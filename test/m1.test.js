/* M-1 — Days Since Last Update.
   Replaces "Blocked / silent", which measured only self-reported color.
   Silence (no recent log entry) is the leading indicator this surfaces.
*/
const { load, check, section } = require("./harness");
const F = require("./fixtures");

const ctx = load([
  { file: "assets/js/sheets.js", fns: ["parseGvizDate", "daysSinceLastUpdate", "stalenessLevel"] },
]);

function run() {
  section("M-1 — daysSinceLastUpdate");

  check("recent log (2 days ago) for DDH Task Trainer",
    ctx.daysSinceLastUpdate(F.M1_LOGS, "DDH Task Trainer", F.M1_TODAY), 2);
  check("log 11 days before today for Airway Trainer",
    ctx.daysSinceLastUpdate(F.M1_LOGS, "Airway Trainer", F.M1_TODAY), 11);
  check("project with no log entries at all returns null",
    ctx.daysSinceLastUpdate(F.M1_LOGS, "Legacy Sim Cart", F.M1_TODAY), null);
  check("unknown project name returns null", ctx.daysSinceLastUpdate(F.M1_LOGS, "Nonexistent", F.M1_TODAY), null);

  check("matching is case/whitespace-insensitive (P1-10 consistency)",
    ctx.daysSinceLastUpdate(F.M1_LOGS, "  ddh task trainer  ", F.M1_TODAY), 2);

  check("uses the MOST RECENT of several log entries, not the first",
    ctx.daysSinceLastUpdate([
      { Project: "X", Timestamp: "Date(2026,8,1)" },
      { Project: "X", Timestamp: "Date(2026,8,20)" },
      { Project: "X", Timestamp: "Date(2026,7,1)" },
    ], "X", new Date(2026, 8, 22)), 2);

  check("logs with unparseable timestamps are ignored, not counted as recent",
    ctx.daysSinceLastUpdate([{ Project: "X", Timestamp: "not a date" }], "X", F.M1_TODAY), null);

  section("M-1 — stalenessLevel bands");

  check("null (never logged) -> 'never'", ctx.stalenessLevel(null), "never");
  check("0 days -> green", ctx.stalenessLevel(0), "green");
  check("7 days (boundary) -> green", ctx.stalenessLevel(7), "green");
  check("8 days -> yellow", ctx.stalenessLevel(8), "yellow");
  check("14 days (boundary) -> yellow", ctx.stalenessLevel(14), "yellow");
  check("15 days -> red", ctx.stalenessLevel(15), "red");
  check("60 days -> red", ctx.stalenessLevel(60), "red");
}

module.exports = { run };
if (require.main === module) { run(); require("./harness").report(); }
