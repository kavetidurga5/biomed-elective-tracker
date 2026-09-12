/* M-3 (grid page) — the compact per-card deliverable rollup badge. */
const { load, check, checkTrue, section } = require("./harness");

const ctx = load([
  { file: "assets/js/sheets.js", fns: ["escapeHtml"] },
  { file: "projects/index.html", fns: ["renderDeliverableSummaryBadge"] },
]);

function run() {
  section("M-3 — renderDeliverableSummaryBadge");

  check("no badge at all when there's nothing on file yet (not '0/0')",
    ctx.renderDeliverableSummaryBadge({ total: 0, submittedCount: 0, lateCount: 0, pendingCount: 0 }), "");

  const clean = ctx.renderDeliverableSummaryBadge({ total: 5, submittedCount: 3, lateCount: 0, pendingCount: 2 });
  checkTrue("shows submitted/total", clean.includes("3/5 deliverables"));
  checkTrue("no late count shown when there are none", !clean.includes("late"));
  checkTrue("uses the 'ok' style when nothing is late", clean.includes("deliv-badge-ok"));

  const late = ctx.renderDeliverableSummaryBadge({ total: 5, submittedCount: 2, lateCount: 1, pendingCount: 2 });
  checkTrue("shows the late count when present", late.includes("1 late"));
  checkTrue("uses the 'late' style when anything is late", late.includes("deliv-badge-late"));

  const allSubmitted = ctx.renderDeliverableSummaryBadge({ total: 5, submittedCount: 5, lateCount: 0, pendingCount: 0 });
  checkTrue("5/5 fully submitted still renders (not treated as empty)", allSubmitted.includes("5/5 deliverables"));
}

module.exports = { run };
if (require.main === module) { run(); require("./harness").report(); }
