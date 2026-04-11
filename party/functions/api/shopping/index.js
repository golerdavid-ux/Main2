import { generateId, nowIso } from '../_auth.js';

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
  const { results } = await context.env.DB.prepare(
    `SELECT * FROM shopping_items ORDER BY purchased ASC, store ASC, created_at DESC`,
  ).all();
  return Response.json({ items: results.map(rowToShopping), count: results.length });
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
      `INSERT INTO shopping_items (id, name, store, quantity, purchased, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      id,
      String(body.name).trim(),
      body.store || '',
      body.quantity || '',
      body.purchased ? 1 : 0,
      body.notes || '',
      now,
    ).run();
    return Response.json({ success: true, id }, { status: 201 });
  } catch (err) {
    return Response.json({ error: 'Failed to create shopping item: ' + err.message }, { status: 500 });
  }
}
