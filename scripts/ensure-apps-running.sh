#!/usr/bin/env bash
# Ensure Claude Desktop and Obsidian are running. `open -a` is idempotent —
# it foregrounds an already-running app or launches one that isn't.
# Called by com.brickbot.app-launcher.plist before each Cowork event so the
# Cowork tasks (running inside Claude Desktop) and Granola Sync (inside Obsidian)
# can fire reliably.
set -euo pipefail

open -a "Claude" || echo "Warning: failed to open Claude" >&2
open -a "Obsidian" || echo "Warning: failed to open Obsidian" >&2
