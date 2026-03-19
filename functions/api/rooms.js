// functions/api/rooms.js
export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const userId = url.searchParams.get('userId');

  if (request.method === 'GET') {
    if (!userId) return new Response('userId required', { status: 400 });

    // Fetch all public rooms + private rooms where the user is a participant
    const { results: publicRooms } = await env.zagent_db.prepare(`
      SELECT * FROM rooms WHERE id = 'global-chat'
    `).all();

    const { results: privateRooms } = await env.zagent_db.prepare(`
      SELECT r.* FROM rooms r
      JOIN room_participants rp ON r.id = rp.room_id
      WHERE rp.user_id = ? AND r.id != 'global-chat'
    `).bind(userId).all();

    // Check if user has an AI private room, if not, we'll suggest creating one or just return it if it exists
    const aiRoomId = `ai-private-${userId}`;
    const aiRoom = await env.zagent_db.prepare(`SELECT * FROM rooms WHERE id = ?`).bind(aiRoomId).first();
    
    let results = [...publicRooms, ...privateRooms];
    if (aiRoom && !privateRooms.find(r => r.id === aiRoomId)) {
      results.push(aiRoom);
    }

    return new Response(JSON.stringify(results), { headers: { 'Content-Type': 'application/json' } });
  }

  if (request.method === 'POST') {
    const { name, userId: creatorId, isAiPrivate } = await request.json();
    
    if (isAiPrivate && creatorId) {
      const roomId = `ai-private-${creatorId}`;
      const existing = await env.zagent_db.prepare(`SELECT * FROM rooms WHERE id = ?`).bind(roomId).first();
      
      if (!existing) {
        await env.zagent_db.prepare(`INSERT INTO rooms (id, name) VALUES (?, ?)`).bind(roomId, 'AI Assistant (Private)').run();
        await env.zagent_db.prepare(`INSERT INTO room_participants (room_id, user_id) VALUES (?, ?)`).bind(roomId, creatorId).run();
        await env.zagent_db.prepare(`INSERT INTO room_participants (room_id, user_id) VALUES (?, ?)`).bind(roomId, 'ai-agent-001').run();
      }
      return new Response(JSON.stringify({ id: roomId, name: 'AI Assistant (Private)' }), { status: 201 });
    }

    if (!name) return new Response('Room name required', { status: 400 });

    const roomId = crypto.randomUUID();
    await env.zagent_db.prepare(`INSERT INTO rooms (id, name) VALUES (?, ?)`).bind(roomId, name).run();
    if (creatorId) {
       await env.zagent_db.prepare(`INSERT INTO room_participants (room_id, user_id) VALUES (?, ?)`).bind(roomId, creatorId).run();
    }

    return new Response(JSON.stringify({ id: roomId, name }), { status: 201 });
  }

  return new Response('Method not allowed', { status: 405 });
}
