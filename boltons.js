// Tree Survey – © 2026 Mark Johnson. All rights reserved. Use only under a written licence from the owner.
/* Tree Survey – bolt-ons.
   - Nesting bird / pre-clearance checks: nests plotted with exclusion zones (5 / 10 / 15 / 20 / 30 / 50 m or custom),
     BoCC5 status (Red / Amber / Green) and Wildlife and Countryside Act Schedule 1 flags, re-check dates.
   - Ecology: protected species signs, invasive plants and habitat features (badger setts kept confidential).
   - Bats: ground level tree assessment and potential roost features (BCT Good Practice Guidelines, 4th ed., 2023 categories).
   - BNG: individual tree baseline for the statutory biodiversity metric (size class, condition criteria A–F).
   - Property: distance to the building, ownership, water demand and zone of influence (mortgage / subsidence reports).
   - Lone working check-in / check-out by text message.
   Nests and ecology features live in the "features" store; bat / BNG / property data on each tree (t.bat, t.bng, t.prop). */
"use strict";

const BOLT_LIST = [["nest", "🐦 Nesting birds"], ["bat", "🦇 Bats (tree roosts)"], ["eco", "🦡 Ecology"], ["bng", "🌿 BNG tree baseline"]];
const bolts = job => Object.assign({}, job.bolts || {}, job.type === "NEST" ? { nest: true } : {});
const TYPE_LABEL = { AMR: "AMR", BS5837: "BS5837", NEST: "Nesting birds", PROPERTY: "Property", WORKS: "Works order" };

// ------------------------------------------------------------------ birds
// Birds of Conservation Concern 5 (2021): R / A / G ("" = not assessed or check); S1 = Schedule 1, WCA 1981.
const BIRDS = [
  ["Barn owl", "G", 1], ["Black redstart", "A", 1], ["Black-headed gull", "A"], ["Blackbird", "G"], ["Blackcap", "G"], ["Blue tit", "G"],
  ["Brambling", "", 1], ["Bullfinch", "A"], ["Buzzard", "G"], ["Carrion crow", "G"], ["Chaffinch", "G"], ["Chiffchaff", "G"],
  ["Coal tit", "G"], ["Collared dove", "G"], ["Common crossbill", "G", 1], ["Common sandpiper", "A"], ["Cuckoo", "R"], ["Curlew", "R"],
  ["Dunnock", "A"], ["Feral pigeon", ""], ["Fieldfare", "R", 1], ["Firecrest", "", 1], ["Goldcrest", "G"], ["Goldfinch", "G"],
  ["Goshawk", "G", 1], ["Grasshopper warbler", "R"], ["Great spotted woodpecker", "G"], ["Great tit", "G"], ["Green woodpecker", "G"],
  ["Greenfinch", "R"], ["Grey heron", "G"], ["Grey partridge", "R"], ["Grey wagtail", "A"], ["Hawfinch", "R"], ["Hen harrier", "R", 1],
  ["Herring gull", "R"], ["Hobby", "G", 1], ["House martin", "R"], ["House sparrow", "R"], ["Jackdaw", "G"], ["Jay", "G"],
  ["Kestrel", "A"], ["Kingfisher", "G", 1], ["Lapwing", "R"], ["Lesser black-backed gull", "A"], ["Lesser redpoll", "R"],
  ["Lesser spotted woodpecker", "R"], ["Linnet", "R"], ["Little owl", ""], ["Long-tailed tit", "G"], ["Magpie", "G"], ["Mallard", "A"],
  ["Marsh tit", "R"], ["Meadow pipit", "A"], ["Merlin", "R", 1], ["Mistle thrush", "R"], ["Moorhen", "A"], ["Nuthatch", "G"],
  ["Osprey", "A", 1], ["Oystercatcher", "A"], ["Peregrine", "G", 1], ["Pheasant", ""], ["Pied flycatcher", "A"], ["Pied wagtail", "G"],
  ["Raven", "G"], ["Red kite", "G", 1], ["Redstart (common)", "A"], ["Redwing", "A", 1], ["Reed bunting", "A"], ["Ring ouzel", "R"],
  ["Robin", "G"], ["Rook", "A"], ["Sedge warbler", "A"], ["Short-eared owl", "A"], ["Siskin", "G"], ["Skylark", "R"], ["Snipe", "A"],
  ["Song thrush", "A"], ["Sparrowhawk", "A"], ["Spotted flycatcher", "R"], ["Starling", "R"], ["Stock dove", "A"], ["Swallow", "G"],
  ["Swift", "R"], ["Tawny owl", "A"], ["Tree pipit", "R"], ["Tree sparrow", "R"], ["Treecreeper", "G"], ["Turtle dove", "R"],
  ["Twite", "R"], ["Wheatear", "A"], ["Whitethroat", "A"], ["Willow tit", "R"], ["Willow warbler", "A"], ["Wood warbler", "R"],
  ["Woodcock", "R"], ["Woodlark", "", 1], ["Woodpigeon", "A"], ["Wren", "A"], ["Yellow wagtail", "R"], ["Yellowhammer", "R"],
  ["Unknown – small bird", ""], ["Unknown – large bird", ""]];
const BIRD = new Map(BIRDS.map(([n, s, s1]) => [n.toLowerCase(), { name: n, status: s, s1: !!s1 }]));
const STATUS_NAME = { R: "Red", A: "Amber", G: "Green", "": "–" };
const STATUS_COL = { R: "#C8102E", A: "#E8A200", G: "#2F8A3B", "": "#6a7a6d", S1: "#7A1FA2" };
const NEST_STATUS = ["Building", "Eggs / incubating", "Young in nest", "Fledged – young still dependent", "Suspected – adult behaviour", "Not in use / old nest"];
const NEST_EVID = ["Nest seen", "Adult sitting", "Adults carrying food", "Adults carrying nest material", "Alarm calling / agitated adults", "Young heard", "Fledglings nearby", "Droppings / whitewash"];
const NEST_WHERE = ["In tree", "Hedge", "Shrub / scrub", "Bramble / ground cover", "Ivy", "Building / structure", "Ground", "Nest box", "Waterside / reeds", "Other"];
const NEST_METHOD = ["Visual from the ground", "Binoculars", "Inspection camera / endoscope", "Thermal camera", "Drone", "Ladder", "Watched for adult activity"];
const NEST_LIMITS = ["Dense vegetation limited the view", "Upper canopy not fully visible", "Ivy-clad stems not fully checked", "Access restricted", "Poor light", "Weather limited bird activity"];
const BUFFERS = [5, 10, 15, 20, 30, 50];
const nestActive = n => n.status !== "Not in use / old nest" && !n.finished;
const nestKey = n => n.s1 ? "S1" : (n.bocc || "");

function nestDefaults(s) {
  return Object.assign({ G: 5, A: 10, R: 10, S1: 30, "": 5, validHours: 48, recheckDays: 7 }, s.nest || {});
}
function bufferFor(n, s) { const d = nestDefaults(s); return n.s1 ? d.S1 : d[n.bocc || ""] ?? d[""]; }

// ------------------------------------------------------------------ ecology
const ECO = {
  "Protected species sign": ["Badger sett", "Badger signs (latrine, paths, hair, snuffle holes)", "Otter (spraint, holt, prints)", "Water vole (burrows, latrines, feeding)",
    "Red squirrel (drey, stripped cones, sighting)", "Hedgehog", "Great crested newt – pond / habitat", "Reptile (sighting / habitat)", "Bat (roost evidence / sighting)",
    "Barn owl (pellets, whitewash)", "Dormouse (opened hazelnuts)", "Other protected species"],
  "Invasive plant": ["Japanese knotweed", "Giant hogweed", "Himalayan balsam", "Rhododendron ponticum", "Cotoneaster (invasive)", "Variegated yellow archangel", "Other invasive plant"],
  "Habitat feature": ["Pond", "Watercourse / ditch", "Hedgerow", "Deadwood / log pile", "Veteran / ancient tree", "Woodland edge", "Species-rich grassland", "Scrub", "Wall / structure with crevices", "Other habitat"],
  "Other": ["Other observation"],
};
const ECO_COL = { "Protected species sign": "#7A1FA2", "Invasive plant": "#C8102E", "Habitat feature": "#1F6FB2", "Other": "#555" };
const ecoConfidential = f => /badger sett/i.test(f.type || "") || f.confidential;

