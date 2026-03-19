#!/bin/bash

# list-users.sh
# Fetches all users in the system

HOST=${HOST:-"http://localhost:8788"}
# Remove trailing slash if it exists
HOST=${HOST%/}

echo "Fetching all users from $HOST..."

curl -sL "$HOST/api/users" | jq '.'

echo -e "\nDone."
