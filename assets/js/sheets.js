/* sheets.js
   Shared fetch helper for pulling live data from the Biomedical Innovations
   Project Tracker Google Sheet into static GitHub Pages pages.

   HOW TO SET THIS UP:
   1. Replace SHEET_ID below with your real Sheet ID (Step 2, Part A).
   2. Replace the three GID placeholders below with your real gids (Step 2, Part B).
   3. Confirm Sheet is "Anyone with the link: Viewer" (Share) AND Published to web.
*/

// ── TODO: fill these in from Step 2 ──────────────────────────────
const SHEET_ID = "14rtBS-Okk7DWrroNznYtepigcF7cCpwGLtwhNT5n0Hs";

const GIDS = {
  dashboard: "1643196814",
  roster: "572784313",
  presentations: "2069434519",
  syllabus: "1905738931",
  updateLog: "1731368813",
};

// Some tabs have header cells containing extra baked-in guidance text
// (e.g. "Presentation Type\nMilestone deliverable\nMid-Semester Check-In\nSymposium"
// all in one cell), which breaks reading the header as a clean column name.
// For any tab where that happens, list its real column names here in order —
// fetchTab will use these instead of whatever the sheet's header cells contain.
const HEADER_OVERRIDES = {
  [GIDS.presentations]: ["Project", "Presentation Type", "Date", "Prep Status", "Owner", "Key (calc)", "Event Name", "Link"],
};
// ──────────────────────────────────────────────────────────────────

/**
 * Thrown by fetchTab on ANY failure path.
 *
 * Previously every failure returned [], which downstream rendered as
 * "No open requests right now." and stat chips of 0/0/0/0 — a dead API
 * was indistinguishable from a healthy semester. Callers must now
 * distinguish "loaded, and there is nothing" from "did not load".
 *
 * `reason` is one of: network | http | parse | gviz | envelope
 */
class SheetError extends Error {
  constructor(message, reason, cause) {
    super(message);
    this.name = "SheetError";
    this.reason = reason;
    this.cause = cause;
  }
}

// Timestamp of the most recent successful fetchTab, for the "Last synced"
// line. Null until something actually loads.
let lastSyncedAt = null;
function getLastSyncedAt() { return lastSyncedAt; }

/**
 * Parse a gviz date cell value, which comes back as a literal string
 * like "Date(2026,8,14)" (month is 0-indexed), into a readable string
 * like "Sep 14, 2026". Returns "" if the value isn't a gviz date.
 */
function formatGvizDate(value) {
  if (!value || typeof value !== "string" || !value.startsWith("Date(")) {
    return value || "";
  }
  const nums = value.slice(5, -1).split(",").map(n => parseInt(n, 10));
  const [y, m, d] = nums;
  const dt = new Date(y, m, d);
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/**
 * Fetch a single tab from the published Google Sheet and return it as
 * an array of row objects keyed by header name.
 *
 * NOTE: this assumes the tab's FIRST ROW is the header row (confirmed
 * necessary after testing — gviz did not auto-detect headers on this
 * sheet, so we pull headers from rows[0] ourselves rather than cols[]).
 *
 * @param {string} gid - the tab's gid (use GIDS.dashboard, GIDS.roster, etc.)
 * @returns {Promise<Array<Object>>}
 */
async function fetchTab(gid) {
  // headers=1 tells gviz exactly how many header rows to expect. Without
  // it, gviz guesses based on column data density — and on tabs like
  // Roster, where many rows have blank Project/Status/Date cells, it
  // guesses wrong, folding dozens of real rows into a single garbled
  // "header" and silently dropping them from the results.
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&gid=${gid}&headers=1`;

  let res;
  try {
    res = await fetch(url);
  } catch (err) {
    throw new SheetError(`Network error fetching tab ${gid}`, "network", err);
  }

  if (!res.ok) {
    throw new SheetError(`Sheet fetch failed with HTTP ${res.status} for tab ${gid}`, "http");
  }

  const text = await res.text();

  // gviz wraps its JSON in a JS callback string:
  //   /*O_o*/\ngoogle.visualization.Query.setResponse({...});
  // This used to be stripped with substring(47) — a magic number equal to
  // the length of that exact prefix. Two ways that bit:
  //   - any change to the wrapper (padding, whitespace) silently corrupts
  //     the slice, and
  //   - gviz answers HTTP 200 with an HTML LOGIN PAGE when the sheet stops
  //     being link-viewable, which sliced into garbage and yielded [].
  // Match the callback instead, and treat a non-match as a hard failure.
  const m = text.match(/setResponse\(([\s\S]*)\);?\s*$/);
  if (!m) {
    throw new SheetError(
      `Unexpected gviz envelope for tab ${gid} — the sheet may be unshared, or the response is not JSON`,
      "envelope"
    );
  }

  let json;
  try {
    json = JSON.parse(m[1]);
  } catch (err) {
    throw new SheetError(`Could not parse gviz JSON for tab ${gid}`, "parse", err);
  }

  if (json.status === "error") {
    throw new SheetError(
      `gviz returned an error for tab ${gid}: ${(json.errors || []).map(e => e.detailed_message || e.message).join("; ")}`,
      "gviz"
    );
  }

  lastSyncedAt = new Date();

  const table = json.table;
  let headers, dataRows;

  if (table.parsedNumHeaders && table.parsedNumHeaders > 0) {
    // gviz auto-detected a real header row on this tab (e.g. bold/frozen
    // formatting) — cols[].label is already correct, and table.rows is
    // pure data with no header row mixed in.
    headers = table.cols.map(c => (c.label || "").trim());
    dataRows = table.rows || [];
  } else {
    // No auto-detected header on this tab (plain-text header row) — fall
    // back to treating the first row ourselves as the header row.
    if (!table.rows || table.rows.length < 2) return [];
    headers = table.rows[0].c.map(cell => ((cell ? cell.v : "") || "").trim());
    dataRows = table.rows.slice(1);
  }

  // Override with known-clean header names if this tab's header cells
  // contain extra baked-in text (see HEADER_OVERRIDES above).
  if (HEADER_OVERRIDES[gid] && HEADER_OVERRIDES[gid].length === headers.length) {
    headers = HEADER_OVERRIDES[gid];
  }

  return dataRows
    // Drop the "^ example row" placeholder, fully-empty rows, and any
    // note/instruction rows. Real data rows have more than just column A
    // filled in — instruction rows (e.g. "This tab is fully computed...")
    // only populate column A, so require at least one other column to
    // have a value too.
    .filter(r => {
      const first = r.c[0] && r.c[0].v != null ? String(r.c[0].v).trim() : "";
      if (!first || first.startsWith("^")) return false;
      const hasOtherData = r.c.slice(1).some(cell => cell && cell.v != null && String(cell.v).trim() !== "");
      return hasOtherData;
    })
    .map(r =>
      Object.fromEntries(
        r.c.map((cell, i) => [headers[i], cell ? cell.v : null])
      )
    );
}

/**
 * Convenience: fetch all five tabs together.
 * @returns {Promise<{dashboard: Array, roster: Array, presentations: Array, syllabus: Array, updateLog: Array}>}
 */
async function fetchAllTabs() {
  const [dashboard, roster, presentations, syllabus, updateLog] = await Promise.all([
    fetchTab(GIDS.dashboard),
    fetchTab(GIDS.roster),
    fetchTab(GIDS.presentations),
    fetchTab(GIDS.syllabus),
    fetchTab(GIDS.updateLog),
  ]);
  return { dashboard, roster, presentations, syllabus, updateLog };
}
