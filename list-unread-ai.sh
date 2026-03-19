#!/bin/bash

# list-unread-ai.sh
# Fetches all UNREAD messages for AI agent analysis

HOST=${HOST:-"http://localhost:8788"}
HOST=${HOST%/}

echo "AI Agent fetching unread messages for analysis from $HOST..."

curl -sL "$HOST/api/ai?unread=true" | jq '.'

echo -e "\nDone."
