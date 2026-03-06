#!/usr/bin/env node
/**
 * View CLI
 * Starts a local HTTP server and opens the plan viewer in the browser.
 * Needed because fetch() doesn't work with file:// URLs.
 *
 * Usage: yarn view
 */

const http = require("http");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const LOCAL_DIR = path.join(__dirname, "..", "local");
const PORT = 8787;
const DEFAULT_ROUTE = process.argv[2] || "/plan/";

const MIME_TYPES = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".csv": "text/csv",
};

const server = http.createServer((req, res) => {
  // Redirect root to the default route
  if (req.url === "/") {
    res.writeHead(302, { Location: DEFAULT_ROUTE });
    res.end();
    return;
  }

  // Also serve data/ directory for HTML viewers that reference ../../data/
  let filePath;
  if (req.url.startsWith("/data/")) {
    filePath = path.join(__dirname, "..", req.url);
  } else {
    // Map /plan/ to /plan/index.html
    let urlPath = req.url;
    if (urlPath.endsWith("/")) urlPath += "index.html";
    filePath = path.join(LOCAL_DIR, urlPath);
  }

  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || "application/octet-stream";

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    res.writeHead(200, { "Content-Type": contentType });
    res.end(content);
  });
});

server.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log(`Serving local/ at ${url}`);
  console.log("Press Ctrl+C to stop\n");
  execSync(`open ${url}`);
});
