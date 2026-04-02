/**
 * GET /api/photos/:key — serve a photo from R2
 */
export async function onRequestGet(context) {
  const key = `notes/${context.params.key}`;
  const object = await context.env.PHOTOS.get(key);

  if (!object) {
    return new Response('Photo not found', { status: 404 });
  }

  const headers = new Headers();
  headers.set('Content-Type', object.httpMetadata?.contentType || 'image/jpeg');
  headers.set('Cache-Control', 'public, max-age=31536000');

  return new Response(object.body, { headers });
}
