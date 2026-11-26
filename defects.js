// Tree Survey – © 2026 Mark Johnson. All rights reserved. Use only under a written licence from the owner.
/* Tree Survey – size, position and direction of defects and features.
   Tapping an observation phrase opens a small panel: part of the tree, height, side (compass), size.
   It writes a sentence into Observations, e.g.
     "Cavity on the stem at 1.5 m on the south-west side, c. 300 × 150 mm."
     "Lean to the north-east, c. 10°."
   and keeps the details as a list on the tree (exported in data.json). */
"use strict";

const ASPECTS = [["NW", "north-west"], ["N", "north"], ["NE", "north-east"], ["W", "west"], ["", ""], ["E", "east"],
  ["SW", "south-west"], ["S", "south"], ["SE", "south-east"]];
const PARTS = [["Root plate", "at the root plate"], ["Base", "at the base"], ["Stem", "on the stem"],
  ["Main union", "at the main union"], ["Scaffold limb", "on a scaffold limb"], ["Branch", "on a branch"],
  ["Crown", "in the crown"], ["Upper crown", "in the upper crown"], ["Lower crown", "in the lower crown"]];
// "Where on the tree" can be more than one place: kept as "Root plate, Stem", always in the order above (ground up)
const partList = v => { const got = String(v || "").split(/\s*[,+]\s*/); return PARTS.filter(p => got.includes(p[0])).map(p => p[0]); };
const partPhrase = v => { const ph = partList(v).map(n => PARTS.find(p => p[0] === n)[1]);
  return ph.length > 1 ? ph.slice(0, -1).join(", ") + " and " + ph[ph.length - 1] : ph[0] || ""; };
const UNITS = [["mm", "mm"], ["mm Ø", "mm diameter"], ["cm", "cm"], ["m", "m"], ["%", "%"], ["°", "°"]];
const aspectWord = a => (ASPECTS.find(x => x[0] === a) || [, ""])[1];

// Defect / feature library, in sections (Mark's lists + Lonsdale, Hazards from Trees, 2000 – terms only)
// Defects and features by the part of the tree they are on (v1.93, Mark, 26 Nov 2026: "too many options … isolate them
// to different areas of the tree, such as root / stem interface, stem, canopy"). The quick phrases that used to sit in
// one long row under Observations and this library are one list now. Unions are an area of their own AND the main
// three are under Stem (Mark: "maybe both would be better"). [key, name, where a defect picked here usually is, items]
// (Mark's lists + Lonsdale, Hazards from Trees, 2000 – terms only)
const DEFECT_AREAS = [
  ["root", "Root / stem interface", "Root plate", ["Basal cavity", "Butt swell", "Fungi at root plate", "Root plate lifting",
    "Soil cracking and heaving", "Severe root damage", "Root collar buried", "Restricted rooting", "Historical grade change",
    "Recently exposed", "Leaning tree"]],
  ["stem", "Stem", "Stem", ["Cavity", "Decay", "Exudation", "Fungi on stem", "Bracket fungi", "Stem wound", "Wound – skinning",
    "Wound – scored or splintered", "Bark damage", "Bark shedding", "Loose or detaching bark", "Structural crack",
    "Rib – blunt-nosed (occluded crack)", "Rib – sharp-nosed (open crack)", "Buckling bulge", "Target canker",
    "Graft incompatibility", "Stem fluting", "Dog-leg bend at old wound", "Multiple pruning wounds", "Old topping points",
    "Poor stem taper", "Slender stem (high H/D)", "Reaction wood", "Included union", "Co-dominant stems", "Bifurcation"]],
  ["union", "Unions", "Main union", ["Included union", "Co-dominant stems", "Bifurcation", "Natural bracing", "Bark congestion",
    "Split below union", "Codominant stems diverging to height", "Branches attached around topping snag"]],
  ["crown", "Crown", "Crown", ["Minor deadwood", "Major deadwood", "Deadwood", "Hanging branch", "Broken or snapped branches",
    "Storm damage", "Tear-out wound", "Limb sinking", "Crack on underside of limb", "Over-extended limb",
    "End-loaded / lion-tailed limbs", "Crossing branches", "Gap in crown", "Asymmetric crown", "Epicormic growth",
    "Neglected pollard", "Ivy cover", "Climbing plants"]],
  ["vital", "Foliage / vitality", "", ["Crown dieback", "Upper crown / twig dieback", "Sparse crown", "Low crown density",
    "Sparse or small foliage", "Small leaf size", "Sub-optimal shoot extension", "Yellowing (chlorotic) foliage",
    "Premature leaf fall", "Defoliation"]],
  ["whole", "Whole tree / other", "", ["No significant defects observed", "Leaning tree", "Excessive sway in wind",
    "Windthrow history on site", "Previously pollarded", "Previously reduced", "Suppressed", "Self-set",
    "Previously laid (hedge)", "Stems removed from hedgerow", "Defoliating insects", "Oak processionary moth nests",
    "Horse chestnut leaf miner", "Bark beetle exit holes", "Wood-boring insect activity", "Ant activity in decay",
    "Wasp / bee nest"]],
];
// where on the tree, when it is not simply the area's own place
const DEFECT_PART = { "Included union": "Main union", "Co-dominant stems": "Main union", "Bifurcation": "Main union",
  "Butt swell": "Base", "Limb sinking": "Scaffold limb", "Crack on underside of limb": "Scaffold limb",
  "Over-extended limb": "Scaffold limb", "End-loaded / lion-tailed limbs": "Scaffold limb", "Leaning tree": "",
  "Historical grade change": "", "Restricted rooting": "", "Recently exposed": "", "Neglected pollard": "",
  "Old topping points": "", "Codominant stems diverging to height": "", "Branches attached around topping snag": "" };
