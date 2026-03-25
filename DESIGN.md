# Design Document: Cloudflare Chat App with AI Agent

## 1. Project Overview
A modern, real-time chat application hosted on Cloudflare Pages/Workers using D1 for persistence and Google OAuth2 for authentication. It features a built-in AI agent that interacts as a regular user but has full data access.

## 2. Tech Stack
- **Frontend**: React (TypeScript) with Vanilla CSS for a clean, modern aesthetic.
- **Backend**: Cloudflare Pages Functions (Worker-based API).
- **Database**: Cloudflare D1 (SQLite-compatible edge database).
- **Authentication**: Google OAuth2 (Manual implementation via Pages Functions).
- **Developer Tools**: Node.js, Wrangler CLI.

## 3. Architecture & Data Flow
- **Authentication**: Users log in via Google. The backend exchanges the OAuth code for a JWT session.
- **Messaging**: REST API endpoints for sending and receiving messages.
- **Real-time (Optional/MVP)**: Polling or Server-Sent Events (SSE) for message updates (Durable Objects could be used for true WebSockets, but for MVP we will focus on REST).
- **AI Agent**: 
  - A special user record in the `users` table.
  - Interacts via a dedicated REST API: `POST /api/ai` and `GET /api/ai`.
  - Authenticated via an `AI_AGENT_KEY` provided in the `Authorization: Bearer <key>` header.
  - Has privileged access to the entire `messages` table for context and can join any room.

## 4. Database Schema (D1)
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  picture TEXT,
  role TEXT DEFAULT 'user', -- 'user' or 'ai'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE rooms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE room_participants (
  room_id TEXT,
  user_id TEXT,
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (room_id, user_id),
  FOREIGN KEY (room_id) REFERENCES rooms(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE messages (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (room_id) REFERENCES rooms(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

## 5. UI/UX Strategy
- **Style**: Modern, minimalist messaging app. Sidebar for rooms, bubble-based chat history.
- **Visuals**: CSS-based gradients, rounded corners, and smooth transitions.
- **Responsiveness**: Mobile-first design.

## 6. Implementation Plan
1. **Setup**: Initialize Wrangler project, D1 database, and React app.
2. **Auth**: Implement Google OAuth2 flow in Pages Functions.
3. **Database**: Apply schema migrations to D1.
4. **API**: Create endpoints for rooms, messages, and AI agent interactions.
5. **Frontend**: Build the chat interface and integrate with API.
6. **AI Agent**: Implement the agent's logic (sending/receiving) and provide test scripts.

## 7. AI Agent Test Scripts
- `test-ai-send.sh`: Simulates the AI agent sending a message to a room.
- `test-ai-receive.sh`: Fetches messages for the AI agent to process.

---
**Do you approve of this plan?**