// ------------------------------------------------------------------ bats (BCT 4th ed. categories)
const BAT_GLTA = ["None", "FAR", "PRF"];
const BAT_GLTA_TXT = { None: "None – no potential roost features", FAR: "FAR – further assessment required", PRF: "PRF – at least one potential roost feature" };
const PRF_TYPES = ["Woodpecker hole", "Rot hole / cavity", "Hazard beam", "Tear-out", "Split / crack", "Frost crack", "Knot hole", "Lifting / loose bark", "Canker",
  "Butt rot / basal cavity", "Compression fork / included bark", "Dense ivy (stems over 50 mm)", "Hollow stem / limb", "Other"];
const BAT_ASPECTS = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
const PRF_METHOD = ["Ground / binoculars", "Torch / mirror", "Endoscope", "Ladder", "MEWP", "Climbing", "Drone / pole camera", "Not inspected"];
const PRF_EVID = ["None found", "Bats seen", "Droppings", "Urine / grease staining", "Scratch marks", "Feeding remains", "Odour", "Flies", "Bird / other use", "Wet – unsuitable"];
const BAT_RECS = ["No further survey", "Precautionary working method", "Aerial PRF inspection by a licensed ecologist", "Further survey by an ecologist (emergence / re-entry)", "Retain the feature", "Bat box as a precaution"];
function batGrade(b) {
  if (!b) return "";
  const g = (b.prfs || []).map(p => p.grade);
  if (g.includes("PRF-M")) return "PRF-M";
  if (g.includes("PRF-I")) return "PRF-I";
  return b.glta || "";
}

// ------------------------------------------------------------------ BNG (statutory biodiversity metric, individual trees)
const NATIVE_TREES = ["Acer campestre", "Alnus glutinosa", "Arbutus unedo", "Betula pendula", "Betula pubescens", "Buxus sempervirens", "Carpinus betulus", "Cornus sanguinea",
  "Corylus avellana", "Crataegus laevigata", "Crataegus monogyna", "Euonymus europaeus", "Fagus sylvatica", "Frangula alnus", "Fraxinus excelsior", "Ilex aquifolium",
  "Juniperus communis", "Malus sylvestris", "Pinus sylvestris", "Populus nigra", "Populus tremula", "Prunus avium", "Prunus padus", "Prunus spinosa", "Quercus petraea",
  "Quercus robur", "Rhamnus cathartica", "Salix alba", "Salix aurita", "Salix caprea", "Salix cinerea", "Salix fragilis", "Salix pentandra", "Salix purpurea", "Salix triandra",
  "Salix viminalis", "Sambucus nigra", "Sorbus aria", "Sorbus aucuparia", "Sorbus torminalis", "Taxus baccata", "Tilia cordata", "Tilia platyphyllos", "Ulmus glabra",
  "Ulmus minor", "Ulmus procera", "Viburnum opulus", "Viburnum lantana"];
const BNG_CRIT = [
  ["A", "Native species (or 70%+ of a block native)"],
  ["B", "Canopy continuous – individual trees pass automatically"],
  ["C", "Mature (or 50%+ of a block mature)"],
  ["D", "Little or no damage to health by human activity; no regular pruning (75%+ of expected canopy)"],
  ["E", "Natural niches – deadwood, cavities, ivy or loose bark"],
  ["F", "More than 20% of the canopy oversails vegetation beneath"]];
