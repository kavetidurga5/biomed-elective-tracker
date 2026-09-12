/* P0-1 — chronological sorting of gviz timestamps.
   Acceptance (brief §1): feed the four-date fixture through the sort;
   assert output order matches "True chronological".
*/
const { load, check, section } = require("./harness");
const F = require("./fixtures");

const ctx = load([
  { file: "projects/project.html", fns: ["parseGvizDate", "byTimestamp"], consts: ["tsOf"] },
]);

function run() {
  section("P0-1 — chronological sorting");

  check(
    "four mixed Sep/Oct/Nov dates sort chronologically",
    F.SORT_LOGS.slice().sort(ctx.byTimestamp).map(r => r.Timestamp),
    F.SORT_EXPECTED_CHRONOLOGICAL
  );

  check(
    "single-digit day (Sep 3) precedes double-digit (Sep 14)",
    ctx.byTimestamp({ Timestamp: "Date(2026,8,3)" }, { Timestamp: "Date(2026,8,14)" }) < 0,
    true
  );

  check(
    "undated rows sink to the end rather than throwing",
    F.SORT_LOGS_WITH_NULL.slice().sort(ctx.byTimestamp).map(r => r.Timestamp),
    [...F.SORT_EXPECTED_CHRONOLOGICAL, null]
  );

  check(
    "two undated rows compare equal",
    ctx.byTimestamp({ Timestamp: null }, { Timestamp: null }),
    0
  );

  check(
    "plain-ISO syllabus dates sort against gviz Date() literals",
    [{ Timestamp: "Date(2026,9,1)" }, { Timestamp: "2026-09-03" }]
      .sort(ctx.byTimestamp).map(r => r.Timestamp),
    ["2026-09-03", "Date(2026,9,1)"]
  );
}

module.exports = { run };
if (require.main === module) { run(); require("./harness").report(); }
