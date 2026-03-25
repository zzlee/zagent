import { requireUser } from '../_lib/session.js';

export async function onRequest(context) {
  const { request, env } = context;
  const user = await requireUser(context);
  if (user instanceof Response) return user;
  if (user.role !== 'ai') return new Response('Forbidden', { status: 403 });

  const url = new URL(request.url);
  const userId = user.id;

  if (request.method === 'GET') {
    const unreadOnly = url.searchParams.get('unread') === 'true';
    const whereClause = unreadOnly ? 'WHERE m.is_read = 0' : '';

    // Grant full data access: Fetch all messages from all rooms
    const { results } = await env.zagent_db.prepare(`
      SELECT m.*, u.name, u.role, r.name as roomName
      FROM messages m
      JOIN users u ON m.user_id = u.id
      JOIN rooms r ON m.room_id = r.id
      ${whereClause}
      ORDER BY m.created_at DESC
      LIMIT 100
    `).all();
    return new Response(JSON.stringify(results), { headers: { 'Content-Type': 'application/json' } });
  }

  if (request.method === 'PATCH') {
    // Mark all unread messages as read
    const { results } = await env.zagent_db.prepare(`
      UPDATE messages SET is_read = 1 WHERE is_read = 0
    `).run();
    return new Response(JSON.stringify({ success: true, count: results?.changes || 0 }), { status: 200 });
  }

  if (request.method === 'POST') {
    const { roomId, content } = await request.json();
    if (!roomId || !content) return new Response('Missing fields', { status: 400 });

    const msgId = crypto.randomUUID();
    await env.zagent_db.prepare(`
      INSERT INTO messages (id, room_id, user_id, content)
      VALUES (?, ?, ?, ?)
    `).bind(msgId, roomId, userId, content).run();

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
