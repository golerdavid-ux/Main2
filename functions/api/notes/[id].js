import { analyzeNote } from '../_currency.js';

function rowToNote(row) {
  return {
    id: row.id,
    denomination: row.denomination,
    seriesYear: row.series_year,
    serialNumber: row.serial_number,
    treasurerSignature: row.treasurer_signature,
    secretarySignature: row.secretary_signature,
    friedbergNumber: row.friedberg_number,
    isStarNote: !!row.is_star_note,
    fancySerials: JSON.parse(row.fancy_serials || '[]'),
    errors: JSON.parse(row.errors || '[]'),
    grade: row.grade,
    grader: row.grader,
    certNumber: row.cert_number,
    gradingComments: row.grading_comments,
    estimatedValue: row.estimated_value,
    costPaid: row.cost_paid,
    photoKey: row.photo_key,
    flags: JSON.parse(row.flags || '[]'),
    notes: row.user_notes,
    dateAdded: row.date_added,
  };
}

/**
 * GET /api/notes/:id
 */
export async function onRequestGet(context) {
  const id = context.params.id;
  const row = await context.env.DB.prepare('SELECT * FROM notes WHERE id = ?').bind(id).first();
  if (!row) return Response.json({ error: 'Note not found' }, { status: 404 });
  return Response.json(rowToNote(row));
}

/**
 * PUT /api/notes/:id
 */
export async function onRequestPut(context) {
  try {
    const id = context.params.id;
    const existing = await context.env.DB.prepare('SELECT * FROM notes WHERE id = ?').bind(id).first();
    if (!existing) return Response.json({ error: 'Note not found' }, { status: 404 });

    let updates = {};
    let photoFile = null;
    const contentType = context.request.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await context.request.formData();
      for (const [key, value] of formData.entries()) {
        if (key === 'photo' && value instanceof File) {
          photoFile = value;
        } else {
          updates[key] = value;
        }
      }
    } else {
      updates = await context.request.json();
    }

    let errors = updates.errors || existing.errors || '[]';
    if (typeof errors === 'string') {
      try { errors = JSON.parse(errors); } catch { errors = errors ? [errors] : []; }
    }

    const denomination = updates.denomination || existing.denomination;
    const seriesYear = updates.seriesYear || existing.series_year;
    const serialNumber = updates.serialNumber || existing.serial_number;

    const analysis = analyzeNote({ denomination, seriesYear, serial_number: serialNumber, errors });

    let photoKey = existing.photo_key;
    if (photoFile && context.env.PHOTOS) {
      const ext = photoFile.name.split('.').pop() || 'jpg';
      photoKey = `notes/${id}.${ext}`;
      await context.env.PHOTOS.put(photoKey, photoFile.stream(), {
        httpMetadata: { contentType: photoFile.type },
      });
    }

    const friedberg = analysis.friedbergNumber || updates.friedbergNumber || existing.friedberg_number;

    await context.env.DB.prepare(`
      UPDATE notes SET denomination=?, series_year=?, serial_number=?,
        treasurer_signature=?, secretary_signature=?, friedberg_number=?,
        is_star_note=?, fancy_serials=?, errors=?, grade=?, grader=?,
        cert_number=?, grading_comments=?, estimated_value=?, cost_paid=?,
        photo_key=?, flags=?, user_notes=?
      WHERE id=?
    `).bind(
      denomination,
      seriesYear,
      serialNumber,
      updates.treasurerSignature || existing.treasurer_signature,
      updates.secretarySignature || existing.secretary_signature,
      friedberg,
      analysis.isStarNote ? 1 : 0,
      JSON.stringify(analysis.fancySerials),
      JSON.stringify(errors),
      updates.grade || existing.grade,
      updates.grader || existing.grader,
      updates.certNumber || existing.cert_number,
      updates.gradingComments || existing.grading_comments,
      updates.estimatedValue || existing.estimated_value,
      updates.costPaid || existing.cost_paid,
      photoKey,
      JSON.stringify(analysis.flags),
      updates.notes || existing.user_notes,
      id,
    ).run();

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: 'Failed to update: ' + error.message }, { status: 500 });
  }
}

/**
 * DELETE /api/notes/:id
 */
export async function onRequestDelete(context) {
  const id = context.params.id;
  const existing = await context.env.DB.prepare('SELECT * FROM notes WHERE id = ?').bind(id).first();
  if (!existing) return Response.json({ error: 'Note not found' }, { status: 404 });

  // Delete photo from R2 if exists
  if (existing.photo_key && context.env.PHOTOS) {
    try { await context.env.PHOTOS.delete(existing.photo_key); } catch {}
  }

  await context.env.DB.prepare('DELETE FROM notes WHERE id = ?').bind(id).run();
  return Response.json({ success: true, message: 'Note deleted' });
}