// quick phrases that say the same as a library term – the library's wording is the one offered
const DEFECT_SAME = { "lean": "Leaning tree", "root plate heave": "Root plate lifting" };
// said as they stand: no place, size or direction to ask for
const DEFECT_PLAIN = /^(no significant|previously |suppressed$|self-set$|stems removed)/i;
// the "most used" row before this device has a history of its own
const DEFECT_START = ["No significant defects observed", "Minor deadwood", "Major deadwood", "Ivy cover", "Cavity", "Included union"];
// The areas with the surveyor's own phrases (Settings → Observation phrases, or the PC's wording) added to the area their
// words point to – anything that names no part goes under Whole tree / other, so nothing typed there is lost.
// -> [{ key, name, part, items, partOf(name) }]
function defectAreas(own) {
  const areas = DEFECT_AREAS.map(([key, name, part, items]) => ({ key, name, part, items: items.slice() }));
  const have = new Set(areas.flatMap(a => a.items.map(i => i.toLowerCase())));
  const guess = p => /root|basal|\bbase\b|buttress/i.test(p) ? "root" : /union|fork/i.test(p) ? "union" : /stem|trunk|bark|bole/i.test(p) ? "stem"
    : /leaf|leaves|foliage|dieback|vigour|vitality|bud/i.test(p) ? "vital" : /crown|branch|limb|deadwood|canopy|pollard/i.test(p) ? "crown" : "whole";
  for (const p of own || []) {
    const k = String(p || "").trim(); if (!k || have.has(k.toLowerCase()) || DEFECT_SAME[k.toLowerCase()]) continue;
    areas.find(a => a.key === guess(k)).items.push(k); have.add(k.toLowerCase());
  }
  const says = (name, part) => { const n = name.toLowerCase(); return { "Root plate": /root|basal|base\b/, "Base": /basal|base\b|butt/, "Stem": /stem/, "Main union": /union|bifurcation/, "Crown": /crown|deadwood|ivy|climbing/ }[part]?.test(n); };
  for (const a of areas) a.partOf = name => name in DEFECT_PART ? DEFECT_PART[name] : /\blean/i.test(name) || DEFECT_PLAIN.test(name) || says(name, a.part) ? "" : a.part;
  return areas;
}
// the handful this device picks most, topped up from DEFECT_START -> [{ name, part }]
function defectUsed(s, areas, n = 6) {
  const all = new Map(); areas.forEach(a => a.items.forEach(i => { if (!all.has(i)) all.set(i, a.partOf(i)); }));
  const use = (s && s.defectUse) || {};
  const names = Object.keys(use).filter(k => all.has(k)).sort((x, y) => use[y] - use[x]).concat(DEFECT_START);
  return names.filter((x, i) => names.indexOf(x) === i && all.has(x)).slice(0, n).map(name => ({ name, part: all.get(name) }));
}
const UNION_RE = /\b(union|fork|bifurcation|co-?dominant)/i;
const CAVITY_RE = /\b(cavity|hollow|decay)/i;
const UNION_TYPES = [["Normal", "normally formed union"], ["Embedded bark", "union with embedded (occluded) bark"],
  ["Cup-shaped", "cup-shaped union, bark partly occluded"], ["Bark at apex", "union with bark included at the apex"]];
