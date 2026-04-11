#!/usr/bin/env node

/**
 * Sync CLI
 * Runs the full Brickbot pipeline: tokens:refresh → collect → update → summarize → recap → push → pull
 * Called by launchd or manually via `yarn sync`
 *
 * Usage:
 *   yarn sync          # Run full pipeline (interactive where applicable)
 *   yarn sync --auto   # Non-interactive (used by launchd)
 */

// NOTE: Do NOT load dotenv here. Each step runs as a child process that inherits
// this process's env. dotenv won't override existing vars, so if we load .env here,
// child processes get stale tokens even after tokens:refresh updates .env.
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const autoMode = process.argv.includes("--auto");
const projectDir = path.resolve(__dirname, "..");
const logDir = path.join(projectDir, "local", "logs");
const lockFile = path.join(projectDir, "local", "sync.lock");
const today = new Date().toISOString().slice(0, 10);
const logFile = path.join(logDir, `daily-${today}.log`);

// Use process.execPath so launchd child processes find node
// (launchd's shell PATH doesn't include /opt/homebrew/bin)
const NODE = process.execPath;

const STEPS = [
  { name: "tokens:refresh", cmd: `${NODE} cli/tokens/refresh.js --auto` },
  { name: "collect", cmd: `${NODE} cli/collect-data.js --auto` },
  { name: "update", cmd: `${NODE} cli/update-calendar.js --auto` },
  { name: "summarize", cmd: `${NODE} cli/summarize-week.js --auto` },
  { name: "recap", cmd: `${NODE} cli/recap-month.js --auto` },
  { name: "push", cmd: `${NODE} cli/push.js --auto` },
  { name: "pull", cmd: `${NODE} cli/pull.js --auto` },
  { name: "vault-sync", cmd: `${NODE} cli/vault-sync.js --auto` },
];

function log(message) {
  const line = message + "\n";
  if (autoMode) {
    fs.appendFileSync(logFile, line);
  } else {
    process.stdout.write(line);
  }
}

function cleanOldLogs() {
  try {
    const files = fs.readdirSync(logDir).filter((f) => f.startsWith("daily-") && f.endsWith(".log"));
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    for (const file of files) {
      const filePath = path.join(logDir, file);
      const stat = fs.statSync(filePath);
      if (stat.mtimeMs < cutoff) {
        fs.unlinkSync(filePath);
      }
    }
  } catch {
    // Ignore cleanup errors
  }
}


function sendNotification(title, message) {
  try {
    execSync(
      `osascript -e 'display notification "${message}" with title "${title}"'`,
      { stdio: "ignore" }
    );
  } catch {
    log("Warning: Failed to send notification");
  }
}

function isProcessRunning(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function acquireLock() {
  try {
    const content = fs.readFileSync(lockFile, "utf8").trim();
    const pid = parseInt(content, 10);
    if (pid && isProcessRunning(pid)) {
      return pid; // Another sync is running
    }
    // Stale lock — process is gone, clean up and continue
  } catch {
    // No lock file — good to go
  }
  fs.writeFileSync(lockFile, String(process.pid));
  return null;
}

function releaseLock() {
  try {
    fs.unlinkSync(lockFile);
  } catch {
    // Ignore — file may already be gone
  }
}

function main() {
  // Ensure log directory exists
  fs.mkdirSync(logDir, { recursive: true });

  // Prevent concurrent syncs
  const runningPid = acquireLock();
  if (runningPid) {
    const msg = `Sync already running (PID ${runningPid}), skipping.`;
    if (autoMode) {
      fs.appendFileSync(logFile, msg + "\n");
    } else {
      console.log(msg);
    }
    process.exit(0);
  }

  if (autoMode) {
    cleanOldLogs();
  }

  log(`=== Brickbot Run: ${new Date().toLocaleString()} ===`);

  const errors = [];

  for (const step of STEPS) {
    log(`--- ${step.name} ---`);
    try {
      const output = execSync(step.cmd, {
        cwd: projectDir,
        timeout: 3 * 60 * 1000,
        encoding: "utf8",
        stdio: autoMode ? "pipe" : "inherit",
      });
      if (autoMode && output) {
        fs.appendFileSync(logFile, output);
      }
    } catch (err) {
      errors.push(step.name);
      if (autoMode && err.stdout) {
        fs.appendFileSync(logFile, err.stdout);
      }
      if (autoMode && err.stderr) {
        fs.appendFileSync(logFile, err.stderr);
      }
      log(`ERROR: ${step.name} failed (${err.signal ? `signal ${err.signal}` : `exit code ${err.status}`})`);
      if (step.name === "tokens:refresh") {
        log("Bailing: tokens:refresh failed — network or API likely down");
        break;
      }
    }
  }

  log(`=== Done: ${new Date().toLocaleString()} ===\n`);

  releaseLock();

  if (errors.length > 0) {
    const failedSteps = errors.join(", ");
    if (autoMode) {
      sendNotification("Brickbot", `Sync failed: ${failedSteps}. Check logs.`);
    }
    console.error(`Failed steps: ${failedSteps}`);
    process.exit(1);
  } else if (autoMode) {
    sendNotification("Brickbot", "Sync complete");
  }
}

// Clean up lock on unexpected exit (Ctrl+C, kill, etc.)
process.on("SIGINT", () => { releaseLock(); process.exit(130); });
process.on("SIGTERM", () => { releaseLock(); process.exit(143); });

main();
