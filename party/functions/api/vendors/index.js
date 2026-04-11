import { generateId, nowIso } from '../_auth.js';

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
  const { results } = await context.env.DB.prepare(
    `SELECT * FROM vendors ORDER BY category ASC, name ASC`,
  ).all();
  return Response.json({ vendors: results.map(rowToVendor), count: results.length });
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
      `INSERT INTO vendors (id, name, category, contact_name, phone, email, website,
        deposit_amount, balance_amount, deposit_paid, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      id,
      String(body.name).trim(),
      body.category || '',
      body.contactName || '',
      body.phone || '',
      body.email || '',
      body.website || '',
      Number(body.depositAmount) || 0,
      Number(body.balanceAmount) || 0,
      body.depositPaid ? 1 : 0,
      body.notes || '',
      now,
    ).run();
    return Response.json({ success: true, id }, { status: 201 });
  } catch (err) {
    return Response.json({ error: 'Failed to create vendor: ' + err.message }, { status: 500 });
  }
}
