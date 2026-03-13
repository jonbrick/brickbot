#!/bin/bash

# Wrapper for launchd → node sync
# iMessage notifications live here because bash has Messages automation permission (node does not)

NODE="/opt/homebrew/bin/node"
SYNC="/Users/jonbrick/projects/brickbot/cli/sync.js"
PHONE="+14432501647"

send_imessage() {
  osascript -e "tell application \"Messages\"
    set targetService to 1st account whose service type = iMessage
    set targetBuddy to participant \"$PHONE\" of targetService
    send \"$1\" to targetBuddy
  end tell" 2>/dev/null
}

send_mac_notification() {
  osascript -e "display notification \"$2\" with title \"$1\"" 2>/dev/null
}

notify() {
  send_imessage "$2" || send_mac_notification "$1" "$2"
}

"$NODE" "$SYNC" --auto
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
  notify "Brickbot Complete" "Brickbot sync complete"
else
  notify "Brickbot Failed" "Brickbot sync failed (exit $EXIT_CODE). Check logs."
fi

exit $EXIT_CODE
