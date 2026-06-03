# Nashville Trip Planning Bot 🎸

A WhatsApp group bot that gathers trip preferences from a group of friends,
synthesizes them into a cohesive plan, resolves conflicts, and tracks what's
been decided — so an async group chat actually turns into a bookable trip.

**Stack:** Twilio (WhatsApp) · Claude API (`claude-opus-4-8`) · Node + Express

---

## How it works

```
WhatsApp group ──▶ Twilio webhook ──▶ Express (/webhook/whatsapp)
                                          │
                          record message into trip memory (JSON)
                                          │
                       addressed? ── no ──▶ stay silent, just remember
                                          │ yes
                                          ▼
                            Claude agent loop (agent.js)
                      system prompt + tools + transcript + trip state
                                          │
                    ┌─────────────────────┼───────────────────────┐
              update_participant     record_decision          web_search
              set_dates              add/resolve_question     (real-time data)
                                          │
                            reply text  ──or──  [[SKIP]]
                                          │
                          Twilio REST ──▶ back to the group
```

Two kinds of memory (`memory.js`):

- **Short-term** — the recent transcript, so the model follows the chat flow.
- **Long-term** — the structured *trip state* (participants, preferences,
  dates, decisions, open questions). This is the durable "what's been decided"
  record and survives even after old messages scroll out of the window. The
  agent keeps it current by calling tools (`tools.js`).

The agent decides when to speak. A cheap gate (`isAddressed`) wakes it on a
wake word or a question; the model itself returns `[[SKIP]]` for anything that
doesn't need a reply, so it isn't a chatterbox in a busy group.

---

## Setup

```bash
cd nashville-bot
npm install
cp .env.example .env        # fill in ANTHROPIC_API_KEY + Twilio creds
```

### Run it locally without Twilio

The fastest way to see the agent work — drive it from your terminal:

```bash
npm run simulate
# then type, e.g.:
#   Alice: I want hot chicken and live music, budget ~$500
#   Bob: I'm tighter on cash, like $300 total, and I love hiking
#   Alice: tripbot what should we do Saturday?
```

State persists under `data/simulator.json`, so you can quit and resume.

### Run the webhook server

```bash
npm start            # listens on $PORT (default 3002)
npx ngrok http 3002  # expose it; set PUBLIC_URL to the ngrok URL
```

Point your Twilio WhatsApp number's inbound webhook at
`https://<your-ngrok>/webhook/whatsapp` (HTTP POST). Use the
[Twilio WhatsApp sandbox](https://www.twilio.com/docs/whatsapp/sandbox) to test
without a fully approved number.

### Tests

```bash
npm test       # offline: memory, tools, and the addressing gate (no API key needed)
```

The model call is integration-tested via `npm run simulate` (needs a real key).

---

## Configuration (`.env`)

| Variable | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Claude API key |
| `ANTHROPIC_MODEL` | Model id (default `claude-opus-4-8`) |
| `AGENT_EFFORT` | Thinking effort: `low`/`medium`/`high`/`max` |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` | Twilio credentials |
| `TWILIO_WHATSAPP_NUMBER` | Sending number, `whatsapp:+1...` |
| `VALIDATE_TWILIO_SIGNATURE` | `true` in prod to reject forged webhooks |
| `PUBLIC_URL` | Public base URL (for signature validation) |
| `DEFAULT_GROUP_ID` | Aggregation key when Twilio gives no `ConversationSid` |
| `WAKE_WORDS` | Comma-separated words that always wake the bot |
| `BOT_NAME` / `TRIP_NAME` | How the bot refers to itself and the trip |

---

## Design notes

- **Prompt caching** — the system prompt + tool definitions are frozen and
  cached; the date and live trip state are passed in a *separate, uncached*
  block after the cached prefix, so per-turn changes don't blow the cache.
- **Tools as the source of truth** — the model never free-writes the plan; it
  calls typed tools that the backend validates and persists. The trip state on
  disk is always authoritative.
- **Async-safe replies** — the webhook is acknowledged immediately and the
  (slower) agent work happens in the background, then replies via the REST API.
  This avoids Twilio's ~15s webhook timeout when the model searches the web.

See [`LEARNINGS.md`](./LEARNINGS.md) for what worked, what breaks, and where
human judgment still matters.
