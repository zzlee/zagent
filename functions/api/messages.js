// functions/api/messages.js
export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const roomId = url.searchParams.get('roomId');

  if (request.method === 'GET') {
    if (!roomId) return new Response('roomId required', { status: 400 });
    const { results } = await env.zagent_db.prepare(`
      SELECT m.*, u.name, u.picture, u.role
      FROM messages m
      JOIN users u ON m.user_id = u.id
      WHERE m.room_id = ?
      ORDER BY m.created_at ASC
    `).bind(roomId).all();
    return new Response(JSON.stringify(results), { headers: { 'Content-Type': 'application/json' } });
  }

  if (request.method === 'POST') {
    const { userId, roomId, content } = await request.json();
    if (!userId || !roomId || !content) return new Response('Missing fields', { status: 400 });

    const msgId = crypto.randomUUID();
    await env.zagent_db.prepare(`
      INSERT INTO messages (id, room_id, user_id, content)
      VALUES (?, ?, ?, ?)
    `).bind(msgId, roomId, userId, content).run();

    return new Response(JSON.stringify({ id: msgId }), { status: 201 });
  }

  if (request.method === 'PATCH') {
    const { roomId, userId } = await request.json();
    if (!roomId || !userId) return new Response('Missing fields', { status: 400 });

    // Mark messages in the room as read for the current user
    // In this simple app, we mark messages NOT sent by the user as read
    await env.zagent_db.prepare(`
      UPDATE messages SET is_read = 1
      WHERE room_id = ? AND user_id != ? AND is_read = 0
    `).bind(roomId, userId).run();

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  }

  return new Response('Method not allowed', { status: 405 });
}
