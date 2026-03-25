import { requireUser } from '../_lib/session.js';

async function userCanAccessRoom(env, userId, roomId) {
  if (roomId === 'global-chat') {
    return true;
  }

  const participant = await env.zagent_db.prepare(`
    SELECT 1 FROM room_participants
    WHERE room_id = ? AND user_id = ?
  `).bind(roomId, userId).first();

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

  if (!roomId) return new Response('roomId required', { status: 400 });
  if (!(await userCanAccessRoom(env, user.id, roomId))) {
    return new Response('Forbidden', { status: 403 });
  }

  const upgradeHeader = request.headers.get('Upgrade');
  if (!upgradeHeader || upgradeHeader !== 'websocket') {
    return new Response('Expected Upgrade: websocket', { status: 426 });
  }

  const id = env.CHAT_ROOM.idFromName(roomId);
  const room = env.CHAT_ROOM.get(id);

  return room.fetch(new Request(request.url, {
    headers: request.headers,
    method: 'GET'
  }));
}
