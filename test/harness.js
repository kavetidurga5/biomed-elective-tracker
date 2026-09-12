/* harness.js — pull named functions out of the real source files and make
   them callable under node.

   The site has no build step and no modules: every function lives inline in
   a <script> block. Rather than copy those functions into the tests (which
   would let the tests pass while the shipped code stays broken), this reads
   the actual file, slices out the function by brace matching, and evals it.
   Tests therefore exercise exactly what GitHub Pages serves.
*/
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..");

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

/** Slice out `function NAME(...) { ... }` by matching braces. */
function extractFunction(src, name) {
  const start = src.indexOf(`function ${name}(`);
  if (start === -1) throw new Error(`extractFunction: ${name} not found`);
  const open = src.indexOf("{", start);
  let depth = 0, inStr = null, inLineComment = false, inBlockComment = false, prev = "";
  for (let i = open; i < src.length; i++) {
    const ch = src[i], next = src[i + 1];
    if (inLineComment) { if (ch === "\n") inLineComment = false; prev = ch; continue; }
    if (inBlockComment) { if (ch === "*" && next === "/") { inBlockComment = false; i++; } prev = ch; continue; }
    if (inStr) {
      if (ch === "\\") { i++; prev = ""; continue; }
      if (ch === inStr) inStr = null;
      prev = ch; continue;
    }
    if (ch === "/" && next === "/") { inLineComment = true; i++; continue; }
    if (ch === "/" && next === "*") { inBlockComment = true; i++; continue; }
    if (ch === '"' || ch === "'" || ch === "`") { inStr = ch; prev = ch; continue; }
    if (ch === "{") depth++;
    else if (ch === "}") { depth--; if (depth === 0) return src.slice(start, i + 1); }
    prev = ch;
  }
  throw new Error(`extractFunction: unbalanced braces in ${name}`);
}

/** Slice out a single-line `const NAME = ...;` arrow/expression helper. */
function extractConst(src, name) {
  const re = new RegExp(`^\\s*const ${name}\\s*=.*?;\\s*$`, "m");
  const m = src.match(re);
  if (!m) throw new Error(`extractConst: ${name} not found`);
  // Re-declare as `var` so it lands on the sandbox global and stays visible
  // to function declarations pulled in from the same file.
  return m[0].trim().replace(/^const /, "var ");
}

/** Eval an arbitrary snippet inside an existing sandbox. */
function evalIn(ctx, code, filename = "snippet") {
  return vm.runInContext(code, ctx, { filename });
}

/**
 * Build a sandbox containing the named functions extracted from the given
 * files. Later files override earlier ones, so pass shared code first.
 * `consts` entries are pulled with extractConst before the functions.
 */
function load(spec) {
  const ctx = vm.createContext({ console, Date, Math, JSON, String, Number, Array, Object, parseInt, parseFloat, isNaN, encodeURIComponent, RegExp });
  for (const { file, fns = [], consts = [] } of spec) {
    const src = read(file);
    for (const fn of fns) {
      vm.runInContext(extractFunction(src, fn), ctx, { filename: `${file}:${fn}` });
    }
    for (const c of consts) {
      vm.runInContext(extractConst(src, c), ctx, { filename: `${file}:${c}` });
    }
  }
  return ctx;
}

// ── Tiny assertion helpers ──────────────────────────────────────────
let passed = 0, failed = 0;
const failures = [];

function check(label, actual, expected) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) { passed++; console.log(`  \u2713 ${label}`); }
  else { failed++; failures.push(label); console.log(`  \u2717 ${label}\n      expected: ${e}\n      actual:   ${a}`); }
}

function checkTrue(label, cond) { check(label, !!cond, true); }

function section(name) { console.log(`\n${name}`); }

function report() {
  console.log(`\n${"-".repeat(58)}`);
  console.log(`${passed} passed, ${failed} failed`);
  if (failed) { console.log(`\nFailing:\n  - ${failures.join("\n  - ")}`); process.exitCode = 1; }
  return failed === 0;
}

module.exports = { read, extractFunction, extractConst, evalIn, load, check, checkTrue, section, report };
