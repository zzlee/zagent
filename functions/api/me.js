import { requireUser } from '../_lib/session.js';

export async function onRequest(context) {
  const user = await requireUser(context);
  if (user instanceof Response) {
    return user;
  }

  return new Response(JSON.stringify(user), {
    headers: { 'Content-Type': 'application/json' }
  });
}
