// Tree Survey – © 2026 Mark Johnson. All rights reserved. Use only under a written licence from the owner.
// QTRA: no Risk of Harm data is in the app or its files. QTRA Ltd allows a licence holder to load the table QTRA
// supplied to them onto their own device (Settings), for their own use and that of their Licensee Representatives.
// Without a table, enter the Risk of Harm from your own QTRA calculator; the app shows its Tolerability of Risk band.
const QTRA = (() => {
  // "1/250,000", "1/250k", "1/1M", "4x10-6" -> probability, or null
  function parse(v) {
    const s = String(v ?? "").toLowerCase().replace(/[,\s]/g, "");
    let m = /^1\/(\d+(?:\.\d+)?)(k|m)?$/.exec(s);
    if (m) { const n = +m[1] * (m[2] === "k" ? 1e3 : m[2] === "m" ? 1e6 : 1); return n > 0 ? 1 / n : null; }
    m = /^(\d+(?:\.\d+)?)(?:x|\*)10(?:\^)?-(\d+)$/.exec(s);
    return m ? +m[1] * Math.pow(10, -m[2]) : null;
  }
  // Tolerability of Risk bands (QTRA User Manual V5.4)
  function band(r) {
    if (r >= 1 / 1000) return ["Unacceptable", "roh-red"];
    if (r >= 1 / 10000) return ["Unacceptable where imposed on others", "roh-amber"];
    if (r >= 1 / 1000000) return ["Tolerable (if ALARP)", "roh-yellow"];
    return ["Broadly acceptable", "roh-green"];
  }
  const ROWS = 6 * 5 * 7;  // Target 1-6 x (property + Size 1-4) x PoF 1-7
  // rows of the spreadsheet QTRA supplies ([Target, Size/Property, PoF, Risk of Harm], header first) -> {table} or {error}
  function readRows(rows) {
    const head = (rows[0] || []).map(c => String(c ?? "").toLowerCase().replace(/[^a-z]/g, ""));
    const ct = head.findIndex(h => h.startsWith("target")), cs = head.findIndex(h => h.startsWith("size") || h.includes("property")),
      cp = head.findIndex(h => h.startsWith("pof") || h.startsWith("probability")), cr = head.findIndex(h => h.includes("risk"));
    if (ct < 0 || cs < 0 || cp < 0 || cr < 0) return { error: "The first sheet needs the columns Target, Size/Property, PoF and Risk of Harm." };
    const num = v => { const m = /^[A-Za-z \/]*?R?\s*(\d)$/.exec(String(v ?? "").trim()); return m ? m[1] : ""; };
    const table = {};
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i] || [];
      if (!r.some(c => c != null && c !== "")) continue;
      const t = num(r[ct]), p = num(r[cp]), s = /^p/i.test(String(r[cs] ?? "").trim()) ? "P" : num(r[cs]);
      const m = /^1\/(\d+)$/.exec(String(r[cr] ?? "").replace(/[\s,]/g, ""));
      if (!m || !(t >= 1 && t <= 6) || !(p >= 1 && p <= 7) || !(s === "P" || (s >= 1 && s <= 4))) return { error: `Row ${i + 1} wasn't understood.` };
      table[`${t}|${s}|${p}`] = +m[1];
    }
    const n = Object.keys(table).length;
    return n === ROWS ? { table } : { error: `The table has ${n} combinations; ${ROWS} are expected.` };
  }
  // qtra_roh.json made by the PC toolkit -> {table} or {error}
  function readJson(text) {
    try {
      const roh = JSON.parse(text).roh, n = Object.keys(roh).length;
      return n === ROWS && Object.values(roh).every(v => Number.isFinite(+v) && +v > 0) ? { table: roh } : { error: `The file has ${n} combinations; ${ROWS} are expected.` };
    } catch (e) { return { error: "That isn't the toolkit's qtra_roh.json file." }; }
  }
  // probability from the loaded table: reduced mass ("50%", "25%") and multiple targets multiply the table value
  function lookup(table, type, target, size, pof, mass, mx) {
    if (!table || !target || !pof) return null;
    const s = type === "Property" ? "P" : size;
    if (!s) return null;
    const den = +table[`${target}|${s}|${pof}`];
    if (!den) return null;
    let p = 1 / den;
    const f = parseFloat(String(mass || "").replace("%", ""));
    if (f > 0) p *= f > 1 ? f / 100 : f;
    const n = parseFloat(mx);
    if (n > 1) p *= n;
    return Math.min(p, 1);
  }
  // 1/20,000 – two significant figures, as the PC reports it
  function text(p) {
    let n = Math.round(1 / p);
    if (n >= 1000) { const mag = Math.pow(10, String(n).length - 2); n = Math.round(n / mag) * mag; }
    return "1/" + n.toLocaleString("en-GB");
  }
  return { parse, band, readRows, readJson, lookup, text, ROWS };
})();
if (typeof module !== "undefined") module.exports = QTRA;
