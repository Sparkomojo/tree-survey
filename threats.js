/* THREATS – Tree Hazard: Risk Evaluation and Treatment System (Julian Forbes-Laird, 2010).
   Scores and category bands follow the published guidance note; the method's terms are kept exactly,
   because changing them would mean it could no longer be called THREATS. */
"use strict";

const THREATS = (() => {
  const INDICATORS = ["Altered exposure", "Unstable root plate", "Root damage", "Root decay (fungi)", "Stem/limb decay (fungi)",
    "Inadequate stem taper", "Target cankers", "Exudates", "Stem hollow, decayed, cracked inc. shear cracks", "Lapsed pollard",
    "Overweight, subsiding, or lion-tailed limbs", "Bark congestion", "Reactive growth", "Inclusive bark", "Fractured limbs; storm damage",
    "Bark necrosis", "Dieback; poor foliage", "Dead wood", "Prolific ivy", "Other/None (specify)"];
  const FAILURE = [[50, "Imminent/Immediate"], [8, "Probable/Soon"], [2, "Likely, foreseeable"], [0.8, "Potentially with time"], [0, "None apparent"]];
  const TARGET = [[40, "Very high"], [25, "High"], [20, "Medium"], [15, "Low"], [7, "Very low"], [0, "None"]];
  const IMPACT = [[10, "Severe structural damage – fatalities very probable (VL)"], [6, "Moderate structural / severe vehicle damage (L)"],
    [4, "Minor damage / probable disabling injury (M)"], [1, "Fragile objects / superficial injury (S)"]];
  const CATS = [[4000, 7, "Extreme", "E"], [2001, 6, "Serious", "7D"], [1000, 5, "Significant", "4W"], [330, 4, "Moderate", "13W"],
    [160, 3, "Slight", "A"], [50, 2, "Minimal", "3Y"], [0, 1, "Insignificant", "3/5Y"]];
  const CLS = { 7: "roh-red", 6: "roh-red", 5: "roh-amber", 4: "roh-amber", 3: "roh-yellow", 2: "roh-green", 1: "roh-green" };
  // upgrade the target by one category where unsupervised children / elderly or infirm are likely
  const upgrade = t => { const i = TARGET.findIndex(x => x[0] === t); return i > 0 ? TARGET[i - 1][0] : t; };
  function score(th) {
    if (!th || th.f == null || th.t == null || th.i == null || th.f === "" || th.t === "" || th.i === "") return null;
    const t = th.vuln ? upgrade(+th.t) : +th.t;
    return Math.round(+th.f * t * +th.i * 10) / 10;
  }
  function category(sc) {
    const c = CATS.find(x => sc >= x[0]);
    return c ? { n: c[1], name: c[2], code: c[3], cls: CLS[c[1]] } : null;
  }
  return { INDICATORS, FAILURE, TARGET, IMPACT, score, category };
})();
