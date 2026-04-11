function rowToVendor(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category || '',
    contactName: row.contact_name || '',
    phone: row.phone || '',
    email: row.email || '',
    website: row.website || '',
    depositAmount: Number(row.deposit_amount) || 0,
    balanceAmount: Number(row.balance_amount) || 0,
    depositPaid: !!row.deposit_paid,
    notes: row.notes || '',
    createdAt: row.created_at,
  };
}

export async function onRequestGet(context) {
  const row = await context.env.DB.prepare('SELECT * FROM vendors WHERE id = ?')
    .bind(context.params.id).first();
  if (!row) return Response.json({ error: 'Vendor not found' }, { status: 404 });
  return Response.json(rowToVendor(row));
}

export async function onRequestPut(context) {
  try {
    const id = context.params.id;
    const existing = await context.env.DB.prepare('SELECT * FROM vendors WHERE id = ?')
      .bind(id).first();
    if (!existing) return Response.json({ error: 'Vendor not found' }, { status: 404 });

    const body = await context.request.json();
    const name = body.name !== undefined ? String(body.name).trim() : existing.name;
    if (!name) return Response.json({ error: 'name is required' }, { status: 400 });

    await context.env.DB.prepare(
      `UPDATE vendors SET name=?, category=?, contact_name=?, phone=?, email=?, website=?,
        deposit_amount=?, balance_amount=?, deposit_paid=?, notes=?
       WHERE id=?`,
    ).bind(
      name,
      body.category !== undefined ? body.category : existing.category,
      body.contactName !== undefined ? body.contactName : existing.contact_name,
      body.phone !== undefined ? body.phone : existing.phone,
      body.email !== undefined ? body.email : existing.email,
      body.website !== undefined ? body.website : existing.website,
      body.depositAmount !== undefined ? Number(body.depositAmount) || 0 : existing.deposit_amount,
      body.balanceAmount !== undefined ? Number(body.balanceAmount) || 0 : existing.balance_amount,
      body.depositPaid !== undefined ? (body.depositPaid ? 1 : 0) : existing.deposit_paid,
      body.notes !== undefined ? body.notes : existing.notes,
      id,
    ).run();
    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: 'Failed to update vendor: ' + err.message }, { status: 500 });
  }
}

export async function onRequestDelete(context) {
  const id = context.params.id;
  const existing = await context.env.DB.prepare('SELECT id FROM vendors WHERE id = ?')
    .bind(id).first();
  if (!existing) return Response.json({ error: 'Vendor not found' }, { status: 404 });
  await context.env.DB.prepare('DELETE FROM vendors WHERE id = ?').bind(id).run();
  return Response.json({ success: true });
}
