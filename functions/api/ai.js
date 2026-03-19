// functions/api/ai.js
export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  // AI agent's dedicated user ID
  const AI_USER_ID = 'ai-agent-001';

  if (request.method === 'GET') {
    // Grant full data access: Fetch all messages from all rooms
    const { results } = await env.zagent_db.prepare(`
      SELECT m.*, u.name, u.role, r.name as roomName
      FROM messages m
      JOIN users u ON m.user_id = u.id
      JOIN rooms r ON m.room_id = r.id
      ORDER BY m.created_at DESC
      LIMIT 100
    `).all();
    return new Response(JSON.stringify(results), { headers: { 'Content-Type': 'application/json' } });
  }

  if (request.method === 'POST') {
    const { roomId, content } = await request.json();
    if (!roomId || !content) return new Response('Missing fields', { status: 400 });

    const msgId = crypto.randomUUID();
    await env.zagent_db.prepare(`
      INSERT INTO messages (id, room_id, user_id, content)
      VALUES (?, ?, ?, ?)
    `).bind(msgId, roomId, AI_USER_ID, content).run();

    // Broadcast to WebSocket
    try {
      const id = env.CHAT_ROOM.idFromName(roomId);
      const room = env.CHAT_ROOM.get(id);
      await room.fetch(new Request('http://localhost/broadcast', {
        method: 'POST',
        body: JSON.stringify({ type: 'NEW_MESSAGE', roomId })
      }));
    } catch (e) {
      console.error('Failed to broadcast message:', e);
    }

    return new Response(JSON.stringify({ id: msgId, status: 'sent' }), { status: 201 });
  }

  return new Response('Method not allowed', { status: 405 });
}
