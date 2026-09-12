/* repro.js — demonstrates the P0 defects against the CURRENT code.
   Run before fixing to confirm the audit; after fixing these should flip.
*/
const { load } = require("./harness");
const F = require("./fixtures");

const ctx = load([{ file: "assets/js/sheets.js", fns: ["parseGvizDate"] }]);

console.log("P0-1 — lexicographic sort of gviz timestamps");
const stringSorted = F.SORT_LOGS.slice()
  .sort((a, b) => String(a["Timestamp"]).localeCompare(String(b["Timestamp"])))
  .map(r => r.Timestamp);
console.log("  current (string sort): ", stringSorted.join("  \u2192  "));
console.log("  true chronological:    ", F.SORT_EXPECTED_CHRONOLOGICAL.join("  \u2192  "));
console.log("  MATCH:", JSON.stringify(stringSorted) === JSON.stringify(F.SORT_EXPECTED_CHRONOLOGICAL));

console.log("\nP0-2 — fill % from lastReachedIdx, unbounded reach");
const checkpointsNaive = F.SYLLABUS_12.map(row => {
  const expected = (row["Expected Stage"] || "").trim();
  const matches = F.LOGS_EARLY_PITCH.filter(
    l => (l["Biodesign Stage"] || "").trim().toLowerCase() === expected.toLowerCase()
  );
  return { week: row.Week, stage: expected, reached: matches.length > 0 };
});
const lastReachedIdx = checkpointsNaive.reduce((acc, c, i) => (c.reached ? i : acc), -1);
const naiveFill = (lastReachedIdx / (checkpointsNaive.length - 1)) * 100;
console.log("  one early 'Pitch Prep' entry in Week 4 \u2192 fill =", naiveFill.toFixed(0) + "%");
console.log("  checkpoints actually reached:", checkpointsNaive.filter(c => c.reached).length, "of 12");

const shared = F.SYLLABUS_12.map(row => {
  const expected = (row["Expected Stage"] || "").trim();
  const matches = F.LOGS_ONE_PROTOTYPING.filter(
    l => (l["Biodesign Stage"] || "").trim().toLowerCase() === expected.toLowerCase()
  );
  return { week: row.Week, reached: matches.length > 0 };
});
console.log("  one 'Prototyping' entry lights weeks:",
  shared.filter(c => c.reached).map(c => c.week).join(", "), "(should be 5 only)");

console.log("\nP0-3 — null timestamp \u2192 epoch");
const epoch = F.ALERT_LOGS
  .map(r => ({ ...r, _ts: ctx.parseGvizDate(r["Timestamp"]) || new Date(r["Timestamp"]) }))
  .filter(r => r._ts && !isNaN(r._ts));
console.log("  rows surviving filter:", epoch.length, "(should be 1)");
epoch.forEach(r => console.log("    \u2192", r._ts.toDateString(), "|", r.Description.slice(0, 40)));
