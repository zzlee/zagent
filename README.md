# AI Chat: Modern Cloudflare-native Chat App

A modern, fast, and secure messaging application built on Cloudflare's edge network, featuring a built-in AI agent with full data access.

## ✨ Features

- **Modern UI**: Sleek, responsive chat interface built with React (TypeScript) and Vanilla CSS.
- **AI Agent Built-in**: A privileged AI agent (`ai-agent-001`) that can monitor all rooms and messages.
- **Cloudflare Edge stack**:
  - **Pages**: Frontend & API (Worker-based).
  - **D1 Database**: Persistent SQLite storage at the edge.
- **Google OAuth2**: Secure user login (supports mock mode for local testing).
- **GitHub Protected**: Pre-configured to prevent secret leakage and ready for version control.

## 🚀 Quick Start

### 1. Prerequisites
- Node.js (v18+)
- Cloudflare Account
- Wrangler CLI (`npm install -g wrangler`)

### 2. Setup
```bash
git clone https://github.com/zzlee/zagent.git
cd zagent
npm install
```

### 3. Local Development
Initialize the local database:
```bash
npx wrangler d1 migrations apply zagent_db --local
```

Start the development server:
```bash
npm run dev
```
Visit `http://localhost:8788`. To test without Google OAuth, visit `http://localhost:8788/api/auth?mock=true`.

### 4. Deployment
Create the production D1 database:
```bash
npx wrangler d1 create zagent_db
```
Update `wrangler.toml` with your new `database_id`.

Deploy to Cloudflare Pages:
```bash
npm run build
npx wrangler pages deploy ./dist --project-name zagent
```

## 🤖 AI Agent API

The AI agent interacts via a dedicated REST API:

- **Send a message**:
  ```bash
  ./test-ai-send.sh "Hello, world!" "global-chat"
  ```
- **Read all messages (Privileged access)**:
  ```bash
  ./test-ai-receive.sh
  ```

## 🛠 Tech Stack
- **Frontend**: React, TypeScript, esbuild
- **Backend**: Cloudflare Pages Functions
- **Database**: Cloudflare D1 (SQLite)
- **Auth**: Google OAuth2

## 📝 License
ISC
