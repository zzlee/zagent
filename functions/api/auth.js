// functions/api/auth.js
export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  if (url.searchParams.has('code')) {
    // Exchange code for token
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
    await env.DB.prepare(`
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
