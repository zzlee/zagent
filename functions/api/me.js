// functions/api/me.js
export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const userId = url.searchParams.get('userId');

  if (!userId) return new Response('Unauthorized', { status: 401 });

  const user = await env.zagent_db.prepare(`SELECT * FROM users WHERE id = ?`)
    .bind(userId)
    .first();

  if (!user) return new Response('User not found', { status: 404 });

  return new Response(JSON.stringify(user), { headers: { 'Content-Type': 'application/json' } });
}
