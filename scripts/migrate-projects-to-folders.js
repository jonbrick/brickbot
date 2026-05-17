#!/usr/bin/env node

/**
 * Migrate project files from flat layout to folder-per-project layout.
 *
 * Before:
 *   work/cortex/projects/Design Engineering/refresh-plugin-styling.md
 *   work/cortex/projects/Design Engineering/refresh-plugin-styling/sources/*.png
 *
 * After:
 *   work/cortex/projects/Design Engineering/Refresh plugin styling/refresh-plugin-styling.md
 *   work/cortex/projects/Design Engineering/Refresh plugin styling/sources/*.png
 *
 * Folder name derivation (per pd-vs-de-conventions.md § Folder name derivation):
 *   - Work projects: `linear_name:` verbatim, with `[Design] ` prefix stripped
 *   - Personal projects: `notion_name:` verbatim
 *   - Fallback (vault-only, missing field): sentence-case the filename slug
 *
 * Skips:
 *   - Area pages (frontmatter type: product-area or type: domain) — stay flat
 *   - Files in _work-project-triage/ and _personal-project-triage/ — stay flat
 *   - Files already inside a project folder (idempotent re-runs)
 *
 * Usage:
 *   node scripts/migrate-projects-to-folders.js                # Dry-run (default)
 *   node scripts/migrate-projects-to-folders.js --execute      # Commit
 *
 * @layer 0 - Local (Vault)
 */

const fs = require("fs");
const path = require("path");

const VAULT = path.join(process.env.HOME, "Documents", "Brickocampus");
const WORK_TEAMS = [
  path.join(VAULT, "work/cortex/projects/Product Design"),
  path.join(VAULT, "work/cortex/projects/Design Engineering"),
  path.join(VAULT, "work/cortex/projects/Team & Management"),
  path.join(VAULT, "work/cortex/projects/Talks & Demos"),
];
const PERSONAL = path.join(VAULT, "personal/projects");

const EXECUTE = process.argv.includes("--execute");

// --- Helpers ---

function readFrontmatter(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const m = content.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return null;
  const fm = {};
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^([a-z_]+):\s*(.*)$/);
    if (!kv) continue;
    let val = kv[2].trim();
    // strip surrounding quotes
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    fm[kv[1]] = val;
  }
  return fm;
}

