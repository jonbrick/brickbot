#!/usr/bin/env node

/**
 * Sync CLI
 * Runs the full Brickbot pipeline: tokens:refresh → collect → update → summarize → recap → pull
 * Replaces brickbot-daily.sh — called by launchd or manually via `yarn sync`
 *
 * Usage:
 *   yarn sync          # Run full pipeline (interactive where applicable)
 *   yarn sync --auto   # Non-interactive (used by launchd)
 */

require("dotenv").config();
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const autoMode = process.argv.includes("--auto");
const projectDir = path.resolve(__dirname, "..");
const logDir = path.join(projectDir, "local", "logs");
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
  { name: "pull", cmd: `${NODE} cli/pull.js --auto` },
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

function main() {
  // Ensure log directory exists
  fs.mkdirSync(logDir, { recursive: true });

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
        timeout: 5 * 60 * 1000,
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
      log(`ERROR: ${step.name} failed (exit code ${err.status})`);
    }
  }

  log(`=== Done: ${new Date().toLocaleString()} ===\n`);

  if (errors.length > 0) {
    const failedSteps = errors.join(", ");
    console.error(`Failed steps: ${failedSteps}`);
    process.exit(1);
  }
}

main();
