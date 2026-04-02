/**
 * Cloudflare Pages middleware — password-protects the entire site.
 * Set SITE_PASSWORD as an environment variable in Cloudflare Pages settings.
 * Username can be anything; only the password is checked.
 */
export async function onRequest(context) {
  const password = context.env.SITE_PASSWORD;

  // If no password is configured, allow access (so it doesn't lock you out)
  if (!password) {
    return context.next();
  }

  const auth = context.request.headers.get('Authorization');

  if (auth) {
    const [scheme, encoded] = auth.split(' ');
    if (scheme === 'Basic' && encoded) {
      const decoded = atob(encoded);
      const [, pwd] = decoded.split(':');
      if (pwd === password) {
        return context.next();
      }
    }
  }

  return new Response('Authentication required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Money Book", charset="UTF-8"',
    },
  });
}
