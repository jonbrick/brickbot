#!/bin/bash
# Brickbot Daily Automation
# Runs yarn collect --auto && yarn update --auto
# Called by launchd (com.brickbot.daily.plist)

set -e

BRICKBOT_DIR="/Users/jonbrick/projects/brickbot"
LOG_DIR="$BRICKBOT_DIR/local/logs"
LOG_FILE="$LOG_DIR/daily-$(date +%Y-%m-%d).log"

# Ensure log directory exists
mkdir -p "$LOG_DIR"

# Log start
echo "=== Brickbot Daily Run: $(date) ===" >> "$LOG_FILE"

# Use the correct node (from nvm/homebrew/etc)
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

cd "$BRICKBOT_DIR"

# Refresh expired OAuth tokens first
echo "--- yarn tokens:refresh --auto ---" >> "$LOG_FILE"
node cli/tokens/refresh.js --auto >> "$LOG_FILE" 2>&1

# Collect data from all APIs
echo "--- yarn collect --auto ---" >> "$LOG_FILE"
node cli/collect-data.js --auto >> "$LOG_FILE" 2>&1

# Sync to Google Calendar
echo "--- yarn update --auto ---" >> "$LOG_FILE"
node cli/update-calendar.js --auto >> "$LOG_FILE" 2>&1

echo "=== Done: $(date) ===" >> "$LOG_FILE"
echo "" >> "$LOG_FILE"