const BNG_SIZE = [["Small", 7.5, 30, 0.0041], ["Medium", 30, 60, 0.0163], ["Large", 60, 90, 0.0366], ["Very large", 90, 1e9, 0.0765]];
function largestStem(t) {
  const nums = String(t.dbh || "").replace(/#/g, "").match(/\d+(\.\d+)?/g) || [];
  const mm = Math.max(0, ...nums.map(Number));
  return mm > 0 ? mm / 10 : 0;  // cm
}
function bngSize(t) {
  const cm = largestStem(t);
  if (!cm) return null;
  if (cm <= 7.5) return ["Small (under 7.5 cm – not counted at baseline)", 0, 7.5, 0];
  return BNG_SIZE.find(([, lo, hi]) => cm > lo && cm <= hi) || null;
}
const isNative = t => NATIVE_TREES.some(n => String(t.species || "").toLowerCase().startsWith(n.toLowerCase()));
function bngCondition(b) {
  const n = BNG_CRIT.filter(([k]) => b && b.crit && b.crit[k]).length;
  return n >= 5 ? "Good" : n >= 3 ? "Moderate" : "Poor";
}
function bngSuggest(t, job) {
  const txt = `${t.comments || ""} ${t.recs || ""}`.toLowerCase(), v = t.vet || {};
  const niches = /cavit|deadwood|dead wood|ivy|loose bark|hollow|decay|rot hole|woodpecker/.test(txt) || +v.holes > 0 || +v.dwAttached > 0 || (v.epiphytes || []).includes("Ivy");
  const removed = job.type === "BS5837" ? t.retain === "Remove" || t.category === "U" : /\bfell|\bremove/.test(String(t.recs || "").toLowerCase());
  return { setting: job.bngSetting || "Urban", crit: { A: isNative(t), B: true, C: ["M", "OM", "V"].includes(t.lifeStage), D: !/vandal|topped|herbicide|lopped/.test(txt), E: niches, F: false },
    outcome: removed ? "Removed" : "Retained", irreplaceable: t.lifeStage === "V", count: 1, auto: true };
}

// ------------------------------------------------------------------ property: water demand (NHBC Standards 4.2 classes)
const WATER = {
  High: ["Quercus", "Populus", "Salix", "Ulmus", "Eucalyptus", "Crataegus", "Cupressus", "Chamaecyparis", "Cuprocyparis", "Cupressocyparis", "× Cuprocyparis", "x Cuprocyparis"],
  Moderate: ["Robinia", "Alnus", "Malus", "Fraxinus", "Laurus", "Fagus", "Prunus", "Cedrus", "Aesculus", "Castanea", "Pseudotsuga", "Tilia", "Acer", "Sorbus", "Pyrus",
    "Pinus", "Platanus", "Picea", "Ailanthus", "Juglans", "Sequoiadendron", "Taxus", "Larix", "Araucaria"],
  Low: ["Betula", "Sambucus", "Ficus", "Corylus", "Ilex", "Gleditsia", "Carpinus", "Laburnum", "Magnolia", "Morus", "Liriodendron"]};
const ZONE = { High: 1.25, Moderate: 0.75, Low: 0.5 };
function waterDemand(species) {
  const g = String(species || "").trim().replace(/^[x×]\s*/i, "").split(/[\s-]/)[0].toLowerCase();
  for (const [k, list] of Object.entries(WATER)) if (list.some(x => x.replace(/^[x×]\s*/i, "").toLowerCase() === g)) return k;
  return "";
}
const PROP_PART = ["House", "Extension", "Garage", "Conservatory", "Outbuilding", "Boundary wall", "Drains", "Paving / drive"];
const PROP_OWNER = ["Client's", "Neighbour's", "Council / highway", "Unknown"];
const PROP_DIRECT = ["Roots lifting paving", "Stem / roots against a wall", "Branches touching the building", "Roots near drains", "Debris in gutters", "Overhanging the roof"];
const PROP_IMPL = ["Implicated", "Possibly implicated", "Not implicated"];
function propInfluence(t) {
  const p = t.prop || {}, wd = p.water || waterDemand(t.species), h = Math.max(parseFloat(t.height) || 0, parseFloat(p.matureH) || 0), d = parseFloat(p.dist);
  if (!wd || !h || !(d >= 0)) return null;
  const zone = ZONE[wd] * h;
  return { wd, h, d, zone, within: d <= zone, ratio: d / h };
}

// ------------------------------------------------------------------ generic chip / input binding for a sub-object
function chips(key, opts, val, many = false, small = true) {
  const on = o => many ? (val || []).includes(o) : val === o;
  return `<div class="chips" data-${many ? "bmany" : "bone"}="${key}">${opts.map(o => `<button class="chip ${small ? "small" : ""} ${on(o) ? "on" : ""}" data-v="${esc(o)}">${esc(o)}</button>`).join("")}</div>`;
}
function bindSub(box, obj, touch, after) {
  if (!box) return;
  box.querySelectorAll("[data-bone]").forEach(g => g.onclick = e => {
    const b = e.target.closest(".chip"); if (!b) return; e.preventDefault();
    const k = g.dataset.bone; obj()[k] = obj()[k] === b.dataset.v ? "" : b.dataset.v;
    g.querySelectorAll(".chip").forEach(c => c.classList.toggle("on", c.dataset.v === obj()[k])); touch(); if (after) after(k);
  });
  box.querySelectorAll("[data-bmany]").forEach(g => g.onclick = e => {
    const b = e.target.closest(".chip"); if (!b) return; e.preventDefault();
    const k = g.dataset.bmany, s = new Set(obj()[k] || []); s.has(b.dataset.v) ? s.delete(b.dataset.v) : s.add(b.dataset.v);
    obj()[k] = [...s]; b.classList.toggle("on"); touch(); if (after) after(k);
  });
  box.querySelectorAll("[data-bin]").forEach(i => i.oninput = () => { obj()[i.dataset.bin] = i.type === "number" || i.inputMode === "decimal" ? i.value.replace(",", ".").trim() : i.value; touch(); if (after) after(i.dataset.bin); });
  box.querySelectorAll("[data-bchk]").forEach(c => c.onchange = () => { obj()[c.dataset.bchk] = c.checked; touch(); if (after) after(c.dataset.bchk); });
}

// ------------------------------------------------------------------ tree form panels (called from treePage)
function boltTreeBoxes(t, job, s) {
  const bo = bolts(job), out = [];
  if (job.type === "PROPERTY") {
    const p = t.prop || {}, wd = p.water || waterDemand(t.species);
    out.push(`<details class="more" id="propBox" open><summary>Property – distance, ownership, water demand</summary>
      <div class="grid2"><div><label for="p_dist">Distance to the building (m)</label><input id="p_dist" data-bin="dist" inputmode="decimal" autocomplete="off" value="${esc(p.dist ?? "")}"></div>
        <div><label for="p_matureH">Mature height (m, NHBC)</label><input id="p_matureH" data-bin="matureH" inputmode="decimal" autocomplete="off" placeholder="optional" value="${esc(p.matureH ?? "")}"></div></div>
      <label>Measured to</label>${chips("part", PROP_PART, p.part)}
      <label>Tree belongs to</label>${chips("owner", PROP_OWNER, p.owner)}
      <label>Water demand ${wd && !p.water ? `<span class="hint">(${wd} from the species)</span>` : ""}</label>${chips("water", ["High", "Moderate", "Low"], p.water || "")}
      <div class="roh" id="propOut"></div>
      <label>Direct damage</label>${chips("direct", PROP_DIRECT, p.direct, true)}
      ${(job.property || {}).purpose === "Subsidence" ? `<label>Subsidence</label>${chips("implicated", PROP_IMPL, p.implicated)}` : ""}
    </details>`);
  }
  if (bo.bat) {
    const b = t.bat || {};
    out.push(`<details class="more" id="batBox" ${t.bat ? "open" : ""}><summary>Bats – ground level tree assessment ${batGrade(b) ? `· <b>${esc(batGrade(b))}</b>` : ""}</summary>
      <div class="hint">${s.batLicence ? `Bat licence ${esc(s.batLicence)}.` : "<b>No bat licence on this device:</b> inspect only from the ground or with a camera where bats won't be disturbed. If bats may be present, stop – a licensed ecologist inspects."}</div>
      <label>Tree category (from the ground)</label>${chips("glta", BAT_GLTA, b.glta)}
      <label>Access for the assessment</label>${chips("access", ["All aspects", "Partial", "Poor"], b.access)}
      <div id="prfList"></div><button class="btn small" id="addPrf">＋ Potential roost feature</button>
      <label>Recommendation</label>${chips("recs", BAT_RECS, b.recs, true)}
      <label for="b_notes">Bat notes</label><textarea id="b_notes" data-bin="notes" rows="2">${esc(b.notes || "")}</textarea>
    </details>`);
  }
  if (bo.bng) {
    const g = t.bng || bngSuggest(t, job), sz = bngSize(t);
    out.push(`<details class="more" id="bngBox" ${t.bng ? "open" : ""}><summary>BNG tree baseline · <span id="bngHead">${esc(sz ? sz[0] : "DBH?")} · ${bngCondition(g)}</span></summary>
      <div class="hint">Size class from the largest stem (${largestStem(t) ? largestStem(t).toFixed(1) + " cm" : "enter the DBH"}). Tick the condition criteria that apply – suggested from the record, check each one.</div>
      <label>Setting</label>${chips("setting", ["Urban", "Rural"], g.setting)}
      <div class="bngcrit">${BNG_CRIT.map(([k, l]) => `<label class="check"><input type="checkbox" data-crit="${k}" ${g.crit && g.crit[k] ? "checked" : ""}> <b>${k}</b> ${esc(l)}</label>`).join("")}</div>
      <div class="roh" id="bngOut"></div>
      <label>Baseline → after development</label>${chips("outcome", ["Retained", "Removed"], g.outcome)}
      <label class="check"><input type="checkbox" data-bchk="irreplaceable" ${g.irreplaceable ? "checked" : ""}> Ancient or veteran – irreplaceable habitat</label>
      <div class="grid2"><div><label for="g_count">Number of trees (urban groups)</label><input id="g_count" data-bin="count" inputmode="numeric" value="${esc(g.count ?? 1)}"></div><div></div></div>
    </details>`);
  }
  return out.join("");
}

function bindBoltTree(t, job, touch) {
  const s = window._boltSettings || {};
  const pb = document.getElementById("propBox");
  if (pb) {
    const show = () => {
      const r = propInfluence(t), o = document.getElementById("propOut"); if (!o) return;
      o.innerHTML = r ? `${r.wd} water demand · zone of influence ${r.zone.toFixed(1)} m (${ZONE[r.wd]} × ${r.h} m) · ${r.d} m away (D/H ${r.ratio.toFixed(2)}) · <b class="${r.within ? "no" : "ok"}">${r.within ? "within the zone of influence" : "outside the zone of influence"}</b>`
        : "Enter the height, distance and water demand to see whether the building is within the tree's zone of influence (on shrinkable clay).";
    };
    bindSub(pb, () => (t.prop = t.prop || {}), touch, show); show();
  }
  const bb = document.getElementById("batBox");
  if (bb) {
    const b = () => (t.bat = t.bat || { prfs: [] });
    const drawPrfs = () => {
      const el = document.getElementById("prfList"), list = b().prfs || (b().prfs = []);
      el.innerHTML = list.map((p, i) => `<div class="card prf" data-i="${i}"><div class="row"><b>PRF ${i + 1}</b><span class="pill">${esc(p.grade || "not graded")}</span><button class="btn small danger" data-del>✕</button></div>
        <label>Feature</label><select data-k="type"><option></option>${PRF_TYPES.map(x => `<option ${p.type === x ? "selected" : ""}>${esc(x)}</option>`).join("")}</select>
        <div class="grid3"><div><label>Height (m)</label><input data-k="height" inputmode="decimal" value="${esc(p.height || "")}"></div>
          <div><label>Aspect</label><select data-k="aspect"><option></option>${BAT_ASPECTS.map(x => `<option ${p.aspect === x ? "selected" : ""}>${x}</option>`).join("")}</select></div>
          <div><label>Entrance (cm)</label><input data-k="entrance" inputmode="decimal" value="${esc(p.entrance || "")}"></div></div>
        <div class="grid2"><div><label>Extends</label><select data-k="extent"><option></option>${["Upwards", "Downwards", "Both", "Shallow / none"].map(x => `<option ${p.extent === x ? "selected" : ""}>${x}</option>`).join("")}</select></div>
          <div><label>Inspected with</label><select data-k="method">${["", ...PRF_METHOD].map(x => `<option ${p.method === x ? "selected" : ""}>${x}</option>`).join("")}</select></div></div>
        <label>Evidence</label><div class="chips" data-ev>${PRF_EVID.map(x => `<button class="chip small ${(p.evidence || []).includes(x) ? "on" : ""}" data-v="${esc(x)}">${esc(x)}</button>`).join("")}</div>
        <label>Suitability</label><div class="chips" data-gr>${["PRF-I", "PRF-M"].map(x => `<button class="chip small ${p.grade === x ? "on" : ""}" data-v="${x}">${x === "PRF-I" ? "PRF-I (individual bats)" : "PRF-M (multiple bats / maternity)"}</button>`).join("")}</div>
      </div>`).join("");
      el.querySelectorAll(".prf").forEach(card => {
        const p = list[+card.dataset.i];
        card.querySelectorAll("[data-k]").forEach(i => i.oninput = i.onchange = () => { p[i.dataset.k] = i.value; touch(); });
        card.querySelector("[data-ev]").onclick = e => { const c = e.target.closest(".chip"); if (!c) return; e.preventDefault(); const st = new Set(p.evidence || []); st.has(c.dataset.v) ? st.delete(c.dataset.v) : st.add(c.dataset.v); p.evidence = [...st]; c.classList.toggle("on"); touch(); };
        card.querySelector("[data-gr]").onclick = e => { const c = e.target.closest(".chip"); if (!c) return; e.preventDefault(); p.grade = p.grade === c.dataset.v ? "" : c.dataset.v; touch(); drawPrfs(); };
        card.querySelector("[data-del]").onclick = e => { e.preventDefault(); if (confirm("Remove this feature?")) { list.splice(+card.dataset.i, 1); touch(); drawPrfs(); } };
      });
    };
    bindSub(bb, b, touch, k => {
      if (k === "glta" && !t.batPrfManual) { t.batPrf = b().glta === "None" ? "No" : b().glta ? "Yes" : ""; }
    });
    document.getElementById("addPrf").onclick = e => { e.preventDefault(); (b().prfs = b().prfs || []).push({ evidence: [] }); if (!b().glta) b().glta = "PRF"; t.batPrf = "Yes"; touch(); drawPrfs(); };
    drawPrfs();
  }
  const gb = document.getElementById("bngBox");
  if (gb) {
    const g = () => { if (!t.bng) t.bng = bngSuggest(t, job); return t.bng; };
    const show = () => {
      const sz = bngSize(t), c = bngCondition(t.bng || bngSuggest(t, job));
      document.getElementById("bngHead").textContent = `${sz ? sz[0] : "DBH?"} · ${c}`;
      const n = BNG_CRIT.filter(([k]) => (t.bng || bngSuggest(t, job)).crit[k]).length;
      document.getElementById("bngOut").innerHTML = `${n} of 6 criteria → <b>${c}</b> condition${sz && sz[3] ? ` · ${sz[0]} = ${sz[3]} ha in the metric` : ""}`;
    };
    bindSub(gb, g, touch, k => { if (t.bng && k !== "setting") t.bng.auto = false; show(); });
    gb.querySelectorAll("[data-crit]").forEach(c => c.onchange = () => { g().crit[c.dataset.crit] = c.checked; g().auto = false; touch(); show(); });
    gb.addEventListener("toggle", () => {
      if (!gb.open) return;
      if (!t.bng) { g(); touch(); }
      else if (t.bng.auto) {  // not edited yet: refresh the suggestions from the record as it is now
        const sg = bngSuggest(t, job); t.bng.crit = sg.crit; t.bng.outcome = sg.outcome; t.bng.irreplaceable = sg.irreplaceable;
        gb.querySelectorAll("[data-crit]").forEach(c => { c.checked = !!t.bng.crit[c.dataset.crit]; });
        const ir = gb.querySelector('[data-bchk="irreplaceable"]'); if (ir) ir.checked = !!t.bng.irreplaceable;
        gb.querySelectorAll('[data-bone="outcome"] .chip').forEach(c => c.classList.toggle("on", c.dataset.v === t.bng.outcome));
      }
      show();
    });
    show();
  }
}

// ------------------------------------------------------------------ site details: survey types and bolt-ons (called from detailsPage)
function boltDetails(job, s) {
  const bo = job.bolts || (job.bolts = {}), pr = job.property || (job.property = {}), ns = job.nest || (job.nest = {});
  const el = document.getElementById("boltwrap"); if (!el) return;
  const draw = () => {
    el.innerHTML = `
      ${job.type === "PROPERTY" ? `<div class="card" id="propcard"><h3 class="subhead">Property report</h3>
        <label>Report for</label>${chips("purpose", ["Mortgage", "Subsidence"], pr.purpose, false, false)}
        <div class="grid2"><div><label for="pr_party">${pr.purpose === "Subsidence" ? "Insurer / loss adjuster" : "Lender / surveyor"}</label><input id="pr_party" data-bin="party" value="${esc(pr.party || "")}"></div>
          <div><label for="pr_ref">${pr.purpose === "Subsidence" ? "Claim reference" : "Application / report ref"}</label><input id="pr_ref" data-bin="ref" value="${esc(pr.ref || "")}"></div></div>
        <label for="pr_build">Building (type, age, construction)</label><input id="pr_build" data-bin="building" placeholder="e.g. 1930s semi-detached, brick, rear extension 2005" value="${esc(pr.building || "")}">
        <label for="pr_soil">Soil (if known)</label><input id="pr_soil" data-bin="soil" placeholder="e.g. boulder clay (BGS map)" value="${esc(pr.soil || "")}">
        <label for="pr_damage">Damage seen (cracks: where, width, direction)</label><textarea id="pr_damage" data-bin="damage" rows="2">${esc(pr.damage || "")}</textarea>
        ${pr.purpose === "Subsidence" ? `<label>Damage category (BRE Digest 251)</label>${chips("bre", ["0", "1", "2", "3", "4", "5"], pr.bre)}` : ""}
      </div>` : ""}
      ${job.type !== "NEST" ? `<label>Bolt-ons for this survey</label><div class="chips" id="boltChips">${BOLT_LIST.map(([k, l]) => `<button class="chip ${bo[k] ? "on" : ""}" data-v="${k}">${l}</button>`).join("")}</div>` : ""}
      ${bo.bng ? `<div class="card"><h3 class="subhead">BNG</h3><label>Trees are mostly</label>${chips("bngSetting", ["Urban", "Rural"], job.bngSetting || "Urban")}
        <div class="grid2"><div><label for="siteHa">Site area (ha)</label><input id="siteHa" inputmode="decimal" value="${esc(job.siteHa || "")}"></div><div></div></div>
        <div class="hint" id="haNote"></div></div>` : ""}`;
    bindSub(document.getElementById("propcard"), () => pr, () => { }, k => { if (k === "purpose") draw(); });
    const bc = document.getElementById("boltChips");
    if (bc) bc.onclick = e => { const b = e.target.closest(".chip"); if (!b) return; e.preventDefault(); bo[b.dataset.v] = !bo[b.dataset.v]; draw(); };
    const bs = el.querySelector('[data-bone="bngSetting"]');
    if (bs) bs.onclick = e => { const b = e.target.closest(".chip"); if (!b) return; e.preventDefault(); job.bngSetting = b.dataset.v; bs.querySelectorAll(".chip").forEach(c => c.classList.toggle("on", c === b)); };
    const ha = document.getElementById("siteHa");
    if (ha) { const note = () => { const v = parseFloat(ha.value); document.getElementById("haNote").textContent = v > 0 && v <= 0.2 ? "0.2 ha or less: probably exempt from mandatory BNG since 6 August 2026 – check with the planning authority." : ""; }; ha.oninput = () => { job.siteHa = ha.value.trim(); note(); }; note(); }
  };
  draw();
}

// ------------------------------------------------------------------ features (nests, ecology): list, form, map placement
async function featuresOf(jobId, kind) { return (await DB.by("features", "job", jobId)).filter(f => !kind || f.kind === kind).sort((a, b) => (a.ref || "").localeCompare(b.ref || "", undefined, { numeric: true })); }
function nextRef(list, prefix) { const n = list.map(f => parseInt(String(f.ref || "").replace(/\D/g, ""), 10) || 0); return prefix + (Math.max(0, ...n) + 1); }
const fmtDate = d => d ? new Date(d + (d.length === 10 ? "T12:00" : "")).toLocaleDateString("en-GB") : "";
const addDays = (iso, n) => { const d = new Date((iso || today()) + "T12:00"); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };

function nestCheckState(job, nests, s) {
  const n = job.nest || {}, active = nests.filter(nestActive);
  const done = !!n.complete, until = n.complete ? new Date(n.complete + nestDefaults(s).validHours * 3600e3) : null;
  const result = active.length ? `Active nests found – ${active.length} exclusion zone${active.length === 1 ? "" : "s"}` : done ? "No active nests found" : "Check not finished";
  return { active, done, until, result, cls: active.length ? "no" : done ? "ok" : "" };
}

async function nestJobPage(job) {
  const s = await settings(); window._boltSettings = s;
  const nests = await featuresOf(job.id, "nest"), trees = await DB.by("trees", "job", job.id), photos = await DB.by("photos", "job", job.id);
  const st = nestCheckState(job, nests, s), n = job.nest || {};
  const today_ = today();
  app.innerHTML = `
  <header class="top"><button aria-label="Home" onclick="go('#/')">‹</button>
    <h1>${esc(job.site)}<span class="sub">Nesting bird check · ${esc(job.client || "")} · ${ukDate(job.surveyDate)}</span></h1>
    <button aria-label="Site details" onclick="go('#/job/${job.id}/details')">✎</button></header>
  <main>
    <div class="card"><div class="big ${st.cls}">${esc(st.result)}</div>
      ${st.until ? `<div class="meta">Checked ${new Date(n.complete).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })} – works should start by <b>${st.until.toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}</b> or be checked again.</div>` : ""}
      ${n.works ? `<div class="meta">Works: ${esc(n.works)}</div>` : ""}
      <div class="row" style="margin-top:8px"><button class="btn small" onclick="go('#/job/${job.id}/nestcheck')">Check details</button>
        ${st.done ? "" : `<button class="btn small green" id="finish">✓ Check finished</button>`}</div></div>
    <div class="row">
      <button class="btn small" onclick="go('#/job/${job.id}/map')">🗺 Map</button>
      <button class="btn small" onclick="go('#/job/${job.id}/photos')">📷 Photos (${photos.filter(p => !p.treeId).length})</button>
      <button class="btn small green" onclick="exportJob('${job.id}')">⇪ Export</button>
      <button class="btn small" onclick="go('#/job/${job.id}/trees')">🌳 Trees (${trees.length})</button>
      ${(() => { const c = safetyToday(job); return `<button class="btn small ${c ? (c.proceed ? "" : "danger") : "warnbtn"}" onclick="go('#/job/${job.id}/safety')">${c ? (c.proceed ? "✓ Safety check done" : "✕ Not safe today") : "⚠ Safety check"}</button>`; })()}
    </div>
    <div id="list">${nests.map(f => featCard(job, f, today_)).join("") || `<div class="empty">No nests recorded.<br>If you find one, tap <b>＋ Nest</b>. If the check finds none, tap <b>Check finished</b>.</div>`}</div>
  </main>
  <button class="btn primary fab" onclick="go('#/job/${job.id}/feat/nest/new')">＋ Nest</button>`;
  if ($("#finish")) $("#finish").onclick = async () => {
    if (!nests.length && !confirm("Record that the check is finished and no active nests were found?")) return;
    job.nest = Object.assign(job.nest || {}, { complete: Date.now(), end: job.nest && job.nest.end || new Date().toTimeString().slice(0, 5) });
    job.updated = Date.now(); await DB.put("jobs", job); route();
  };
}

