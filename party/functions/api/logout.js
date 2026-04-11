import { buildClearAuthCookie } from './_auth.js';

/**
 * POST /api/logout — clears the party_auth cookie.
 */
export async function onRequestPost(context) {
  const cookie = buildClearAuthCookie(context.request);
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': cookie,
    },
  });
}
