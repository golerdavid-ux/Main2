/**
 * GET /api/dashboard — one round-trip containing the four dashboard cards:
 *   - countdown: party_name, party_date, days until party
 *   - budget: totals, spent, category breakdown
 *   - tasks: open/done counts, next 5 upcoming
 *   - deadlines: tasks due within 14 days + unpaid vendor balances
 */
export async function onRequestGet(context) {
  const db = context.env.DB;

  const [settingsRes, tasksRes, budgetRes, vendorsRes] = await Promise.all([
    db.prepare('SELECT key, value FROM settings').all(),
    db.prepare(
      `SELECT id, title, due_date, assignee, status
       FROM tasks
       ORDER BY
         CASE WHEN due_date = '' THEN 1 ELSE 0 END,
         due_date ASC,
         created_at DESC`,
    ).all(),
    db.prepare(
      `SELECT category, estimated_cost, actual_cost, paid FROM budget_items`,
    ).all(),
    db.prepare(
      `SELECT id, name, category, deposit_amount, balance_amount, deposit_paid
       FROM vendors`,
    ).all(),
  ]);

  // --- Settings (flattened) ---
  const settings = {};
  for (const row of settingsRes.results) settings[row.key] = row.value || '';

  // --- Countdown ---
  let daysUntil = null;
  if (settings.party_date) {
    const partyDate = new Date(settings.party_date + 'T00:00:00Z');
    if (!isNaN(partyDate.getTime())) {
      const today = new Date();
      const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
      const diffMs = partyDate.getTime() - todayUtc;
      daysUntil = Math.round(diffMs / 86400000);
    }
  }

  // --- Budget totals + category breakdown ---
  let totalEstimated = 0;
  let totalActual = 0;
  let totalPaid = 0;
  const categoryMap = {};
  for (const row of budgetRes.results) {
    const est = Number(row.estimated_cost) || 0;
    const act = Number(row.actual_cost) || 0;
    totalEstimated += est;
    totalActual += act;
    if (row.paid) totalPaid += act;
    const cat = row.category || 'uncategorized';
    if (!categoryMap[cat]) categoryMap[cat] = { category: cat, estimated: 0, actual: 0 };
    categoryMap[cat].estimated += est;
    categoryMap[cat].actual += act;
  }
  const budgetByCategory = Object.values(categoryMap).sort((a, b) => b.actual - a.actual);

  // --- Task counts + upcoming ---
  let openCount = 0;
  let doneCount = 0;
  const upcoming = [];
  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);
  const in14 = new Date(today.getTime() + 14 * 86400000).toISOString().slice(0, 10);

  for (const row of tasksRes.results) {
    if (row.status === 'done') {
      doneCount += 1;
    } else {
      openCount += 1;
      if (upcoming.length < 5) {
        upcoming.push({
          id: row.id,
          title: row.title,
          dueDate: row.due_date || '',
          assignee: row.assignee || '',
        });
      }
    }
  }

  // --- Deadlines feed (open tasks due <= 14 days out + unpaid vendor balances) ---
  const deadlines = [];
  for (const row of tasksRes.results) {
    if (row.status !== 'open') continue;
    if (!row.due_date) continue;
    if (row.due_date < todayIso) {
      deadlines.push({
        kind: 'task',
        id: row.id,
        label: row.title,
        date: row.due_date,
        overdue: true,
      });
    } else if (row.due_date <= in14) {
      deadlines.push({
        kind: 'task',
        id: row.id,
        label: row.title,
        date: row.due_date,
        overdue: false,
      });
    }
  }
  for (const row of vendorsRes.results) {
    const balance = Number(row.balance_amount) || 0;
    const deposit = Number(row.deposit_amount) || 0;
    if (balance > 0) {
      deadlines.push({
        kind: 'vendor_balance',
        id: row.id,
        label: `${row.name} balance due`,
        amount: balance,
      });
    }
    if (deposit > 0 && !row.deposit_paid) {
      deadlines.push({
        kind: 'vendor_deposit',
        id: row.id,
        label: `${row.name} deposit unpaid`,
        amount: deposit,
      });
    }
  }

  return Response.json({
    settings,
    countdown: {
      partyName: settings.party_name || '',
      partyDate: settings.party_date || '',
      venueHeadline: settings.venue_headline || '',
      daysUntil,
    },
    budget: {
      estimated: round2(totalEstimated),
      actual: round2(totalActual),
      paid: round2(totalPaid),
      byCategory: budgetByCategory.map((c) => ({
        category: c.category,
        estimated: round2(c.estimated),
        actual: round2(c.actual),
      })),
    },
    tasks: {
      openCount,
      doneCount,
      upcoming,
    },
    deadlines,
  });
}

function round2(n) {
  return Math.round(n * 100) / 100;
}
