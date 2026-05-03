#!/usr/bin/env bash
# Schedule pmset wake events for the next N days (default 30).
# Wakes the mini ~5 min before each scheduled job in
# `_automation/_automation-readme.md`'s Schedule table.
#
# Mechanism:
#   - One `pmset repeat` for the daily 6 AM personal wake (recurring)
#   - One `pmset schedule` per pre-job wake per day (one-shot, queued)
#
# Re-run periodically to top up the queue. Idempotent — cancels existing
# schedule before scheduling fresh.
#
# Usage: schedule-pmset-wakes.sh [days]
#   days: number of days to queue (default 30, max ~60 before pmset's queue
#         starts feeling crowded with our 13 daily events)
set -euo pipefail

DAYS="${1:-30}"

# Daily pre-job wakes. Each ~5 min before its scheduled job.
# Keep this list in sync with the Schedule table in
# Brickocampus/_automation/_automation-readme.md
WAKE_TIMES=(
  "06:55:00"  # before 7 AM yarn sync
  "07:55:00"  # before 8 AM Cowork morning-brief + ensure-apps-running
  "08:55:00"  # before 9 AM yarn sync
  "10:55:00"  # before 11 AM yarn sync
  "11:55:00"  # before 12 PM yarn sync
  "12:55:00"  # before 1 PM yarn sync
  "16:55:00"  # before 5 PM yarn sync
  "17:55:00"  # before 6 PM yarn sync
  "18:55:00"  # before 7 PM yarn sync
  "19:55:00"  # before 8 PM yarn sync
  "20:55:00"  # before 9 PM yarn sync + Cowork meeting-processor + ensure-apps-running
  "21:55:00"  # before 10 PM yarn sync
  "22:55:00"  # before 11 PM yarn sync
)

echo "Cancelling existing pmset schedule..."
sudo pmset repeat cancel
sudo pmset schedule cancelall

echo "Setting daily 6 AM personal wake (pmset repeat)..."
sudo pmset repeat wakeorpoweron MTWRFSU 06:00:00

echo "Scheduling ${#WAKE_TIMES[@]} pre-job wakes per day for $DAYS days..."
NOW_EPOCH=$(date +%s)
SCHEDULED=0
SKIPPED_PAST=0

for ((i=0; i<DAYS; i++)); do
  date_str=$(date -v +"${i}"d "+%m/%d/%Y")
  for time in "${WAKE_TIMES[@]}"; do
    target_str="${date_str} ${time}"
    target_epoch=$(date -j -f "%m/%d/%Y %H:%M:%S" "$target_str" +%s)
    if (( target_epoch > NOW_EPOCH )); then
      sudo pmset schedule wakeorpoweron "$target_str" >/dev/null
      SCHEDULED=$((SCHEDULED + 1))
    else
      SKIPPED_PAST=$((SKIPPED_PAST + 1))
    fi
  done
done

echo ""
echo "Done."
echo "  Scheduled: $SCHEDULED wake events"
echo "  Skipped (already past): $SKIPPED_PAST"
echo ""
echo "Verify with: pmset -g sched"
