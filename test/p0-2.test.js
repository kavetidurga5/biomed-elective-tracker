/* Timeline — calendar-synced roadmap.

   Design, per Durga (2026-09-18), REVERSING the original P0-2 decision
   this file used to test: reach is now bound ONLY to the checkpoint's
   own calendar date, identical for every project, with no Update Log
   input at all.

   Why the reversal: date-unbound reach let one early log claim a
   later-week checkpoint (e.g. an early "Pitch Prep" entry lighting
   Week 11 while the class was still in Week 3), which on a timeline
   literally labeled "mapped to syllabus" read as visibly broken —
   later weeks lit up while earlier ones weren't. The old
   buildCheckpoints()/roadmap-detail (click-to-expand debrief) are gone;
   see buildSyllabusCalendar in project.html.
*/
const { load, check, checkTrue, section } = require("./harness");
const F = require("./fixtures");

const ctx = load([
  { file: "assets/js/sheets.js", fns: ["formatGvizDate", "parseGvizDate"] },
  { file: "projects/project.html", fns: ["buildSyllabusCalendar", "roadmapFillPct"] },
]);

function run() {
  section("Timeline — buildSyllabusCalendar (calendar-only reach)");

  // "We just had Week 3 lecture completed" — Sep 17 2026 is Week 3's date;
  // Sep 18 (the day after) should show Weeks 1-3 reached, Week 4+ not.
  const dayAfterWeek3 = new Date(2026, 8, 18);
  const cps = ctx.buildSyllabusCalendar(F.SYLLABUS_12, dayAfterWeek3);
  check("12 checkpoints built", cps.length, 12);
  check("Weeks 1-3 are reached (dates have passed)", cps.slice(0, 3).every(c => c.reached), true);
  check("Week 4 onward is NOT reached (date hasn't happened yet)", cps.slice(3).some(c => c.reached), false);
  check("exactly 3 reached", cps.filter(c => c.reached).length, 3);
  check("fill = 3/12 = 25%", ctx.roadmapFillPct(cps), 25);

  // ── No log data changes anything — this is the whole point ─────────
  // buildSyllabusCalendar doesn't even take a logs argument anymore, so
  // there's no "early log claims a later week" case left to test; the
  // function signature itself makes that bug structurally impossible.
  checkTrue("function takes exactly 2 params (syllabusRows, today) — no logs input",
    ctx.buildSyllabusCalendar.length === 2);

  // ── Same date, on the week itself, not just the day after ──────────
  const onWeek3 = new Date(2026, 8, 17);
  const cpsOnDay = ctx.buildSyllabusCalendar(F.SYLLABUS_12, onWeek3);
  check("a week is reached on its own date, not just after", cpsOnDay[2].reached, true);

  // ── Sorted by Week even if the syllabus rows arrive out of order ───
  const shuffled = [F.SYLLABUS_12[2], F.SYLLABUS_12[0], F.SYLLABUS_12[1]];
  const cpsShuffled = ctx.buildSyllabusCalendar(shuffled, dayAfterWeek3);
  check("output is sorted by Week regardless of input order", cpsShuffled.map(c => c.week), [1, 2, 3]);

  // ── Degenerate inputs ────────────────────────────────────────────
  check("empty syllabus => no checkpoints", ctx.buildSyllabusCalendar([], dayAfterWeek3).length, 0);
  check("empty checkpoints => fill 0, no divide-by-zero", ctx.roadmapFillPct([]), 0);

  const badDateSyllabus = [{ Week: 1, Date: "not a date", Topic: "X", "Expected Stage": "Ideation" }];
  check("checkpoint with an unparseable Date is simply never reached, not thrown",
    ctx.buildSyllabusCalendar(badDateSyllabus, dayAfterWeek3)[0].reached, false);

  // ── Before the course has started at all ────────────────────────
  const beforeCourseStart = new Date(2026, 7, 1); // Aug 1, before Week 1
  const cpsBefore = ctx.buildSyllabusCalendar(F.SYLLABUS_12, beforeCourseStart);
  check("nothing is reached before the course starts", cpsBefore.filter(c => c.reached).length, 0);
}

module.exports = { run };
if (require.main === module) { run(); require("./harness").report(); }
