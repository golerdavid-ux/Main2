import { analyzeNote } from '../_currency.js';

/**
 * POST /api/notes/analyze — analyze a note without saving
 */
export async function onRequestPost(context) {
  const body = await context.request.json();
  const analysis = analyzeNote(body);
  return Response.json(analysis);
}
