/* P2 — "Submit Weekly Update" link.
   No DOM library is available in this harness, so this tests the logic
   with a minimal fake element/document rather than exercising real DOM
   attachment — sufficient to confirm the show/hide + href-setting logic
   is correct on both sides of UPDATE_FORM_URL being empty or set.
*/
const vm = require("vm");
const { read, extractFunction, check, section } = require("./harness");

function loadWithFakeDom(formUrl) {
  const el = { href: "#", style: { display: "none" } };
  const fakeDocument = { getElementById: id => (id === "submit-update-link" ? el : null) };
  const ctx = vm.createContext({ document: fakeDocument });
  const src = read("assets/js/sheets.js");

  // UPDATE_FORM_URL is a simple string const; override it for the test
  // rather than parsing whatever placeholder value ships in the file.
  vm.runInContext(`var UPDATE_FORM_URL = ${JSON.stringify(formUrl)};`, ctx);
  vm.runInContext(extractFunction(src, "wireSubmitUpdateLink"), ctx, { filename: "wireSubmitUpdateLink" });
  return { ctx, el };
}

function run() {
  section("P2 — wireSubmitUpdateLink");

  const empty = loadWithFakeDom("");
  empty.ctx.wireSubmitUpdateLink();
  check("with no URL set, the link stays hidden", empty.el.style.display, "none");
  check("with no URL set, href is left untouched (still '#')", empty.el.href, "#");

  const set = loadWithFakeDom("https://forms.gle/example123");
  set.ctx.wireSubmitUpdateLink();
  check("with a URL set, the link becomes visible", set.el.style.display, "");
  check("with a URL set, href points to the form", set.el.href, "https://forms.gle/example123");

  // Missing element (page doesn't have the nav link yet) must not throw.
  const missing = vm.createContext({ document: { getElementById: () => null } });
  vm.runInContext(`var UPDATE_FORM_URL = "https://forms.gle/x";`, missing);
  vm.runInContext(extractFunction(read("assets/js/sheets.js"), "wireSubmitUpdateLink"), missing);
  let threw = false;
  try { missing.wireSubmitUpdateLink(); } catch (e) { threw = true; }
  check("missing element does not throw", threw, false);
}

module.exports = { run };
if (require.main === module) { run(); require("./harness").report(); }
