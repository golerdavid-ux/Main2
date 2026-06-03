# Nashville Trip Planning Bot

A WhatsApp bot that gathers trip preferences from a group of friends,
synthesizes them into a cohesive plan, resolves conflicts, and tracks what's
been decided — turning a messy async chat into a bookable Nashville trip.

**Stack:** Twilio (WhatsApp) · Claude API (`claude-opus-4-8`) · Node + Express

👉 The project lives in [`nashville-bot/`](./nashville-bot) — see its
[README](./nashville-bot/README.md) for setup and
[LEARNINGS.md](./nashville-bot/LEARNINGS.md) for design notes, including the
important caveat about WhatsApp **group** support over Twilio.
