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
  const row = await context.env.DB.prepare('SELECT * FROM menu_items WHERE id = ?')
    .bind(context.params.id).first();
  if (!row) return Response.json({ error: 'Menu item not found' }, { status: 404 });
  return Response.json(rowToMenu(row));
}

export async function onRequestPut(context) {
  try {
    const id = context.params.id;
    const existing = await context.env.DB.prepare('SELECT * FROM menu_items WHERE id = ?')
      .bind(id).first();
    if (!existing) return Response.json({ error: 'Menu item not found' }, { status: 404 });

    const body = await context.request.json();
    const name = body.name !== undefined ? String(body.name).trim() : existing.name;
    if (!name) return Response.json({ error: 'name is required' }, { status: 400 });

    await context.env.DB.prepare(
      `UPDATE menu_items SET course=?, name=?, serving_count=?, dietary_notes=?, notes=? WHERE id=?`,
    ).bind(
      body.course !== undefined ? body.course : existing.course,
      name,
      body.servingCount !== undefined ? Number(body.servingCount) || 0 : existing.serving_count,
      body.dietaryNotes !== undefined ? body.dietaryNotes : existing.dietary_notes,
      body.notes !== undefined ? body.notes : existing.notes,
      id,
    ).run();
    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: 'Failed to update menu item: ' + err.message }, { status: 500 });
  }
}

export async function onRequestDelete(context) {
  const id = context.params.id;
  const existing = await context.env.DB.prepare('SELECT id FROM menu_items WHERE id = ?')
    .bind(id).first();
  if (!existing) return Response.json({ error: 'Menu item not found' }, { status: 404 });
  await context.env.DB.prepare('DELETE FROM menu_items WHERE id = ?').bind(id).run();
  return Response.json({ success: true });
}
