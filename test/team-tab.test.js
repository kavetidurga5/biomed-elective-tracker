/* Student Portal — Team tab.
   "Team pages should host team info (headshots, background, etc.) as a
   tab under the project's page." Bio/Headshot are manually populated in
   the Roster tab for now (no upload form yet), so both must be optional.
*/
const { load, check, section } = require("./harness");

const ctx = load([
  { file: "assets/js/sheets.js", fns: ["buildTeamRoster"] },
]);

const ROSTER = [
  { Project: "Shoulder Dislocation", "Student Name": "Ana Ruiz", Bio: "MS2 interested in ortho.", Headshot: "ana-ruiz.jpg" },
  { Project: "Shoulder Dislocation", "Student Name": "Devon Cole", Bio: "", Headshot: "" }, // no bio/headshot on file yet
  { Project: "Patellar Dislocation ", "Student Name": "Priya Nair", Bio: "MS2, biomedical engineering background.", Headshot: "priya-nair.jpg" }, // trailing space, matches P1-10 pattern
  { Project: "  shoulder dislocation", "Student Name": "Sam Lee", Bio: "", Headshot: "sam-lee.jpg" }, // case/whitespace-insensitive match
  { Project: "Shoulder Dislocation", "Student Name": "", Bio: "orphan blank row", Headshot: "" }, // blank name row, must be dropped
];

function run() {
  section("Team tab — buildTeamRoster");

  const team = ctx.buildTeamRoster(ROSTER, "Shoulder Dislocation");
  check("finds all 3 real members for the project (case/whitespace-insensitive)", team.length, 3);
  check("names in original row order", team.map(m => m.name), ["Ana Ruiz", "Devon Cole", "Sam Lee"]);
  check("bio present when set", team[0].bio, "MS2 interested in ortho.");
  check("bio defaults to empty string when not yet on file", team[1].bio, "");
  check("headshot defaults to empty string when not yet on file", team[1].headshot, "");
  check("headshot present when set", team[2].headshot, "sam-lee.jpg");

  const other = ctx.buildTeamRoster(ROSTER, "Patellar Dislocation");
  check("other project's team is isolated — does not include Shoulder Dislocation members", other.length, 1);
  check("other project's member is correct", other[0].name, "Priya Nair");

  const blankName = ctx.buildTeamRoster(ROSTER, "Shoulder Dislocation").some(m => m.name === "");
  check("blank-name rows are dropped, not rendered as an empty member", blankName, false);

  const none = ctx.buildTeamRoster(ROSTER, "No Such Project");
  check("unknown project returns an empty team, not an error", none, []);
}

run();
module.exports = { run };
require("./harness").report();