function featCard(job, f, today_) {
  if (f.kind === "nest") {
    const k = nestKey(f), act = nestActive(f), due = act && f.recheck && f.recheck <= today_;
    return `<a class="card tree" href="#/job/${job.id}/feat/nest/${f.id}">
      <div class="tag" style="background:${STATUS_COL[k]};color:#fff">${esc(f.ref)}</div>
      <div class="info"><div class="name">${esc(f.species || "Species?")} ${f.s1 ? `<span class="pill s1">Schedule 1</span>` : f.bocc ? `<span class="pill" style="background:${STATUS_COL[f.bocc]}22">${STATUS_NAME[f.bocc]}</span>` : ""}</div>
        <div class="meta">${esc(f.status || "")}${act ? ` · zone ${esc(f.buffer || "")} m` : " · <b class='ok'>no zone</b>"}${f.lat ? ` <span class="ok">· 📍</span>` : ` <span class="no">· no position</span>`}</div>
        ${act && f.recheck ? `<div class="rec ${due ? "no" : ""}">${due ? "⚠ Re-check due" : "Re-check"} ${fmtDate(f.recheck)}</div>` : ""}</div></a>`;
  }
  return `<a class="card tree" href="#/job/${job.id}/feat/eco/${f.id}">
    <div class="tag" style="background:${ECO_COL[f.cat] || "#555"};color:#fff">${esc(f.ref)}</div>
    <div class="info"><div class="name">${esc(f.type || f.cat || "Feature")}${ecoConfidential(f) ? ` <span class="pill">confidential</span>` : ""}</div>
      <div class="meta">${esc(f.cat || "")}${f.extent ? " · " + esc(f.extent) : ""}${f.lat ? ` <span class="ok">· 📍</span>` : ` <span class="no">· no position</span>`}</div>
      <div class="rec">${esc(f.notes || "")}</div></div></a>`;
}

