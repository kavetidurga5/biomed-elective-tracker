/* P0-4 interim mitigation — the public alerts card must not render
   Student Name. This is privacy-sensitive (FERPA-adjacent per the
   remediation brief), so it gets its own check rather than trusting a
   visual read of the diff.

   Extracts the exact template literal used in index.html's alerts
   renderer and evaluates it against fixture rows, then asserts the
   output HTML contains no name field.
*/
const { read, load, check, checkTrue, section } = require("./harness");
const F = require("./fixtures");

function extractAlertsTemplate(src) {
  const marker = 'container.innerHTML = alerts.map(r => `';
  const start = src.indexOf(marker);
  if (start === -1) throw new Error("alerts render template not found — did the markup change?");
  const tplStart = start + marker.length - 1; // include the opening backtick
  const tplEnd = src.indexOf("`).join", tplStart);
  if (tplEnd === -1) throw new Error("closing of alerts template not found");
  return src.slice(tplStart, tplEnd + 1);
}

function run() {
  section("P0-4 — public alerts card excludes Student Name");

  const src = read("index.html");
  checkTrue("source no longer references Student Name in the alerts render path",
    !extractAlertsTemplate(src).includes("Student Name"));
  checkTrue("source no longer references a bare Name fallback in the alerts render path",
    !extractAlertsTemplate(src).includes('r["Name"]'));

  const ctx = load([{ file: "index.html", fns: ["escapeHtml", "parseGvizDate", "fmtDate"] }]);
  const tpl = extractAlertsTemplate(src);
  const renderRow = new Function("r", "escapeHtml", "fmtDate",
    "return " + tpl.replace(/^r => /, "") + ";"
  );

  const row = { ...F.ALERT_LOGS[0], _ts: ctx.parseGvizDate(F.ALERT_LOGS[0].Timestamp) };
  const html = renderRow(row, ctx.escapeHtml, ctx.fmtDate);

  checkTrue("rendered HTML contains the project name", html.includes("DDH Task Trainer"));
  checkTrue("rendered HTML contains the description", html.includes("Room booking blocked"));
  checkTrue("rendered HTML does NOT contain the student's name", !html.includes("Test Student"));
}

module.exports = { run };
if (require.main === module) { run(); require("./harness").report(); }
