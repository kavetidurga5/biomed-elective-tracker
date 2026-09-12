/* fixtures.js — mock gviz row objects for offline verification.

   docs.google.com is unreachable from a sandbox, so these fixtures stand in
   for real Sheet responses. Each block maps to an acceptance test in the
   remediation brief (§1). Row shapes match what fetchTab() returns AFTER
   header mapping: plain objects keyed by column name, null for empty cells.
*/

// ── Date forms seen in this workbook ────────────────────────────────
// gviz Date cells come back as the literal STRING "Date(y,m,d)", month
// 0-indexed. The Syllabus Map tab stores dates as plain ISO text instead.

// P0-1: the four-date ordering case. Deliberately supplied in an order
// where lexicographic sort and chronological sort disagree.
const SORT_LOGS = [
  { Timestamp: "Date(2026,10,19)", Project: "DDH Task Trainer", "Biodesign Stage": "Pitch Prep",   Description: "Nov 19 — symposium dry run" },
  { Timestamp: "Date(2026,8,14)",  Project: "DDH Task Trainer", "Biodesign Stage": "Needs Finding", Description: "Sep 14 — double-digit day" },
  { Timestamp: "Date(2026,8,3)",   Project: "DDH Task Trainer", "Biodesign Stage": "Needs Finding", Description: "Sep 3 — single-digit day" },
  { Timestamp: "Date(2026,9,1)",   Project: "DDH Task Trainer", "Biodesign Stage": "Prototyping",  Description: "Oct 1 — proposal due" },
];

const SORT_EXPECTED_CHRONOLOGICAL = [
  "Date(2026,8,3)",
  "Date(2026,8,14)",
  "Date(2026,9,1)",
  "Date(2026,10,19)",
];

// P0-1 guard: undated rows must sink, not throw.
const SORT_LOGS_WITH_NULL = [
  ...SORT_LOGS,
  { Timestamp: null, Project: "DDH Task Trainer", "Biodesign Stage": "Prototyping", Description: "no timestamp" },
];

// P0-3: blank Timestamp cell arrives as null, not "".
const ALERT_LOGS = [
  { Timestamp: "Date(2026,8,10)", Project: "DDH Task Trainer", "Student Name": "Test Student", "Entry Type": "Needs Admin Support", Description: "Room booking blocked" },
  { Timestamp: null,              Project: "DDH Task Trainer", "Student Name": "Test Student", "Entry Type": "Blocker",             Description: "blank timestamp — must be dropped, not shown as 1970" },
];

// P0-2: 12 syllabus checkpoints, Weeks 5 and 6 SHARING "Prototyping".
// Dates mirror the real ENRH 116 Fall 2026 schedule (Thursdays).
const SYLLABUS_12 = [
  { Week: 1,  Date: "2026-09-03", Topic: "Introductory Day",          "Expected Stage": "Orientation" },
  { Week: 2,  Date: "2026-09-10", Topic: "Needs Assessment",          "Expected Stage": "Needs Finding" },
  { Week: 3,  Date: "2026-09-17", Topic: "Concept Ideation",          "Expected Stage": "Ideation" },
  { Week: 4,  Date: "2026-09-24", Topic: "Human-Centered Design",     "Expected Stage": "Ideation" },
  { Week: 5,  Date: "2026-10-01", Topic: "Prototyping Skills",        "Expected Stage": "Prototyping" },
  { Week: 6,  Date: "2026-10-08", Topic: "Workshop Field Trip",       "Expected Stage": "Prototyping" },
  { Week: 7,  Date: "2026-10-15", Topic: "Guest Speaker: Dr. Ying",   "Expected Stage": "Prototyping" },
  { Week: 8,  Date: "2026-10-22", Topic: "Workshop",                  "Expected Stage": "Iteration" },
  { Week: 9,  Date: "2026-10-29", Topic: "Iterative Development",     "Expected Stage": "Iteration" },
  { Week: 10, Date: "2026-11-05", Topic: "DFM & IP",                  "Expected Stage": "Design for Manufacturing" },
  { Week: 11, Date: "2026-11-12", Topic: "Business Model & Pitch",    "Expected Stage": "Pitch Prep" },
  { Week: 12, Date: "2026-11-19", Topic: "Pitch Day",                 "Expected Stage": "Pitch Prep" },
];

