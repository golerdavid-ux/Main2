/**
 * GET /api/photos/:key — serve an inspiration photo from R2.
 *
 * The `key` param is the filename part (e.g. "abc123.jpg"). This handler
 * reconstructs the full R2 object key as `inspiration/<key>`.
 */
export async function onRequestGet(context) {
  if (!context.env.PHOTOS) {
    return new Response('R2 bucket not bound', { status: 500 });
  }
  const key = `inspiration/${context.params.key}`;
  const object = await context.env.PHOTOS.get(key);

  if (!object) {
    return new Response('Photo not found', { status: 404 });
  }

  const headers = new Headers();
  headers.set('Content-Type', object.httpMetadata?.contentType || 'image/jpeg');
  headers.set('Cache-Control', 'public, max-age=31536000');

  return new Response(object.body, { headers });
}
