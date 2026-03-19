// functions/api/auth.js
export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  // MOCK MODE: If mock=true is passed, or if client ID is not set, use a dummy user
  if (url.searchParams.has('mock') || !env.GOOGLE_CLIENT_ID) {
    const mockProfile = {
      id: 'mock-user-123',
      email: 'tester@example.com',
      name: 'Mock Tester',
      picture: 'https://via.placeholder.com/150'
    };

    await env.zagent_db.prepare(`
      INSERT INTO users (id, email, name, picture)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET name=excluded.name, picture=excluded.picture
    `).bind(mockProfile.id, mockProfile.email, mockProfile.name, mockProfile.picture).run();

    return Response.redirect(`${new URL(request.url).origin}?userId=${mockProfile.id}`, 302);
  }

  if (url.searchParams.has('code')) {
    // ... rest of real Google OAuth code ...
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
    if (tokens.error) return new Response(JSON.stringify(tokens), { status: 400 });

    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const profile = await userResponse.json();

    // Store/Update user in D1
    await env.zagent_db.prepare(`
      INSERT INTO users (id, email, name, picture)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET name=excluded.name, picture=excluded.picture
    `).bind(profile.id, profile.email, profile.name, profile.picture).run();

    // In a real app, set a JWT cookie here. For this demo, we'll redirect with userId.
    return Response.redirect(`${new URL(request.url).origin}?userId=${profile.id}`, 302);
  }

  // Redirect to Google OAuth
  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` + new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: env.GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: 'openid email profile',
  }).toString();

  return Response.redirect(googleAuthUrl, 302);
}
