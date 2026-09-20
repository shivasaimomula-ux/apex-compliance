#!/bin/bash
# Double-click this file to start the APEX Compliance Platform (harden-E).
# A Terminal window will open and stay open — that is the server running.
# To stop the app: close that Terminal window.
#
# Audit Finding #16: this launcher must start the harden-e worktree only —
# never the base ~/Desktop/apex_compliance_platform tree.
#
# Default port is 8002 (avoids clash with Stage A on :8000).
# Override with: PORT=8003 ./Start\ APEX.command

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
EXPECTED_MARKER="apex_compliance_platform-harden-e"
BASE_TREE_NAME="apex_compliance_platform"

cd "$SCRIPT_DIR" || exit 1

# Refuse if this .command somehow lives under (or resolves to) the base tree.
TREE_BASENAME="$(basename "$SCRIPT_DIR")"
if [[ "$TREE_BASENAME" == "$BASE_TREE_NAME" ]] || [[ "$SCRIPT_DIR" != *"$EXPECTED_MARKER"* ]]; then
  echo "============================================================" >&2
  echo "   REFUSED: wrong APEX tree" >&2
  echo "============================================================" >&2
  echo "" >&2
  echo "This launcher must run from the harden-E worktree:" >&2
  echo "  …/${EXPECTED_MARKER}/" >&2
  echo "" >&2
  echo "Resolved path:" >&2
  echo "  ${SCRIPT_DIR}" >&2
  echo "" >&2
  echo "Do not use the base Desktop tree (${BASE_TREE_NAME}) for pipeline Stage E." >&2
  exit 1
fi

PORT="${PORT:-8002}"

clear
echo "============================================================"
echo "   APEX Compliance Platform — HARDEN-E"
echo "============================================================"
echo ""
echo "  Tree:  ${SCRIPT_DIR}"
echo "  Build: harden-e (pipeline Stage E)"
echo "  Port:  ${PORT}"
echo ""
echo "Starting the server. Keep this window open while you work."
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

echo "Opening APEX (harden-e) in your browser at http://localhost:${PORT} ..."
echo ""
PORT="${PORT}" npm start
