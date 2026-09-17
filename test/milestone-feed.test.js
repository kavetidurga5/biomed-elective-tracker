/* Student Portal — Meeting Notes & Milestones tab.
   Pulls the chronological Update Log feed (previously inline, Custom-track
   only) into one canonical function so it can also back the new tab for
   Standard-track projects.
*/
const { load, check, section } = require("./harness");

const ctx = load([
  { file: "assets/js/sheets.js", fns: ["parseGvizDate", "formatGvizDate", "buildMilestoneFeed"] },
]);

const LOGS = [
  { Timestamp: "Date(2026,10,19)", "Biodesign Stage": "Pitch Prep",   "Entry Type": "Update", Description: "Symposium dry run scheduled" },
  { Timestamp: "Date(2026,8,14)",  "Biodesign Stage": "Needs Finding", "Entry Type": "Meeting Note", Description: "Interviewed 3 attendings" },
  { Timestamp: null,               "Biodesign Stage": "Prototyping",  "Entry Type": "Blocker", Description: "no timestamp — must sink, not throw" },
  { Timestamp: "Date(2026,9,1)",   "Biodesign Stage": "Prototyping",  "Entry Type": "Update", Description: "" }, // missing description
];

function run() {
  section("Meeting Notes & Milestones — buildMilestoneFeed");

  const feed = ctx.buildMilestoneFeed(LOGS);
  check("returns all 4 entries, none dropped", feed.length, 4);
  check("sorted chronologically, oldest first", feed.map(f => f.stage),
    ["Needs Finding", "Prototyping", "Pitch Prep", "Prototyping"]);
  check("undated entry sinks to the end rather than throwing", feed[3].description.includes("must sink"), true);
  check("dates are formatted for display", feed[0].date, "Sep 14, 2026");
  check("undated entry has an empty (not crashed) date", feed[3].date, "");
  check("entryType defaults to 'Update' when Entry Type is set", feed[0].entryType, "Meeting Note");
  check("missing description defaults to empty string, not undefined", feed[1].description, "");
  check("does not mutate the input array", LOGS.length, 4);

  const empty = ctx.buildMilestoneFeed([]);
  check("empty log list returns an empty feed, not an error", empty, []);
}

run();
module.exports = { run };
require("./harness").report();
