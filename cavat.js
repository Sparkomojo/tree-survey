// Tree Survey – © 2026 Mark Johnson. All rights reserved. Use only under a written licence from the owner.
/* CAVAT Full Method (Capital Asset Value for Amenity Trees – LTOA; Guide for Practitioners).
   base = UVF × π(d/2)²  (d in cm, rounded down; multi-stem: stem areas added)
   location = base × CTI × visibility × (1 + positive − negative)
   functional = location × (0.4 × PSC × PSQ + 0.6 × CC × CAN × CCQ)
   CAVAT = functional × life expectancy factor
   Checked against the guide's worked examples. The Unit Value Factor changes yearly – set it in Settings. */
"use strict";

const CAVAT = (() => {
  const VIS = [[100, "Full"], [75, "Partial (75%)"], [50, "Partial (50%)"], [25, "Barely visible"]];
  const PSC = [[100, "Over 75%"], [75, "51–75%"], [50, "26–50%"], [25, "1–25%"]];
  const QUAL = [[100, "Excellent"], [75, "Good"], [50, "Fair"], [25, "Poor"]];
  const CC = [100, 90, 80, 70, 60, 50, 40, 30, 20, 10];
  const CAN = [[100, "81–100%"], [80, "61–80%"], [60, "41–60%"], [40, "21–40%"], [20, "1–20%"], [0, "None"]];
  const ADJ = [0, 10, 20, 30, 40, 50, 60];
  const LE = [[100, "80+ years"], [95, "40–80"], [80, "20–40"], [55, "10–20"], [30, "5–10"], [10, "Under 5"], [0, "Dead"]];
  const DEFAULT_UVF = 18.44;

  function stems(dbh) {  // "450" | "200, 180" | "3x200" -> [cm…]
    const s = String(dbh || "").trim();
    const m = /^(\d+)\s*[x×@]\s*(\d+(?:\.\d+)?)/i.exec(s);
    const mm = m ? Array(+m[1]).fill(+m[2]) : (s.match(/\d+(?:\.\d+)?/g) || []).map(Number);
    return mm.filter(x => x > 0).map(x => Math.floor(x / 10));
  }
  function value(c, dbh, uvf, cti) {
    const d = stems(dbh);
    const need = ["vis", "psc", "psq", "cc", "can", "ccq", "le"];
    if (!d.length || !cti || !uvf || need.some(k => c[k] === undefined || c[k] === "")) return null;
    const area = d.reduce((a, x) => a + Math.PI * (x / 2) ** 2, 0);
    const base = uvf * area;
    const loc = base * cti / 100 * c.vis / 100 * (1 + (+c.pos || 0) / 100 - (+c.neg || 0) / 100);
    const func = loc * (0.4 * c.psc / 100 * c.psq / 100 + 0.6 * c.cc / 100 * c.can / 100 * c.ccq / 100);
    return Math.round(func * c.le / 100);
  }
  const money = v => "£" + Math.round(v).toLocaleString("en-GB");
  const cti = name => (CAVAT_CTI.find(x => x[0] === name) || [, null])[1];
  return { VIS, PSC, QUAL, CC, CAN, ADJ, LE, DEFAULT_UVF, value, money, cti, stems };
})();
