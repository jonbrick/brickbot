#!/bin/bash
# Brickbot Daily Automation
# Runs tokens:refresh, collect, update, summarize, recap, pull
# Called by launchd (com.brickbot.daily.plist)
# Sends iMessage on failure

BRICKBOT_DIR="/Users/jonbrick/projects/brickbot"
LOG_DIR="$BRICKBOT_DIR/local/logs"
LOG_FILE="$LOG_DIR/daily-$(date +%Y-%m-%d).log"
NOTIFY_PHONE="+14432501647"

# Ensure log directory exists
mkdir -p "$LOG_DIR"

# Clean logs older than 30 days
find "$LOG_DIR" -name "daily-*.log" -mtime +30 -delete 2>/dev/null

# Log start
echo "=== Brickbot Run: $(date) ===" >> "$LOG_FILE"

# Use the correct node (from nvm/homebrew/etc)
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

cd "$BRICKBOT_DIR"

ERRORS=""

# Step 1: Refresh expired OAuth tokens
echo "--- tokens:refresh --auto ---" >> "$LOG_FILE"
if ! node cli/tokens/refresh.js --auto >> "$LOG_FILE" 2>&1; then
  ERRORS="$ERRORS tokens:refresh"
fi

# Step 2: Collect data from all APIs
echo "--- collect --auto ---" >> "$LOG_FILE"
if ! node cli/collect-data.js --auto >> "$LOG_FILE" 2>&1; then
  ERRORS="$ERRORS collect"
fi

# Step 3: Sync to Google Calendar
echo "--- update --auto ---" >> "$LOG_FILE"
if ! node cli/update-calendar.js --auto >> "$LOG_FILE" 2>&1; then
  ERRORS="$ERRORS update"
fi

# Step 4: Summarize weekly data
echo "--- summarize --auto ---" >> "$LOG_FILE"
if ! node cli/summarize-week.js --auto >> "$LOG_FILE" 2>&1; then
  ERRORS="$ERRORS summarize"
fi

# Step 5: Generate monthly recaps
echo "--- recap --auto ---" >> "$LOG_FILE"
if ! node cli/recap-month.js --auto >> "$LOG_FILE" 2>&1; then
  ERRORS="$ERRORS recap"
fi

# Step 6: Pull Notion data to local JSON
echo "--- pull --auto ---" >> "$LOG_FILE"
if ! node cli/pull.js --auto >> "$LOG_FILE" 2>&1; then
  ERRORS="$ERRORS pull"
fi

echo "=== Done: $(date) ===" >> "$LOG_FILE"
echo "" >> "$LOG_FILE"

# Notify on failure
if [ -n "$ERRORS" ]; then
  osascript -e "tell application \"Messages\"
    set targetService to 1st account whose service type = iMessage
    set targetBuddy to participant \"$NOTIFY_PHONE\" of targetService
    send \"Brickbot failed:$ERRORS. Check $LOG_FILE\" to targetBuddy
  end tell" 2>> "$LOG_FILE"
fi
