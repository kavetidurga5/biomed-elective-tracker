/* Real per-project access gating — client-side pieces.
   The Apps Script doGet handler itself lives outside this repo (in the
   Sheet's script editor) and can't be unit-tested here; these two pure
   functions are everything on the client side that isn't a bare fetch()
   call, and they're what a wrong URL or a misread response would break.
*/
const { load, check, section } = require("./harness");

const ctx = load([
  { file: "assets/js/sheets.js", fns: ["buildGatedApiUrl", "parseGatedResponse"] },
]);

function run() {
  section("Gated access — buildGatedApiUrl");

  const url = ctx.buildGatedApiUrl("https://script.google.com/macros/s/ABC123/exec", "DDH Task Trainer", "xyz789");
  check("includes the base URL", url.startsWith("https://script.google.com/macros/s/ABC123/exec"), true);
  check("project name is present and URL-encoded", url.includes("project=DDH%20Task%20Trainer"), true);
  check("token is present", url.includes("token=xyz789"), true);
  check("uses ? for the first param", url.includes("?project="), true);

  const withExistingQuery = ctx.buildGatedApiUrl("https://example.com/exec?debug=1", "Shoulder Dislocation", "tok");
  check("appends with & when the base already has a query string", withExistingQuery.includes("?debug=1&project="), true);

  // A token or project name containing characters that would otherwise
  // break the query string (&, #, =) must not corrupt the other param.
  // Parens are left unescaped by encodeURIComponent — that's correct,
  // they're safe/legal inside a query string, not a delimiter.
  const messyToken = ctx.buildGatedApiUrl("https://example.com/exec", "Upper Extremity Nerve Block (Hand)", "a&b=c");
  check("special characters in the token don't leak a second param", messyToken.includes("token=a%26b%3Dc"), true);
  check("project name with parens round-trips intact", messyToken.includes("project=Upper%20Extremity%20Nerve%20Block%20(Hand)"), true);

  section("Gated access — parseGatedResponse");

  const errorBody = { error: "Invalid project or token." };
  const parsedError = ctx.parseGatedResponse(errorBody);
  check("an error response is flagged not-ok", parsedError.ok, false);
  check("the error message passes through", parsedError.error, "Invalid project or token.");

  const successBody = { dashboard: [{ Project: "X" }], roster: [], presentations: [], syllabus: [], updateLog: [], deliverables: [] };
  const parsedSuccess = ctx.parseGatedResponse(successBody);
  check("a data response is flagged ok", parsedSuccess.ok, true);
  check("the data passes through unchanged", parsedSuccess.data, successBody);

  check("null response doesn't throw, treated as ok with null data", ctx.parseGatedResponse(null).ok, true);
}

run();
module.exports = { run };
require("./harness").report();
