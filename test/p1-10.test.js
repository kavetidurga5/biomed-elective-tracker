/* P1-10 — join key normalization.
   A trailing space or case difference in one tab must not break the
   join to Dashboard. Also confirms the URL-building id is trimmed.
*/
const { load, check, section } = require("./harness");
const F = require("./fixtures");

const ctx = load([{ file: "projects/project.html", fns: ["projectKey"] }]);

function run() {
  section("P1-10 — join key normalization");

  check("trailing space is stripped", ctx.projectKey("DDH Task Trainer "), "ddh task trainer");
  check("case is folded", ctx.projectKey("DDH TASK TRAINER"), "ddh task trainer");
  check("null/undefined normalize to empty string", ctx.projectKey(null), "");
  check("both sides of a trailing-space mismatch now match",
    ctx.projectKey(F.ROSTER_ROWS[0]["Project"]) === ctx.projectKey("DDH Task Trainer"), true);
  check("case-only mismatch now matches",
    ctx.projectKey(F.ROSTER_ROWS[1]["Project"]) === ctx.projectKey("DDH Task Trainer"), true);
  check("genuinely different projects still don't match",
    ctx.projectKey("Airway Trainer") === ctx.projectKey("DDH Task Trainer"), false);

  const roster = F.ROSTER_ROWS.filter(r => ctx.projectKey(r["Project"]) === ctx.projectKey("DDH Task Trainer"));
  check("roster join now finds both variants of the same project", roster.length, 2);
}

module.exports = { run };
if (require.main === module) { run(); require("./harness").report(); }
