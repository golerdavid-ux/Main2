import { generateId, nowIso } from '../_auth.js';

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
  const { results } = await context.env.DB.prepare(
    `SELECT * FROM budget_items ORDER BY category ASC, created_at DESC`,
  ).all();
  return Response.json({ items: results.map(rowToBudget), count: results.length });
}

export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    if (!body?.description || !String(body.description).trim()) {
      return Response.json({ error: 'description is required' }, { status: 400 });
    }
    const id = generateId();
    const now = nowIso();
    await context.env.DB.prepare(
      `INSERT INTO budget_items (id, category, description, estimated_cost, actual_cost,
        paid, vendor_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      id,
      body.category || '',
      String(body.description).trim(),
      Number(body.estimatedCost) || 0,
      Number(body.actualCost) || 0,
      body.paid ? 1 : 0,
      body.vendorId || null,
      now,
    ).run();
    return Response.json({ success: true, id }, { status: 201 });
  } catch (err) {
    return Response.json({ error: 'Failed to create budget item: ' + err.message }, { status: 500 });
  }
}
