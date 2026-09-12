/* P1-8 — blank Project rows must not render ghost cards. */
const { load, check, section } = require("./harness");
const F = require("./fixtures");

const ctx = load([{ file: "projects/index.html", fns: ["selectProjectRows"] }]);

function run() {
  section("P1-8 — ghost row filtering");

  const kept = ctx.selectProjectRows(F.DASHBOARD_ROWS);
  check("whitespace-only Project row is dropped",
    kept.map(r => r["Project"]),
    ["DDH Task Trainer", "Airway Trainer", "Legacy Sim Cart", "Suture Pad v2"]);

  check("null Project is dropped", ctx.selectProjectRows([{ Project: null }]).length, 0);
  check("empty array stays empty", ctx.selectProjectRows([]).length, 0);
  check("a real project with other blank fields is kept",
    ctx.selectProjectRows([{ Project: "X", "Current Stage": null }]).length, 1);
}

module.exports = { run };
if (require.main === module) { run(); require("./harness").report(); }
