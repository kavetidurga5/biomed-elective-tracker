/* M-3 (project detail page) — the deliverables checklist renderer. */
const { load, check, checkTrue, section } = require("./harness");

const ctx = load([
  { file: "assets/js/sheets.js", fns: ["escapeHtml"] },
  { file: "projects/project.html", fns: ["renderDeliverablesList", "fmtShortDate"],
    consts: ["DELIVERABLE_STATUS_LABEL", "DELIVERABLE_STATUS_CLASS"] },
]);

function fakeEl() {
  return { _html: "", set innerHTML(v) { this._html = v; }, get innerHTML() { return this._html; } };
}

function run() {
  section("M-3 — renderDeliverablesList");

  const empty = fakeEl();
  ctx.renderDeliverablesList(empty, { items: [], total: 0, submittedCount: 0, lateCount: 0, pendingCount: 0 });
  checkTrue("empty summary shows a 'no deliverables' message", empty.innerHTML.includes("No deliverables on file"));

  const summary = {
    items: [
      { deliverable: "Project Proposal", status: "submitted", dueDate: new Date(2026, 9, 1), submittedDate: new Date(2026, 8, 30) },
      { deliverable: "Mid-Semester Progress Check-In", status: "late", dueDate: new Date(2026, 9, 22), submittedDate: null },
      { deliverable: "Pitch Presentation", status: "pending", dueDate: new Date(2026, 10, 26), submittedDate: null },
    ],
    total: 3, submittedCount: 1, lateCount: 1, pendingCount: 1,
  };
  const el = fakeEl();
  ctx.renderDeliverablesList(el, summary);

  checkTrue("shows the submitted count in the summary line", el.innerHTML.includes("1/3 submitted"));
  checkTrue("shows the late count in the summary line", el.innerHTML.includes("1 late"));
  checkTrue("submitted item shows a checkmark label", el.innerHTML.includes("✓ Submitted"));
  checkTrue("late item shows a warning label", el.innerHTML.includes("⚠ Late"));
  checkTrue("pending item shows Pending", el.innerHTML.includes(">Pending<"));
  checkTrue("submitted item shows its submitted date, not a due date", el.innerHTML.includes("Submitted Sep 30"));
  checkTrue("pending item shows its due date", el.innerHTML.includes("Due Nov 26"));
  checkTrue("late item (no submitted date) shows its due date", el.innerHTML.includes("Due Oct 22"));

  // A summary with zero lates must not show a stray "· 0 late".
  const noLate = fakeEl();
  ctx.renderDeliverablesList(noLate, { items: [summary.items[0]], total: 1, submittedCount: 1, lateCount: 0, pendingCount: 0 });
  checkTrue("no late count shown when lateCount is 0", !noLate.innerHTML.includes("late"));

  // HTML injection: a deliverable name with a hostile value must be escaped.
  const hostile = fakeEl();
  ctx.renderDeliverablesList(hostile, {
    items: [{ deliverable: '<img src=x onerror=alert(1)>', status: "pending", dueDate: null, submittedDate: null }],
    total: 1, submittedCount: 0, lateCount: 0, pendingCount: 1,
  });
  checkTrue("deliverable name is escaped", hostile.innerHTML.includes("&lt;img"));
  checkTrue("no unescaped tag makes it through", !hostile.innerHTML.includes("<img src=x"));

  // No due date and not submitted -> explicit "No due date set", not blank.
  const noDue = fakeEl();
  ctx.renderDeliverablesList(noDue, {
    items: [{ deliverable: "Mystery Deliverable", status: "pending", dueDate: null, submittedDate: null }],
    total: 1, submittedCount: 0, lateCount: 0, pendingCount: 1,
  });
  checkTrue("missing due date shows an explicit message", noDue.innerHTML.includes("No due date set"));
}

module.exports = { run };
if (require.main === module) { run(); require("./harness").report(); }
