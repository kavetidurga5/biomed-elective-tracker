/* P1-13 — retire the hardcoded COURSE_EVENTS array.
   Guest Speaker / Workshop / Symposium events must derive live from the
   syllabus tab's Topic column, not a static duplicate array — rescheduling
   a guest speaker in the Sheet must be reflected with no code change.

   DELIVERABLES stays hardcoded (flagged, blocked on the M-3 Deliverables
   tab schema change), so buildUpcomingEvents still accepts it as an
   explicit second argument rather than reading a tab that doesn't exist.
*/
const { load, check, section } = require("./harness");

const ctx = load([
  { file: "index.html", fns: ["classifyEventType", "buildUpcomingEvents"] },
]);

const TODAY = new Date(2026, 8, 12); // Sep 12 2026

function run() {
  section("P1-13 — classifyEventType");

  check("Guest Speaker topic classified", ctx.classifyEventType("Guest Speaker: Dr. Ying"), "Guest Speaker");
  check("Workshop topic classified", ctx.classifyEventType("Workshop Field Trip"), "Workshop");
  check("Pitch Day classified as Symposium", ctx.classifyEventType("Pitch Day — Final Innovation Symposium"), "Symposium");
  check("plain lecture classified as Class Session", ctx.classifyEventType("Lecture: Needs Assessment"), "Class Session");
  check("case-insensitive match", ctx.classifyEventType("GUEST SPEAKER: X"), "Guest Speaker");
  check("null/empty topic doesn't throw", ctx.classifyEventType(null), "Class Session");

  section("P1-13 — buildUpcomingEvents derives live from syllabus, not a static list");

  const weeks = [
    { date: new Date(2026, 8, 3),  topic: "Introductory Day" },
    { date: new Date(2026, 8, 24), topic: "Guest Speaker: Human-Centered Design & Human Factors" },
    { date: new Date(2026, 9, 8),  topic: "Workshop Field Trip" },
    { date: new Date(2026, 10, 19), topic: "Pitch Day — Final Innovation Symposium" },
  ];
  const deliverables = [
    { date: new Date(2026, 8, 8), label: "Project Preference Ranking due" }, // past
    { date: new Date(2026, 9, 1), label: "Project Proposal due" },            // future
  ];

  const events = ctx.buildUpcomingEvents(weeks, deliverables, TODAY);

  check("past events (before TODAY) are excluded",
    events.some(e => e.label === "Introductory Day"), false);
  check("past deliverables are excluded",
    events.some(e => e.label === "Project Preference Ranking due"), false);
  check("future guest speaker, workshop, symposium, and deliverable all included",
    events.map(e => e.label).sort(),
    ["Guest Speaker: Human-Centered Design & Human Factors", "Pitch Day — Final Innovation Symposium",
     "Project Proposal due", "Workshop Field Trip"].sort());
  check("events are sorted chronologically",
    events.map(e => e.label),
    ["Guest Speaker: Human-Centered Design & Human Factors", "Project Proposal due",
     "Workshop Field Trip", "Pitch Day — Final Innovation Symposium"]);
  check("deliverable events are typed 'Deliverable'",
    events.find(e => e.label === "Project Proposal due").type, "Deliverable");

  // The core P1-13 guarantee: a syllabus change (reschedule) is picked up
  // automatically because nothing is duplicated in a static array.
  const rescheduled = weeks.map(w =>
    w.topic.startsWith("Guest Speaker") ? { ...w, date: new Date(2026, 10, 1) } : w
  );
  const afterReschedule = ctx.buildUpcomingEvents(rescheduled, [], TODAY);
  check("rescheduling a guest speaker in the source data moves it automatically",
    afterReschedule.find(e => e.type === "Guest Speaker").date.getTime(),
    new Date(2026, 10, 1).getTime());

  check("empty syllabus + empty deliverables => empty, no throw",
    ctx.buildUpcomingEvents([], [], TODAY).length, 0);
}

module.exports = { run };
if (require.main === module) { run(); require("./harness").report(); }
