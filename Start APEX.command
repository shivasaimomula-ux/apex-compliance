#!/bin/bash
# Double-click this file to start the APEX Compliance Platform.
# A Terminal window will open and stay open — that is the server running.
# To stop the app: close that Terminal window.
#
# Default port is 8002 (avoids clash with Stage A on :8000).
# Override with: PORT=8003 ./Start\ APEX.command

cd "/Users/shivasaimomula/Desktop/apex_compliance_platform" || exit 1

PORT="${PORT:-8002}"

clear
echo "============================================================"
echo "   APEX Compliance Platform"
echo "============================================================"
echo ""
echo "Starting the server on port ${PORT}. Keep this window open while you work."
echo "When you're done, just close this window to stop the app."
echo ""

# Free this port if a previous run is still hanging on to it.
for pid in $(lsof -nP -iTCP:"${PORT}" -sTCP:LISTEN -t 2>/dev/null); do kill "$pid" 2>/dev/null; done

# First-time setup: install dependencies if they're missing.
if [ ! -d node_modules ]; then
  echo "First-time setup (this takes about a minute)..."
  npm install
  echo ""
fi

# Open the app in your browser a moment after the server boots.
( sleep 3; open "http://localhost:${PORT}" ) &

echo "Opening APEX in your browser at http://localhost:${PORT} ..."
echo ""
PORT="${PORT}" npm start
