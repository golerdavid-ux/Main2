/**
 * Offline smoke test for the memory + tools layer.
 *
 * Exercises every custom tool and the transcript window WITHOUT calling the
 * Claude API or Twilio, so it runs anywhere (CI, no API key). The agent's model
 * call is integration-tested via scripts/simulate.js, which needs a real key.
 *
 *   npm test
 */

const assert = require('assert');

const { emptyRecord, appendMessage } = require('../src/memory');
const { executeTool } = require('../src/tools');
const { isAddressed } = require('../src/server');

let passed = 0;
function check(label, fn) {
  fn();
  passed++;
  console.log(`  ok - ${label}`);
}

// --- tools mutate the trip state ---
const record = emptyRecord('test-group');
const trip = record.trip;

check('update_participant creates a participant', () => {
  executeTool('update_participant', { name: 'Alice', interests: ['live music'], budget: '$500' }, trip);
  assert.deepStrictEqual(trip.participants.Alice.interests, ['live music']);
  assert.strictEqual(trip.participants.Alice.budget, '$500');
});

check('update_participant merges interests without clobbering fields', () => {
  executeTool('update_participant', { name: 'Alice', interests: ['hot chicken'] }, trip);
  assert.deepStrictEqual(trip.participants.Alice.interests, ['live music', 'hot chicken']);
  assert.strictEqual(trip.participants.Alice.budget, '$500'); // untouched
});

check('set_dates records proposed then confirmed', () => {
  executeTool('set_dates', { start: '2026-09-18', end: '2026-09-20', status: 'proposed' }, trip);
  assert.strictEqual(trip.dates.status, 'proposed');
  executeTool('set_dates', { status: 'confirmed' }, trip);
  assert.strictEqual(trip.dates.status, 'confirmed');
  assert.strictEqual(trip.dates.start, '2026-09-18'); // preserved across update
});

check('record_decision replaces same-topic decisions', () => {
  executeTool('record_decision', { topic: 'lodging', decision: 'Airbnb in East Nashville' }, trip);
  executeTool('record_decision', { topic: 'lodging', decision: 'Hotel downtown instead' }, trip);
  const lodging = trip.decisions.filter((d) => d.topic === 'lodging');
  assert.strictEqual(lodging.length, 1);
  assert.strictEqual(lodging[0].decision, 'Hotel downtown instead');
});

check('open questions add and resolve by id', () => {
  executeTool('add_open_question', { question: 'How many nights?' }, trip);
  executeTool('add_open_question', { question: 'Rent a car?' }, trip);
  assert.strictEqual(trip.openQuestions.length, 2);
  const firstId = trip.openQuestions[0].id;
  executeTool('resolve_open_question', { id: firstId }, trip);
  assert.strictEqual(trip.openQuestions.length, 1);
  assert.ok(!trip.openQuestions.some((q) => q.id === firstId));
});

check('get_trip_state returns serializable state', () => {
  const out = executeTool('get_trip_state', {}, trip);
  const parsed = JSON.parse(out);
  assert.strictEqual(parsed.participants.Alice.budget, '$500');
});

// --- transcript window ---
check('appendMessage trims to the history window', () => {
  const r = emptyRecord('window-test');
  for (let i = 0; i < 100; i++) appendMessage(r, { role: 'user', name: 'X', text: `m${i}` });
  assert.ok(r.messages.length <= require('../src/config').historyWindow);
  assert.strictEqual(r.messages[r.messages.length - 1].text, 'm99'); // newest kept
});

// --- addressing gate ---
check('isAddressed wakes on wake word and questions only', () => {
  assert.strictEqual(isAddressed('tripbot what should we do'), true);
  assert.strictEqual(isAddressed('what time works?'), true);
  assert.strictEqual(isAddressed('lol same'), false);
});

console.log(`\n${passed} checks passed.`);
