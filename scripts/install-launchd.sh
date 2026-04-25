#!/usr/bin/env bash
set -euo pipefail

# install-launchd.sh — install com.brickbot.daily on the current machine.
# Substitutes $HOME into the plist template and (re)loads via launchctl.
# Safe to re-run; unloads any existing plist before reloading.

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TEMPLATE="$REPO_ROOT/infra/launchd/com.brickbot.daily.plist.template"
DEST="$HOME/Library/LaunchAgents/com.brickbot.daily.plist"

if [ ! -f "$TEMPLATE" ]; then
  echo "Error: template not found at $TEMPLATE" >&2
  exit 1
fi

mkdir -p "$(dirname "$DEST")"

if [ -f "$DEST" ]; then
  echo "Unloading existing $DEST"
  launchctl unload "$DEST" 2>/dev/null || true
fi

sed "s|__HOME__|$HOME|g" "$TEMPLATE" > "$DEST"
chmod 644 "$DEST"

launchctl load "$DEST"

echo "Installed and loaded com.brickbot.daily"
echo "  user: $(whoami)"
echo "  host: $(hostname -s)"
echo "  plist: $DEST"
