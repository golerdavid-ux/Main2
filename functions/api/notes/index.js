import { analyzeNote, generateId } from '../_currency.js';

/**
 * GET /api/notes — list all notes
 */
export async function onRequestGet(context) {
  const db = context.env.DB;
  const { results } = await db.prepare(`SELECT id, denomination, series_year, note_type,
    serial_number, treasurer_signature, secretary_signature, friedberg_number,
    is_star_note, fancy_serials, errors, grade, grader, cert_number,
    grading_comments, estimated_value, cost_paid, photo_front_key, photo_back_key,
    CASE WHEN photo_front_base64 != '' THEN 1 ELSE 0 END as has_photo_front,
    CASE WHEN photo_back_base64 != '' THEN 1 ELSE 0 END as has_photo_back,
    flags, user_notes, date_added FROM notes ORDER BY date_added DESC`).all();

  const notes = results.map(row => ({
    id: row.id,
    denomination: row.denomination,
    seriesYear: row.series_year,
    noteType: row.note_type || '',
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
    photoFrontKey: row.photo_front_key,
    photoBackKey: row.photo_back_key,
    hasPhotoFront: !!row.has_photo_front,
    hasPhotoBack: !!row.has_photo_back,
    flags: JSON.parse(row.flags || '[]'),
    notes: row.user_notes,
    dateAdded: row.date_added,
  }));

  return Response.json({ notes, count: notes.length });
}

/**
 * POST /api/notes — add a new note (multipart form with optional front/back photos)
 */
export async function onRequestPost(context) {
  try {
    const id = generateId();
    let noteData = {};
    let photoFrontFile = null;
    let photoBackFile = null;

    const contentType = context.request.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await context.request.formData();
      for (const [key, value] of formData.entries()) {
        if (key === 'photoFront' && value instanceof File) {
          photoFrontFile = value;
        } else if (key === 'photoBack' && value instanceof File) {
          photoBackFile = value;
        } else {
          noteData[key] = value;
        }
      }
    } else {
      noteData = await context.request.json();
    }

    let errors = noteData.errors || '[]';
    if (typeof errors === 'string') {
      try { errors = JSON.parse(errors); } catch { errors = errors ? [errors] : []; }
    }

    const analysis = analyzeNote({
      denomination: noteData.denomination,
      seriesYear: noteData.seriesYear,
      serial_number: noteData.serialNumber,
      errors,
    });

    let photoFrontKey = '';
    let photoBackKey = '';
    let photoFrontBase64 = '';
    let photoBackBase64 = '';

    if (photoFrontFile) {
      photoFrontKey = `notes/${id}-front.jpg`;
      const buffer = await photoFrontFile.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      photoFrontBase64 = btoa(binary);
    }

    if (photoBackFile) {
      photoBackKey = `notes/${id}-back.jpg`;
      const buffer = await photoBackFile.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      photoBackBase64 = btoa(binary);
    }

    const friedberg = analysis.friedbergNumber || noteData.friedbergNumber || '';
    const now = new Date().toISOString();

    await context.env.DB.prepare(`
      INSERT INTO notes (id, denomination, series_year, note_type, serial_number,
        treasurer_signature, secretary_signature, friedberg_number,
        is_star_note, fancy_serials, errors, grade, grader, cert_number,
        grading_comments, estimated_value, cost_paid, photo_front_key,
        photo_back_key, photo_front_base64, photo_back_base64,
        flags, user_notes, date_added)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      noteData.denomination || '',
      noteData.seriesYear || '',
      noteData.noteType || '',
      noteData.serialNumber || '',
      noteData.treasurerSignature || '',
      noteData.secretarySignature || '',
      friedberg,
      analysis.isStarNote ? 1 : 0,
      JSON.stringify(analysis.fancySerials),
      JSON.stringify(errors),
      noteData.grade || '',
      noteData.grader || '',
      noteData.certNumber || '',
      noteData.gradingComments || '',
      noteData.estimatedValue || '',
      noteData.costPaid || '',
      photoFrontKey,
      photoBackKey,
      photoFrontBase64,
      photoBackBase64,
      JSON.stringify(analysis.flags),
      noteData.notes || '',
      now,
    ).run();

    return Response.json({
      success: true,
      message: "That's another one for your collection! I've put it in your Money Book for you.",
      note: { id, denomination: noteData.denomination, seriesYear: noteData.seriesYear, friedbergNumber: friedberg, flags: analysis.flags },
    }, { status: 201 });

  } catch (error) {
    return Response.json({ error: 'Failed to add note: ' + error.message }, { status: 500 });
  }
}
