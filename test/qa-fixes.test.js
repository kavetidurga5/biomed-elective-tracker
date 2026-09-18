/* QA remediation (2026-09-18) — regression tests for:
   D5 ISO dates rendered raw, D8 grid markup/escaping, D3 live course
   deliverables, and the generic API URL builder. */
const { load, check, checkTrue, section } = require("./harness");

const ctx = load([
  { file: "assets/js/sheets.js", fns: ["parseGvizDate", "formatGvizDate", "buildApiUrl", "escapeHtml",
      "stalenessLevel", "daysSinceLastUpdate", "buildDeliverableSummary", "classifyDeliverableStatus"],
    consts: ["STALENESS_EMOJI", "STALENESS_LABEL"] },
  { file: "projects/index.html", fns: ["healthClass", "selectProjectRows", "renderStalenessBadge",
      "renderDeliverableSummaryBadge", "renderProjectCards"] },
  { file: "index.html", fns: ["buildCourseDeliverables"] },
]);

function run() {
  section("D5 — formatGvizDate handles ISO strings from Apps Script");
  check("ISO timestamp with time + Z renders as a plain date", ctx.formatGvizDate("2026-01-12T08:00:00.000Z"), "Jan 12, 2026");
  check("plain ISO date renders as a plain date", ctx.formatGvizDate("2026-09-03"), "Sep 3, 2026");
  check("gviz Date() literal still works", ctx.formatGvizDate("Date(2026,8,14)"), "Sep 14, 2026");
  check("non-date text is returned untouched", ctx.formatGvizDate("Not started"), "Not started");
  check("null/empty returns empty string", ctx.formatGvizDate(null), "");

  section("buildApiUrl");
  check("adds ? and encodes values", ctx.buildApiUrl("https://x/exec", { action: "course" }), "https://x/exec?action=course");
  check("skips null params", ctx.buildApiUrl("https://x/exec", { action: "projects", token: null }), "https://x/exec?action=projects");
  check("encodes spaces", ctx.buildApiUrl("https://x/exec", { project: "A B" }), "https://x/exec?project=A%20B");
  check("uses & when base already has ?", ctx.buildApiUrl("https://x/exec?v=1", { a: "b" }), "https://x/exec?v=1&a=b");

  section("D3 — course deliverables come from data, not a hardcoded array");
  const rows = [
    { Deliverable: "Pitch Presentation", "Due Date": "2026-11-19" },
    { Deliverable: "Project Proposal", "Due Date": "2026-10-01" },
    { Deliverable: "Project Proposal", "Due Date": "2026-10-01" },   // duplicate from another team
    { Deliverable: "", "Due Date": "2026-10-02" },                  // no name -> dropped
    { Deliverable: "No Date", "Due Date": null },                   // no date -> dropped
  ];
  const out = ctx.buildCourseDeliverables(rows);
  check("dedupes and drops incomplete rows", out.length, 2);
  check("sorted by date", out[0].label, "Project Proposal due");
  check("label format matches the old hardcoded strings", out[1].label, "Pitch Presentation due");
  check("empty input is safe", ctx.buildCourseDeliverables(undefined).length, 0);

  section("D8 — Projects grid markup");
  const today = new Date(2026, 8, 18);
  const dash = [{ Project: "Alpha <img src=x onerror=1>", "Current Stage": "Invent", "Overall Health": "Green", "Project Status": "Active" }];
  const html = ctx.renderProjectCards(dash, [], [], today);
  checkTrue("project name is HTML-escaped", !html.includes("<img") && html.includes("&lt;img"));
  checkTrue("no stale 'Next:' line any more", !html.includes("Next:"));
  checkTrue("card link carries no token", !html.includes("token="));
  checkTrue("empty list gives friendly message", ctx.renderProjectCards([], [], [], today).includes("No projects listed yet"));
}

module.exports = { run };
if (require.main === module) { run(); require("./harness").report(); }
