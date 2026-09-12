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

/** Slice out `function NAME(...) { ... }` by matching braces.
 *  Tracks strings, comments, and regex literals so quote/brace characters
 *  inside any of those (e.g. the regex /'/g, or a comment containing a
 *  bare ") don't throw off the brace count.
 */
function extractFunction(src, name) {
  const start = src.indexOf(`function ${name}(`);
  if (start === -1) throw new Error(`extractFunction: ${name} not found`);
  const open = src.indexOf("{", start);
  let depth = 0, inStr = null, inLineComment = false, inBlockComment = false;
  let lastSignificant = "("; // what precedes the open paren of the fn args
  for (let i = open; i < src.length; i++) {
    const ch = src[i], next = src[i + 1];
    if (inLineComment) { if (ch === "\n") inLineComment = false; continue; }
    if (inBlockComment) { if (ch === "*" && next === "/") { inBlockComment = false; i++; } continue; }
    if (inStr) {
      if (ch === "\\") { i++; continue; }
      if (ch === inStr) inStr = null;
      continue;
    }
    if (ch === "/" && next === "/") { inLineComment = true; i++; continue; }
    if (ch === "/" && next === "*") { inBlockComment = true; i++; continue; }
    if (ch === "/" && isRegexPosition(lastSignificant)) {
      // Regex literal: scan to an unescaped closing "/", honoring [...]
      // character classes (which may themselves contain an unescaped "/").
      let j = i + 1, inClass = false;
      for (; j < src.length; j++) {
        const c = src[j];
        if (c === "\\") { j++; continue; }
        if (c === "[") inClass = true;
        else if (c === "]") inClass = false;
        else if (c === "/" && !inClass) break;
      }
      // Skip trailing flags (g, i, m, ...).
      let k = j + 1;
      while (k < src.length && /[a-z]/i.test(src[k])) k++;
      i = k - 1;
      lastSignificant = "/";
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") { inStr = ch; lastSignificant = ch; continue; }
    if (ch === "{") { depth++; lastSignificant = ch; continue; }
    if (ch === "}") { depth--; if (depth === 0) return src.slice(start, i + 1); lastSignificant = ch; continue; }
    if (!/\s/.test(ch)) lastSignificant = ch;
  }
  throw new Error(`extractFunction: unbalanced braces in ${name}`);
}

/** Heuristic: could a "/" at this point start a regex literal rather than
 *  be division? True unless the previous significant character is one
 *  that would make "/" a division operator (identifier, number, ), ], }).
 */
function isRegexPosition(lastSignificant) {
  return !/[A-Za-z0-9_$)\]}]/.test(lastSignificant);
}

/** Slice out a `const NAME = ...;` declaration, single-line or a
 *  multi-line object/array literal (matched via braces/brackets). */
function extractConst(src, name) {
  const marker = `const ${name}`;
  const idx = src.indexOf(marker);
  if (idx === -1) throw new Error(`extractConst: ${name} not found`);
  const eq = src.indexOf("=", idx);
  let i = eq + 1;
  while (/\s/.test(src[i])) i++;
  const valueStart = i;

  if (src[i] === "{" || src[i] === "[") {
    const open = src[i], close = open === "{" ? "}" : "]";
    let depth = 0;
    for (; i < src.length; i++) {
      if (src[i] === open) depth++;
      else if (src[i] === close) { depth--; if (depth === 0) { i++; break; } }
    }
    // Skip to the terminating semicolon, if present.
    while (src[i] === ";" ) { i++; break; }
    return `var ${name} = ${src.slice(valueStart, i).replace(/;$/, "")};`;
  }

  // Single-line scalar/expression value.
  const semi = src.indexOf(";", i);
  return `var ${name} = ${src.slice(valueStart, semi)};`;
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
