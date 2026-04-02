import { analyzeNote, generateId } from '../_currency.js';

/**
 * POST /api/notes/batch — save multiple notes at once
 */
export async function onRequestPost(context) {
  try {
    const { notes } = await context.request.json();

    if (!Array.isArray(notes) || notes.length === 0) {
      return Response.json({ error: 'No notes provided' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const saved = [];

    for (const noteData of notes) {
      const id = generateId();

      let errors = noteData.errors || [];
      if (typeof errors === 'string') {
        try { errors = JSON.parse(errors); } catch { errors = errors ? [errors] : []; }
      }

      const analysis = analyzeNote({
        denomination: noteData.denomination,
        seriesYear: noteData.seriesYear,
        serial_number: noteData.serialNumber,
        errors,
      });

      const friedberg = analysis.friedbergNumber || noteData.friedbergNumber || '';

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
        '',
        '',
        '',
        '',
        JSON.stringify(analysis.flags),
        noteData.notes || '',
        now,
      ).run();

      saved.push({
        id,
        denomination: noteData.denomination,
        seriesYear: noteData.seriesYear,
        friedbergNumber: friedberg,
        flags: analysis.flags,
      });
    }

    return Response.json({
      success: true,
      message: `Added ${saved.length} note${saved.length !== 1 ? 's' : ''} to your Money Book!`,
      notes: saved,
    }, { status: 201 });

  } catch (error) {
    return Response.json({ error: 'Failed to save batch: ' + error.message }, { status: 500 });
  }
}
