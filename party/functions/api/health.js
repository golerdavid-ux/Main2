/**
 * GET /api/health — liveness check. Unauthenticated (see _middleware.js).
 */
export async function onRequestGet() {
  return Response.json({ ok: true, app: 'party-planning' });
}
