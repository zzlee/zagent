// functions/api/rooms.js
export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === 'GET') {
    const { results } = await env.zagent_db.prepare(`SELECT * FROM rooms ORDER BY created_at DESC`).all();
    return new Response(JSON.stringify(results), { headers: { 'Content-Type': 'application/json' } });
  }

  if (request.method === 'POST') {
    const { name } = await request.json();
    if (!name) return new Response('Room name required', { status: 400 });

    const roomId = crypto.randomUUID();
    await env.zagent_db.prepare(`INSERT INTO rooms (id, name) VALUES (?, ?)`).bind(roomId, name).run();

    return new Response(JSON.stringify({ id: roomId, name }), { status: 201 });
  }

  return new Response('Method not allowed', { status: 405 });
}
