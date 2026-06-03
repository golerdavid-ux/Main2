require('dotenv').config();

const path = require('path');

/**
 * Centralized configuration, read once from the environment.
 * Keeping this in one place makes the rest of the code testable (the simulate
 * and test scripts run without Twilio credentials).
 */
const config = {
  // Claude
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  model: process.env.ANTHROPIC_MODEL || 'claude-opus-4-8',
  agentEffort: process.env.AGENT_EFFORT || 'medium',

  // Twilio
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID,
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN,
  twilioWhatsAppNumber: process.env.TWILIO_WHATSAPP_NUMBER,
  validateTwilioSignature: process.env.VALIDATE_TWILIO_SIGNATURE === 'true',
  publicUrl: process.env.PUBLIC_URL || '',

  // App
  port: parseInt(process.env.PORT || '3002', 10),
  dataDir: path.resolve(process.env.DATA_DIR || './data'),
  botName: process.env.BOT_NAME || 'TripBot',
  tripName: process.env.TRIP_NAME || 'Nashville in September',
  defaultGroupId: process.env.DEFAULT_GROUP_ID || 'nashville-crew',
  wakeWords: (process.env.WAKE_WORDS || 'tripbot,@tripbot,bot')
    .split(',')
    .map((w) => w.trim().toLowerCase())
    .filter(Boolean),

  // How many recent chat turns to keep in the model context. The durable
  // memory is the structured trip state, not the raw transcript.
  historyWindow: 40,
};

module.exports = config;