const BRACES = ["None", "Crossing limb", "Fused stems", "Neighbouring tree", "Other stem"];

// t/R and the loss of bending strength for a centrally hollow round stem (section modulus; Rinn 2018)
function shellLoss(t, R) {
  if (!(t > 0 && R > 0) || t >= R) return null;
  const k = t / R, loss = Math.pow(1 - k, 4);
  return { k, loss };
}
function unionNote(u) {
  const bits = [];
  const ut = UNION_TYPES.find(x => x[0] === u.type);
  if (ut) bits.push(ut[1]);
  if (u.a && u.b) {
    const r = Math.round(Math.min(u.a, u.b) / Math.max(u.a, u.b) * 100);
    bits.push(`diameter ratio c. ${r}%` + (r >= 80 ? " (codominant)" : ""));
  }
  if (u.brace && u.brace !== "None") bits.push(`naturally braced by ${u.brace.toLowerCase()}`);
  if (u.bulge) bits.push("response growth either side");
  return bits.join(", ");
}
function unionHints(u) {
  const h = [];
  if (u.a && u.b && Math.min(u.a, u.b) / Math.max(u.a, u.b) >= 0.8) h.push("Ratio 80%+ – codominant stems; failures tend to be sudden splitting at the apex.");
  if (u.type === "Bark at apex") h.push("Bark exposed at the apex – the weakest union form in testing (Slater & Ennos 2015).");
  if (u.type === "Embedded bark") h.push("Fully embedded bark made little difference to strength in testing.");
  if (u.type === "Cup-shaped") h.push("Cup-shaped: partly repaired – stronger than bark at the apex.");
  if (u.brace && u.brace !== "None") h.push("Naturally braced – check before thinning, removing the brace or felling a neighbour.");
  if (u.bulge) h.push("Bulges show a flaw inside but don't by themselves predict failure (Slater).");
  return h;
}

function defectText(d) {
  let s = (d.name || "").trim().replace(/[.\s]+$/, "");
  if (!s) return "";
  const lean = /\blean/i.test(s);
  if (lean) {
    if (d.aspect) s += ` to the ${aspectWord(d.aspect)}`;
  } else {
    const where = partPhrase(d.part);
    if (where) s += " " + where;
    // a height, or a range of heights ("from 1.5 to 4 m") – always written low to high
    const h1 = parseFloat(d.height), h2 = parseFloat(d.height2);
    // the base and the root plate are at ground level: a height with only those is a second place ("at the base and at 3 m")
    const ground = where && partList(d.part).every(n => n === "Root plate" || n === "Base") && (d.height || d.height2) ? " and" : "";
    if (d.height && d.height2 && h1 !== h2 && !isNaN(h1) && !isNaN(h2)) s += `${ground} from ${h1 < h2 ? d.height : d.height2} to ${h1 < h2 ? d.height2 : d.height} m`;
    else if (d.height || d.height2) s += `${ground} at ${d.height || d.height2} m`;
    if (d.aspect) s += ` on the ${aspectWord(d.aspect)} side`;
  }
  if (d.size) {
    const size = String(d.size).trim().replace(/\s*[x×*]\s*/gi, " × ");
    const u = (UNITS.find(x => x[0] === d.unit) || UNITS[0])[1];
    s += `, c. ${size}${u === "%" || u === "°" ? "" : " "}${u}`;
  }
  if (d.choice && d.choiceInText) s += ` – ${d.choice}`;
  if (d.note) s += ` – ${d.note.trim()}`;
  return s;
}

