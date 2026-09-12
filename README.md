# Biomedical Innovations Tracker

Live status dashboard for the ENRH 116 Biomedical Innovations elective at
UT Southwestern. A static site (no build step, no framework) reads
directly from a Google Sheet and renders a course-wide dashboard plus a
detail page per project.

**Live site:** https://kavetidurga5.github.io/biomed-elective-tracker/index.html
**Sheet:** the workbook at `SHEET_ID` in `assets/js/sheets.js`

There is intentionally no build step, no package.json, and no framework.
The maintainers are four medical students — a toolchain is a bus-factor
risk. Everything is hand-written vanilla JS loaded via `<script src>`.

---

## How the Sheet maps to the site

The site reads five tabs from one Google Sheet via the `gviz` JSON
endpoint (no API key, no server — this only works because the sheet is
shared as "Anyone with the link: Viewer"):

| Tab (in `GIDS`) | Read by | Key columns |
|---|---|---|
| `dashboard` | all three pages | `Project`, `Current Stage`, `Overall Health`, `Next Presentation`, `Project Status`, `Tracking Mode`, `Poster PDF`, `Poster Image` |
| `roster` | project detail page | `Project`, `Student Name` |
| `presentations` | project detail page | `Project`, `Presentation Type`, `Date`, `Prep Status`, `Owner`, `Event Name`, `Link` |
| `syllabus` | dashboard, project detail page | `Week`, `Date`, `Topic`, `Expected Stage`, `Agenda Note` |
| `updateLog` | dashboard, project detail page | `Timestamp`, `Project`, `Student Name`, `Entry Type`, `Biodesign Stage`, `Description`, `Status`\* |

\* `Status` (Open/Resolved) doesn't exist in the sheet yet — see
[Known gaps](#known-gaps-that-need-a-sheet-change) below.

Each row's **first column must be non-empty** to be read at all — a
blank column A (or one starting with `^`) is treated as a spacer/example
row and dropped. Every other column can be blank; a project with just a
name and nothing else set is still shown.

**Three pages, one data layer:**

```
index.html              → Dashboard (week card, stat chips, alerts, upcoming events)
projects/index.html     → Project grid (one card per project)
projects/project.html   → Project detail (?id=<project name>)
assets/js/sheets.js     → Shared: fetchTab(), fetchAllTabs(), date parsing,
                           HTML escaping, and the M-1 staleness helpers.
                           Loaded by all three pages before their own
                           inline <script>.
assets/css/projects.css → Shared styles for all three pages.
```

There's no bundler, so `sheets.js` is loaded via a plain `<script src>`
tag in each page's `<head>`/before its own script block. Functions
defined there (`escapeHtml`, `parseGvizDate`, `daysSinceLastUpdate`,
etc.) are just available as globals in each page's inline script.

---

## Common changes

### Add a new project
Add a row to the `dashboard` tab with a `Project` name. It appears on
the grid and gets a detail page at
`project.html?id=<url-encoded project name>` automatically — nothing to
deploy. If you also want it on a team's roster, or want presentations
tracked, add matching rows to `roster` / `presentations` keyed by the
same `Project` name (matching is trim + case-insensitive, so exact
casing doesn't matter, but use the *same* name consistently).

### Change the syllabus (reschedule a guest speaker, add a week, etc.)
Edit the `syllabus` tab directly. The "Where we are now" week card,
the roadmap checkpoints on every project page, and the "Upcoming"
events list on the dashboard are all derived live from this tab — no
code change, no redeploy, just edit the Sheet.

Dates can be either a real Date-typed cell or plain ISO text
(`2026-09-03`) — both are parsed. `Expected Stage` values are matched
case-insensitively against the Update Log's `Biodesign Stage` column to
build each project's roadmap.

### Log progress for a project (Update Log tab)
Add a row with `Project`, `Timestamp`, `Biodesign Stage` (should match
an `Expected Stage` value from the syllabus tab if you want it to light
up a roadmap checkpoint), `Entry Type`, and `Description`.

- `Entry Type` containing "admin" or "blocker" (case-insensitive) shows
  up in the dashboard's "Immediate alerts" card.
- The most recent `Timestamp` per project drives the "Days since last
  update" badge (🟢/🟡/🔴/⚫) on the grid page and the dashboard's
  "Needs attention" count.

### Mark a project complete
Set `Project Status` to `Complete` in the `dashboard` tab. This excludes
it from the "Active projects" count and from "Needs attention" (a
completed project's stale log isn't a real problem), and shows a
"Pending" badge instead of a health color.

---

## Deploy

Every push to `main` is a live production deploy via GitHub Pages —
there is no staging environment. **Work on a branch, open a PR, review
the diff, then merge.**

```bash
git checkout -b my-change
# ...edit...
git push origin my-change
# open a PR into main, review, merge
```

Before merging anything that touches `assets/js/sheets.js` or the data
layer, run the test suite (`node`, no install needed beyond what's
already on your machine):

```bash
for f in test/*.test.js; do node "$f"; done
```

These tests extract the real functions out of the shipped HTML/JS files
(there's no separate source-of-truth module to import), so a passing
suite means the actual site logic was exercised, not a reimplementation
of it.

---

## Known gaps that need a Sheet change

These came out of a September 2026 remediation pass — ask Durga for the
full write-up if you want the reasoning behind each. Summary:

- [ ] **Update Log needs a `Status` column** (`Open` / `Resolved`). The
      code already reads it defensively — until the column exists,
      every alert is treated as open (today's behavior, unchanged). Add
      the column and alert resolution starts working immediately.
- [ ] **Dashboard needs a stable `Project ID` slug column.** Right now
      every cross-tab join and every shared URL is keyed on the
      `Project` display name. Renaming a project breaks old links. A
      slug column (e.g. `ddh-task-trainer`) would survive renames.
- [ ] **No Deliverables tab.** The five course deliverables (Preference
      Ranking, Team Formation, Proposal, Mid-Semester Check-In, Pitch)
      are still hardcoded in `index.html` (`DELIVERABLES` array) because
      there's no per-project submission tracking in the Sheet. A new
      tab (`Project | Deliverable | Due Date | Submitted | Submitted Date`)
      would let this go live and add a compliance grid.
- [ ] **No Attendance tab.** Pass/Fail hinges on attending 10 of 12
      sessions and all guest lectures — currently untracked anywhere in
      the site.

## ⚠️ Public data note

`SHEET_ID` in `assets/js/sheets.js` is public (it's in this repo), and
the Sheet must be link-viewable for the site to work at all. That means
**anyone with the link can query any tab in the workbook**, not just the
five the site reads. The public "Immediate alerts" card shows
`Project · Date · Description` (student names were removed — see git
history for `P0-4-mitigation`). If you add new tabs or columns to this
workbook, assume they're publicly queryable and don't put anything in
this Sheet you wouldn't post on an open bulletin board.
