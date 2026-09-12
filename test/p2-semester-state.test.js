/* P2 — pre-semester and post-semester states.
   Before this fix: a date before Week 1 defaulted to "Week 1" (wrong —
   the course hadn't started), and a date after the last week stuck on
   "Week 12 of 12" forever (wrong — the course had ended).
*/
const { load, check, section } = require("./harness");

const ctx = load([{ file: "index.html", fns: ["classifyWeekState"] }]);

const WEEKS = [
  { week: 1,  date: new Date(2026, 8, 3),  topic: "Introductory Day" },
  { week: 2,  date: new Date(2026, 8, 10), topic: "Needs Assessment" },
  { week: 12, date: new Date(2026, 10, 19), topic: "Pitch Day" },
];

function run() {
  section("P2 — classifyWeekState");

  check("empty syllabus => no-data", ctx.classifyWeekState([], new Date()).state, "no-data");

  check("a date before Week 1 => pre-semester",
    ctx.classifyWeekState(WEEKS, new Date(2026, 7, 20)).state, "pre-semester");

  check("the exact date of Week 1 => in-progress, not pre-semester",
    ctx.classifyWeekState(WEEKS, new Date(2026, 8, 3)).state, "in-progress");

  check("a date mid-semester => in-progress, current week correct",
    ctx.classifyWeekState(WEEKS, new Date(2026, 8, 12)).current.week, 2);

  check("the exact date of the last week => in-progress, not post-semester",
    ctx.classifyWeekState(WEEKS, new Date(2026, 10, 19)).state, "in-progress");

  check("a date after the last week => post-semester",
    ctx.classifyWeekState(WEEKS, new Date(2026, 10, 20)).state, "post-semester");

  check("a date long after the last week is still post-semester (doesn't revert)",
    ctx.classifyWeekState(WEEKS, new Date(2027, 2, 1)).state, "post-semester");

  const pre = ctx.classifyWeekState(WEEKS, new Date(2026, 7, 1));
  check("pre-semester result carries firstWeek and lastWeek for messaging",
    [pre.firstWeek.week, pre.lastWeek.week], [1, 12]);

  const post = ctx.classifyWeekState(WEEKS, new Date(2026, 11, 1));
  check("post-semester result carries lastWeek for messaging", post.lastWeek.week, 12);
}

module.exports = { run };
if (require.main === module) { run(); require("./harness").report(); }