async function ecoListPage(jobId) {
  const job = await DB.get("jobs", jobId); if (!job) return go("#/");
  const list = await featuresOf(jobId, "eco");
  app.innerHTML = `<header class="top"><button aria-label="Back" onclick="go('#/job/${jobId}')">‹</button><h1>Ecology<span class="sub">${esc(job.site)}</span></h1></header>
  <main><p class="hint">Protected species signs, invasive plants and habitat features seen during the survey – recorded for the ecology note and for advice to get an ecologist where needed. Badger setts are kept out of client reports (confidential appendix only).</p>
    <div id="list">${list.map(f => featCard(job, f)).join("") || `<div class="empty">Nothing recorded yet.</div>`}</div></main>
  <button class="btn primary fab" onclick="go('#/job/${jobId}/feat/eco/new')">＋ Feature</button>`;
}

async function nestCheckPage(jobId) {
  const job = await DB.get("jobs", jobId); if (!job) return go("#/");
  const n = job.nest || (job.nest = {}), s = await settings(), d = nestDefaults(s);
  if (!n.start) n.start = new Date().toTimeString().slice(0, 5);
  app.innerHTML = `<header class="top"><button aria-label="Back" id="back">‹</button><h1>Nesting bird check<span class="sub">${esc(job.site)}</span></h1></header>
  <main id="nc">
    <label for="n_works">Works the check is for</label><textarea id="n_works" data-bin="works" rows="2" placeholder="e.g. Removal of 40 m of hedge for the new access; felling T3–T7">${esc(n.works || "")}</textarea>
    <label for="n_area">Area checked</label><input id="n_area" data-bin="area" placeholder="e.g. the hedge and trees within 10 m of it" value="${esc(n.area || "")}">
    <label>How it was checked</label>${chips("method", NEST_METHOD, n.method, true)}
    <div class="grid2"><div><label for="n_start">Started</label><input id="n_start" type="time" data-bin="start" value="${esc(n.start || "")}"></div><div><label for="n_end">Finished</label><input id="n_end" type="time" data-bin="end" value="${esc(n.end || "")}"></div></div>
    <label>Limitations</label>${chips("limits", NEST_LIMITS, n.limits, true)}
    <label for="n_notes">Notes</label><textarea id="n_notes" data-bin="notes" rows="2">${esc(n.notes || "")}</textarea>
    <h2>Defaults</h2>
    <p class="hint">Exclusion zones suggested for new nests (you can change each one). A clear check is valid for ${d.validHours} hours – works starting later need a fresh check.</p>
    <div class="grid3">${["G", "A", "R"].map(k => `<div><label>${STATUS_NAME[k]} (m)</label><input data-def="${k}" inputmode="numeric" value="${d[k]}"></div>`).join("")}</div>
    <div class="grid3"><div><label>Schedule 1 (m)</label><input data-def="S1" inputmode="numeric" value="${d.S1}"></div><div><label>Valid (hours)</label><input data-def="validHours" inputmode="numeric" value="${d.validHours}"></div><div><label>Re-check (days)</label><input data-def="recheckDays" inputmode="numeric" value="${d.recheckDays}"></div></div>
  </main><div class="bar"><button class="btn primary" id="save">Save</button></div>`;
  bindSub($("#nc"), () => n, () => { });
  $("#back").onclick = $("#save").onclick = async () => {
    const nd = Object.assign({}, s.nest || {});
    app.querySelectorAll("[data-def]").forEach(i => { const v = parseFloat(i.value); if (v >= 0) nd[i.dataset.def] = v; });
    s.nest = nd; await DB.put("settings", s);
    job.updated = Date.now(); await DB.put("jobs", job); go("#/job/" + jobId);
  };
}

