/**
 * Shared auth helpers for party planning app.
 *
 * Auth model: one shared password.
 *   - PARTY_PASSWORD_HASH env/secret holds hex-encoded SHA-256 of the plaintext.
 *   - /api/login accepts { password }, hashes it, compares with constant-time check,
 *     and on match sets an HttpOnly cookie `party_auth=<hash>`.
 *   - _middleware.js checks that cookie against PARTY_PASSWORD_HASH on every /api/*
 *     request (except /api/login and /api/health).
 */

/** Hex-encoded SHA-256 of the given string, computed via Web Crypto. */
export async function sha256Hex(input) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  const bytes = new Uint8Array(buf);
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

/** Constant-time string equality to avoid leaking length/content via timing. */
export function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/** Extract a named cookie value from a raw `Cookie:` header. */
export function getCookie(cookieHeader, name) {
  if (!cookieHeader) return '';
  const parts = cookieHeader.split(';');
  for (const part of parts) {
    const idx = part.indexOf('=');
    if (idx < 0) continue;
    const key = part.slice(0, idx).trim();
    if (key === name) return decodeURIComponent(part.slice(idx + 1).trim());
  }
  return '';
}

/**
 * Build a Set-Cookie string for the party_auth cookie.
 * Adds Secure only when the request is HTTPS — local `wrangler pages dev`
 * runs over HTTP and would silently drop a Secure cookie.
 */
export function buildAuthCookie(request, value, maxAgeSeconds) {
  const isHttps = new URL(request.url).protocol === 'https:';
  const parts = [
    `party_auth=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAgeSeconds}`,
  ];
  if (isHttps) parts.push('Secure');
  return parts.join('; ');
}

/** Build a Set-Cookie string that immediately clears the party_auth cookie. */
export function buildClearAuthCookie(request) {
  const isHttps = new URL(request.url).protocol === 'https:';
  const parts = [
    'party_auth=',
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
  ];
  if (isHttps) parts.push('Secure');
  return parts.join('; ');
}

/** Generate a short random ID for new DB rows. */
export function generateId() {
  return crypto.randomUUID();
}

/** Current time as an ISO string, our standard created_at format. */
export function nowIso() {
  return new Date().toISOString();
}
