/* P1-14 — alerts must be able to clear.
   No Status column exists in the sheet yet (schema change, Durga's
   action per brief §5), so isResolved() must default every row to "open"
   until that column is added — behaviour must not change today.
*/
const { load, check, section } = require("./harness");

const ctx = load([
  { file: "assets/js/sheets.js", fns: ["parseGvizDate"] },
  { file: "index.html", fns: ["isResolved", "selectAlerts"] },
]);

function run() {
  section("P1-14 — alert resolution state");

  check("row with no Status column at all is treated as open",
    ctx.isResolved({ Description: "x" }), false);
  check("Status: 'Resolved' (any case/whitespace) is resolved",
    ctx.isResolved({ Status: "  Resolved  " }), true);
  check("Status: 'resolved' lowercase still counts", ctx.isResolved({ Status: "resolved" }), true);
  check("Status: 'Open' is not resolved", ctx.isResolved({ Status: "Open" }), false);

  const rows = [
    { Timestamp: "Date(2026,8,3)",  "Entry Type": "Blocker", Description: "still open", Status: "Open" },
    { Timestamp: "Date(2026,8,10)", "Entry Type": "Blocker", Description: "fixed weeks ago", Status: "Resolved" },
    { Timestamp: "Date(2026,9,1)",  "Entry Type": "Needs Admin Support", Description: "no status column set" },
  ];

  const { alerts, resolvedCount } = ctx.selectAlerts(rows, 6);
  check("resolved row is excluded from the open list", alerts.map(a => a.Description).includes("fixed weeks ago"), false);
  check("two open rows remain (one explicit, one defaulted)", alerts.length, 2);
  check("resolved count is tracked separately", resolvedCount, 1);

  // Backward compatibility: today's real sheet has no Status column at all.
  const noStatusRows = rows.map(({ Status, ...rest }) => rest);
  const today = ctx.selectAlerts(noStatusRows, 6);
  check("with no Status column anywhere, nothing is auto-resolved", today.resolvedCount, 0);
  check("all three rows remain open, matching pre-P1-14 behaviour", today.alerts.length, 3);
}

module.exports = { run };
if (require.main === module) { run(); require("./harness").report(); }
