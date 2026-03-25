// scripts/poll-unread.js
require('dotenv').config();
// Also load from .dev.vars if it exists (for compatibility with wrangler's local dev)
require('dotenv').config({ path: '.dev.vars' });

const API_BASE = process.env.API_BASE || 'http://localhost:8788';

const AI_AGENT_KEY = process.env.AI_AGENT_KEY;

async function fetchUnreadMessages() {
  if (!AI_AGENT_KEY) {
    throw new Error('AI_AGENT_KEY environment variable is required');
  }
  const response = await fetch(`${API_BASE}/api/ai?unread=true`, {
    headers: {
      'Authorization': `Bearer ${AI_AGENT_KEY}`
    }
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch unread messages: ${response.status}`);
  }
  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

async function markMessagesAsRead() {
  if (!AI_AGENT_KEY) {
    throw new Error('AI_AGENT_KEY environment variable is required');
  }
  const response = await fetch(`${API_BASE}/api/ai`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${AI_AGENT_KEY}`
    }
  });
  if (!response.ok) {
    throw new Error(`Failed to mark messages as read: ${response.status}`);
  }
  return response.json();
}

async function processMessage(message) {
  console.log(`[${message.roomName}] ${message.name}: ${message.content}`);
}

async function poll() {
  console.log(`[${new Date().toISOString()}] Polling for unread messages...`);

  const messages = await fetchUnreadMessages();

  if (messages.length === 0) {
    console.log('No unread messages.');
    return;
  }

  console.log(`Found ${messages.length} unread message(s).`);

  for (const message of messages) {
    await processMessage(message);
  }

  await markMessagesAsRead();
  console.log('Marked all messages as read.');
}

async function main() {
  const intervalMs = parseInt(process.env.POLL_INTERVAL_MS || '5000', 10);

  console.log(`Starting AI agent polling...`);
  console.log(`API Base: ${API_BASE}`);
  console.log(`Poll interval: ${intervalMs}ms`);
  console.log('');

  await poll();

  setInterval(async () => {
    try {
      await poll();
    } catch (error) {
      console.error('Polling error:', error.message);
    }
  }, intervalMs);
}

main().catch(console.error);
