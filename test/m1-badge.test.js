/* M-1 (grid page) — the per-project staleness badge. */
const { load, check, checkTrue, section } = require("./harness");

const ctx = load([
  { file: "assets/js/sheets.js", fns: ["stalenessLevel", "escapeHtml"], consts: ["STALENESS_EMOJI", "STALENESS_LABEL"] },
  { file: "projects/index.html", fns: ["renderStalenessBadge"] },
]);

function run() {
  section("M-1 — project card staleness badge");

  checkTrue("green badge for a recent update", ctx.renderStalenessBadge(2).includes("staleness-green"));
  checkTrue("yellow badge for a 10-day-old update", ctx.renderStalenessBadge(10).includes("staleness-yellow"));
  checkTrue("red badge for a 20-day-old update", ctx.renderStalenessBadge(20).includes("staleness-red"));
  checkTrue("never-logged badge is its own state", ctx.renderStalenessBadge(null).includes("staleness-never"));
  checkTrue("never-logged badge says so in text", ctx.renderStalenessBadge(null).includes("Never logged"));
  checkTrue("dated badge includes the day count", ctx.renderStalenessBadge(5).includes("5d since last update"));
}

module.exports = { run };
if (require.main === module) { run(); require("./harness").report(); }
