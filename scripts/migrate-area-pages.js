#!/usr/bin/env node

/**
 * One-off: wrap Product Design area pages in folders + rename to kebab-case slug.
 *
 * Before: Product Design/AI Chat UX.md
 * After:  Product Design/AI Chat UX/ai-chat-ux.md  (with aliases: ["AI Chat UX"])
 *
 * Adds the original display-name filename to `aliases:` so existing
 * `[[Display Name]]` wikilinks continue to resolve.
 *
 * Usage:
 *   node scripts/migrate-area-pages.js            # Dry-run
 *   node scripts/migrate-area-pages.js --execute  # Commit
 */

const fs = require("fs");
const path = require("path");

const VAULT = path.join(process.env.HOME, "Documents", "Brickocampus");
const PD = path.join(VAULT, "work/cortex/projects/Product Design");
const EXECUTE = process.argv.includes("--execute");

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function parseFrontmatter(content) {
  const m = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) return null;
  return { fmRaw: m[1], body: m[2] };
}

/** Returns updated frontmatter text with the displayName added to aliases. */
function ensureAlias(fmRaw, displayName) {
  const aliasLine = fmRaw.match(/^aliases:\s*(.*)$/m);
  if (!aliasLine) {
    // No aliases line — append one
    return fmRaw + `\naliases: ["${displayName}"]`;
  }
  // Existing aliases — parse bracket list, add if missing
  const val = aliasLine[1].trim();
  if (!val.startsWith("[") || !val.endsWith("]")) {
    // unexpected format — leave alone, warn
    console.warn(`  ⚠ unexpected aliases format: ${val}`);
    return fmRaw;
  }
  const inner = val.slice(1, -1).trim();
  const items = inner
    ? inner.split(",").map((s) => s.trim().replace(/^["']|["']$/g, ""))
    : [];
  if (items.includes(displayName)) return fmRaw; // already there
  items.unshift(displayName);
  const newVal = `[${items.map((i) => (/[, ]/.test(i) ? `"${i}"` : i)).join(", ")}]`;
  return fmRaw.replace(/^aliases:\s*.*$/m, `aliases: ${newVal}`);
}

const moves = [];

for (const entry of fs.readdirSync(PD, { withFileTypes: true })) {
  if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
  const filePath = path.join(PD, entry.name);
  const content = fs.readFileSync(filePath, "utf8");
  const parsed = parseFrontmatter(content);
  if (!parsed) continue;
  // Only area pages
  if (!/^type:\s*product-area/m.test(parsed.fmRaw)) continue;

  const displayName = entry.name.replace(/\.md$/, "");
  const slug = slugify(displayName);
  const folder = path.join(PD, displayName);
  const newPath = path.join(folder, `${slug}.md`);

  const updatedFm = ensureAlias(parsed.fmRaw, displayName);
  const newContent = `---\n${updatedFm}\n---\n${parsed.body}`;

  moves.push({ filePath, newPath, folder, displayName, slug, newContent });
}

console.log(`\n=== Plan: ${moves.length} area pages ===\n`);
console.log(`Mode: ${EXECUTE ? "EXECUTE" : "DRY-RUN"}\n`);

for (const m of moves) {
  const rel = (p) => p.replace(VAULT + "/", "");
  console.log(`  ${rel(m.filePath)}`);
  console.log(`    → ${rel(m.newPath)}`);
  console.log(`    aliases ensured: "${m.displayName}"`);
}

if (!EXECUTE) {
  console.log("\nDry-run only. Re-run with --execute to commit.");
  process.exit(0);
}

console.log("\n=== Executing ===");
for (const m of moves) {
  if (!fs.existsSync(m.folder)) fs.mkdirSync(m.folder, { recursive: true });
  if (fs.existsSync(m.newPath)) {
    console.error(`FAILED: destination exists: ${m.newPath}`);
    process.exit(1);
  }
  fs.writeFileSync(m.newPath, m.newContent);
  fs.unlinkSync(m.filePath);
}
console.log(`Done. ${moves.length} area pages wrapped.`);
