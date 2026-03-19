-- Schema for Chat App with AI Agent
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  picture TEXT,
  role TEXT DEFAULT 'user', -- 'user' or 'ai'
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rooms (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS room_participants (
  room_id TEXT,
  user_id TEXT,
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (room_id, user_id),
  FOREIGN KEY (room_id) REFERENCES rooms(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (room_id) REFERENCES rooms(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Seed data for AI Agent
INSERT OR IGNORE INTO users (id, email, name, role) VALUES ('ai-agent-001', 'ai@system.local', 'AI Assistant', 'ai');
INSERT OR IGNORE INTO rooms (id, name) VALUES ('global-chat', 'Global Chat');
INSERT OR IGNORE INTO room_participants (room_id, user_id) VALUES ('global-chat', 'ai-agent-001');
