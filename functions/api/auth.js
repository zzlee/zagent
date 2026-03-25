import {
  createExpiredSessionCookie,
  createSessionCookie,
  createUserSession,
  deleteSession
} from '../_lib/session.js';

async function upsertUser(env, profile) {
  await env.zagent_db.prepare(`
    INSERT INTO users (id, email, name, picture)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET email=excluded.email, name=excluded.name, picture=excluded.picture
  `).bind(profile.id, profile.email, profile.name, profile.picture).run();
}

async function completeLogin(request, env, profile) {
  await upsertUser(env, profile);
  const { sessionId } = await createUserSession(env, profile.id);

  return new Response(null, {
    status: 302,
    headers: {
      Location: new URL(request.url).origin,
      'Set-Cookie': createSessionCookie(request, sessionId)
    }
  });
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  if (url.searchParams.get('logout') === 'true') {
    await deleteSession(env, request);
    return new Response(null, {
      status: 302,
      headers: {
        Location: url.origin,
        'Set-Cookie': createExpiredSessionCookie(request)
      }
    });
  }

  if (url.searchParams.has('mock') || !env.GOOGLE_CLIENT_ID) {
    return completeLogin(request, env, {
      id: 'mock-user-123',
      email: 'tester@example.com',
      name: 'Mock Tester',
      picture: 'https://via.placeholder.com/150'
    });
  }

  if (url.searchParams.has('code')) {
    const code = url.searchParams.get('code');
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: env.GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await tokenResponse.json();
    if (tokens.error) {
      return new Response(JSON.stringify(tokens), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const profile = await userResponse.json();

    return completeLogin(request, env, profile);
  }

  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` + new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: env.GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: 'openid email profile',
  }).toString();

  return Response.redirect(googleAuthUrl, 302);
}
