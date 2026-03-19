#!/bin/bash

# test-ai-receive.sh
# Fetches all messages for AI agent analysis

HOST=${HOST:-"http://localhost:8788"}

echo "AI Agent fetching all messages for analysis..."

curl -s "$HOST/api/ai" | jq '.'

echo -e "\nDone."
