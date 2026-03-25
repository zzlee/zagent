import { requireUser } from '../_lib/session.js';

async function userCanAccessRoom(env, user, roomId) {
  if (user.role === 'ai' || roomId === 'global-chat') {
    return true;
  }

  const participant = await env.zagent_db.prepare(`
    SELECT 1 FROM room_participants
    WHERE room_id = ? AND user_id = ?
  `).bind(roomId, user.id).first();

  return Boolean(participant);
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const roomId = url.searchParams.get('roomId');
  const user = await requireUser(context);
  if (user instanceof Response) {
    return user;
  }

  if (request.method === 'GET') {
    if (!roomId) return new Response('roomId required', { status: 400 });
    if (!(await userCanAccessRoom(env, user, roomId))) {
      return new Response('Forbidden', { status: 403 });
    }

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
    const { roomId: targetRoomId, content } = await request.json();
    if (!targetRoomId || !content) return new Response('Missing fields', { status: 400 });
    if (!(await userCanAccessRoom(env, user, targetRoomId))) {
      return new Response('Forbidden', { status: 403 });
    }

    const msgId = crypto.randomUUID();
    await env.zagent_db.prepare(`
      INSERT INTO messages (id, room_id, user_id, content)
      VALUES (?, ?, ?, ?)
    `).bind(msgId, targetRoomId, user.id, content).run();

    try {
      const id = env.CHAT_ROOM.idFromName(targetRoomId);
      const room = env.CHAT_ROOM.get(id);
      await room.fetch(new Request('http://localhost/broadcast', {
        method: 'POST',
        body: JSON.stringify({ type: 'NEW_MESSAGE', roomId: targetRoomId })
      }));
    } catch (e) {
      console.error('Failed to broadcast message:', e);
    }

    return new Response(JSON.stringify({ id: msgId }), { status: 201 });
  }

  if (request.method === 'PATCH') {
    const { roomId: targetRoomId } = await request.json();
    if (!targetRoomId) return new Response('Missing fields', { status: 400 });
    if (!(await userCanAccessRoom(env, user, targetRoomId))) {
      return new Response('Forbidden', { status: 403 });
    }

    await env.zagent_db.prepare(`
      UPDATE messages SET is_read = 1
      WHERE room_id = ? AND user_id != ? AND is_read = 0
    `).bind(targetRoomId, user.id).run();

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  }

  return new Response('Method not allowed', { status: 405 });
}
