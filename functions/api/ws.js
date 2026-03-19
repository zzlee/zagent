// functions/api/ws.js
export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const roomId = url.searchParams.get('roomId');

  if (!roomId) return new Response('roomId required', { status: 400 });

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
