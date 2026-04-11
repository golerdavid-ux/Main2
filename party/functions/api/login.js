import {
  sha256Hex,
  timingSafeEqual,
  buildAuthCookie,
} from './_auth.js';

/**
 * POST /api/login
 * Body: { password: string }
 *
 * Hashes the submitted password with SHA-256 and compares it constant-time
 * against PARTY_PASSWORD_HASH. On success, sets an HttpOnly cookie.
 * Adds a small fixed delay on failure to slow down brute forcing.
 */
export async function onRequestPost(context) {
  const expectedHash = context.env.PARTY_PASSWORD_HASH || '';
  if (!expectedHash) {
    return Response.json(
      { error: 'Server misconfigured: PARTY_PASSWORD_HASH not set' },
      { status: 500 },
    );
  }

  let body;
  try {
    body = await context.request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const password = typeof body?.password === 'string' ? body.password : '';
  if (!password) {
    return Response.json({ error: 'Password required' }, { status: 400 });
  }

  const hash = await sha256Hex(password);

  if (!timingSafeEqual(hash, expectedHash)) {
    // Fixed ~300ms delay to blunt guessing.
    await new Promise((r) => setTimeout(r, 300));
    return Response.json({ error: 'Incorrect password' }, { status: 401 });
  }

  // 30 days
  const maxAge = 60 * 60 * 24 * 30;
  const cookie = buildAuthCookie(context.request, hash, maxAge);

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': cookie,
    },
  });
}
