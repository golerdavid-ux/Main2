import { generateId, nowIso } from '../_auth.js';

const COURSE_ORDER = { appetizer: 1, main: 2, side: 3, dessert: 4, drink: 5 };

function rowToMenu(row) {
  return {
    id: row.id,
    course: row.course || '',
    name: row.name,
    servingCount: Number(row.serving_count) || 0,
    dietaryNotes: row.dietary_notes || '',
    notes: row.notes || '',
    createdAt: row.created_at,
  };
}

export async function onRequestGet(context) {
  const { results } = await context.env.DB.prepare(
    `SELECT * FROM menu_items ORDER BY course ASC, created_at DESC`,
  ).all();
  // Client groups by course, but nudge canonical ordering here too.
  const items = results.map(rowToMenu).sort((a, b) => {
    const ai = COURSE_ORDER[a.course] || 99;
    const bi = COURSE_ORDER[b.course] || 99;
    if (ai !== bi) return ai - bi;
    return a.createdAt < b.createdAt ? 1 : -1;
  });
  return Response.json({ items, count: items.length });
}

export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    if (!body?.name || !String(body.name).trim()) {
      return Response.json({ error: 'name is required' }, { status: 400 });
    }
    const id = generateId();
    const now = nowIso();
    await context.env.DB.prepare(
      `INSERT INTO menu_items (id, course, name, serving_count, dietary_notes, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      id,
      body.course || '',
      String(body.name).trim(),
      Number(body.servingCount) || 0,
      body.dietaryNotes || '',
      body.notes || '',
      now,
    ).run();
    return Response.json({ success: true, id }, { status: 201 });
  } catch (err) {
    return Response.json({ error: 'Failed to create menu item: ' + err.message }, { status: 500 });
  }
}
