#!/bin/bash

# test-ai-receive.sh
# Fetches all messages for AI agent analysis

HOST=${HOST:-"http://localhost:8788"}
HOST=${HOST%/}

echo "AI Agent fetching all messages for analysis from $HOST..."

if [ -z "$AI_AGENT_KEY" ]; then
  echo "Warning: AI_AGENT_KEY is not set. The request will likely fail with 401 Unauthorized."
fi

curl -sL "$HOST/api/ai" \
  -H "Authorization: Bearer $AI_AGENT_KEY" | jq '.'

echo -e "\nDone."
