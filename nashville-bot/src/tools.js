/**
 * Tool surface for the planning agent.
 *
 * Each custom tool is a typed action the model can take to *durably* record
 * something into the trip state. We promote these to dedicated tools (rather
 * than letting the model free-write JSON) so the backend stays the single
 * source of truth: every write is validated and persisted here, not in prose.
 *
 * `web_search` is an Anthropic server-side tool — it runs on Anthropic's
 * infrastructure, so it has no handler here; we just declare it.
 */

const toolDefinitions = [
  {
    name: 'update_participant',
    description:
      "Create or update a friend's trip preferences. Call this whenever someone " +
      'shares interests, a budget, travel constraints, or arrival/departure plans. ' +
      'Only include the fields the person actually mentioned; omitted fields are left unchanged.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: "The friend's name (as used in the chat)." },
        interests: {
          type: 'array',
          items: { type: 'string' },
          description: 'Things they want to do (e.g. "live music", "hot chicken", "hiking").',
        },
        budget: { type: 'string', description: 'Their stated budget or price sensitivity.' },
        constraints: {
          type: 'string',
          description: 'Hard constraints: dietary needs, mobility, "must be back by Sunday", etc.',
        },
        arrival: { type: 'string', description: 'Arrival/departure timing or travel method.' },
        notes: { type: 'string', description: 'Anything else worth remembering about this person.' },
      },
      required: ['name'],
    },
  },
  {
    name: 'set_dates',
    description:
      'Record or update the trip dates. Use status "proposed" when floating an option and ' +
      '"confirmed" once the group has agreed.',
    input_schema: {
      type: 'object',
      properties: {
        start: { type: 'string', description: 'Start date, ideally ISO (YYYY-MM-DD).' },
        end: { type: 'string', description: 'End date, ideally ISO (YYYY-MM-DD).' },
        status: { type: 'string', enum: ['proposed', 'confirmed'] },
      },
      required: ['status'],
    },
  },
  {
    name: 'record_decision',
    description:
      'Record a decision the group has converged on (lodging, transport, a specific ' +
      'activity/booking, overall budget, theme). Use this when there is genuine agreement, ' +
      'not for ideas still under discussion.',
    input_schema: {
      type: 'object',
      properties: {
        topic: { type: 'string', description: 'Short topic key, e.g. "lodging" or "saturday-night".' },
        decision: { type: 'string', description: 'What was decided, in one sentence.' },
      },
      required: ['topic', 'decision'],
    },
  },
  {
    name: 'add_open_question',
    description:
      'Log an unresolved question the group still needs to answer (e.g. "How many nights?"). ' +
      'Use this to keep track of what is blocking the plan.',
    input_schema: {
      type: 'object',
      properties: {
        question: { type: 'string', description: 'The open question.' },
      },
      required: ['question'],
    },
  },
  {
    name: 'resolve_open_question',
    description: 'Mark a previously logged open question as resolved, by its id.',
    input_schema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'The open question id to resolve.' },
      },
      required: ['id'],
    },
  },
  {
    name: 'get_trip_state',
    description:
      'Return the current structured trip state (participants, dates, decisions, open ' +
      'questions). Use after recording changes if you need to reason over the fresh state.',
    input_schema: { type: 'object', properties: {} },
  },
  // Anthropic-hosted: lets the bot pull real-time data (hotel prices, event
  // listings, weather) when planning. No local handler — runs server-side.
  { type: 'web_search_20260209', name: 'web_search' },
];

/**
 * Execute a custom tool against the trip state. Mutates `trip` in place and
 * returns a short string the model receives as the tool result.
 */
function executeTool(name, input, trip) {
  switch (name) {
    case 'update_participant': {
      const key = input.name.trim();
      const existing = trip.participants[key] || { interests: [] };
      const merged = {
        interests: input.interests
          ? Array.from(new Set([...(existing.interests || []), ...input.interests]))
          : existing.interests || [],
        budget: input.budget ?? existing.budget,
        constraints: input.constraints ?? existing.constraints,
        arrival: input.arrival ?? existing.arrival,
        notes: input.notes ?? existing.notes,
      };
      trip.participants[key] = merged;
      return `Saved preferences for ${key}.`;
    }

    case 'set_dates': {
      trip.dates = {
        start: input.start ?? trip.dates.start,
        end: input.end ?? trip.dates.end,
        status: input.status,
      };
      return `Dates ${input.status}: ${trip.dates.start || '?'} -> ${trip.dates.end || '?'}.`;
    }

    case 'record_decision': {
      // Replace any prior decision on the same topic so the record stays current.
      trip.decisions = trip.decisions.filter((d) => d.topic !== input.topic);
      trip.decisions.push({
        topic: input.topic,
        decision: input.decision,
        decidedAt: new Date().toISOString(),
      });
      return `Recorded decision on "${input.topic}".`;
    }

    case 'add_open_question': {
      const id = (trip._questionSeq = (trip._questionSeq || 0) + 1);
      trip.openQuestions.push({ id, question: input.question, askedAt: new Date().toISOString() });
      return `Logged open question #${id}.`;
    }

    case 'resolve_open_question': {
      const before = trip.openQuestions.length;
      trip.openQuestions = trip.openQuestions.filter((q) => q.id !== input.id);
      return trip.openQuestions.length < before
        ? `Resolved open question #${input.id}.`
        : `No open question #${input.id} found.`;
    }

    case 'get_trip_state':
      return JSON.stringify(trip);

    default:
      return `Unknown tool: ${name}`;
  }
}

/** The set of tool names this backend executes locally (vs. server-side tools). */
const CUSTOM_TOOL_NAMES = new Set([
  'update_participant',
  'set_dates',
  'record_decision',
  'add_open_question',
  'resolve_open_question',
  'get_trip_state',
]);

module.exports = { toolDefinitions, executeTool, CUSTOM_TOOL_NAMES };