async function featurePage(jobId, kind, fid) {
  const job = await DB.get("jobs", jobId); if (!job) return go("#/");
  const s = await settings(), d = nestDefaults(s);
  const list = await featuresOf(jobId, kind), trees = (await DB.by("trees", "job", jobId)).sort(byTag);
  const isNew = fid === "new";
  const f = isNew ? { id: uid(), jobId, kind, ref: nextRef(list, kind === "nest" ? "N" : "E"), created: Date.now(), evidence: [], method: [] } : await DB.get("features", fid);
  if (!f) return go("#/job/" + jobId);
  if (kind === "nest" && isNew) { f.status = ""; f.recheck = addDays(today(), d.recheckDays); }
  let dirty = isNew;
  const touch = () => { dirty = true; };
  const save = async () => { f.updated = Date.now(); await DB.put("features", f); job.updated = Date.now(); await DB.put("jobs", job); dirty = false; };
  const photos = (await DB.by("photos", "job", jobId)).filter(p => p.treeId === f.id);
  const nestHtml = () => `
    <label for="sp">Species</label><input id="sp" list="birdList" value="${esc(f.species || "")}" placeholder="Start typing – e.g. Blackbird" autocomplete="off">
    <datalist id="birdList">${BIRDS.map(([nm]) => `<option value="${esc(nm)}">`).join("")}</datalist>
    <div class="row"><span id="statusPill"></span><label class="check" style="margin:0"><input type="checkbox" id="s1" ${f.s1 ? "checked" : ""}> Schedule 1</label></div>
    <label>Conservation status (BoCC5)</label><div class="chips" id="bocc">${["R", "A", "G", ""].map(k => `<button class="chip small ${(f.bocc || "") === k ? "on" : ""}" data-v="${k}">${STATUS_NAME[k] === "–" ? "Not listed / check" : STATUS_NAME[k]}</button>`).join("")}</div>
    <div class="warn" id="s1warn" ${f.s1 ? "" : "hidden"}>Schedule 1 species: it's an offence to disturb it while it's building a nest or at a nest with eggs or young. Keep well away, stop works nearby and get advice from an ecologist.</div>
    <label>Nest status</label>${chips("status", NEST_STATUS, f.status, false, false)}
    <label>Evidence</label>${chips("evidence", NEST_EVID, f.evidence, true)}
    <label>Where</label>${chips("where", NEST_WHERE, f.where)}
    <div class="grid2"><div id="treewrap" ${f.where === "In tree" ? "" : "hidden"}><label for="tt">Tree</label><select id="tt" data-bin="tree"><option></option>${trees.map(t => `<option ${f.tree === t.tag ? "selected" : ""}>${esc(t.tag)}</option>`).join("")}</select></div>
      <div><label for="ht">Height (m)</label><input id="ht" data-bin="height" inputmode="decimal" value="${esc(f.height || "")}"></div></div>
    <label>Exclusion zone (radius, m)</label><div class="chips" id="buf">${BUFFERS.map(b => `<button class="chip ${+f.buffer === b ? "on" : ""}" data-v="${b}">${b} m</button>`).join("")}</div>
    <div class="grid2"><div><label for="bufc">Other (m)</label><input id="bufc" inputmode="decimal" value="${BUFFERS.includes(+f.buffer) ? "" : esc(f.buffer || "")}"></div>
      <div><label for="rc">Re-check on</label><input id="rc" type="date" data-bin="recheck" value="${esc(f.recheck || "")}"></div></div>
    <div class="hint" id="bufhint"></div>
    <label class="check"><input type="checkbox" id="fin" ${f.finished ? "checked" : ""}> Nest finished – no longer in use, zone can be lifted</label>
    <div id="finwrap" ${f.finished ? "" : "hidden"}><label for="fd">Date confirmed</label><input id="fd" type="date" data-bin="finished" value="${esc(f.finished || "")}"></div>`;
  const ecoHtml = () => `
    <label>Category</label><div class="chips" id="cat">${Object.keys(ECO).map(c => `<button class="chip ${f.cat === c ? "on" : ""}" data-v="${esc(c)}">${esc(c)}</button>`).join("")}</div>
    <div id="typewrap">${f.cat ? `<label>What</label>${chips("type", ECO[f.cat], f.type)}` : ""}</div>
    <label for="ex">Extent / number</label><input id="ex" data-bin="extent" placeholder="e.g. 3 entrances, 12 m² stand, 40 m length" value="${esc(f.extent || "")}">
    <label for="act">Activity / condition</label><input id="act" data-bin="activity" placeholder="e.g. active – fresh spoil, well-used paths" value="${esc(f.activity || "")}">
    <label class="check"><input type="checkbox" id="conf" ${ecoConfidential(f) ? "checked" : ""}> Confidential – keep the location out of client reports</label>`;
  app.innerHTML = `<header class="top"><button aria-label="Back" id="back">‹</button><h1>${esc(f.ref)}<span class="sub">${kind === "nest" ? "Nest" : "Ecology"} · ${esc(job.site)}</span></h1></header>
  <main id="ff">
    <div class="card gps"><div class="status"><div class="big" id="pos">${f.grid ? esc(f.grid) : "No position yet"}</div><div class="meta" id="posm">${f.acc ? "±" + Math.round(f.acc) + " m" : f.posSource || ""}</div></div>
      <div class="stack"><button class="btn small" id="gps">📍 GPS here</button><button class="btn small" id="onmap">🗺 Place on map</button></div></div>
    ${kind === "nest" ? nestHtml() : ecoHtml()}
    <label for="nt">Notes</label><textarea id="nt" data-bin="notes" rows="3">${esc(f.notes || "")}</textarea>
    <h2>Photos</h2><div class="hint">${kind === "nest" ? "Photograph from a distance – don't approach or disturb the nest." : ""}</div>
    <div class="row"><button class="btn" id="takePhoto">📷 Take photo</button><button class="btn" id="pickPhoto">🖼 From gallery</button></div>
    <div class="photos" id="photos">${photos.map(p => `<div class="ph"><img alt="" src="${URL.createObjectURL(p.blob)}"></div>`).join("")}</div>
    ${isNew ? "" : `<button class="btn danger block" style="margin-top:20px" id="del">Delete ${esc(f.ref)}</button>`}
  </main><div class="bar"><button class="btn primary" id="save">Save</button></div>`;
  bindSub($("#ff"), () => f, touch, k => {
    if (k === "where") $("#treewrap").hidden = f.where !== "In tree";
    if (k === "type" && /badger sett/i.test(f.type || "")) { f.confidential = true; $("#conf").checked = true; }
    if (k === "status") showBuf();
  });
  const showBuf = () => {
    if (kind !== "nest") return;
    const act = nestActive(f);
    $("#bufhint").innerHTML = !act ? "Not in use – no exclusion zone." : `Suggested for ${f.s1 ? "a Schedule 1 species" : STATUS_NAME[f.bocc || ""] === "–" ? "this species" : STATUS_NAME[f.bocc] + "-listed species"}: <b>${bufferFor(f, s)} m</b>. No works inside the zone until a re-check shows the nest is no longer in use.`;
  };
  if (kind === "nest") {
    const setSpecies = () => {
      const b = BIRD.get(($("#sp").value || "").trim().toLowerCase());
      f.species = $("#sp").value.trim();
      if (b) { f.bocc = b.status; f.s1 = b.s1; $("#s1").checked = b.s1; $("#bocc").querySelectorAll(".chip").forEach(c => c.classList.toggle("on", c.dataset.v === f.bocc)); }
      if (!f.bufferSet) { f.buffer = bufferFor(f, s); $("#buf").querySelectorAll(".chip").forEach(c => c.classList.toggle("on", +c.dataset.v === +f.buffer)); $("#bufc").value = BUFFERS.includes(+f.buffer) ? "" : f.buffer; }
      $("#s1warn").hidden = !f.s1; showBuf(); touch();
    };
    $("#sp").addEventListener("change", setSpecies); $("#sp").addEventListener("input", () => { f.species = $("#sp").value.trim(); touch(); });
    $("#s1").onchange = () => { f.s1 = $("#s1").checked; $("#s1warn").hidden = !f.s1; if (!f.bufferSet) { f.buffer = bufferFor(f, s); $("#buf").querySelectorAll(".chip").forEach(c => c.classList.toggle("on", +c.dataset.v === +f.buffer)); } showBuf(); touch(); };
    $("#bocc").onclick = e => { const c = e.target.closest(".chip"); if (!c) return; e.preventDefault(); f.bocc = c.dataset.v; $("#bocc").querySelectorAll(".chip").forEach(x => x.classList.toggle("on", x === c)); if (!f.bufferSet) { f.buffer = bufferFor(f, s); $("#buf").querySelectorAll(".chip").forEach(x => x.classList.toggle("on", +x.dataset.v === +f.buffer)); } showBuf(); touch(); };
    $("#buf").onclick = e => { const c = e.target.closest(".chip"); if (!c) return; e.preventDefault(); f.buffer = +c.dataset.v; f.bufferSet = true; $("#bufc").value = ""; $("#buf").querySelectorAll(".chip").forEach(x => x.classList.toggle("on", x === c)); touch(); };
    $("#bufc").oninput = () => { const v = parseFloat($("#bufc").value.replace(",", ".")); if (v > 0) { f.buffer = v; f.bufferSet = true; $("#buf").querySelectorAll(".chip").forEach(x => x.classList.remove("on")); touch(); } };
    $("#fin").onchange = () => { f.finished = $("#fin").checked ? (f.finished || today()) : ""; $("#finwrap").hidden = !f.finished; $("#fd").value = f.finished || ""; showBuf(); touch(); };
    if (f.buffer == null) f.buffer = bufferFor(f, s);
    showBuf();
  } else {
    $("#cat").onclick = e => { const c = e.target.closest(".chip"); if (!c) return; e.preventDefault(); f.cat = c.dataset.v; f.type = ""; $("#cat").querySelectorAll(".chip").forEach(x => x.classList.toggle("on", x === c));
      $("#typewrap").innerHTML = `<label>What</label>${chips("type", ECO[f.cat], f.type)}`; bindSub($("#typewrap"), () => f, touch, k => { if (/badger sett/i.test(f.type || "")) { f.confidential = true; $("#conf").checked = true; } }); touch(); };
    $("#conf").onchange = () => { f.confidential = $("#conf").checked; touch(); };
  }
  $("#gps").onclick = () => {
    $("#pos").textContent = "Getting a fix…"; let best = null;
    startGps(c => { best = c; $("#posm").textContent = `±${Math.round(c.accuracy)} m…`; }, stt => {
      if (stt === "done" && best) { f.lat = +best.latitude.toFixed(7); f.lon = +best.longitude.toFixed(7); f.acc = best.accuracy; f.grid = OSGB.fromLatLon(f.lat, f.lon).ref; f.posSource = "GPS"; $("#pos").textContent = f.grid; $("#posm").textContent = `±${Math.round(f.acc)} m`; touch(); }
      else if (stt !== "searching") $("#pos").textContent = f.grid || "No GPS fix";
    });
  };
  $("#onmap").onclick = async () => { await save(); go(`#/job/${jobId}/featmap/${f.id}`); };
  const addPhotos = async files => { for (const file of files) { const blob = await shrink(file); await DB.put("photos", { id: uid(), jobId, treeId: f.id, blob, caption: "", created: Date.now() }); } await save(); route(); };
  $("#takePhoto").onclick = () => pickFiles("#cam", addPhotos);
  $("#pickPhoto").onclick = () => pickFiles("#gallery", addPhotos);
  const back = () => go(kind === "nest" ? "#/job/" + jobId : `#/job/${jobId}/eco`);
  $("#save").onclick = async () => { await save(); back(); };
  $("#back").onclick = async () => { if (dirty) await save(); back(); };
  leaveHook = async () => { stopGps(); if (dirty && !isNew) await save(); };
  if ($("#del")) $("#del").onclick = async () => { if (!confirm(`Delete ${f.ref}?`)) return; for (const p of photos) await DB.del("photos", p.id); await DB.del("features", f.id); leaveHook = null; back(); };
}

