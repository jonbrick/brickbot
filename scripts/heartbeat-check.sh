#!/usr/bin/env bash
set -uo pipefail

# heartbeat-check.sh — verify scheduled tasks landed expected output.
# Run by launchd. Sends an iMessage to ALERT_IMESSAGE_TARGET on miss;
# silent on success.
#
# Schedule:
#   HH:15  — verify the HH:00 brickbot pipeline run (instant local log).
#   07:30  — verify Cowork's morning-brief output landed in today's daily note.
#   21:30  — verify Cowork's meeting-processor wrote a log.md entry.
#
# Cowork checks use HH:30 (not HH:15) to absorb Cowork's randomized launch
# delay + multi-minute runtime — output can land anywhere from HH:00 to ~HH:16.
#
# Design intent: existence-only checks. We verify that expected outputs *exist*
# (today's daily note, ## Brief heading, log.md entry) — never their content.
# Cheap, no false negatives on quality, escalates on miss. Don't extend this
# script to validate output correctness (semantic checks, mtime windows,
# quality scoring) — content-validation expands surface area without enough
# payoff. New checks are fine if they follow the existence pattern.

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
VAULT="$HOME/Documents/Brickocampus"
TODAY=$(date +%Y-%m-%d)
HOUR=$(date +%H)

# Pull just ALERT_IMESSAGE_TARGET from .env (gitignored). Avoid sourcing the
# whole file — brickbot's .env contains lines that don't parse as bash.
if [ -f "$REPO_ROOT/.env" ]; then
  ALERT_IMESSAGE_TARGET=$(grep -E "^ALERT_IMESSAGE_TARGET=" "$REPO_ROOT/.env" \
    | head -1 | cut -d= -f2-)
fi

if [ -z "${ALERT_IMESSAGE_TARGET:-}" ]; then
  echo "ALERT_IMESSAGE_TARGET not set in .env; heartbeat exiting silently." >&2
  exit 0
fi

ALERTS=()

send_imessage() {
  local msg="$1"
  # Escape double quotes for embedding into the AppleScript string literal.
  local escaped="${msg//\"/\\\"}"
  # Write the AppleScript to a temp file rather than passing via -e — modern
  # macOS Messages errors with "Invalid key form" on the inline `to buddy ... of
  # service "iMessage"` form, and shell line-wrapping mangles `-e` chains.
  local script
  script=$(mktemp -t brickbot-imessage)
  cat > "$script" <<APPLESCRIPT
tell application "Messages"
    set theService to 1st service whose service type = iMessage
    set theBuddy to buddy "$ALERT_IMESSAGE_TARGET" of theService
    send "$escaped" to theBuddy
end tell
APPLESCRIPT
  if ! osascript "$script" >/dev/null 2>&1; then
    echo "Failed to send iMessage: $msg" >&2
  fi
  rm -f "$script"
}

check_brickbot_recent() {
  # Verify the most recent brickbot run today completed without errors.
  local LOG="$REPO_ROOT/local/logs/daily-$TODAY.log"
  if [ ! -f "$LOG" ]; then
    ALERTS+=("[brickbot] no daily log for $TODAY at ${HOUR}:15")
    return
  fi

  # Pull the slice from the last "=== Brickbot Run:" header to end-of-file.
  local LAST_RUN
  LAST_RUN=$(awk '/^=== Brickbot Run:/{buf=""} {buf=buf"\n"$0} END{print buf}' "$LOG")

  if [ -z "$LAST_RUN" ]; then
    ALERTS+=("[brickbot] no run header in today's log")
    return
  fi

  # "=== Done:" footer indicates pipeline completed end-to-end.
  if ! grep -q "^=== Done:" <<<"$LAST_RUN"; then
    ALERTS+=("[brickbot] last run never reached === Done === (crashed or hung)")
    return
  fi

  # ERROR: lines indicate step failures. tokens:refresh failures bail the
  # pipeline so we surface those; ditto any other step.
  local ERR_LINES
  ERR_LINES=$(grep -E "^ERROR: [a-z:-]+ failed" <<<"$LAST_RUN" || true)
  if [ -n "$ERR_LINES" ]; then
    local FIRST_ERR
    FIRST_ERR=$(head -1 <<<"$ERR_LINES")
    ALERTS+=("[brickbot] $FIRST_ERR")
  fi
}

check_morning_brief() {
  # Today's daily note should exist and have a populated ## Brief section.
  local NOTE
  NOTE=$(ls "$VAULT/_daily/$TODAY"*.md 2>/dev/null | head -1)
  if [ -z "$NOTE" ]; then
    ALERTS+=("[brickbot] morning-brief: no daily note for $TODAY by 7:30")
    return
  fi
  if ! grep -q "^## Brief" "$NOTE"; then
    ALERTS+=("[brickbot] morning-brief: today's note missing ## Brief")
  fi
}

check_meeting_processor() {
  # Today's run logs an entry like "- **YYYY-MM-DD HH:MM** | meeting-processor | ..."
  if ! grep -q "^- \*\*$TODAY .*meeting-processor" "$VAULT/_automation/cowork/log.md" 2>/dev/null; then
    ALERTS+=("[brickbot] meeting-processor: no log entry for $TODAY by 21:30")
  fi
}

MINUTE=$(date +%M)

# Brickbot pipeline check runs at every HH:15 fire (15 min after the HH:00
# brickbot run; brickbot writes its log on completion, so HH:15 is plenty).
if [ "$MINUTE" = "15" ]; then
  check_brickbot_recent
fi

# Cowork checks run 30 min after each scheduled Cowork task to absorb
# Cowork's randomized launch delay + runtime.
if [ "$HOUR" = "07" ] && [ "$MINUTE" = "30" ]; then
  check_morning_brief
fi

if [ "$HOUR" = "21" ] && [ "$MINUTE" = "30" ]; then
  check_meeting_processor
fi

# One iMessage per failure; phone notifications stay short and scannable.
# Guard the for-loop: bash 3.2 + set -u errors on "${ALERTS[@]}" when empty.
for alert in "${ALERTS[@]+"${ALERTS[@]}"}"; do
  send_imessage "$alert"
done

exit 0
