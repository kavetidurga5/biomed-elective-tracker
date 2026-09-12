/* P1-7 — stat chips must reconcile.
   Active excludes Complete. Needs Attention is driven by M-1 staleness,
   not self-reported Overall Health (which the brief explicitly demotes:
   "self-reported health is a lagging indicator").
*/
const { load, check, section } = require("./harness");
const F = require("./fixtures");

const ctx = load([
  { file: "assets/js/sheets.js", fns: ["parseGvizDate", "daysSinceLastUpdate", "stalenessLevel"] },
  { file: "index.html", fns: ["computeDashboardStats"] },
]);

const TODAY = F.M1_TODAY; // 2026-09-12

function run() {
  section("P1-7 — dashboard stat reconciliation");

  // F.DASHBOARD_ROWS: DDH (Active), Airway (Active), Legacy Sim Cart
  // (Complete), Suture Pad v2 (Active), blank row.
  // F.M1_LOGS: DDH logged 2 days ago, Airway 11 days ago, Suture Pad v2
  // never logged, Legacy Sim Cart absent (but it's Complete, so excluded
  // from "active" anyway and must not count toward Needs Attention).
  const { activeCount, needsAttentionCount } = ctx.computeDashboardStats(F.DASHBOARD_ROWS, F.M1_LOGS, TODAY);

  check("Active excludes Complete and blank rows", activeCount, 3); // DDH, Airway, Suture Pad v2
  check("Needs Attention = red or never-logged among ACTIVE only",
    needsAttentionCount, 1); // only Suture Pad v2 (never logged); DDH=2d green, Airway=11d yellow

  // A Complete project that's gone completely silent must not inflate
  // Needs Attention — it's not active, so its staleness is irrelevant.
  const withStaleComplete = ctx.computeDashboardStats(
    [{ Project: "Old Project", "Project Status": "Complete" }],
    [], // never logged
    TODAY
  );
  check("stale Complete project contributes to neither count",
    withStaleComplete, { activeCount: 0, needsAttentionCount: 0 });

  // Green-reported project that has gone silent for 20 days DOES count —
  // this is the whole point of M-1 replacing self-reported color.
  const staleButGreen = ctx.computeDashboardStats(
    [{ Project: "Quiet Team", "Project Status": "Active", "Overall Health": "Green" }],
    [{ Project: "Quiet Team", Timestamp: "Date(2026,7,20)" }], // ~54 days before TODAY
    TODAY
  );
  check("a self-reported-Green project that has gone silent counts as Needs Attention",
    staleButGreen.needsAttentionCount, 1);

  // Empty inputs shouldn't throw.
  check("empty dashboard => zero/zero", ctx.computeDashboardStats([], [], TODAY),
    { activeCount: 0, needsAttentionCount: 0 });
}

module.exports = { run };
if (require.main === module) { run(); require("./harness").report(); }
