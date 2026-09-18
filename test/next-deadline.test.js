/* Student Portal — Overview "Next Deadline".
   Replaces the old Dashboard "Next Presentation" field with the soonest
   not-yet-submitted deliverable, so it's always in sync with the shared
   deliverable schedule rather than a manually-typed cell.
*/
const { load, check, section } = require("./harness");

const ctx = load([
  { file: "assets/js/sheets.js", fns: ["nextDeadlineFrom"] },
]);

function run() {
  section("Overview Next Deadline — nextDeadlineFrom");

  const items = [
    { deliverable: "Team Formation", dueDate: new Date(2026, 8, 9), status: "submitted" },
    { deliverable: "Project Proposal", dueDate: new Date(2026, 9, 1), status: "pending" },
    { deliverable: "Mid-Semester Check-In", dueDate: new Date(2026, 9, 22), status: "pending" },
  ];
  const next = ctx.nextDeadlineFrom(items);
  check("skips submitted items and returns the next pending one", next.deliverable, "Project Proposal");

  const late = [
    { deliverable: "Team Formation", dueDate: new Date(2026, 8, 9), status: "submitted" },
    { deliverable: "Project Proposal", dueDate: new Date(2026, 9, 1), status: "late" },
  ];
  check("a late (not just pending) item still counts as the next deadline", ctx.nextDeadlineFrom(late).deliverable, "Project Proposal");

  const allDone = [
    { deliverable: "Team Formation", dueDate: new Date(2026, 8, 9), status: "submitted" },
    { deliverable: "Project Proposal", dueDate: new Date(2026, 9, 1), status: "submitted" },
  ];
  check("all-submitted project returns null rather than throwing", ctx.nextDeadlineFrom(allDone), null);

  check("empty deliverable list returns null", ctx.nextDeadlineFrom([]), null);
}

run();
module.exports = { run };
require("./harness").report();
