#!/bin/bash

# test-ai-send.sh
# Usage: ./test-ai-send.sh "Hello world" [room_id]

CONTENT=${1:-"Hello, I am the AI agent. How can I help you today?"}
ROOM_ID=${2:-"global-chat"}
HOST=${HOST:-"http://localhost:8788"}

echo "AI Agent sending message to room: $ROOM_ID"

curl -X POST "$HOST/api/ai" \
  -H "Content-Type: application/json" \
  -d "{\"roomId\": \"$ROOM_ID\", \"content\": \"$CONTENT\"}"

echo -e "\nDone."
