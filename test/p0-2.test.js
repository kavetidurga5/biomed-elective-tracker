/* P0-2 — roadmap reach logic + fill calculation.

   Design, per Durga (2026-09-12):
   - Fill = reachedCount / total (decision B — matches intuition for a
     single reached checkpoint, e.g. 1/12 ≈ 8%, not the brief's original
     "index of furthest node" math).
   - Reach is NOT bound by the checkpoint's calendar week. The roadmap
     reflects actual biodesign progress, not alignment to the syllabus
     timeline — a team ahead of or behind schedule should show as such.
   - The one guard kept from the original brief: each log claims the
     earliest still-unclaimed checkpoint sharing its stage, so N entries
     light N nodes rather than every node with that stage (Prototyping
     spans Weeks 5-7 in ENRH 116 — one entry must not light all three).
*/
const { load, check, checkTrue, section } = require("./harness");
const F = require("./fixtures");

const ctx = load([
  { file: "assets/js/sheets.js", fns: ["formatGvizDate"] },
  { file: "projects/project.html", fns: ["parseGvizDate", "byTimestamp", "buildCheckpoints", "roadmapFillPct"], consts: ["tsOf"] },
]);

const TODAY = new Date(2026, 9, 3); // Oct 3 2026, mid-semester

function run() {
  section("P0-2 — roadmap reach + fill (no date bound, count-based fill)");

  // ── Shared-stage containment still holds without the date bound ──
  const cps = ctx.buildCheckpoints(F.SYLLABUS_12, F.LOGS_ONE_PROTOTYPING, TODAY);
  check("12 checkpoints built", cps.length, 12);
  check("Week 5 (Prototyping) is reached", cps[4].reached, true);
  check("Week 6 (same stage) is NOT reached — only one log, earliest claims first", cps[5].reached, false);
  check("Week 7 (same stage) is NOT reached", cps[6].reached, false);
  check("exactly one checkpoint reached from one log", cps.filter(c => c.reached).length, 1);
  check("fill = 1/12 ≈ 8.3%", Math.round(ctx.roadmapFillPct(cps) * 10) / 10, 8.3);

  // ── An early log now CAN claim a later-week checkpoint ────────
  // This is the intended behaviour post-decision: progress isn't gated by
  // the calendar. A "Pitch Prep" entry logged in Week 4 claims the
  // earliest unclaimed "Pitch Prep" checkpoint (Week 11), reflecting that
  // the team is genuinely ahead — not a bug to suppress.
  const early = ctx.buildCheckpoints(F.SYLLABUS_12, F.LOGS_EARLY_PITCH, TODAY);
  check("early 'Pitch Prep' log claims the Week-11 checkpoint (team is ahead)",
    early.map((c, i) => (c.reached ? i + 1 : null)).filter(Boolean), [11]);
  check("only ONE checkpoint reached — it does not also light Week 12", ctx.roadmapFillPct(early), (1/12)*100);
  checkTrue("fill is nowhere near 100% from a single entry", ctx.roadmapFillPct(early) < 15);

  // ── Sequential claiming across shared stages ──────────────────
  const two = ctx.buildCheckpoints(F.SYLLABUS_12, [
    { Timestamp: "Date(2026,9,1)", "Biodesign Stage": "Prototyping", Description: "first" },
    { Timestamp: "Date(2026,9,8)", "Biodesign Stage": "Prototyping", Description: "second" },
  ], TODAY);
  check("two Prototyping logs claim Weeks 5 and 6, not 5/6/7",
    two.map((c, i) => (c.reached ? i + 1 : null)).filter(Boolean), [5, 6]);
  check("earliest log claims earliest week (debrief matches)", two[4].debrief, "first");
  check("second log claims the next week", two[5].debrief, "second");
  check("fill = 2/12 ≈ 16.7%", Math.round(ctx.roadmapFillPct(two) * 10) / 10, 16.7);

  // ── Debrief / date correctness (the P0-1 knock-on) ────────────
  check("reached checkpoint carries its own log's debrief", cps[4].debrief, "First foam mockup done");
  checkTrue("reached checkpoint has an actual date", !!cps[4].actualDate);
  check("unreached checkpoint has null actual date", cps[5].actualDate, null);

  // ── Full progression ──────────────────────────────────────────
  const allStages = F.SYLLABUS_12.map(w => ({
    Timestamp: `Date(${w.Date.slice(0,4)},${parseInt(w.Date.slice(5,7),10)-1},${parseInt(w.Date.slice(8,10),10)})`,
    "Biodesign Stage": w["Expected Stage"],
    Description: `wk${w.Week}`,
  }));
  const full = ctx.buildCheckpoints(F.SYLLABUS_12, allStages, TODAY);
  check("one log per week reaches all 12 checkpoints", full.filter(c => c.reached).length, 12);
  check("all reached => fill 100%", ctx.roadmapFillPct(full), 100);

  // ── Degenerate inputs ─────────────────────────────────────────
  check("empty syllabus => no checkpoints, fill 0", ctx.buildCheckpoints([], F.SORT_LOGS, TODAY).length, 0);
  check("empty checkpoints => fill 0, no divide-by-zero", ctx.roadmapFillPct([]), 0);
  check("single checkpoint, unreached => fill 0", ctx.roadmapFillPct([{ reached: false }]), 0);
  check("single checkpoint, reached => fill 100", ctx.roadmapFillPct([{ reached: true }]), 100);
  check("null-timestamp log is skipped, does not throw",
    ctx.buildCheckpoints(F.SYLLABUS_12, [{ Timestamp: null, "Biodesign Stage": "Prototyping" }], TODAY)
      .filter(c => c.reached).length, 0);

  // ── Checkpoints with unparseable syllabus dates are still claimable ──
  // (Direct consequence of dropping the date bound — a checkpoint with a
  // bad/missing Date cell can no longer be permanently unreachable, since
  // reach no longer depends on rawDate at all.)
  const badDateSyllabus = [{ Week: 1, Date: "not a date", Topic: "X", "Expected Stage": "Ideation" }];
  const badDateLogs = [{ Timestamp: "Date(2026,8,20)", "Biodesign Stage": "Ideation", Description: "still counts" }];
  check("checkpoint with unparseable Date can still be reached",
    ctx.buildCheckpoints(badDateSyllabus, badDateLogs, TODAY)[0].reached, true);
}

module.exports = { run };
if (require.main === module) { run(); require("./harness").report(); }