// Opens the panel. name: the phrase tapped ("" = choose). onAdd(text, details) is called with the sentence.
// opts: { part: preset "where on the tree", info: html shown at the top (e.g. fungus notes),
//         choice: { label, options, value, inText } – one extra pick (e.g. the ash dieback category); it comes back
//         as details.choice, and is written into the sentence only when inText is true }
function defectSheet(name, phrases, onAdd, opts = {}) {
  const d = { name: name || "", part: opts.part || "", height: "", height2: "", aspect: "", size: "", unit: "mm", note: "",
    choice: (opts.choice && opts.choice.value) || "", choiceInText: !!(opts.choice && opts.choice.inText) };
  const back = document.createElement("div");
  back.className = "sheet-back";
  back.innerHTML = `<div class="sheet" role="dialog" aria-label="Defect details">
    <div class="grip"></div>
    ${opts.info ? `<div class="info">${opts.info}</div>` : ""}
    <label for="ds_name">Defect / feature</label>
    <input id="ds_name" list="ds_list" value="${esc(d.name)}" placeholder="e.g. Cavity" autocomplete="off">
    <datalist id="ds_list">${phrases.map(p => `<option value="${esc(p)}">`).join("")}</datalist>
    ${opts.choice ? `<label>${esc(opts.choice.label)}</label>
      <div class="chips" id="ds_choice">${opts.choice.options.map(o => `<button class="chip ${o === d.choice ? "on" : ""}" data-v="${esc(o)}">${esc(o)}</button>`).join("")}</div>` : ""}
    ${name ? `<button class="btn block" id="ds_plain" style="margin-top:8px">Add “${esc(name)}” without details</button>` :
      `<div class="ds-lib">${defectAreas(phrases).map(a => `<details><summary>${esc(a.name)}</summary>
        <div class="chips">${a.items.map(i => `<button class="chip small" data-lib="${esc(i)}" data-part="${esc(a.partOf(i))}">${esc(i)}</button>`).join("")}</div></details>`).join("")}</div>`}
    <div id="ds_union" hidden>
      <label>Union type</label><div class="chips" id="ds_ut">${UNION_TYPES.map(u => `<button class="chip small" data-v="${u[0]}">${u[0]}</button>`).join("")}</div>
      <div class="ds-row"><div><label for="ds_ua">Stem A dia (mm)</label><input id="ds_ua" inputmode="decimal" autocomplete="off"></div>
        <div><label for="ds_ub">Stem B dia (mm)</label><input id="ds_ub" inputmode="decimal" autocomplete="off"></div></div>
      <label>Natural brace</label><div class="chips" id="ds_br">${BRACES.map(b => `<button class="chip small" data-v="${b}">${b}</button>`).join("")}</div>
      <label class="check"><input type="checkbox" id="ds_bulge"> Bulges / response growth either side</label>
      <div class="hint" id="ds_uh"></div>
    </div>
    <div id="ds_cav" hidden>
      <label>Decay type (if known)</label><div class="chips" id="ds_dt">${["Brittle (brown / soft rot)", "Ductile (white rot)"].map(b => `<button class="chip small" data-v="${b}">${b}</button>`).join("")}</div>
      <div class="ds-row"><div><label for="ds_t">Sound wall t (mm)</label><input id="ds_t" inputmode="decimal" autocomplete="off" placeholder="thinnest"></div>
        <div><label for="ds_R">Stem radius R (mm)</label><input id="ds_R" inputmode="decimal" autocomplete="off" value="${opts.dbh ? Math.round(opts.dbh / 2) : ""}"></div></div>
      <div class="hint" id="ds_tr"></div>
    </div>
    <label>Where on the tree <span style="font-weight:400;color:var(--muted)">– tap one or more</span></label>
    <div class="chips" id="ds_part">${PARTS.map(p => `<button class="chip" data-v="${p[0]}">${p[0]}</button>`).join("")}</div>
    <div class="ds-row">
      <div><label for="ds_h">Height (m)</label>
        <div class="ds-range"><input id="ds_h" inputmode="decimal" autocomplete="off" placeholder="1.5" aria-label="Height, or from"><span>to</span><input id="ds_h2" inputmode="decimal" autocomplete="off" placeholder="–" aria-label="Height to (optional)"></div>
        <div class="hint">One height, or a range: fill in both.</div></div>
      <div><label>Side / direction</label><div class="compass" id="ds_asp">${ASPECTS.map(a => a[0]
        ? `<button class="chip" data-v="${a[0]}">${a[0]}</button>` : `<span class="hub">✛</span>`).join("")}</div></div>
    </div>
    <label for="ds_size">Size</label>
    <div class="ds-size"><input id="ds_size" inputmode="decimal" autocomplete="off" placeholder="300  or  300 x 150">
      <div class="chips" id="ds_unit">${UNITS.map(u => `<button class="chip ${u[0] === d.unit ? "on" : ""}" data-v="${u[0]}">${u[0]}</button>`).join("")}</div></div>
    <div class="hint">For “×” on the number pad, type a space: <i>300 150</i> becomes 300 × 150.</div>
    <label for="ds_note">Note (optional)</label><input id="ds_note" placeholder="e.g. hollow when sounded" autocomplete="off">
    <div class="sheet-foot"><div class="preview" id="ds_prev"></div>
    <div class="row"><button class="btn" id="ds_cancel">Cancel</button><button class="btn primary" id="ds_add">Add</button></div></div>
  </div>`;
  document.body.appendChild(back);
  const $s = sel => back.querySelector(sel);
  const u = { type: "", a: null, b: null, brace: "", bulge: false }, cav = { dtype: "", t: null, R: null };
  const extraNote = () => {
    const bits = [];
    if (!$s("#ds_union").hidden) { const n = unionNote(u); if (n) bits.push(n); }
    if (!$s("#ds_cav").hidden) {
      if (cav.dtype) bits.push(cav.dtype.split(" (")[0].toLowerCase() + " decay suspected");
      const r = shellLoss(cav.t, cav.R);
      if (r) bits.push(`t/R c. ${r.k.toFixed(2)}`);
    }
    return bits.join("; ");
  };
  let unitChosen = false, unitAuto = false, unitWas = "";
  const update = () => {
    d.name = $s("#ds_name").value;
    const hs = $s("#ds_h").value.trim().replace(/,/g, ".").split(/\s+|\s*(?:-|–|to)\s*/).filter(Boolean);  // "1.5 4" in the first box is a range too
    d.height = hs[0] || ""; d.height2 = $s("#ds_h2").value.trim().replace(",", ".") || hs[1] || "";
    d.size = $s("#ds_size").value.trim().replace(/(\d)\s+(\d)/g, "$1 x $2");
    const lean = /\blean/i.test(d.name);
    if (!unitChosen && (lean ? d.unit !== "°" : d.unit === "°" && unitAuto)) {   // nobody has tapped a unit: degrees for a lean, back to the usual unit otherwise
      if (lean) { unitWas = d.unit; d.unit = "°"; unitAuto = true; } else { d.unit = unitWas || UNITS[0][0]; unitAuto = false; }
      $s("#ds_unit").querySelectorAll(".chip").forEach(c => c.classList.toggle("on", c.dataset.v === d.unit));
    }
    $s("#ds_part").closest("div").style.opacity = lean ? 0.4 : 1;
    $s("#ds_union").hidden = !UNION_RE.test(d.name); $s("#ds_cav").hidden = !CAVITY_RE.test(d.name);
    u.a = +$s("#ds_ua").value || null; u.b = +$s("#ds_ub").value || null; u.bulge = $s("#ds_bulge").checked;
    cav.t = +$s("#ds_t").value || null; cav.R = +$s("#ds_R").value || null;
    $s("#ds_uh").innerHTML = unionHints(u).map(esc).join("<br>");
    const r = shellLoss(cav.t, cav.R);
    $s("#ds_tr").innerHTML = r ? `t/R ${r.k.toFixed(2)} – about ${Math.round(r.loss * 100)}% of the cross-section's bending strength lost (hollow round stem, section modulus).` +
      (r.k < 0.25 ? " <b>Below ¼ the formula overstates real strength; torsional (twisting) failure becomes likely.</b>" : "") +
      " Not a pass/fail – growth since the tree reached full height adds strength (Rinn)." : "Enter the thinnest sound wall and the stem radius for t/R.";
    const ex = extraNote(), own = $s("#ds_note").value.trim();
    d.note = [ex, own].filter(Boolean).join("; ");
    d.union = !$s("#ds_union").hidden && (u.type || u.a || u.brace) ? Object.assign({}, u) : undefined;
    d.cavity = !$s("#ds_cav").hidden && (cav.t || cav.dtype) ? Object.assign({}, cav, r ? { tR: +r.k.toFixed(3), loss: +r.loss.toFixed(3) } : {}) : undefined;
    const txt = defectText(d);
    $s("#ds_prev").textContent = txt ? txt.replace(/[.\s]+$/, "") + "." : "Choose a defect or feature";
  };
  const single = (id, key) => $s(id).onclick = e => {
    const b = e.target.closest(".chip"); if (!b) return;
    d[key] = d[key] === b.dataset.v && key !== "unit" ? "" : b.dataset.v;
    $s(id).querySelectorAll(".chip").forEach(c => c.classList.toggle("on", c.dataset.v === d[key]));
    update();
  };
  single("#ds_asp", "aspect"); single("#ds_unit", "unit");
  $s("#ds_unit").addEventListener("click", e => { if (e.target.closest(".chip")) unitChosen = true; }, true);
  if (opts.choice) single("#ds_choice", "choice");
  $s("#ds_part").onclick = e => {  // tap one or several places
    const b = e.target.closest(".chip"); if (!b) return;
    const cur = partList(d.part), v = b.dataset.v;
    d.part = partList((cur.includes(v) ? cur.filter(x => x !== v) : cur.concat(v)).join(", ")).join(", ");
    $s("#ds_part").querySelectorAll(".chip").forEach(c => c.classList.toggle("on", partList(d.part).includes(c.dataset.v)));
    update();
  };
  const pickOne = (id, obj, key) => $s(id).onclick = e => {
    const b = e.target.closest(".chip"); if (!b) return; e.preventDefault();
    obj[key] = obj[key] === b.dataset.v ? "" : b.dataset.v;
    $s(id).querySelectorAll(".chip").forEach(c => c.classList.toggle("on", c.dataset.v === obj[key])); update();
  };
  pickOne("#ds_ut", u, "type"); pickOne("#ds_br", u, "brace"); pickOne("#ds_dt", cav, "dtype");
  $s("#ds_bulge").onchange = update;
  const lib = $s(".ds-lib");
  if (lib) lib.onclick = e => {
    const b = e.target.closest("[data-lib]"); if (!b) return; e.preventDefault();
    $s("#ds_name").value = b.dataset.lib; lib.querySelectorAll("details").forEach(x => x.open = false);
    if (b.dataset.part && !partList(d.part).length) {   // the area it was picked from says where it is, unless a place is already chosen
      d.part = b.dataset.part; $s("#ds_part").querySelectorAll(".chip").forEach(c => c.classList.toggle("on", partList(d.part).includes(c.dataset.v)));
    }
    update();
  };
  d.part = partList(d.part).join(", ");
  $s("#ds_part").querySelectorAll(".chip").forEach(c => c.classList.toggle("on", partList(d.part).includes(c.dataset.v)));
  back.querySelectorAll("input").forEach(i => i.addEventListener("input", update));
  const close = () => back.remove();
  back.addEventListener("click", e => { if (e.target === back) close(); });
  $s("#ds_cancel").onclick = close;
  if ($s("#ds_plain")) $s("#ds_plain").onclick = () => {
    close();
    if (!d.choice) return onAdd(name, null);
    const txt = name + (d.choiceInText ? ` – ${d.choice}` : "");
    onAdd(txt, { name, choice: d.choice, text: txt });
  };
  $s("#ds_add").onclick = () => {
    update();
    const txt = defectText(d);
    if (!txt) { toast("Choose a defect or feature first"); $s("#ds_name").focus(); return; }
    close(); onAdd(txt, Object.assign({}, d, { text: txt }));
  };
  update();
  // (no autofocus: the keyboard would cover the defect library)
}


