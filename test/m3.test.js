/* M-3 — deliverable compliance.
   "Projects × Deliverables, ✓ / ✗ / late" — the brief's own framing.
*/
const { load, check, section } = require("./harness");

const ctx = load([
  { file: "assets/js/sheets.js", fns: ["parseGvizDate", "classifyDeliverableStatus", "buildDeliverableSummary"] },
]);

const TODAY = new Date(2026, 9, 15); // Oct 15 2026 — mid-semester

const ROWS = [
  { Project: "Shoulder Dislocation", Deliverable: "Project Preference Ranking", "Due Date": "2026-09-08", Submitted: "Yes", "Submitted Date": "Date(2026,8,8)" },
  { Project: "Shoulder Dislocation", Deliverable: "Team Formation", "Due Date": "2026-09-09", Submitted: "Yes", "Submitted Date": "Date(2026,8,9)" },
  { Project: "Shoulder Dislocation", Deliverable: "Project Proposal", "Due Date": "2026-10-01", Submitted: "", "Submitted Date": "" },      // past due, not submitted -> late
  { Project: "Shoulder Dislocation", Deliverable: "Mid-Semester Progress Check-In", "Due Date": "2026-10-22", Submitted: "", "Submitted Date": "" }, // future -> pending
  { Project: "Shoulder Dislocation", Deliverable: "Pitch Presentation", "Due Date": "2026-11-26", Submitted: "", "Submitted Date": "" },    // future -> pending
  { Project: "Patellar Dislocation ", Deliverable: "Project Proposal", "Due Date": "2026-10-01", Submitted: "yes", "Submitted Date": "Date(2026,9,30)" }, // trailing space + lowercase
];

function run() {
  section("M-3 — classifyDeliverableStatus");

  check("Submitted = Yes -> submitted", ctx.classifyDeliverableStatus({ Submitted: "Yes" }, TODAY), "submitted");
  check("Submitted = yes (lowercase) -> submitted", ctx.classifyDeliverableStatus({ Submitted: "yes" }, TODAY), "submitted");
  check("Submitted = '  Yes  ' (whitespace) -> submitted",
    ctx.classifyDeliverableStatus({ Submitted: "  Yes  " }, TODAY), "submitted");
  check("not submitted, due date in the past -> late",
    ctx.classifyDeliverableStatus({ Submitted: "", "Due Date": "2026-10-01" }, TODAY), "late");
  check("not submitted, due date in the future -> pending",
    ctx.classifyDeliverableStatus({ Submitted: "", "Due Date": "2026-11-26" }, TODAY), "pending");
  check("not submitted, due date is exactly today -> pending (not late until after)",
    ctx.classifyDeliverableStatus({ Submitted: "", "Due Date": "2026-10-15" }, TODAY), "pending");
  check("not submitted, no due date at all -> pending (can't be late with no due date)",
    ctx.classifyDeliverableStatus({ Submitted: "" }, TODAY), "pending");

  section("M-3 — buildDeliverableSummary");

  const summary = ctx.buildDeliverableSummary(ROWS, "Shoulder Dislocation", TODAY);
  check("finds all 5 deliverables for the project", summary.total, 5);
  check("2 submitted (Preference Ranking, Team Formation)", summary.submittedCount, 2);
  check("1 late (Project Proposal, past due, unsubmitted)", summary.lateCount, 1);
  check("2 pending (Check-In, Pitch — future due dates)", summary.pendingCount, 2);
  check("items sorted by due date ascending",
    summary.items.map(i => i.deliverable),
    ["Project Preference Ranking", "Team Formation", "Project Proposal",
     "Mid-Semester Progress Check-In", "Pitch Presentation"]);

  check("case/whitespace-insensitive project matching (P1-10 consistency)",
    ctx.buildDeliverableSummary(ROWS, "  shoulder dislocation", TODAY).total, 5);
  check("trailing space in the SHEET's Project value also matches",
    ctx.buildDeliverableSummary(ROWS, "Patellar Dislocation", TODAY).total, 1);

  check("unknown project returns an empty summary, not a throw",
    ctx.buildDeliverableSummary(ROWS, "Nonexistent Project", TODAY),
    { items: [], total: 0, submittedCount: 0, lateCount: 0, pendingCount: 0 });

  check("empty deliverable rows => empty summary", ctx.buildDeliverableSummary([], "X", TODAY).total, 0);
}

module.exports = { run };
if (require.main === module) { run(); require("./harness").report(); }
