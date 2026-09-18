# Biomedical Innovations Tracker

Status site for the ENRH 116 Biomedical Innovations elective at UT Southwestern.
A static site (no build step, no framework) hosted on GitHub Pages. All data
comes from a **private** Google Sheet through an **Apps Script Web App**.

**Live site:** https://kavetidurga5.github.io/biomed-elective-tracker/index.html

There is intentionally no build step, no package.json, and no framework: the
maintainers are four medical students, and a toolchain is a bus-factor risk.

---

## How it works

```
Browser (GitHub Pages)  ──GET──▶  Apps Script Web App (apps-script/Code.gs)  ──reads──▶  PRIVATE Google Sheet
                                        │
                                        └── reads tokens from a SECOND private spreadsheet
```

| Page | Who | Data it asks the Web App for |
|---|---|---|
| `index.html` (Dashboard) | Everyone | `?action=course` — syllabus + course deliverable dates (non-sensitive) |
| `projects/project.html?id=<name>&token=<token>` | One team (or admin) | `?project=&token=` — that team's rows only, whitelisted columns only |
| `projects/index.html` (Projects grid) | **Admin only** | `?action=projects&token=<ADMIN>` |

- Each team gets its own link containing its own token. A team's token cannot read another team.
- The **admin key** is typed once per device and saved in that browser's localStorage. It is never in any page, link, or this repo.
- The Sheet must be **Restricted**. Do not set it to "Anyone with the link".
- `assets/js/sheets.js` holds shared helpers and `GATED_API_URL`. Its `fetchTab`/`SHEET_ID`/`GIDS`
  are LEGACY (direct public-Sheet reads) and are not called by any page.

## Sheet tabs (main spreadsheet)

| Tab | Key columns |
|---|---|
| `dashboard` | `Project`, `Current Stage`, `Overall Health`, `Project Status`, `Tracking Mode`, `Poster PDF`, `Poster Image`, `Elevator Pitch`, `Key Stat Number/Text`, `Disease State`, `Affected Demographic`, `Problem Statement`, `Gap` |
| `roster` | `Student Name`, `Project`, `Bio`, `Headshot` |
| `presentations` | `Project`, `Presentation Type`, `Date`, `Prep Status`, `Owner`, `Event Name`, `Link` |
| `syllabus` | `Week`, `Date`, `Topic`, `Expected Stage`, `Agenda Note` |
| `updateLog` | `Timestamp`, `Student Name`, `Project`, `Biodesign Stage`, `Entry Type`, `Description`, `Admin Confirmed`, `Team Confirmed` |
| `deliverables` | `Project`, `Deliverable`, `Due Date`, `Submitted` (Yes), `Submitted Date` |

Only the columns listed in `COLUMNS` in `apps-script/Code.gs` are ever sent to a browser. To show a new
column on the site, add its name there **and** redeploy the script.

Row rules: a row whose first column is blank or starts with `^` is ignored. Project matching is
trim + case-insensitive.

## Common changes

- **Reschedule a class / guest speaker:** edit the `syllabus` tab. Dashboard, timelines, and "Upcoming" update automatically.
- **Change a deliverable date:** edit that deliverable's `Due Date` in the `deliverables` tab (all teams' rows).
  The dashboard reads it from there — nothing is hardcoded in the site.
- **Add a project:** add a row to `dashboard`, matching rows in `roster` / `deliverables`, and a row in the
  private token spreadsheet (`Access Tokens`: Project + a new random Token). Send that team its link.
- **Rotate a token:** change it in the private token spreadsheet, then re-send that team's link.
- **Mark a project complete:** set `Project Status` = `Complete` on the `dashboard` tab.

## Deploying the Apps Script

1. Open the Sheet → Extensions → Apps Script. Paste `apps-script/Code.gs`; set `TOKEN_SPREADSHEET_ID`.
2. Project Settings → Time zone = the Sheet's time zone (America/Chicago).
3. Deploy → Manage deployments → edit the existing deployment → **New version** (keeps the same `/exec` URL).
   Execute as **Me**; Who has access **Anyone**.

## Deploy the site

Every push to `main` is a live production deploy via GitHub Pages — there is no staging.
Work on a branch, review the diff, then merge. Before merging anything that touches `assets/js/sheets.js`:

```bash
for f in test/*.test.js; do node "$f"; done
```

Tests extract the real functions out of the shipped HTML/JS (see `test/harness.js`), so a pass means the
actual site logic ran.

## Security notes

- Anything in this repo is public. Never commit tokens, the admin key, or real personal data.
- Tokens live only in the private token spreadsheet. Rotate them if a link is forwarded outside its team.
- Dead-but-tested admin helpers (`computeDashboardStats`, `selectAlerts`, `isResolved`, `sheetRowLink`) remain in
  `index.html` for a possible future admin view; they are not called.

## Known gaps

- [ ] No Attendance tab (Pass/Fail needs 10 of 12 sessions + all guest lectures).
- [ ] Site still joins on the `Project` display name; the `Project ID` column exists but is not used yet.
- [ ] M-2 (stage vs. expected-stage delta) not started.