// ---------------------------------------------------------------- fungi & diseases picker
const SIG_CLASS = { "High": "sig-h", "Moderate–high": "sig-mh", "Moderate": "sig-m", "Low–moderate": "sig-l", "Low": "sig-l" };
const CONIFERS = /\b(pinus|picea|abies|larix|pseudotsuga|cedrus|taxus|thuja|tsuga|chamaecyparis|cupressus|sequoia|sequoiadendron|metasequoia|araucaria|juniperus|conifer)/i;

function hostKeywords(species) {
  const s = String(species || "").toLowerCase();
  const p = s.split(/\s+[-–]\s+/);
  const words = new Set();
  (p[1] || p[0]).split(/[\s,]+/).filter(w => w.length > 3 && !["common", "european", "english", "silver", "small", "large", "leaved"].includes(w)).forEach(w => words.add(w.replace(/s$/, "")));
  const genus = (p[0].split(/\s+/)[0] || "");
  if (genus.length > 3) words.add(genus);
  if (CONIFERS.test(s)) words.add("conifer");
  if (/prunus/.test(s)) words.add("prunus");
  return [...words];
}

function fungusSheet(species, onPick) {
  const keys = hostKeywords(species);
  const likely = f => keys.some(k => f.hosts.toLowerCase().includes(k) || (k === "conifer" && /conifer|pine/i.test(f.hosts)));
  let group = "", q = "";
  const back = document.createElement("div");
  back.className = "sheet-back";
  back.innerHTML = `<div class="sheet" role="dialog" aria-label="Fungi and diseases">
    <div class="grip"></div>
    <input id="fg_q" type="search" placeholder="Search – name, host or decay (e.g. ganoderma, beech, brown rot)" autocomplete="off">
    <div class="chips" id="fg_g">${["", "Roots & butt", "Stem & branches", "Disease"].map(g => `<button class="chip ${g ? "" : "on"}" data-v="${g}">${g || "All"}</button>`).join("")}</div>
    <div id="fg_list" class="fglist"></div>
    <div class="sheet-foot"><div class="row"><button class="btn" id="fg_cancel">Cancel</button></div></div>
  </div>`;
  document.body.appendChild(back);
  const $s = sel => back.querySelector(sel);
  const draw = () => {
    const qq = q.toLowerCase();
    const list = FUNGI.filter(f => (!group || f.g === group) &&
      (!qq || [f.com, f.sci, f.hosts, f.decay, f.where].join(" ").toLowerCase().includes(qq)));
    const a = list.filter(likely), b = list.filter(f => !likely(f));
    const item = f => `<button class="fgitem" data-sci="${esc(f.sci)}">
        <span class="fgname">${esc(f.com)} <i>${esc(f.sci)}</i></span>
        <span class="sig ${SIG_CLASS[f.sig] || ""}">${esc(f.sig)}</span>
        <span class="meta">${esc(f.g)} · ${esc(f.decay)} · ${esc(f.hosts)}</span></button>`;
    $s("#fg_list").innerHTML =
      (a.length && keys.length ? `<div class="fghead">Known on ${esc(common(species) || "this species")}</div>` + a.map(item).join("") +
        (b.length ? `<div class="fghead">Others</div>` : "") : "") +
      (a.length && keys.length ? b : list).map(item).join("") ||
      `<div class="empty">Nothing matches “${esc(q)}”.</div>`;
  };
  $s("#fg_q").oninput = e => { q = e.target.value.trim(); draw(); };
  $s("#fg_g").onclick = e => {
    const b = e.target.closest(".chip"); if (!b) return;
    group = b.dataset.v; $s("#fg_g").querySelectorAll(".chip").forEach(c => c.classList.toggle("on", c === b)); draw();
  };
  $s("#fg_list").onclick = e => {
    const b = e.target.closest(".fgitem"); if (!b) return;
    const f = FUNGI.find(x => x.sci === b.dataset.sci); back.remove(); onPick(f);
  };
  $s("#fg_cancel").onclick = () => back.remove();
  back.addEventListener("click", e => { if (e.target === back) back.remove(); });
  draw();
}

