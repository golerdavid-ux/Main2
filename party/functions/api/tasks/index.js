import { generateId, nowIso } from '../_auth.js';

function rowToTask(row) {
  return {
    id: row.id,
    title: row.title,
    notes: row.notes || '',
    dueDate: row.due_date || '',
    assignee: row.assignee || '',
    status: row.status || 'open',
    createdAt: row.created_at,
  };
}

/** GET /api/tasks — list, sorted by due date ascending with blanks last. */
export async function onRequestGet(context) {
  const { results } = await context.env.DB.prepare(
    `SELECT * FROM tasks
     ORDER BY
       CASE WHEN due_date = '' THEN 1 ELSE 0 END,
       due_date ASC,
       created_at DESC`,
  ).all();
  return Response.json({ tasks: results.map(rowToTask), count: results.length });
}

/** POST /api/tasks — create. */
export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    if (!body?.title || !String(body.title).trim()) {
      return Response.json({ error: 'title is required' }, { status: 400 });
    }
    const id = generateId();
    const now = nowIso();
    await context.env.DB.prepare(
      `INSERT INTO tasks (id, title, notes, due_date, assignee, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      id,
      String(body.title).trim(),
      body.notes || '',
      body.dueDate || '',
      body.assignee || '',
      body.status || 'open',
      now,
    ).run();
    return Response.json({ success: true, id }, { status: 201 });
  } catch (err) {
    return Response.json({ error: 'Failed to create task: ' + err.message }, { status: 500 });
  }
}
