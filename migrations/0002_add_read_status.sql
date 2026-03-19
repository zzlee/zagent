-- Add is_read column to messages
ALTER TABLE messages ADD COLUMN is_read INTEGER DEFAULT 0;