async function featMapPage(jobId, fid) {
  const job = await DB.get("jobs", jobId), f = await DB.get("features", fid);
  if (!job || !f) return go("#/job/" + jobId);
  const trees = await DB.by("trees", "job", jobId);
  app.innerHTML = mapShell(`Place ${esc(f.ref)}`, esc(job.site), `location.replace('#/job/${jobId}/feat/${f.kind}/${f.id}')`);
  leaveHook = async () => closeMap();
  const feats = (await featuresOf(jobId)).filter(x => x.id !== f.id);
  const { map } = await buildMap($("#map"), job, trees, { center: f.lat ? [f.lat, f.lon] : null, features: feats, onTree: (t, ll) => map.panTo(ll) });
  $("#meBtn").onclick = () => map._me ? map.setView(map._me, Math.max(map.getZoom(), 19)) : locateOnce(map);
  $("#cross").hidden = false;
  $("#panel").innerHTML = `<div class="hint">Move the map so the <b>✛</b> is on ${f.kind === "nest" ? "the nest" : "the feature"}. Tap a tree to centre on it.</div>
    <div class="row"><button class="btn" onclick="location.replace('#/job/${jobId}/feat/${f.kind}/${f.id}')">Cancel</button><button class="btn primary" id="use">Use this spot</button></div>`;
  $("#use").onclick = async () => {
    const c = map.getCenter(); f.lat = +c.lat.toFixed(7); f.lon = +c.lng.toFixed(7); f.acc = null; f.grid = OSGB.fromLatLon(f.lat, f.lon).ref; f.posSource = "Placed on map";
    f.updated = Date.now(); await DB.put("features", f); location.replace(`#/job/${jobId}/feat/${f.kind}/${f.id}`);
  };
}

