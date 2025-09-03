#!/bin/bash

# Start the server in the background
cd server
echo "Starting server..."
node server.js &
SERVER_PID=$!

# Wait for server to start
sleep 2

# Open the game in the default browser
echo "Opening game in browser..."
open ../index.html

# Function to handle script termination
function cleanup {
  echo "Stopping server..."
  kill $SERVER_PID
  exit 0
}

# Register the cleanup function for when the script is terminated
trap cleanup SIGINT SIGTERM

echo "Server running with PID $SERVER_PID. Press Ctrl+C to stop."

# Keep the script running
while true; do
  sleep 1
done