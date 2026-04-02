/**
 * Cloudflare Pages middleware — pass-through (password protection disabled).
 */
export async function onRequest(context) {
  return context.next();
}
