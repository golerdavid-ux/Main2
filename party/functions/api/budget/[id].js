function rowToBudget(row) {
  return {
    id: row.id,
    category: row.category || '',
    description: row.description,
    estimatedCost: Number(row.estimated_cost) || 0,
    actualCost: Number(row.actual_cost) || 0,
    paid: !!row.paid,
    vendorId: row.vendor_id || null,
    createdAt: row.created_at,
  };
}

export async function onRequestGet(context) {
  const row = await context.env.DB.prepare('SELECT * FROM budget_items WHERE id = ?')
    .bind(context.params.id).first();
  if (!row) return Response.json({ error: 'Budget item not found' }, { status: 404 });
  return Response.json(rowToBudget(row));
}

export async function onRequestPut(context) {
  try {
    const id = context.params.id;
    const existing = await context.env.DB.prepare('SELECT * FROM budget_items WHERE id = ?')
      .bind(id).first();
    if (!existing) return Response.json({ error: 'Budget item not found' }, { status: 404 });

    const body = await context.request.json();
    const description = body.description !== undefined
      ? String(body.description).trim()
      : existing.description;
    if (!description) return Response.json({ error: 'description is required' }, { status: 400 });

    await context.env.DB.prepare(
      `UPDATE budget_items SET category=?, description=?, estimated_cost=?, actual_cost=?,
        paid=?, vendor_id=?
       WHERE id=?`,
    ).bind(
      body.category !== undefined ? body.category : existing.category,
      description,
      body.estimatedCost !== undefined ? Number(body.estimatedCost) || 0 : existing.estimated_cost,
      body.actualCost !== undefined ? Number(body.actualCost) || 0 : existing.actual_cost,
      body.paid !== undefined ? (body.paid ? 1 : 0) : existing.paid,
      body.vendorId !== undefined ? (body.vendorId || null) : existing.vendor_id,
      id,
    ).run();
    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: 'Failed to update budget item: ' + err.message }, { status: 500 });
  }
}

export async function onRequestDelete(context) {
  const id = context.params.id;
  const existing = await context.env.DB.prepare('SELECT id FROM budget_items WHERE id = ?')
    .bind(id).first();
  if (!existing) return Response.json({ error: 'Budget item not found' }, { status: 404 });
  await context.env.DB.prepare('DELETE FROM budget_items WHERE id = ?').bind(id).run();
  return Response.json({ success: true });
}
