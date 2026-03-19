// src/chat-worker.ts
import { ChatRoom } from './ChatRoom';

export default {
  async fetch(request: Request, env: any) {
    return new Response('Chat Worker');
  }
};

export { ChatRoom };
