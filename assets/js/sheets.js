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
 * Escape a value for safe use in BOTH element and attribute HTML context.
 * Escapes & < > as well as " and ' — the quote characters matter because
 * this used to be missing them, and a Link cell containing
 * x" onerror=alert(1) x=" could break out of an href="..." attribute.
 * This is the ONE canonical copy; used to be triplicated across
 * index.html, projects/index.html, and project.html.
 */
function escapeHtml(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/**
 * Whitelist http(s) schemes before a value is allowed to reach an href
 * attribute — closes the javascript:/data: path that quote-escaping alone
 * doesn't. Also the one canonical copy (was triplicated).
 */
function safeLink(url) {
  return /^https?:\/\//i.test(String(url || "").trim()) ? String(url).trim() : "";
}

/**
 * Parse a gviz date cell into a real Date object. Handles the two forms
 * present in this workbook: the gviz literal "Date(y,m,d)" (month is
 * 0-indexed) used by true Date-typed cells, and plain ISO text like
 * "2026-09-03" (the Syllabus Map tab stores its Date column as text, not
 * a Date cell). Falls back to native Date parsing for anything else, and
 * returns null — never an Invalid Date — when nothing parses.
 *
 * This is the ONE canonical copy. It used to be duplicated in index.html
 * and project.html; both now call this shared version instead.
 */
function parseGvizDate(value) {
  if (value == null) return null;
  if (value instanceof Date) return value;
  if (typeof value !== "string") return null;

  if (value.startsWith("Date(")) {
    const nums = value.slice(5, -1).split(",").map(n => parseInt(n, 10));
    const [y, m, d] = nums;
    return new Date(y, m, d);
  }

  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    return new Date(parseInt(iso[1], 10), parseInt(iso[2], 10) - 1, parseInt(iso[3], 10));
  }

  const fallback = new Date(value);
  return isNaN(fallback) ? null : fallback;
}

/**
 * M-1 — Days Since Last Update.
 *
 * Replaces the "Blocked / silent" chip, which measured nothing: only
 * Health === "Red" was computed, so a team that stopped logging entirely
 * stayed Green forever. Silence is the leading indicator; self-reported
 * color is the lagging one — especially in an elective competing with
 * Step 1 prep, teams go quiet before they go red.
 *
 * @param {Array<Object>} updateLogRows - full Update Log tab (all projects)
 * @param {string} projectName - the project to check
 * @param {Date} today
 * @returns {number|null} days since the most recent log entry for this
 *   project, or null if the project has never logged anything
 */
function daysSinceLastUpdate(updateLogRows, projectName, today) {
  const key = v => String(v || "").trim().toLowerCase();
  const target = key(projectName);
  const lastUpdate = updateLogRows
    .filter(r => key(r["Project"]) === target)
    .map(r => parseGvizDate(r["Timestamp"]))
    .filter(Boolean)
    .sort((a, b) => b - a)[0];
  if (!lastUpdate) return null;
  return Math.floor((today - lastUpdate) / 86400000);
}

/**
 * Bucket a days-since value into the M-1 traffic-light bands.
 * null (never logged) is its own band, distinct from "very stale".
 */
function stalenessLevel(days) {
  if (days == null) return "never";
  if (days <= 7) return "green";
  if (days <= 14) return "yellow";
  return "red";
}

const STALENESS_EMOJI = { green: "🟢", yellow: "🟡", red: "🔴", never: "⚫" };
const STALENESS_LABEL = {
  green: "Updated recently",
  yellow: "Update due soon",
  red: "Needs attention",
  never: "Never logged",
};

// ── TODO: fill in from the update form's "Share" link ────────────────
// The brief flags this: "No link to the update form anywhere on the
// site. If teams have to hunt for where to log, compliance drops and
// every downstream metric degrades." Set this once, here, and the
// "Submit Weekly Update" button on all three pages activates itself —
// no other file needs to change.
const UPDATE_FORM_URL = "https://forms.gle/jUMKPpwyNTsM5SVMA"; // e.g. "https://forms.gle/xxxxxxxxxxxx"
// ──────────────────────────────────────────────────────────────────

/**
 * Wires up any element with id="submit-update-link" (present on all
 * three pages' nav bars) to UPDATE_FORM_URL. Hides the link entirely
 * rather than shipping a dead "#" button if the URL hasn't been set yet.
 * Call this once, after the DOM is ready, from each page's own script.
 */
function wireSubmitUpdateLink() {
  const el = document.getElementById("submit-update-link");
  if (!el) return;
  if (UPDATE_FORM_URL) {
    el.href = UPDATE_FORM_URL;
    el.style.display = "";
  } else {
    el.style.display = "none";
  }
}

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

  const rawCount = dataRows.length;
  const kept = dataRows.filter(r => {
    // Drop the "^ example row" placeholder and fully-empty rows. Do NOT
    // require a second populated column: that previously deleted any
    // legitimate row that only has a project name filled in yet (a team
    // that was just created, before anyone has set its stage or health),
    // with no warning that it had happened.
    const first = r.c[0] && r.c[0].v != null ? String(r.c[0].v).trim() : "";
    return !!first && !first.startsWith("^");
  });
  const droppedCount = rawCount - kept.length;
  if (droppedCount > 0) {
    console.warn(`Tab ${gid}: dropped ${droppedCount} row(s) with an empty or "^"-prefixed column A.`);
  }

  return kept.map(r =>
    Object.fromEntries(
      r.c.map((cell, i) => [headers[i], cell ? cell.v : null])
    )
  );
}

/**
 * Race a fetchTab() promise against a timeout. A hung network request
 * (no response, ever) previously left a page stuck on "Loading…"
 * indefinitely — fetchTab's own error handling only fires once something
 * actually comes back. This does not abort the underlying request (no
 * AbortController plumbing here); if the real request eventually
 * resolves after the timeout fires, whichever settles is what callers see
 * first, since .then()/.catch() run once. Good enough for a static site
 * with no retry logic.
 */
function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new SheetError(`Timed out after ${ms}ms waiting for ${label}`, "timeout")), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
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
