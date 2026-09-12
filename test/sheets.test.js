/* sheets.js — data layer behaviour (P1-5, P1-6, P1-9).

   Runs the ENTIRE real sheets.js inside a vm with a mocked fetch, so these
   assertions cover the shipped file rather than a reimplementation.
*/
const vm = require("vm");
const { read, check, checkTrue, section } = require("./harness");

const GVIZ_PREFIX = "/*O_o*/\ngoogle.visualization.Query.setResponse(";
const GVIZ_SUFFIX = ");";

function envelope(obj) { return GVIZ_PREFIX + JSON.stringify(obj) + GVIZ_SUFFIX; }

/** Build a gviz table payload from a header array + array-of-arrays rows. */
function table(headers, rows, { parsedNumHeaders = 0 } = {}) {
  const cols = headers.map(h => ({ label: parsedNumHeaders ? h : "", type: "string" }));
  const bodyRows = (parsedNumHeaders ? rows : [headers, ...rows])
    .map(r => ({ c: r.map(v => (v === null || v === undefined ? null : { v })) }));
  return { status: "ok", table: { cols, parsedNumHeaders, rows: bodyRows } };
}

/** Load sheets.js with a fetch that returns whatever `responder` says. */
function loadSheets(responder) {
  const calls = [];
  const ctx = vm.createContext({
    console: { log() {}, warn() {}, error() {} },
    Date, Math, JSON, String, Number, Array, Object, parseInt, parseFloat, isNaN,
    Promise, Error, RegExp,
    fetch: async (url) => { calls.push(url); return responder(url); },
  });
  vm.runInContext(read("assets/js/sheets.js"), ctx, { filename: "sheets.js" });
  ctx.__calls = calls;
  return ctx;
}

const okResponse = body => ({ ok: true, status: 200, text: async () => body });

async function rejects(fn) {
  try { await fn(); return null; } catch (e) { return e; }
}

async function run() {
  section("sheets.js — P1-5 error vs empty");

  // Network failure
  let ctx = loadSheets(() => { throw new Error("ENOTFOUND"); });
  let err = await rejects(() => ctx.fetchTab("123"));
  checkTrue("network failure throws instead of returning []", !!err);
  check("  reason = network", err && err.reason, "network");

  // Non-200
  ctx = loadSheets(() => ({ ok: false, status: 404, text: async () => "" }));
  err = await rejects(() => ctx.fetchTab("123"));
  check("HTTP error throws with reason=http", err && err.reason, "http");

  // gviz status:error (sheet exists but query rejected)
  ctx = loadSheets(() => okResponse(envelope({ status: "error", errors: [{ message: "access_denied", detailed_message: "not shared" }] })));
  err = await rejects(() => ctx.fetchTab("123"));
  check("gviz error status throws with reason=gviz", err && err.reason, "gviz");
  checkTrue("  gviz error message is surfaced", /not shared/.test(err.message));

  section("sheets.js — P1-6 envelope robustness");

  // The canonical failure: HTTP 200 carrying an HTML login page.
  const loginPage = "<!DOCTYPE html><html><head><title>Sign in</title></head><body>Google Accounts</body></html>";
  ctx = loadSheets(() => okResponse(loginPage));
  err = await rejects(() => ctx.fetchTab("123"));
  checkTrue("HTML login page at HTTP 200 throws, does not yield []", !!err);
  check("  reason = envelope", err && err.reason, "envelope");
  checkTrue("  message names the likely cause", /unshared|not JSON/i.test(err.message));

  // Wrapper with different whitespace/padding must still parse.
  ctx = loadSheets(() => okResponse(
    "/*O_o*/\ngoogle.visualization.Query.setResponse(" +
    JSON.stringify(table(["Project", "Current Stage"], [["DDH", "Prototyping"]])) + ");\n"
  ));
  let rows = await ctx.fetchTab("123");
  check("trailing newline after the wrapper still parses", rows.length, 1);

  // A longer callback prefix (the magic 47 would have mangled this).
  ctx = loadSheets(() => okResponse(
    "/*O_o*/\ngoogle.visualization.Query.setResponse(" +
    JSON.stringify(table(["Project"], [["DDH"], ["Airway"]])) + ");"
  ));
  rows = await ctx.fetchTab("123");
  check("two data rows parse from a plain-header tab", rows.length, 2);

  section("sheets.js — happy path + headers");

  ctx = loadSheets(() => okResponse(envelope(
    table(["Project", "Current Stage", "Overall Health"],
      [["DDH Task Trainer", "Prototyping", "Green"]], { parsedNumHeaders: 1 })
  )));
  rows = await ctx.fetchTab("123");
  check("auto-detected headers map to column names",
    Object.keys(rows[0]), ["Project", "Current Stage", "Overall Health"]);
  check("values map through", rows[0]["Overall Health"], "Green");
  checkTrue("getLastSyncedAt() is set after a successful fetch", ctx.getLastSyncedAt() instanceof Date);

  // lastSyncedAt must NOT advance on failure
  const ctx2 = loadSheets(() => { throw new Error("down"); });
  await rejects(() => ctx2.fetchTab("123"));
  check("getLastSyncedAt() stays null after a failed fetch", ctx2.getLastSyncedAt(), null);

  section("sheets.js — P1-9 row retention");

  ctx = loadSheets(() => okResponse(envelope(
    table(["Project", "Current Stage", "Overall Health"], [
      ["DDH Task Trainer", "Prototyping", "Green"],
      ["Brand New Project", null, null],          // name only — must survive
      ["^ example row", "ignore", "ignore"],      // placeholder — must drop
      [null, null, null],                          // fully empty — must drop
      ["   ", "x", "y"],                            // whitespace-only key — drop
    ], { parsedNumHeaders: 1 })
  )));
  rows = await ctx.fetchTab("123");
  check("name-only project row is retained", rows.map(r => r["Project"]),
    ["DDH Task Trainer", "Brand New Project"]);
}

module.exports = { run };
if (require.main === module) {
  run().then(() => require("./harness").report());
}
