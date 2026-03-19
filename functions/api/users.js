// functions/api/users.js
export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 });
  }

  const { results } = await env.zagent_db.prepare(`
    SELECT id, name, email, picture, role, created_at
    FROM users
    ORDER BY created_at DESC
  `).all();

  return new Response(JSON.stringify(results), { 
    headers: { 'Content-Type': 'application/json' } 
  });
}
