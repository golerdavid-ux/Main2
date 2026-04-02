/**
 * GET /api/photos/note/:noteId/:side
 * Serve a photo stored as base64 in D1.
 * side = "front" or "back"
 */
export async function onRequestGet(context) {
  const { noteId, side } = context.params;

  if (side !== 'front' && side !== 'back') {
    return new Response('Not found', { status: 404 });
  }

  const column = side === 'front' ? 'photo_front_base64' : 'photo_back_base64';

  const row = await context.env.DB.prepare(
    `SELECT ${column} FROM notes WHERE id = ?`
  ).bind(noteId).first();

  if (!row || !row[column]) {
    return new Response('Photo not found', { status: 404 });
  }

  const base64 = row[column];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return new Response(bytes, {
    headers: {
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
