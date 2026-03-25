const SESSION_COOKIE = 'zagent_session';
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;

function parseCookies(request) {
  const cookieHeader = request.headers.get('Cookie') || '';
  return cookieHeader.split(';').reduce((cookies, part) => {
    const [rawName, ...rawValue] = part.trim().split('=');
    if (!rawName) return cookies;
    cookies[rawName] = decodeURIComponent(rawValue.join('='));
    return cookies;
  }, {});
}

function getCookieOptions(request, maxAge = SESSION_TTL_MS / 1000) {
  const url = new URL(request.url);
  const parts = [
    `${SESSION_COOKIE}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAge}`
  ];

  if (url.protocol === 'https:') {
    parts.push('Secure');
  }

  return parts;
}

export async function createUserSession(env, userId) {
  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();

  await env.zagent_db.prepare(`
    INSERT INTO sessions (id, user_id, expires_at)
    VALUES (?, ?, ?)
  `).bind(sessionId, userId, expiresAt).run();

  return { sessionId, expiresAt };
}

export function createSessionCookie(request, sessionId) {
  const parts = getCookieOptions(request);
  parts[0] = `${SESSION_COOKIE}=${encodeURIComponent(sessionId)}`;
  return parts.join('; ');
}

export function createExpiredSessionCookie(request) {
  const parts = getCookieOptions(request, 0);
  parts.push('Expires=Thu, 01 Jan 1970 00:00:00 GMT');
  return parts.join('; ');
}

export async function getSession(env, request) {
  const cookies = parseCookies(request);
  const sessionId = cookies[SESSION_COOKIE];

  if (!sessionId) return null;

  const session = await env.zagent_db.prepare(`
    SELECT s.id, s.user_id, s.expires_at, u.name, u.email, u.picture, u.role
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.id = ?
  `).bind(sessionId).first();

  if (!session) return null;

  const expiresAt = new Date(session.expires_at).getTime();
  if (Number.isNaN(expiresAt) || expiresAt <= Date.now()) {
    await env.zagent_db.prepare('DELETE FROM sessions WHERE id = ?').bind(sessionId).run();
    return null;
  }

  return {
    id: session.id,
    user: {
      id: session.user_id,
      name: session.name,
      email: session.email,
      picture: session.picture,
      role: session.role
    }
  };
}

export async function deleteSession(env, request) {
  const cookies = parseCookies(request);
  const sessionId = cookies[SESSION_COOKIE];

  if (sessionId) {
    await env.zagent_db.prepare('DELETE FROM sessions WHERE id = ?').bind(sessionId).run();
  }
}

export async function requireUser(context) {
  const session = await getSession(context.env, context.request);
  if (!session) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  return session.user;
}
