/**
 * Local simulator — drive the planning agent without Twilio.
 *
 * Type messages as "Name: message" and watch the bot respond (or stay silent).
 * State persists to the data dir under the conversation id "simulator", so you
 * can quit and resume. Requires ANTHROPIC_API_KEY.
 *
 *   node scripts/simulate.js
 *
 * You can also pipe a scripted conversation:
 *   printf 'Alice: I want hot chicken and live music\nBob: I'm on a tight budget, like $400 total\nAlice: tripbot what should we do?\n' | node scripts/simulate.js
 */

const readline = require('readline');

const config = require('../src/config');
const memory = require('../src/memory');
const { runAgentTurn } = require('../src/agent');
const { isAddressed } = require('../src/server');

const CONVERSATION_ID = 'simulator';

if (!config.anthropicApiKey) {
  console.error('Set ANTHROPIC_API_KEY (in nashville-bot/.env) before running the simulator.');
  process.exit(1);
}

/** Parse a "Name: message" line; default the name if none is given. */
function parseLine(line) {
  const idx = line.indexOf(':');
  if (idx > 0 && idx < 24) {
    return { name: line.slice(0, idx).trim(), text: line.slice(idx + 1).trim() };
  }
  return { name: 'You', text: line.trim() };
}

async function feed(name, text) {
  const record = memory.load(CONVERSATION_ID);
  memory.appendMessage(record, { role: 'user', name, text });

  if (!isAddressed(text)) {
    memory.save(record);
    console.log(`  (${config.botName} stays quiet — not addressed)`);
    return;
  }

  let result;
  try {
    result = await runAgentTurn(record);
  } catch (err) {
    console.error('  Agent error:', err.message);
    memory.save(record);
    return;
  }

  if (result.usedTools.length) {
    console.log(`  (tools: ${result.usedTools.join(', ')})`);
  }
  if (result.reply) {
    memory.appendMessage(record, { role: 'assistant', name: config.botName, text: result.reply });
    console.log(`\n${config.botName}: ${result.reply}\n`);
  } else {
    console.log(`  (${config.botName} chose to stay quiet)`);
  }
  memory.save(record);
}

async function main() {
  console.log(`Simulating "${config.tripName}" with ${config.botName} (model: ${config.model}).`);
  console.log('Type messages as "Name: message". Ctrl+C to quit.\n');

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: false });
  for await (const line of rl) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const { name, text } = parseLine(trimmed);
    console.log(`${name}: ${text}`);
    await feed(name, text);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
