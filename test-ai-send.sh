#!/bin/bash

# test-ai-send.sh
# Usage: ./test-ai-send.sh "Hello world" [room_id]

CONTENT=${1:-"Hello, I am the AI agent. How can I help you today?"}
ROOM_ID=${2:-"global-chat"}
HOST=${HOST:-"http://localhost:8788"}
HOST=${HOST%/}

echo "AI Agent sending message to room: $ROOM_ID at $HOST"

if [ -z "$AI_AGENT_KEY" ]; then
  echo "Warning: AI_AGENT_KEY is not set. The request will likely fail with 401 Unauthorized."
fi

curl -sL -X POST "$HOST/api/ai" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AI_AGENT_KEY" \
  -d "{\"roomId\": \"$ROOM_ID\", \"content\": \"$CONTENT\"}"

echo -e "\nDone."
