/* Student Portal — Team Needs tab.
   Filters Update Log to "Needs Admin Support" entries only, using the
   same type.includes("admin") test index.html's selectAlerts() uses, so
   this tab and the admin dashboard's open-alerts queue agree on what
   counts as an admin-support ask. Admin Confirmed / Team Confirmed are
   new optional columns — both must be safe when entirely absent, since
   no project's Update Log has them yet.
*/
const { load, check, section } = require("./harness");

const ctx = load([
  { file: "assets/js/sheets.js", fns: ["parseGvizDate", "formatGvizDate", "buildTeamNeeds"] },
]);

const LOGS = [
  { Timestamp: "Date(2026,9,24)", "Entry Type": "Needs Admin Support", Description: "3D printer access", "Student Name": "Nikhil Garlapati" },
  { Timestamp: "Date(2026,8,10)", "Entry Type": "Needs admin help",    Description: "Material waiver",   "Student Name": "Brandon Zhao", "Admin Confirmed": "Yes" },
  { Timestamp: "Date(2026,8,18)", "Entry Type": "Blocker",             Description: "not an admin request — must be excluded", "Student Name": "Someone" },
  { Timestamp: "Date(2026,7,18)", "Entry Type": "Needs Admin Support", Description: "Room booking conflict", "Student Name": "Durga Kaveti", "Admin Confirmed": "TRUE", "Team Confirmed": "x" },
  { Timestamp: "Date(2026,7,1)",  "Entry Type": "Needs Admin Support", Description: "no confirmation columns present at all" },
];

function run() {
  section("Team Needs — buildTeamNeeds");

  const needs = ctx.buildTeamNeeds(LOGS);
  check("only admin-support rows are included (Blocker excluded)", needs.length, 4);
  check("matching is case-insensitive on Entry Type", needs.some(n => n.description === "Material waiver"), true);
  check("sorted newest first", needs.map(n => n.description),
    ["3D printer access", "Material waiver", "Room booking conflict", "no confirmation columns present at all"]);

  const printerReq = needs.find(n => n.description === "3D printer access");
  check("submittedBy carries through", printerReq.submittedBy, "Nikhil Garlapati");
  check("adminConfirmed defaults false when column absent", printerReq.adminConfirmed, false);
  check("teamConfirmed defaults false when column absent", printerReq.teamConfirmed, false);

  const waiverReq = needs.find(n => n.description === "Material waiver");
  check("adminConfirmed true for 'Yes'", waiverReq.adminConfirmed, true);
  check("teamConfirmed still false — independent flags", waiverReq.teamConfirmed, false);

  const roomReq = needs.find(n => n.description === "Room booking conflict");
  check("adminConfirmed true for 'TRUE'", roomReq.adminConfirmed, true);
  check("teamConfirmed true for 'x'", roomReq.teamConfirmed, true);

  const noColsReq = needs.find(n => n.description === "no confirmation columns present at all");
  check("row with neither confirmation column at all still renders safely", noColsReq.adminConfirmed, false);

  const empty = ctx.buildTeamNeeds([]);
  check("empty log list returns an empty array, not an error", empty, []);
}

run();
module.exports = { run };
require("./harness").report();
