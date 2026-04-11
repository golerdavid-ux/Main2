/**
 * GET /api/settings — returns the party-wide settings as a flat object.
 * PUT /api/settings — body is a flat object of { key: value } pairs to upsert.
 *
 * Known keys: party_name, party_date (ISO YYYY-MM-DD), venue_headline, guest_count_goal.
 * Unknown keys are accepted and stored verbatim so the schema can grow.
 */
export async function onRequestGet(context) {
  const { results } = await context.env.DB.prepare(
    'SELECT key, value FROM settings',
  ).all();

  const out = {};
  for (const row of results) out[row.key] = row.value || '';
  return Response.json(out);
}

export async function onRequestPut(context) {
  let body;
  try {
    body = await context.request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body || typeof body !== 'object') {
    return Response.json({ error: 'Body must be an object' }, { status: 400 });
  }

  const stmt = context.env.DB.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
  );

  const batch = [];
  for (const [key, value] of Object.entries(body)) {
    batch.push(stmt.bind(key, value == null ? '' : String(value)));
  }
  if (batch.length > 0) {
    await context.env.DB.batch(batch);
  }

  return Response.json({ success: true });
}
