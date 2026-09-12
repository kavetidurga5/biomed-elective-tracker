/* P0-3 — missing timestamps must be excluded, not rendered as 1970.
   Acceptance (brief §1): fixture row with Timestamp: null is filtered out.
*/
const { load, check, checkTrue, section } = require("./harness");
const F = require("./fixtures");

const ctx = load([
  { file: "index.html", fns: ["parseGvizDate", "selectAlerts"] },
]);

function run() {
  section("P0-3 — null timestamps");

  check("parseGvizDate(null) returns null", ctx.parseGvizDate(null), null);

  const alerts = ctx.selectAlerts(F.ALERT_LOGS, 6);
  check("null-timestamp alert row is dropped", alerts.length, 1);
  check("the surviving row is the dated one", alerts[0].Description, "Room booking blocked");
  checkTrue("no 1970 dates survive", alerts.every(a => a._ts.getFullYear() > 2000));

  check("empty-string timestamp is also dropped",
    ctx.selectAlerts([{ Timestamp: "", "Entry Type": "Blocker", Description: "x" }], 6).length, 0);

  check("non-alert entry types are excluded",
    ctx.selectAlerts([{ Timestamp: "Date(2026,8,10)", "Entry Type": "Progress Update", Description: "x" }], 6).length, 0);

  check("newest alert sorts first",
    ctx.selectAlerts([
      { Timestamp: "Date(2026,8,3)",  "Entry Type": "Blocker", Description: "older" },
      { Timestamp: "Date(2026,9,19)", "Entry Type": "Blocker", Description: "newer" },
    ], 6).map(a => a.Description),
    ["newer", "older"]);

  check("limit is respected",
    ctx.selectAlerts(
      Array.from({ length: 10 }, (_, i) => ({ Timestamp: `Date(2026,8,${i + 1})`, "Entry Type": "Blocker", Description: `a${i}` })),
      6
    ).length, 6);
}

module.exports = { run };
if (require.main === module) { run(); require("./harness").report(); }
