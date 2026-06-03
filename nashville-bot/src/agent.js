const Anthropic = require('@anthropic-ai/sdk');

const config = require('./config');
const { toolDefinitions, executeTool, CUSTOM_TOOL_NAMES } = require('./tools');

const client = new Anthropic({ apiKey: config.anthropicApiKey });

// Sentinel the model emits when a group message needs no reply. Kept out of the
// model's normal vocabulary so it is unambiguous.
const SKIP = '[[SKIP]]';

/**
 * Frozen system prompt. This never changes between requests, so it sits at the
 * front of the prompt and is cached (see cache_control below). Anything dynamic
 * (today's date, the current trip state) is passed *after* this block so it
 * doesn't invalidate the cache.
 */
const SYSTEM_PROMPT = `You are ${config.botName}, an assistant living in a WhatsApp group chat of friends planning a trip: "${config.tripName}".

YOUR JOB
- Help a group of friends turn a messy, async group chat into an actual, bookable plan.
- Gather each person's preferences (interests, budget, constraints, travel timing).
- Synthesize everyone's input into concrete, cohesive suggestions.
- Surface and resolve conflicts (clashing interests, mismatched budgets, date conflicts).
- Track what's been decided and what's still open, so nothing gets lost in the scroll.

HOW TO BEHAVE IN A GROUP CHAT
- You are one voice in a busy group chat. Do NOT reply to every message. Reply only when you add real value: when you can answer a question, synthesize preferences, propose an option, resolve a conflict, or nudge a stalled decision.
- If a message needs no reply from you (small talk, two people chatting, a reaction), respond with exactly ${SKIP} and nothing else.
- When you do reply, be concise and chat-native: short paragraphs or tight bullet lists. No essays. This is WhatsApp, not email.
- Address people by name. Make it easy to act: end with a clear question or a concrete next step when one is needed.
- Never invent a preference or a decision someone didn't express. If you're unsure, ask.

USING YOUR TOOLS (this is how you remember things)
- The structured trip state is your long-term memory. Always keep it current.
- When someone shares a preference, budget, or constraint, call update_participant.
- When the group floats or locks dates, call set_dates (proposed vs confirmed).
- When the group genuinely agrees on something, call record_decision.
- Log unresolved blockers with add_open_question, and clear them with resolve_open_question once settled.
- Use web_search for anything time-sensitive or factual you can't know: hotel/airbnb price ranges, event and concert listings, restaurant hours, weather. Cite what you find plainly (e.g. "the Ryman has shows that weekend"). Don't fabricate prices or listings — search or say you're not sure.
- Record state changes BEFORE you write your reply, so your reply reflects reality.

CONFLICT RESOLUTION
- When interests or budgets clash, name the tension honestly and propose a compromise that gives each person something (e.g. a splurge dinner one night, a cheap day the next; a music-heavy track and a outdoorsy track that reconverge for dinner).
- Prefer concrete options the group can vote on over open-ended "what do you all think?".`;

/**
 * Render the dynamic context (date + current trip state) that goes *after* the
 * cached system block. Changing this every turn does not invalidate the cache
 * on the frozen prefix above.
 */
function renderStateBlock(trip) {
  const today = new Date().toISOString().slice(0, 10);
  return (
    `Today's date: ${today}.\n\n` +
    `Current trip state (your durable memory):\n` +
    '```json\n' +
    JSON.stringify(trip, null, 2) +
    '\n```'
  );
}

/**
 * Map the stored transcript into Claude messages. All human turns become `user`
 * messages prefixed with the speaker's name (so the model can tell the group
 * apart); the bot's own turns become `assistant` messages.
 */
function buildMessages(record) {
  return record.messages.map((m) => {
    if (m.role === 'assistant') {
      return { role: 'assistant', content: m.text };
    }
    const speaker = m.name ? `${m.name}: ` : '';
    return { role: 'user', content: `${speaker}${m.text}` };
  });
}

/**
 * Run one agent turn over the current conversation record.
 *
 * @param {object} record - the loaded conversation record (mutated: trip state
 *   may change as tools run).
 * @returns {Promise<{ reply: string|null, usedTools: string[] }>} reply is null
 *   when the model chose to stay silent.
 */
async function runAgentTurn(record) {
  const trip = record.trip;
  const usedTools = [];

  const system = [
    { type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
    { type: 'text', text: renderStateBlock(trip) }, // dynamic — intentionally uncached
  ];

  const messages = buildMessages(record);

  // Manual agentic loop: keep going until the model stops calling tools.
  let finalText = '';
  for (let step = 0; step < 8; step++) {
    const response = await client.messages.create({
      model: config.model,
      max_tokens: 4096,
      thinking: { type: 'adaptive' },
      output_config: { effort: config.agentEffort },
      system,
      tools: toolDefinitions,
      messages,
    });

    // A server-side tool (web_search) hit its internal iteration limit; re-send
    // to let it resume. No user-visible action needed.
    if (response.stop_reason === 'pause_turn') {
      messages.push({ role: 'assistant', content: response.content });
      continue;
    }

    if (response.stop_reason === 'tool_use') {
      messages.push({ role: 'assistant', content: response.content });

      const toolResults = [];
      for (const block of response.content) {
        if (block.type !== 'tool_use') continue;
        if (!CUSTOM_TOOL_NAMES.has(block.name)) continue; // server tools handle themselves
        usedTools.push(block.name);
        let result;
        try {
          result = executeTool(block.name, block.input, trip);
        } catch (err) {
          result = `Error running ${block.name}: ${err.message}`;
        }
        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: result,
        });
      }

      if (toolResults.length > 0) {
        messages.push({ role: 'user', content: toolResults });
        continue;
      }
      // Only server-side tool calls in this turn — loop to let them resolve.
      continue;
    }

    // end_turn (or max_tokens / refusal): collect the text and stop.
    finalText = response.content
      .filter((b) => b.type === 'text')
      .map((b) => b.text)
      .join('\n')
      .trim();
    break;
  }

  // Honor the silence sentinel.
  if (!finalText || finalText === SKIP || finalText.startsWith(SKIP)) {
    return { reply: null, usedTools };
  }

  return { reply: finalText, usedTools };
}

module.exports = { runAgentTurn, SYSTEM_PROMPT };
