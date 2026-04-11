function rowToShopping(row) {
  return {
    id: row.id,
    name: row.name,
    store: row.store || '',
    quantity: row.quantity || '',
    purchased: !!row.purchased,
    notes: row.notes || '',
    createdAt: row.created_at,
  };
}

export async function onRequestGet(context) {
  const row = await context.env.DB.prepare('SELECT * FROM shopping_items WHERE id = ?')
    .bind(context.params.id).first();
  if (!row) return Response.json({ error: 'Shopping item not found' }, { status: 404 });
  return Response.json(rowToShopping(row));
}

export async function onRequestPut(context) {
  try {
    const id = context.params.id;
    const existing = await context.env.DB.prepare('SELECT * FROM shopping_items WHERE id = ?')
      .bind(id).first();
    if (!existing) return Response.json({ error: 'Shopping item not found' }, { status: 404 });

    const body = await context.request.json();
    const name = body.name !== undefined ? String(body.name).trim() : existing.name;
    if (!name) return Response.json({ error: 'name is required' }, { status: 400 });

    await context.env.DB.prepare(
      `UPDATE shopping_items SET name=?, store=?, quantity=?, purchased=?, notes=? WHERE id=?`,
    ).bind(
      name,
      body.store !== undefined ? body.store : existing.store,
      body.quantity !== undefined ? body.quantity : existing.quantity,
      body.purchased !== undefined ? (body.purchased ? 1 : 0) : existing.purchased,
      body.notes !== undefined ? body.notes : existing.notes,
      id,
    ).run();
    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: 'Failed to update shopping item: ' + err.message }, { status: 500 });
  }
}

export async function onRequestDelete(context) {
  const id = context.params.id;
  const existing = await context.env.DB.prepare('SELECT id FROM shopping_items WHERE id = ?')
    .bind(id).first();
  if (!existing) return Response.json({ error: 'Shopping item not found' }, { status: 404 });
  await context.env.DB.prepare('DELETE FROM shopping_items WHERE id = ?').bind(id).run();
  return Response.json({ success: true });
}
