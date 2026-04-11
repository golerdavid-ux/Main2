import { getCookie, timingSafeEqual } from './api/_auth.js';

/**
 * Gate all /api/* requests behind the shared-password cookie.
 *
 * Static assets and the React app itself are NOT gated here — the frontend
 * shows a LoginGate whenever any API call returns 401. This also avoids
 * accidentally blocking /favicon.ico and /static/* assets.
 *
 * Unauthenticated endpoints: /api/login, /api/logout, /api/health.
 */
export async function onRequest(context) {
  const url = new URL(context.request.url);
  const path = url.pathname;

  // Only gate /api/* paths.
  if (!path.startsWith('/api/')) {
    return context.next();
  }

  // Public API endpoints.
  if (path === '/api/login' || path === '/api/logout' || path === '/api/health') {
    return context.next();
  }

  const expectedHash = context.env.PARTY_PASSWORD_HASH || '';
  if (!expectedHash) {
    return Response.json(
      { error: 'Server misconfigured: PARTY_PASSWORD_HASH not set' },
      { status: 500 },
    );
  }

  const cookieHeader = context.request.headers.get('Cookie') || '';
  const authCookie = getCookie(cookieHeader, 'party_auth');

  if (!timingSafeEqual(authCookie, expectedHash)) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }

  return context.next();
}
