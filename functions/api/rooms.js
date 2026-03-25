import { requireUser } from '../_lib/session.js';

export async function onRequest(context) {
  const { request, env } = context;
  const user = await requireUser(context);
  if (user instanceof Response) {
    return user;
  }

  if (request.method === 'GET') {
    if (user.role === 'ai') {
      const { results } = await env.zagent_db.prepare(`SELECT * FROM rooms`).all();
      return new Response(JSON.stringify(results), { headers: { 'Content-Type': 'application/json' } });
    }

    const { results: publicRooms } = await env.zagent_db.prepare(`
      SELECT * FROM rooms WHERE id = 'global-chat'
    `).all();

    const { results: privateRooms } = await env.zagent_db.prepare(`
      SELECT r.* FROM rooms r
      JOIN room_participants rp ON r.id = rp.room_id
      WHERE rp.user_id = ? AND r.id != 'global-chat'
    `).bind(user.id).all();

    const aiRoomId = `ai-private-${user.id}`;
    const aiRoom = await env.zagent_db.prepare(`SELECT * FROM rooms WHERE id = ?`).bind(aiRoomId).first();

    const results = [...publicRooms, ...privateRooms];
    if (aiRoom && !privateRooms.find((room) => room.id === aiRoomId)) {
      results.push(aiRoom);
    }

    return new Response(JSON.stringify(results), { headers: { 'Content-Type': 'application/json' } });
  }

  if (request.method === 'POST') {
    const { name, isAiPrivate } = await request.json();

    if (isAiPrivate) {
      const roomId = `ai-private-${user.id}`;
      const existing = await env.zagent_db.prepare(`SELECT * FROM rooms WHERE id = ?`).bind(roomId).first();

      if (!existing) {
        const aiUser = await env.zagent_db.prepare(`SELECT id FROM users WHERE role = 'ai' LIMIT 1`).first();
        if (!aiUser) return new Response('AI User not found', { status: 500 });

        await env.zagent_db.prepare(`INSERT INTO rooms (id, name) VALUES (?, ?)`).bind(roomId, 'AI Assistant (Private)').run();
        await env.zagent_db.prepare(`INSERT INTO room_participants (room_id, user_id) VALUES (?, ?)`).bind(roomId, user.id).run();
        await env.zagent_db.prepare(`INSERT INTO room_participants (room_id, user_id) VALUES (?, ?)`).bind(roomId, aiUser.id).run();
      }
      return new Response(JSON.stringify({ id: roomId, name: 'AI Assistant (Private)' }), { status: 201 });
    }

    if (!name) return new Response('Room name required', { status: 400 });

    const roomId = crypto.randomUUID();
    await env.zagent_db.prepare(`INSERT INTO rooms (id, name) VALUES (?, ?)`).bind(roomId, name).run();
    await env.zagent_db.prepare(`INSERT INTO room_participants (room_id, user_id) VALUES (?, ?)`).bind(roomId, user.id).run();

    return new Response(JSON.stringify({ id: roomId, name }), { status: 201 });
  }

  return new Response('Method not allowed', { status: 405 });
}
