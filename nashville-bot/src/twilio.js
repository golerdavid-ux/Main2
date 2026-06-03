const twilio = require('twilio');

const config = require('./config');

/**
 * Thin wrapper around the Twilio REST client for sending WhatsApp messages.
 *
 * We send replies via the REST API (rather than inline TwiML) so we can:
 *   - reply asynchronously after the agent finishes thinking / searching, and
 *   - choose to stay silent (TwiML would force a reply on every webhook).
 */

let restClient = null;
function getClient() {
  if (!restClient) {
    if (!config.twilioAccountSid || !config.twilioAuthToken) {
      throw new Error('Twilio credentials are not configured.');
    }
    restClient = twilio(config.twilioAccountSid, config.twilioAuthToken);
  }
  return restClient;
}

/**
 * Send a WhatsApp message.
 * @param {string} to - destination in `whatsapp:+1...` form.
 * @param {string} body - message text.
 */
async function sendMessage(to, body) {
  const client = getClient();
  return client.messages.create({
    from: config.twilioWhatsAppNumber,
    to,
    body,
  });
}

/**
 * Validate a Twilio webhook signature. Returns true when validation passes or
 * when validation is disabled (local dev). See config.validateTwilioSignature.
 */
function isValidRequest(req) {
  if (!config.validateTwilioSignature) return true;
  const signature = req.headers['x-twilio-signature'];
  const url = `${config.publicUrl}${req.originalUrl}`;
  return twilio.validateRequest(config.twilioAuthToken, signature, url, req.body);
}

module.exports = { sendMessage, isValidRequest };