// the sentence for a fungus: "Fruiting bodies of Meripilus giganteus (giant polypore)" / "Symptoms of sooty bark disease (Cryptostroma corticale)"
function fungusPhrase(f) {
  const sci = f.sci.replace(/\s*\(.*\)$/, "");
  const com = f.com.split("/")[0].trim();
  // a genus keeps its capital, and so does a name written with capitals inside it ("Brittle Cinder fungus")
  const lc = sci.startsWith(com.split(" ")[0]) || /[A-Z]/.test(com.slice(1)) ? com : com.charAt(0).toLowerCase() + com.slice(1);
  return f.g === "Disease" ? `Symptoms of ${lc} (${sci})` : `Fruiting bodies of ${sci} (${lc})`;
}
function fungusInfo(f) {
  return `<b>${esc(f.com)}</b> <i>${esc(f.sci)}</i> – <span class="sig ${SIG_CLASS[f.sig] || ""}">${esc(f.sig)}</span><br>
    ${esc(f.decay)} · ${esc(f.life)}<br><span class="meta">${esc(f.note)}</span>`;
}

// ---------------------------------------------------------------- pests & diseases picker (insects, mammals, diseases other than decay fungi)
function pestList() {
  const fromFungi = FUNGI.filter(f => f.g === "Disease").map(f => ({ g: "Diseases", com: f.com, sci: f.sci, hosts: f.hosts, where: f.where,
    effect: f.decay, sig: f.sig, report: "", part: f.part, note: f.note }));
  return PESTS.concat(fromFungi.filter(f => !PESTS.some(p => p.sci === f.sci)));
}
function pestSheet(species, onPick) {
  const keys = hostKeywords(species), all = pestList();
  const likely = f => keys.some(k => f.hosts.toLowerCase().includes(k) || (k === "conifer" && /conifer|pine/i.test(f.hosts)));
  let group = "", q = "";
  const back = document.createElement("div");
  back.className = "sheet-back";
  back.innerHTML = `<div class="sheet" role="dialog" aria-label="Pests and diseases">
    <div class="grip"></div>
    <input id="pd_q" type="search" placeholder="Search – name, host or sign (e.g. processionary, oak, bleeding)" autocomplete="off">
    <div class="chips" id="pd_g">${["", "Insects", "Mammals", "Diseases", "Report"].map(g => `<button class="chip ${g ? "" : "on"}" data-v="${g}">${g === "Report" ? "To report" : g || "All"}</button>`).join("")}</div>
    <div id="pd_list" class="fglist"></div>
    <div class="sheet-foot"><div class="row"><button class="btn" id="pd_cancel">Cancel</button></div></div>
  </div>`;
  document.body.appendChild(back);
  const $s = sel => back.querySelector(sel);
  const draw = () => {
    const qq = q.toLowerCase();
    const list = all.filter(f => (!group || (group === "Report" ? !!f.report : f.g === group)) &&
      (!qq || [f.com, f.sci, f.hosts, f.where, f.effect].join(" ").toLowerCase().includes(qq)));
    const a = list.filter(likely), b = list.filter(f => !likely(f));
    const item = f => `<button class="fgitem" data-sci="${esc(f.sci)}">
        <span class="fgname">${esc(f.com)} <i>${esc(f.sci)}</i></span>
        <span class="sig ${SIG_CLASS[f.sig] || ""}">${esc(f.sig)}</span>
        <span class="meta">${esc(f.g)}${f.report ? ` · <b>${esc(/notifiable/i.test(f.report) ? "Notifiable" : "Report")}</b>` : ""} · ${esc(f.hosts)}</span></button>`;
    $s("#pd_list").innerHTML =
      (a.length && keys.length ? `<div class="fghead">Known on ${esc(common(species) || "this species")}</div>` + a.map(item).join("") +
        (b.length ? `<div class="fghead">Others</div>` : "") : "") +
      (a.length && keys.length ? b : list).map(item).join("") ||
      `<div class="empty">Nothing matches “${esc(q)}”.</div>`;
  };
  $s("#pd_q").oninput = e => { q = e.target.value.trim(); draw(); };
  $s("#pd_g").onclick = e => {
    const b = e.target.closest(".chip"); if (!b) return;
    group = b.dataset.v; $s("#pd_g").querySelectorAll(".chip").forEach(c => c.classList.toggle("on", c === b)); draw();
  };
  $s("#pd_list").onclick = e => {
    const b = e.target.closest(".fgitem"); if (!b) return;
    const f = all.find(x => x.sci === b.dataset.sci); back.remove(); onPick(f);
  };
  $s("#pd_cancel").onclick = () => back.remove();
  back.addEventListener("click", e => { if (e.target === back) back.remove(); });
  draw();
}
// "Signs of oak processionary moth (Thaumetopoea processionea)" / "Symptoms of acute oak decline (Brenneria goodwinii …)"
function pestPhrase(f) {
  const sci = f.sci.replace(/\s*\((bacterium|oomycete|bacteria)\)/g, "").replace(/\s+and others$/, "");
  const com = f.com.split("/")[0].trim();
  const lc = /^[A-Z][a-z]/.test(com) && !/^[A-Z]{2}/.test(com) ? com.charAt(0).toLowerCase() + com.slice(1) : com;
  if (/^Several causes/.test(sci)) return `Symptoms of ${lc}`;
  if (sci.toLowerCase().startsWith(com.toLowerCase())) return `Symptoms of ${sci}`;
  return f.g === "Diseases" ? `Symptoms of ${lc} (${sci})` : `Signs of ${lc} (${sci})`;
}
function pestInfo(f) {
  return `<b>${esc(f.com)}</b> <i>${esc(f.sci)}</i> – <span class="sig ${SIG_CLASS[f.sig] || ""}">${esc(f.sig)}</span>
    ${f.report ? `<br><b>${esc(f.report)}</b>` : ""}<br>${esc(f.where)}<br>${esc(f.effect)}${f.note ? `<br><span class="meta">${esc(f.note)}</span>` : ""}`;
}
