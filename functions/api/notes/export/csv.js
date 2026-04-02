/**
 * GET /api/notes/export/csv — export collection as CSV
 */
export async function onRequestGet(context) {
  const { results } = await context.env.DB.prepare('SELECT * FROM notes ORDER BY date_added DESC').all();

  const headers = [
    'ID', 'Denomination', 'Series Year', 'Serial Number',
    'Friedberg #', 'Star Note', 'Fancy Serials', 'Errors',
    'Treasurer', 'Secretary',
    'Grade', 'Grader', 'Cert #', 'Grading Comments',
    'Estimated Value', 'Cost Paid', 'Flags', 'Notes', 'Date Added',
  ];

  const escape = (val) => {
    const str = String(val || '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const parseJSON = (str) => {
    try { return JSON.parse(str || '[]'); } catch { return []; }
  };

  const rows = results.map(r => [
    r.id, r.denomination, r.series_year, r.serial_number,
    r.friedberg_number, r.is_star_note ? 'Yes' : 'No',
    parseJSON(r.fancy_serials).join('; '),
    parseJSON(r.errors).join('; '),
    r.treasurer_signature, r.secretary_signature,
    r.grade, r.grader, r.cert_number, r.grading_comments,
    r.estimated_value, r.cost_paid,
    parseJSON(r.flags).join('; '),
    r.user_notes, r.date_added,
  ]);

  const lines = [headers.map(escape).join(',')];
  for (const row of rows) lines.push(row.map(escape).join(','));

  return new Response(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="MoneyBook.csv"',
    },
  });
}
