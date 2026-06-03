const express = require('express');

const config = require('./config');
const memory = require('./memory');
const { runAgentTurn } = require('./agent');
const { sendMessage, isValidRequest } = require('./twilio');

const app = express();

// Twilio posts application/x-www-form-urlencoded; also accept JSON for testing.
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

/**
 * Decide whether the bot should even consider replying to a given message.
 *
 * In a group chat, reacting to every message is noisy. We always wake on an
 * explicit mention (a wake word) or when someone asks a question; otherwise we
 * still run the agent, but the agent itself returns [[SKIP]] for chatter that
 * doesn't need it. This two-layer gate keeps the bot from being a chatterbox
 * while still letting it volunteer a synthesis when it's genuinely useful.
 */
function isAddressed(text) {
  const lower = (text || '').toLowerCase();
  if (config.wakeWords.some((w) => lower.includes(w))) return true;
  if (lower.includes('?')) return true;
  return false;
}

/**
 * Resolve the conversation key. Twilio's Conversations API provides a
 * ConversationSid for true group chats; the classic Messaging API does not, so
 * we fall back to a single configured group id and aggregate everyone there.
 * (See LEARNINGS.md for why WhatsApp "groups" are awkward over Twilio.)
 */
function conversationIdFor(body) {
  return body.ConversationSid || config.defaultGroupId;
}

/** Pull the human-readable sender name from a Twilio payload. */
function senderName(body) {
  return body.ProfileName || body.Author || body.From || 'Someone';
}

/**
 * Process an inbound message end-to-end: persist it, run the agent, and (maybe)
 * reply. Runs *after* we've already 200'd the webhook so Twilio doesn't time
 * out while the model thinks or searches the web.
 */
async function handleInbound({ conversationId, name, text, replyTo }) {
  const record = memory.load(conversationId);
  memory.appendMessage(record, { role: 'user', name, text });

  // Cheap gate first: if nobody addressed the bot and it's not a question, we
  // still record the message (for context) but skip the model call entirely.
  if (!isAddressed(text)) {
    memory.save(record);
    return;
  }

  let result;
  try {
    result = await runAgentTurn(record);
  } catch (err) {
    console.error('Agent error:', err);
    memory.save(record); // keep the inbound message even if the model failed
    return;
  }

  if (result.reply) {
    memory.appendMessage(record, { role: 'assistant', name: config.botName, text: result.reply });
    if (replyTo) {
      try {
        await sendMessage(replyTo, result.reply);
      } catch (err) {
        console.error('Failed to send WhatsApp reply:', err.message);
      }
    }
  }

  memory.save(record);
}

/**
 * POST /webhook/whatsapp — Twilio inbound message webhook.
 */
app.post('/webhook/whatsapp', (req, res) => {
  if (!isValidRequest(req)) {
    return res.status(403).send('Invalid Twilio signature');
  }

  const body = req.body || {};
  const text = body.Body || '';
  const replyTo = body.From; // classic Messaging API: reply to the sender

  // Acknowledge immediately; do the slow work in the background.
  res.set('Content-Type', 'text/xml');
  res.send('<Response></Response>');

  if (!text.trim()) return;

  handleInbound({
    conversationId: conversationIdFor(body),
    name: senderName(body),
    text,
    replyTo,
  }).catch((err) => console.error('Unhandled inbound error:', err));
});

/** Health check. */
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', bot: config.botName, model: config.model, trip: config.tripName });
});

if (require.main === module) {
  app.listen(config.port, () => {
    console.log(`${config.botName} listening on port ${config.port}`);
    console.log(`Webhook: POST /webhook/whatsapp  | model: ${config.model}`);
  });
}

module.exports = { app, handleInbound, isAddressed };
