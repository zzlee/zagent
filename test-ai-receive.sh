#!/bin/bash

# test-ai-receive.sh
# Fetches all messages for AI agent analysis

HOST=${HOST:-"http://localhost:8788"}
HOST=${HOST%/}

echo "AI Agent fetching all messages for analysis from $HOST..."

curl -sL "$HOST/api/ai" | jq '.'

echo -e "\nDone."
