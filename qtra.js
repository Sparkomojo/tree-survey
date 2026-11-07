// Tree Survey – © 2026 Mark Johnson. All rights reserved. Use only under a written licence from the owner.
// QTRA: no Risk of Harm calculator is built into the app (pending confirmation from QTRA Ltd).
// Enter the Risk of Harm from your own QTRA calculator; the app only shows which Tolerability of Risk band it falls in.
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
  return { parse, band };
})();
if (typeof module !== "undefined") module.exports = QTRA;
