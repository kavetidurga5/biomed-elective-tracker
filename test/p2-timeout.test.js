/* P2 — no timeout on Loading states.
   A hung request previously left a page stuck on "Loading…" forever.
   Uses short ms values so the test runs fast, not the real 15000ms.
*/
const vm = require("vm");
const { read, extractFunction, check, checkTrue, section } = require("./harness");

function loadWithTimeout() {
  const ctx = vm.createContext({ console, Promise, setTimeout, clearTimeout, Error });
  // SheetError is a class declared earlier in the file; extract it too so
  // withTimeout's `new SheetError(...)` resolves.
  const src = read("assets/js/sheets.js");
  const classStart = src.indexOf("class SheetError");
  const classEnd = src.indexOf("\n}", classStart) + 2;
  vm.runInContext(src.slice(classStart, classEnd), ctx, { filename: "SheetError" });
  vm.runInContext(extractFunction(src, "withTimeout"), ctx, { filename: "withTimeout" });
  return ctx;
}

async function run() {
  section("P2 — withTimeout");

  const ctx = loadWithTimeout();

  const fast = new Promise(resolve => setTimeout(() => resolve("data"), 10));
  const result = await ctx.withTimeout(fast, 200, "fast tab");
  check("a promise that resolves before the timeout wins normally", result, "data");

  const slow = new Promise(resolve => setTimeout(() => resolve("too late"), 200));
  let err = null;
  try { await ctx.withTimeout(slow, 10, "slow tab"); } catch (e) { err = e; }
  checkTrue("a promise slower than the timeout rejects instead of hanging", !!err);
  check("timeout rejection reason is 'timeout'", err && err.reason, "timeout");
  checkTrue("timeout message names which tab timed out", /slow tab/.test(err.message));

  const rejecting = new Promise((_, reject) => setTimeout(() => reject(new Error("network down")), 10));
  err = null;
  try { await ctx.withTimeout(rejecting, 200, "x"); } catch (e) { err = e; }
  check("a normal rejection (not a timeout) passes through unchanged", err.message, "network down");
}

module.exports = { run };
if (require.main === module) { run().then(() => require("./harness").report()); }
