const fs = require('fs');
const path = require('path');

const config = require('./config');

/**
 * File-backed conversation store.
 *
 * The bot needs two kinds of memory:
 *   1. Short-term: the recent message transcript (who said what), so the model
 *      can follow the flow of an async group chat.
 *   2. Long-term: the structured *trip state* (participants, preferences,
 *      decisions, open questions). This is the durable record of "what's been
 *      decided" and survives even when old messages scroll out of the window.
 *
 * Both live in one JSON file per conversation/group. For a weekend trip with a
 * handful of friends this is more than enough; swapping the read/write helpers
 * for Google Sheets, Redis, or Postgres would be a localized change.
 */

if (!fs.existsSync(config.dataDir)) {
  fs.mkdirSync(config.dataDir, { recursive: true });
}

/** Build the canonical empty record for a brand-new conversation. */
function emptyRecord(conversationId) {
  return {
    conversationId,
    trip: {
      name: config.tripName,
      destination: 'Nashville, TN',
      dates: { start: null, end: null, status: 'unset' },
      participants: {}, // name -> { interests, budget, constraints, arrival, notes }
      decisions: [], // { topic, decision, decidedAt }
      openQuestions: [], // { id, question, askedAt }
      suggestions: [], // free-form ideas the bot has floated
    },
    messages: [], // { role: 'user'|'assistant', name, text, ts }
    questionSeq: 0,
  };
}

/** Sanitize a conversation id into a safe filename. */
function fileFor(conversationId) {
  const safe = String(conversationId).replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(config.dataDir, `${safe}.json`);
}

/** Load a conversation record, creating a fresh one if none exists. */
function load(conversationId) {
  const file = fileFor(conversationId);
  if (!fs.existsSync(file)) {
    return emptyRecord(conversationId);
  }
  try {
    const record = JSON.parse(fs.readFileSync(file, 'utf8'));
    // Forward-compatibility: backfill any keys added since the file was written.
    return { ...emptyRecord(conversationId), ...record };
  } catch (err) {
    console.error(`Corrupt record for ${conversationId}, starting fresh:`, err.message);
    return emptyRecord(conversationId);
  }
}

/** Persist a conversation record. */
function save(record) {
  const file = fileFor(record.conversationId);
  fs.writeFileSync(file, JSON.stringify(record, null, 2));
}

/** Append a message to the transcript, trimming to the configured window. */
function appendMessage(record, { role, name, text }) {
  record.messages.push({ role, name: name || null, text, ts: new Date().toISOString() });
  // Keep the transcript bounded; the trip state carries the long-term memory.
  if (record.messages.length > config.historyWindow) {
    record.messages = record.messages.slice(-config.historyWindow);
  }
  return record;
}

module.exports = { load, save, appendMessage, emptyRecord };