// One log entry, dated in Week 5. Must light Week 5 only — NOT Week 6/7.
const LOGS_ONE_PROTOTYPING = [
  { Timestamp: "Date(2026,9,1)", Project: "DDH Task Trainer", "Biodesign Stage": "Prototyping", Description: "First foam mockup done" },
];

// The out-of-order entry that currently fills the bar to 100%: a team logs
// "Pitch Prep" (checkpoint index 10) back in Week 4.
const LOGS_EARLY_PITCH = [
  { Timestamp: "Date(2026,8,24)", Project: "DDH Task Trainer", "Biodesign Stage": "Pitch Prep", Description: "Jumped ahead — logged pitch prep in Week 4" },
];

// P1-7 / P1-8: Complete row, blank-Project row, blank-health row.
const DASHBOARD_ROWS = [
  { Project: "DDH Task Trainer", "Current Stage": "Prototyping", "Overall Health": "Green",  "Project Status": "Active",   "Tracking Mode": "Standard" },
  { Project: "Airway Trainer",   "Current Stage": "Ideation",    "Overall Health": "Yellow", "Project Status": "Active",   "Tracking Mode": "Standard" },
  { Project: "Legacy Sim Cart",  "Current Stage": "Complete",    "Overall Health": "Red",    "Project Status": "Complete", "Tracking Mode": "Custom" },
  { Project: "Suture Pad v2",    "Current Stage": "Needs Finding", "Overall Health": null,   "Project Status": "Active",   "Tracking Mode": "Standard" },
  { Project: "   ",              "Current Stage": null,          "Overall Health": null,     "Project Status": null,       "Tracking Mode": null },
];

// P1-10: trailing space in Roster breaks the exact-equality join.
const ROSTER_ROWS = [
  { Project: "DDH Task Trainer ", "Student Name": "Student A" },
  { Project: "ddh task trainer",  "Student Name": "Student B" },
  { Project: "Airway Trainer",    "Student Name": "Student C" },
];

// P1-11: attribute-context escaping.
const HOSTILE_LINK_ROW = {
  Project: "DDH Task Trainer",
  "Event Name": 'Symposium',
  Link: 'x" onerror=alert(1) x="',
  Date: "Date(2026,10,19)",
  "Prep Status": "Not started",
  Owner: null,
};

const JS_SCHEME_LINK_ROW = {
  Project: "DDH Task Trainer",
  "Event Name": "Bad scheme",
  Link: "javascript:alert(1)",
  Date: "Date(2026,10,19)",
  "Prep Status": "Not started",
  Owner: null,
};

// M-1: Days Since Last Update — one project in each band.
const M1_LOGS = [
  { Timestamp: "Date(2026,8,10)", Project: "DDH Task Trainer", "Biodesign Stage": "Prototyping", Description: "recent" },
  { Timestamp: "Date(2026,8,1)",  Project: "Airway Trainer",   "Biodesign Stage": "Ideation",    Description: "stale-ish" },
  { Timestamp: "Date(2026,7,1)",  Project: "Suture Pad v2",    "Biodesign Stage": "Needs Finding", Description: "very stale" },
  // "Legacy Sim Cart" deliberately absent → never logged
];
const M1_TODAY = new Date(2026, 8, 12); // 2026-09-12, the audit date

module.exports = {
  SORT_LOGS,
  SORT_EXPECTED_CHRONOLOGICAL,
  SORT_LOGS_WITH_NULL,
  ALERT_LOGS,
  SYLLABUS_12,
  LOGS_ONE_PROTOTYPING,
  LOGS_EARLY_PITCH,
  DASHBOARD_ROWS,
  ROSTER_ROWS,
  HOSTILE_LINK_ROW,
  JS_SCHEME_LINK_ROW,
  M1_LOGS,
  M1_TODAY,
};