// map layer for nests (with exclusion zones) and ecology features – called from buildMap
function drawFeatures(map, feats, overlays, onFeature) {
  if (!feats || !feats.length) return;
  const lay = L.layerGroup().addTo(map);
  for (const f of feats) {
    if (f.lat == null) continue;
    const ll = [+f.lat, +f.lon];
    if (f.kind === "nest") {
      const col = STATUS_COL[nestKey(f)], act = nestActive(f);
      if (act && +f.buffer > 0) L.circle(ll, { radius: +f.buffer, color: col, weight: 2, dashArray: "6 4", fillOpacity: 0.12, interactive: false }).addTo(lay);
      const m = L.circleMarker(ll, { radius: 6, color: "#fff", weight: 2, fillColor: act ? col : "#999", fillOpacity: 1 }).addTo(lay);
      m.bindTooltip(`${esc(f.ref)}${act && f.buffer ? " · " + f.buffer + " m" : ""}`, { permanent: true, direction: "right", className: "tlabel nestlabel", offset: [6, 0] });
      if (onFeature) m.on("click", () => onFeature(f));
    } else {
      const m = L.circleMarker(ll, { radius: 6, color: "#fff", weight: 2, fillColor: ECO_COL[f.cat] || "#555", fillOpacity: 1 }).addTo(lay);
      m.bindTooltip(esc(f.ref), { permanent: true, direction: "right", className: "tlabel", offset: [6, 0] });
      if (onFeature) m.on("click", () => onFeature(f));
    }
  }
  overlays["Nests & ecology"] = lay;
  return lay;
}

// ------------------------------------------------------------------ lone working check-in / check-out (text message)
function intlPhone(p) { const d = String(p || "").replace(/[^\d+]/g, ""); return d.startsWith("+") ? d.slice(1) : d.startsWith("0") ? "44" + d.slice(1) : d; }
function loneState(s) { return s.loneActive || null; }
function loneBanner(s) {
  const a = loneState(s); if (!a) return "";
  const due = new Date(a.nextDue), late = Date.now() > a.nextDue, fin = new Date(a.finish);
  return `<div class="${late ? "warn" : "card"} lone"><b>Lone working${a.site ? " – " + esc(a.site) : ""}</b><br>
    ${late ? "⚠ Check-in overdue since" : "Next check-in by"} ${due.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} · finish ${fin.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
    <div class="row"><button class="btn small primary" onclick="go('#/lone')">Check in / out</button></div></div>`;
}
async function lonePage() {
  const s = await settings(), lw = s.lone || (s.lone = { name: "", phone: "", interval: 120, via: "sms" });
  const jobs = (await DB.all("jobs")).sort((a, b) => (b.updated || 0) - (a.updated || 0));
  const a = loneState(s);
  const now = new Date(), hhmm = d => d.toTimeString().slice(0, 5);
  app.innerHTML = `<header class="top"><button aria-label="Back" onclick="go('#/')">‹</button><h1>Lone working<span class="sub">Check in and out by text</span></h1></header>
  <main>
    <p class="hint">Tell your nominated contact where you are and when you'll finish. The app sends nothing on its own – it opens a ready-written text (or WhatsApp) for you to send. If you miss a check-in, your contact follows the Lone Working Policy.</p>
    <div class="grid2"><div><label for="lw_name">Contact name</label><input id="lw_name" value="${esc(lw.name)}"></div><div><label for="lw_phone">Contact mobile</label><input id="lw_phone" inputmode="tel" value="${esc(lw.phone)}"></div></div>
    <label>Send by</label>${chips("via", ["sms", "whatsapp"], lw.via || "sms", false, false).replace(">sms<", ">Text message<").replace(">whatsapp<", ">WhatsApp<")}
    ${a ? `<div class="card"><b>On site${a.site ? ": " + esc(a.site) : ""}</b><div class="meta">Since ${new Date(a.start).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} · ${esc(a.grid || "")}</div>
        <div class="meta">Next check-in by <b>${new Date(a.nextDue).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</b> · finish ${new Date(a.finish).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</div></div>
      <div class="stack"><button class="btn primary block" id="ci">✓ I'm OK – check in</button><button class="btn block" id="late">Running late – new finish time</button><button class="btn green block" id="co">I've finished – check out</button></div>`
    : `<label for="lw_site">Site</label><input id="lw_site" list="lw_sites" value="${esc(jobs[0] ? jobs[0].site || "" : "")}"><datalist id="lw_sites">${jobs.map(j => `<option value="${esc(j.site)}">`).join("")}</datalist>
      <div class="grid2"><div><label for="lw_fin">Expected finish</label><input id="lw_fin" type="time" value="${hhmm(new Date(now.getTime() + 4 * 3600e3))}"></div>
        <div><label for="lw_int">Check in every (minutes)</label><input id="lw_int" inputmode="numeric" value="${esc(lw.interval || 120)}"></div></div>
      <label for="lw_note">Note (vehicle, where you've parked…)</label><input id="lw_note" placeholder="e.g. silver van in the estate yard">
      <button class="btn primary block" id="start" style="margin-top:12px">📍 Start – send my location</button>`}
  </main>`;
  bindSub(app.querySelector("main"), () => lw, () => { });
  const keep = async () => { lw.name = $("#lw_name").value.trim(); lw.phone = $("#lw_phone").value.trim(); await DB.put("settings", s); };
  const send = text => {
    if (!lw.phone) { toast("Add your contact's mobile number first"); return false; }
    const url = lw.via === "whatsapp" ? `https://wa.me/${intlPhone(lw.phone)}?text=${encodeURIComponent(text)}` : `sms:${lw.phone.replace(/\s/g, "")}?body=${encodeURIComponent(text)}`;
    location.href = url; return true;
  };
  const me = s.consultant || "Surveyor", t5 = d => new Date(d).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  if (!a) {
    $("#start").onclick = async () => {
      await keep(); lw.interval = Math.max(15, parseInt($("#lw_int").value, 10) || 120);
      const [h, m] = ($("#lw_fin").value || "17:00").split(":").map(Number); const fin = new Date(); fin.setHours(h, m, 0, 0); if (fin < new Date()) fin.setDate(fin.getDate() + 1);
      toast("Getting your position…", 4000); let best = null;
      const go_ = async () => {
        const st = { site: $("#lw_site").value.trim(), start: Date.now(), finish: fin.getTime(), nextDue: Math.min(fin.getTime(), Date.now() + lw.interval * 60e3), interval: lw.interval };
        if (best) { st.lat = +best.latitude.toFixed(6); st.lon = +best.longitude.toFixed(6); st.grid = OSGB.fromLatLon(st.lat, st.lon).ref; }
        const where = st.lat ? `${st.grid} – https://maps.google.com/?q=${st.lat},${st.lon}` : "(no GPS fix)";
        const note = $("#lw_note").value.trim();
        s.loneActive = st; await DB.put("settings", s);
        send(`${me}: lone working at ${st.site || "site"} from ${t5(st.start)}. Location ${where}.${note ? " " + note + "." : ""} Next check-in by ${t5(st.nextDue)}, finishing about ${t5(st.finish)}. If you don't hear from me, call me; if no answer, follow the lone working procedure.`);
        setTimeout(() => route(), 800);
      };
      startGps(c => { best = c; }, stt => { if (stt !== "searching") go_(); });
    };
    return;
  }
  $("#ci").onclick = async () => {
    await keep(); a.nextDue = Math.min(a.finish, Date.now() + (a.interval || 120) * 60e3); await DB.put("settings", s);
    send(`${me}: OK at ${a.site || "site"} (${t5(Date.now())}). Next check-in by ${t5(a.nextDue)}.`); setTimeout(() => route(), 800);
  };
  $("#late").onclick = async () => {
    const v = prompt("New finish time (HH:MM)", t5(a.finish + 3600e3)); if (!v) return;
    const [h, m] = v.split(":").map(Number); const fin = new Date(); fin.setHours(h, m, 0, 0); if (fin < new Date()) fin.setDate(fin.getDate() + 1);
    a.finish = fin.getTime(); a.nextDue = Math.min(a.finish, Date.now() + (a.interval || 120) * 60e3); await keep(); await DB.put("settings", s);
    send(`${me}: running late at ${a.site || "site"} – all OK. New finish about ${t5(a.finish)}; next check-in by ${t5(a.nextDue)}.`); setTimeout(() => route(), 800);
  };
  $("#co").onclick = async () => {
    await keep(); const site = a.site; delete s.loneActive; await DB.put("settings", s);
    send(`${me}: finished at ${site || "site"} and off site safely (${t5(Date.now())}).`); setTimeout(() => route(), 800);
  };
}
