#!/usr/bin/env bash
# Wrap a command in `caffeinate -i` so the system doesn't idle-sleep during execution.
# When the wrapped command exits (clean, error, killed, anything), caffeinate exits
# and the wakelock releases — idle sleep resumes.
#
# Usage: run-with-wakelock.sh <command> [args...]
set -euo pipefail

if [ "$#" -lt 1 ]; then
  echo "Usage: $0 <command> [args...]" >&2
  exit 64
fi

exec caffeinate -i -- "$@"
