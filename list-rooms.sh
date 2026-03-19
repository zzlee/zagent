#!/bin/bash

# list-rooms.sh
# Usage: ./list-rooms.sh [userId]

USER_ID=${1:-"user123"}
HOST=${HOST:-"http://localhost:8788"}
HOST=${HOST%/}

echo "Fetching chat rooms for user: $USER_ID from $HOST..."

curl -sL "$HOST/api/rooms?userId=$USER_ID" | jq '.'

echo -e "\nDone."
