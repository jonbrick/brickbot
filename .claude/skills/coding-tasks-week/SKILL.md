---
name: coding-tasks-week
description: Generate a weekly coding task breakdown from GitHub activity. Use when the user wants to see what they coded this week, review personal PRs, or get a task list for Notion.
---

# /coding-tasks-week — Weekly Coding Task Breakdown

Generate a day-by-day task breakdown from GitHub personal activity for a given week.

## PHASE 1: Week Selection

1. Determine the current week (Sun–Sat) from today's date.
2. Ask the user: **"This week (Week N, Mon Date – Sun Date)? Or a different week?"**
3. Wait for confirmation before proceeding.

## PHASE 2: Gather Data

1. Read `data/collected.json` — extract `githubPersonal` records for the selected week's date range (Sun–Sat).
2. For each day with activity, extract:
   - Date and day of week (**double-check day names against actual calendar**)
   - Repository name
   - Commit count, lines added/deleted
   - Individual commit messages (from `Commit Messages` field)

## PHASE 3: Generate Task Table

1. Group commits into logical tasks using PR merge commits and their associated commits.
2. Apply task naming conventions:
   - Prefix with `Feat:`, `Fix:`, `Chore:`, or `Update` based on the nature of the work
   - Keep names concise but descriptive
   - Do NOT prefix with `Brickbot:` — the user will add repo context themselves if needed
3. Present as a markdown table:

```
| Day | Task |
|-----|------|
| **Mon Mar 9** | |
| | Feat: Description of feature |
| | Fix: Description of fix |
```

4. After the table, show a summary line: total commits, total lines changed, number of tasks.

## Rules

- **Verify day-of-week names** — use `new Date()` to confirm, don't guess.
- **One task per PR** — merge commits and their child commits are one task, not multiple.
- **Order by time within each day** — earliest first.
- **Skip merge-only commits** — don't create separate tasks for "Merge pull request #N" if the underlying work is already captured.
- **Include the PR number** in parentheses if available, e.g., `Feat: Journal import (#8)`

## Tone

Keep it simple and scannable. This is a quick reference, not a narrative.
