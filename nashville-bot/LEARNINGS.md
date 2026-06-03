# Learnings: AI agents in async group chats

Notes from building a trip-planning agent that lives in a WhatsApp group chat.
Organized around the four questions the project set out to answer.

## How agents work in async group chat contexts

- **A group chat is a single stream of multiple speakers.** The model needs to
  know *who* said what, or it conflates preferences ("Alice wants music, Bob
  wants hiking" becomes a mushy "the group wants music and hiking"). We prefix
  every human turn with the speaker's name and collapse all humans into the
  `user` role. The bot's turns are the `assistant` role. That's enough for the
  model to track individuals.
- **Two memories, not one.** The raw transcript is short-term and scrolls away.
  The *decisions* must not. Splitting durable state (participants, dates,
  decisions, open questions) out of the message log — and making the model write
  to it through tools — is what lets the bot answer "wait, what did we decide
  about lodging?" three weeks later. The structured state is the product; the
  transcript is just working memory.
- **Silence is a feature.** The hardest part of a group-chat agent isn't
  generating good replies — it's *not* replying. A bot that answers every
  message is unusable in a group. We use a two-layer gate: a cheap heuristic
  (wake word or question mark) decides whether to even call the model, and the
  model itself emits a `[[SKIP]]` sentinel when a reply wouldn't add value.
- **Tools are the agent's hands.** Promoting "remember this preference" and
  "record this decision" to typed tools (rather than asking the model to emit
  JSON in its reply) keeps the backend authoritative and the writes validated.
  The model reasons; the harness records.

## What breaks and why

- **WhatsApp "groups" over Twilio are awkward.** The classic Programmable
  Messaging API has no native group concept — each inbound message looks like a
  1:1 from one participant, and you can't post a single message that lands in a
  shared group thread. The Conversations API supports multi-party threads and
  gives you a `ConversationSid`, which is the right primitive — but it's more
  setup. This bot keys state on `ConversationSid` when present and otherwise
  aggregates everyone under one configured `DEFAULT_GROUP_ID`, which *simulates*
  a group for the sandbox. Production group support means committing to the
  Conversations API.
- **Webhook timeouts vs. thinking time.** Twilio expects a webhook response in
  ~15 seconds. An agent that searches the web and reasons can easily exceed that.
  Replying inline with TwiML forces you into that budget *and* forces a reply on
  every message. Acknowledging the webhook immediately and replying later via the
  REST API fixes both — but it means you lose the simple request/response shape
  and have to manage delivery yourself.
- **Prompt-cache invalidation is silent.** The first instinct is to drop "today
  is X" and the current trip state into the system prompt — which invalidates the
  cache every single turn, with no error, just a quietly higher bill. Keeping the
  system prompt and tools frozen and passing volatile context in a separate block
  after the cache breakpoint is the fix.
- **Over-eager recording.** Early on the agent recorded a "decision" every time
  someone floated an idea. The line between "Bob suggested an Airbnb" and "the
  group decided on an Airbnb" is a judgment the prompt has to make explicit —
  `record_decision` is for genuine agreement, `add_open_question` is for things
  still in the air.
- **Hallucinated specifics.** Asked for hotel prices or concert dates, a model
  will happily invent plausible-but-wrong ones. Wiring in `web_search` and
  instructing the bot to search-or-abstain (never fabricate prices/listings) is
  the guardrail. It's still worth a human double-check before booking.

## Where human judgment still matters

- **Taste and tie-breaking.** The bot can surface "three people want music, one
  wants quiet" and propose a compromise, but whether the group splits up Saturday
  night or all goes to the Ryman is a human call. The agent is best as a
  *facilitator* that frames the choice, not a decider.
- **Trust on money and bookings.** Aggregating budgets and flagging that someone
  is priced out is high-value. Actually committing money — booking the Airbnb,
  buying tickets — should stay human-confirmed. (The tool surface deliberately
  records decisions; it doesn't make purchases.)
- **Reading the room.** Tone, inside jokes, who's actually committed vs. politely
  nodding — the model misses social subtext. The wake-word + `[[SKIP]]` design is
  an admission that the bot shouldn't try to read every social cue; it stays out
  of the way unless invited or clearly useful.

## How to embed AI in existing communication flows

- **Meet people where they are.** Nobody installs a new app to plan a weekend.
  Living inside the group chat they already use is the whole point — the
  integration cost is a webhook, not a behavior change.
- **Be a participant, not a UI.** The bot has no buttons or forms; it reads and
  writes the same medium everyone else uses. That constrains it (no rich UI) but
  makes adoption frictionless.
- **Degrade gracefully.** If the model errors, we still record the inbound
  message so context isn't lost; the bot just doesn't reply that turn. In a
  shared channel, a missing reply is invisible — a crash or a wrong reply is not.
- **Make the memory inspectable.** The trip state is plain JSON on disk (or could
  be a Google Sheet). When the bot and the humans disagree about "what we
  decided," there's a single artifact to point at and correct.

## Success metric check

The bar was: *the group uses it naturally to plan the actual September trip, and
its output is actionable and reduces back-and-forth.* The architecture here is
built around that — durable decisions, conflict framing, real-time lookups, and
restraint about when to speak. The remaining gap before a real trip is
committing to the Conversations API for true group threads and a live shakedown
with the actual crew.