function sentenceCase(slug) {
  const words = slug.replace(/-/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function sanitizeForFolderName(name) {
  // Replace path-separator and other unsafe characters with hyphens.
  // `/` is the Unix path separator and cannot appear in folder names.
  // Collapse repeated spaces produced by sanitization.
  return name
    .replace(/\//g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function deriveFolderName(fm, slug, kind /* "work" | "personal" */) {
  const nameField = kind === "work" ? "linear_name" : "notion_name";
  let name = fm[nameField];
  if (name) {
    // strip [Design] prefix for PD work projects
    name = name.replace(/^\[Design\]\s+/, "");
    return sanitizeForFolderName(name);
  }
  // fallback: sentence-case the slug
  return sanitizeForFolderName(sentenceCase(slug));
}

/** Move the file's siblings (companion-folder contents) into the new project folder. */
function unwrapCompanion(companionDir, projectDir) {
  const entries = fs.readdirSync(companionDir, { withFileTypes: true });
  for (const entry of entries) {
    const src = path.join(companionDir, entry.name);
    const dst = path.join(projectDir, entry.name);
    if (fs.existsSync(dst)) {
      throw new Error(`Conflict: ${dst} already exists, cannot move ${src}`);
    }
    if (EXECUTE) fs.renameSync(src, dst);
  }
  if (EXECUTE) fs.rmdirSync(companionDir);
}

// --- Migration ---

function planMoves() {
  const moves = []; // { kind, src, dst, companionSrc?, fm, slug, folderName, area }
  const collisions = []; // detected folder-name duplicates within same parent

  for (const teamRoot of WORK_TEAMS) {
    if (!fs.existsSync(teamRoot)) continue;
    for (const entry of fs.readdirSync(teamRoot, { withFileTypes: true })) {
      if (entry.name.startsWith(".") || entry.name.startsWith("_")) continue;
      if (!entry.isFile() || !entry.name.endsWith(".md")) continue;

      const src = path.join(teamRoot, entry.name);
      const slug = entry.name.replace(/\.md$/, "");
      const fm = readFrontmatter(src);
      if (!fm) {
        console.warn(`SKIP no-frontmatter: ${src}`);
        continue;
      }
      // skip area pages and domain pages (stay flat)
      if (fm.type === "product-area" || fm.type === "domain") continue;

      const folderName = deriveFolderName(fm, slug, "work");
      const projectDir = path.join(teamRoot, folderName);
      const dst = path.join(projectDir, entry.name);
      const companionSrc = path.join(teamRoot, slug);
      const hasCompanion =
        fs.existsSync(companionSrc) &&
        fs.statSync(companionSrc).isDirectory();

      moves.push({
        kind: "work",
        src,
        dst,
        projectDir,
        companionSrc: hasCompanion ? companionSrc : null,
        slug,
        folderName,
      });
    }
  }

  if (fs.existsSync(PERSONAL)) {
    for (const entry of fs.readdirSync(PERSONAL, { withFileTypes: true })) {
      if (entry.name.startsWith(".") || entry.name.startsWith("_")) continue;
      if (!entry.isFile() || !entry.name.endsWith(".md")) continue;

      const src = path.join(PERSONAL, entry.name);
      const slug = entry.name.replace(/\.md$/, "");
      const fm = readFrontmatter(src);
      if (!fm) {
        console.warn(`SKIP no-frontmatter: ${src}`);
        continue;
      }

      const folderName = deriveFolderName(fm, slug, "personal");
      const projectDir = path.join(PERSONAL, folderName);
      const dst = path.join(projectDir, entry.name);
      const companionSrc = path.join(PERSONAL, slug);
      const hasCompanion =
        fs.existsSync(companionSrc) &&
        fs.statSync(companionSrc).isDirectory();

      moves.push({
        kind: "personal",
        src,
        dst,
        projectDir,
        companionSrc: hasCompanion ? companionSrc : null,
        slug,
        folderName,
      });
    }
  }

  // collision check: two source files mapping to same dst folder
  const byDir = {};
  for (const m of moves) {
    byDir[m.projectDir] = (byDir[m.projectDir] || []).concat(m);
  }
  for (const [dir, ms] of Object.entries(byDir)) {
    if (ms.length > 1) {
      collisions.push(
        `Collision: ${ms.length} files map to ${dir}: ${ms.map((m) => m.slug).join(", ")}`
      );
    }
  }

  return { moves, collisions };
}

function applyMove(m) {
  if (!EXECUTE) return;
  if (!fs.existsSync(m.projectDir)) {
    fs.mkdirSync(m.projectDir, { recursive: true });
  }
  if (fs.existsSync(m.dst)) {
    throw new Error(`Destination exists: ${m.dst}`);
  }
  fs.renameSync(m.src, m.dst);
  if (m.companionSrc) {
    unwrapCompanion(m.companionSrc, m.projectDir);
  }
}

function main() {
  const { moves, collisions } = planMoves();

  if (collisions.length > 0) {
    console.error("\n=== COLLISIONS — aborting ===");
    for (const c of collisions) console.error("  " + c);
    console.error(
      "\nResolve by editing linear_name / notion_name on conflicting files, then re-run."
    );
    process.exit(1);
  }

  console.log(`\n=== Plan: ${moves.length} files ===`);
  console.log(`Mode: ${EXECUTE ? "EXECUTE" : "DRY-RUN (default)"}\n`);

  let work = 0,
    personal = 0,
    withCompanion = 0;
  for (const m of moves) {
    if (m.kind === "work") work++;
    else personal++;
    if (m.companionSrc) withCompanion++;
    const rel = (p) => p.replace(VAULT + "/", "");
    console.log(`  ${rel(m.src)}`);
    console.log(`    → ${rel(m.dst)}`);
    if (m.companionSrc) {
      console.log(`    + unwrap companion: ${rel(m.companionSrc)}/* → ${rel(m.projectDir)}/`);
    }
  }
  console.log(
    `\nSummary: ${work} work + ${personal} personal = ${moves.length} moves; ${withCompanion} with companion folders.`
  );

  if (!EXECUTE) {
    console.log("\nDry-run only. Re-run with --execute to commit.");
    return;
  }

  console.log("\n=== Executing ===");
  let done = 0;
  for (const m of moves) {
    try {
      applyMove(m);
      done++;
    } catch (err) {
      console.error(`FAILED ${m.src}: ${err.message}`);
      console.error(`Aborting after ${done} successful moves.`);
      process.exit(1);
    }
  }
  console.log(`Done. ${done} files migrated.`);
}

main();
