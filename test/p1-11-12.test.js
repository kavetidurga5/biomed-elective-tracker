/* P1-11 — escapeHtml must protect attribute context (quotes), not just
   element context (< >).
   P1-12 — current.stage must be escaped before reaching innerHTML.

   Acceptance (brief): input  x" onerror=alert(1) x="
                       must NOT produce a working onerror handler.
*/
const { load, check, checkTrue, section, read } = require("./harness");
const F = require("./fixtures");

function run() {
  section("P1-11 — escapeHtml protects attribute context");

  const shared = load([{ file: "assets/js/sheets.js", fns: ["escapeHtml", "safeLink"] }]);
  check("escapes double quotes", shared.escapeHtml('a"b'), "a&quot;b");
  check("escapes single quotes", shared.escapeHtml("a'b"), "a&#39;b");
  check("still escapes < and >", shared.escapeHtml("<b>"), "&lt;b&gt;");
  check("null-safe", shared.escapeHtml(null), "");

  // Confirm every page actually references the shared copy rather than a
  // local one that could drift back out of sync.
  for (const file of ["index.html", "projects/index.html", "projects/project.html"]) {
    const src = read(file);
    checkTrue(`${file}: no local escapeHtml definition remains`,
      !src.includes("function escapeHtml("));
    checkTrue(`${file}: no local safeLink definition remains`,
      !src.includes("function safeLink("));
  }

  // The exact hostile string from the brief's attribute-breakout example.
  const ctx = shared;
  const hostile = F.HOSTILE_LINK_ROW.Link; // x" onerror=alert(1) x="
  const rendered = `<a href="${ctx.escapeHtml(hostile)}">`;
  checkTrue("hostile Link value can no longer break out of href=\"...\"",
    !rendered.includes('onerror=alert(1) x=""'));
  check("the quote itself is neutralized", ctx.escapeHtml(hostile),
    "x&quot; onerror=alert(1) x=&quot;");

  section("P1-11 — safeLink scheme whitelist");

  const links = shared;
  check("https:// passes through", links.safeLink("https://example.com/x"), "https://example.com/x");
  check("http:// passes through", links.safeLink("http://example.com"), "http://example.com");
  check("javascript: scheme is stripped to empty", links.safeLink(F.JS_SCHEME_LINK_ROW.Link), "");
  check("empty/null input is empty", links.safeLink(null), "");
  check("data: scheme is stripped", links.safeLink("data:text/html,<script>alert(1)</script>"), "");
  check("bare relative path is stripped (no scheme = not rendered as a link)",
    links.safeLink("assets/docs/x.pdf"), "");

  section("P1-12 — Expected Stage escaped before innerHTML");

  const hostileStage = '<img src=x onerror=alert(1)>';
  check("hostile stage value is neutralized", shared.escapeHtml(hostileStage),
    "&lt;img src=x onerror=alert(1)&gt;");
}

module.exports = { run };
if (require.main === module) { run(); require("./harness").report(); }
