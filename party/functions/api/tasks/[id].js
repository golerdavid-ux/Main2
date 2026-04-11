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

export async function onRequestGet(context) {
  const row = await context.env.DB.prepare('SELECT * FROM tasks WHERE id = ?')
    .bind(context.params.id)
    .first();
  if (!row) return Response.json({ error: 'Task not found' }, { status: 404 });
  return Response.json(rowToTask(row));
}

export async function onRequestPut(context) {
  try {
    const id = context.params.id;
    const existing = await context.env.DB.prepare('SELECT * FROM tasks WHERE id = ?')
      .bind(id).first();
    if (!existing) return Response.json({ error: 'Task not found' }, { status: 404 });

    const body = await context.request.json();
    const title = body.title !== undefined ? String(body.title).trim() : existing.title;
    if (!title) return Response.json({ error: 'title is required' }, { status: 400 });

    await context.env.DB.prepare(
      `UPDATE tasks SET title=?, notes=?, due_date=?, assignee=?, status=? WHERE id=?`,
    ).bind(
      title,
      body.notes !== undefined ? body.notes : existing.notes,
      body.dueDate !== undefined ? body.dueDate : existing.due_date,
      body.assignee !== undefined ? body.assignee : existing.assignee,
      body.status !== undefined ? body.status : existing.status,
      id,
    ).run();
    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: 'Failed to update task: ' + err.message }, { status: 500 });
  }
}

export async function onRequestDelete(context) {
  const id = context.params.id;
  const existing = await context.env.DB.prepare('SELECT id FROM tasks WHERE id = ?')
    .bind(id).first();
  if (!existing) return Response.json({ error: 'Task not found' }, { status: 404 });
  await context.env.DB.prepare('DELETE FROM tasks WHERE id = ?').bind(id).run();
  return Response.json({ success: true });
}
