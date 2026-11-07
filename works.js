// Tree Survey – © 2026 Mark Johnson. All rights reserved. Use only under a written licence from the owner.
/* Tree Survey – works builder.
   Tapping "＋ Works" opens a panel: choose the operation, fill in what BS 3998:2010 says a specification
   needs (final dimensions, %, clearance and where it's measured from…), pick a timescale, and a clear
   sentence is added to Recommendations. The wording is ours; the checks follow BS 3998 principles. */
"use strict";

const TIMESCALES = ["Urgent", "Within 1 month", "Within 3 months", "Within 6 months", "Within 12 months", "Within 2 years"];
const PHASES = ["Pre-construction", "During construction", "Post-construction"];

// each operation: label, fields [{k, label, type:'num'|'text'|'chips', opts, ph, def}], text(v, ctx) -> sentence, check(v, ctx) -> [warnings]
const WORKS = [
  { id: "reduce", label: "Crown reduction", fields: [
      { k: "h", label: "Final height (m)", type: "num" }, { k: "sp", label: "Final spread (m)", type: "num" },
      { k: "len", label: "or branch length removed (m)", type: "num" },
      { k: "part", label: "Which part", type: "chips", opts: ["Whole crown", "Crown on one side", "Selected limbs", "Upper crown"] },
      { k: "side", label: "Side", type: "chips", opts: ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] }],
    text: v => {
      const where = v.part && v.part !== "Whole crown" ? (v.part === "Crown on one side" && v.side ? ` on the ${aspectWord(v.side)} side` : ` (${v.part.toLowerCase()})`) : "";
      if (v.h || v.sp) return `Reduce the crown${where} to a final height of c. ${v.h || "–"} m and spread of c. ${v.sp || "–"} m, cutting to suitable growth points`;
      if (v.len) return `Reduce the crown${where} by shortening branches by c. ${v.len} m, cutting to suitable growth points`;
      return "";
    },
    check: (v, c) => {
      const w = [];
      if (!v.h && !v.sp && !v.len) w.push("Give the final height/spread or the branch length to remove – a % alone isn't a clear specification (BS 3998 7.7.2).");
      if (c.height && v.h && v.h >= c.height) w.push("Final height isn't below the recorded height.");
      w.push("Cuts normally no larger than c. 100 mm; don't combine with crown thinning.");
      return w;
    } },
  { id: "thin", label: "Crown thin", fields: [{ k: "pc", label: "Thin by (%)", type: "num", def: 15 },
      { k: "why", label: "Purpose", type: "chips", opts: ["Light / views", "Reduce wind resistance", "Relieve a defect"] }],
    text: v => v.pc ? `Crown thin by ${v.pc}%, removing material evenly throughout the crown and retaining a balanced branch structure` : "",
    check: v => {
      const w = [];
      if (v.pc > 30) w.push("BS 3998 limits crown thinning to 30%.");
      if (v.why === "Relieve a defect") w.push("Thinning doesn't reduce leverage on a defect – crown reduction is usually the better choice.");
      w.push("Avoid lion-tailing (stripping inner growth).");
      return w;
    } },
  { id: "lift", label: "Crown lift", fields: [
      { k: "over", label: "Over", type: "chips", opts: ["Footpath", "Highway", "Ground level", "Car park", "Building / roof", "Play area"] },
      { k: "m", label: "Clearance (m)", type: "num" },
      { k: "to", label: "Measured to", type: "chips", opts: ["Lowest remaining branch", "Lowest remaining foliage"], def: "Lowest remaining branch" },
      { k: "how", label: "Method", type: "chips", opts: ["Remove secondary branches / shorten", "Remove branches at the stem"] }],
    defaults: v => { if (!v.m && v.over === "Footpath") v.m = 3; if (!v.m && v.over === "Highway") v.m = 6; },
    text: v => {
      if (!v.m) return "";
      const over = { "Footpath": "the footpath", "Highway": "the carriageway", "Ground level": "ground level", "Car park": "the car park",
        "Building / roof": "the roof", "Play area": "the play area" }[v.over] || "ground level";
      const how = v.how === "Remove secondary branches / shorten" ? ", by shortening or removing secondary branches rather than cutting back to the stem" : "";
      return `Crown lift to give ${v.m} m clearance above ${over}, measured to the ${(v.to || "lowest remaining branch").toLowerCase()}${how}`;
    },
    check: (v, c) => {
      const w = [];
      if (v.over === "Highway" && v.m && v.m < 5.2) w.push("Highway clearance is normally at least 5.2 m (6 m allows for regrowth).");
      if (c.height && v.m && c.clearance != null) {  // needs the existing clearance (recorded on BS5837 surveys)
        const clear = c.clearance, live = c.height - clear;
        const max = Math.min(clear + 0.15 * live, c.height / 3);
        if (v.how === "Remove branches at the stem" && v.m > max + 0.05)
          w.push(`Cutting to the stem: BS 3998 suggests no more than c. ${max.toFixed(1)} m here (15% of the live crown, and the crown kept to two-thirds of the height). Consider shortening branches or phasing the work.`);
      }
      if (/^(M|OM|V)$/.test(c.lifeStage || "")) w.push("Mature tree – keep stem wounds small; phase extensive lifting over several years.");
      return w;
    } },
  { id: "deadwood", label: "Remove deadwood", fields: [{ k: "dia", label: "Over (mm diameter)", type: "num", def: 50 },
      { k: "where", label: "Where", type: "chips", opts: ["Over the target area", "Throughout the crown"], def: "Over the target area" }],
    text: v => `Remove deadwood over ${v.dia || 50} mm diameter ${(v.where || "over the target area").toLowerCase()}`,
    check: (v, c) => (/oak|quercus|chestnut|castanea|yew|taxus/i.test(c.species || "") ? ["Durable species – dead branches often stay sound for years; retain deadwood not over a target as habitat."] : ["Retain deadwood that isn't over a target – it's valuable habitat."]) },
  { id: "limb", label: "Remove / shorten a limb", fields: [{ k: "what", label: "What", type: "chips", opts: ["Hanging branch", "Broken branch", "Limb", "Low limb", "Over-extended limb"] },
      { k: "act", label: "Action", type: "chips", opts: ["Remove", "Shorten"], def: "Remove" },
      { k: "side", label: "Side", type: "chips", opts: ["N", "NE", "E", "SE", "S", "SW", "W", "NW"] },
      { k: "h", label: "At height (m)", type: "num" }, { k: "len", label: "Shorten by (m)", type: "num" }],
    text: v => {
      const what = (v.what || "limb").toLowerCase(), side = v.side ? ` on the ${aspectWord(v.side)} side` : "", h = v.h ? ` at c. ${v.h} m` : "";
      return v.act === "Shorten" ? `Shorten the ${what}${side}${h}${v.len ? ` by c. ${v.len} m` : ""} to a suitable growth point` : `Remove the ${what}${side}${h}`;
    } },
  { id: "pollard", label: "Pollard", fields: [{ k: "type", label: "Type", type: "chips", opts: ["Re-pollard (on cycle)", "Lapsed pollard – reduce", "Start a pollard (young tree)"] }],
    text: v => ({ "Re-pollard (on cycle)": "Re-pollard, cutting new growth back close to the pollard points",
      "Lapsed pollard – reduce": "Reduce the lapsed pollard branches, cutting to suitable laterals or leaving live stubs above the old pollard points",
      "Start a pollard (young tree)": "Establish a pollard at a suitable height, retaining some foliage" })[v.type] || "",
    check: v => v.type === "Lapsed pollard – reduce" ? ["Don't cut back to the knuckles – keep live growth; consider phasing over several years."] : [] },
  { id: "formative", label: "Formative pruning", fields: [], text: () => "Formative prune to develop a single leader and well-spaced branch structure" },
  { id: "ivy", label: "Sever ivy", fields: [], text: () => "Sever ivy at the base to allow inspection of the stem",
    check: () => ["Ivy is habitat – sever outside the bird nesting season."] },
  { id: "support", label: "Install support", fields: [{ k: "type", label: "Type", type: "chips", opts: ["Dynamic (flexible) brace", "Rigid brace", "Prop", "Guy"] },
      { k: "where", label: "Between / where", type: "text", ph: "e.g. the two main stems" }],
    text: v => v.type ? `Install a ${v.type.toLowerCase()}${v.where ? ` between ${v.where}` : ""}, with inspection of the system annually` : "",
    check: () => ["Record the install date – the system needs regular inspection."] },
  { id: "fell", label: "Fell", fields: [{ k: "how", label: "Leave", type: "chips", opts: ["Stump at ground level", "Monolith (standing stem)", "Stump ground out"], def: "Stump at ground level" },
      { k: "h", label: "Monolith height (m)", type: "num" }, { k: "replant", label: "Replace", type: "chips", opts: ["Replant", "No replant"] }],
    text: v => {
      const base = v.how === "Monolith (standing stem)" ? `Reduce to a monolith c. ${v.h || "–"} m tall, retaining it as habitat` :
        v.how === "Stump ground out" ? "Fell and grind out the stump" : "Fell to ground level";
      return base + (v.replant === "Replant" ? "; replant with a suitable replacement tree" : "");
    },
    check: () => ["Check for TPO / Conservation Area, felling licence and protected species first."] },
  { id: "investigate", label: "Further investigation", fields: [{ k: "how", label: "Method", type: "chips",
      opts: ["Sonic tomography", "Resistance drilling", "Climbing inspection", "Aerial (drone) inspection", "Root investigation", "Pull test", "Fungal identification"] }],
    text: v => v.how ? `Further investigation by ${v.how.toLowerCase()} to assess the extent of the defect` : "" },
  { id: "inspect", label: "Re-inspect", fields: [{ k: "m", label: "In", type: "chips", opts: ["6 months", "12 months", "18 months", "2 years", "3 years"] }],
    text: v => v.m ? `Re-inspect in ${v.m}` : "", noTime: true },
  { id: "root", label: "Root zone care", fields: [{ k: "what", label: "What", type: "chips", opts: ["Mulch the rooting area", "Decompact the soil (air-spade)", "Remove competing vegetation", "Irrigate in dry spells"] }],
    text: v => v.what || "" },
  { id: "none", label: "No work required", fields: [], text: () => "No work required at present", noTime: true },
];

// BS5837 extras (during / post construction)
const WORKS_BS = [
  { id: "barrier", label: "Protective barrier", fields: [], text: () => "Protect with tree protection barriers as shown on the Tree Protection Plan", phase: "During construction", noTime: true },
  { id: "ground", label: "Ground protection", fields: [{ k: "for", label: "For", type: "chips", opts: ["Pedestrian movement", "Pedestrian-operated plant", "Construction traffic"] }],
    text: v => `Install temporary ground protection within the RPA suitable for ${(v.for || "pedestrian movement").toLowerCase()}`, phase: "During construction", noTime: true },
  { id: "manual", label: "Manual excavation", fields: [{ k: "for", label: "For", type: "text", ph: "e.g. the boundary wall footing" }],
    text: v => `Excavate by hand within the RPA${v.for ? ` for ${v.for}` : ""}, retaining roots over 25 mm`, phase: "During construction", noTime: true },
  { id: "nodig", label: "No-dig surfacing", fields: [], text: () => "Use no-dig, permeable surfacing within the RPA", phase: "During construction", noTime: true },
  { id: "post", label: "Post-construction care", fields: [{ k: "what", label: "What", type: "chips", opts: ["Remove barriers and decompact", "Mulch the RPA", "Landscape by hand within the RPA"] }],
    text: v => v.what || "", phase: "Post-construction", noTime: true },
];

function worksSheet(ctx, onAdd) {
  const ops = ctx.bs ? WORKS.concat(WORKS_BS) : WORKS;
  let op = null, v = {}, time = "", phase = "Pre-construction";
  const back = document.createElement("div");
  back.className = "sheet-back";
  back.innerHTML = `<div class="sheet" role="dialog" aria-label="Works">
    <div class="grip"></div>
    <label>Operation</label>
    <div class="chips" id="wk_ops">${ops.map(o => `<button class="chip small" data-v="${o.id}">${esc(o.label)}</button>`).join("")}</div>
    <div id="wk_fields"></div>
    ${ctx.bs ? `<label>Phase</label><div class="chips" id="wk_ph">${PHASES.map(p => `<button class="chip small ${p === phase ? "on" : ""}" data-v="${p}">${p}</button>`).join("")}</div>` : ""}
    <div id="wk_timewrap"><label>Timescale</label><div class="chips" id="wk_time">${TIMESCALES.map(p => `<button class="chip small" data-v="${p}">${p}</button>`).join("")}</div></div>
    <div class="hint" id="wk_warn"></div>
    <div class="sheet-foot"><div class="preview" id="wk_prev"></div>
    <div class="row"><button class="btn" id="wk_cancel">Cancel</button><button class="btn primary" id="wk_add">Add</button></div></div>
  </div>`;
  document.body.appendChild(back);
  const $s = sel => back.querySelector(sel);
  const sentence = () => {
    if (!op) return "";
    let x = op.text(v, ctx);
    if (!x) return "";
    if (time && !op.noTime) x += time === "Urgent" ? " (urgent)" : ` (${time.toLowerCase()})`;
    if (ctx.bs && (op.phase || phase)) x = `${op.phase || phase}: ${x}`;
    return x + ".";
  };
  const draw = () => {
    $s("#wk_fields").innerHTML = op ? op.fields.map(f => f.type === "chips"
      ? `<label>${esc(f.label)}</label><div class="chips" data-k="${f.k}">${f.opts.map(o => `<button class="chip small ${v[f.k] === o ? "on" : ""}" data-v="${esc(o)}">${esc(o)}</button>`).join("")}</div>`
      : `<label for="wk_${f.k}">${esc(f.label)}</label><input id="wk_${f.k}" data-k="${f.k}" ${f.type === "num" ? 'inputmode="decimal"' : ""} autocomplete="off" placeholder="${esc(f.ph || "")}" value="${esc(v[f.k] ?? "")}">`).join("") : "";
    $s("#wk_timewrap").hidden = !op || !!op.noTime;
    if ($s("#wk_ph")) $s("#wk_ph").closest("div").hidden = !op || !!op.phase;
    $s("#wk_fields").querySelectorAll("input").forEach(i => i.oninput = () => { v[i.dataset.k] = i.value; numify(); update(); });
    $s("#wk_fields").querySelectorAll(".chips").forEach(g => g.onclick = e => {
      const b = e.target.closest(".chip"); if (!b) return; e.preventDefault();
      const k = g.dataset.k; v[k] = v[k] === b.dataset.v ? "" : b.dataset.v;
      if (op.defaults) { op.defaults(v); const m = $s("#wk_m"); if (m && v.m) m.value = v.m; }
      g.querySelectorAll(".chip").forEach(c => c.classList.toggle("on", c.dataset.v === v[k])); update();
    });
    update();
  };
  const numify = () => { if (!op) return; op.fields.filter(f => f.type === "num").forEach(f => { if (v[f.k] !== "" && v[f.k] != null) v[f.k] = +String(v[f.k]).replace(",", ".") || ""; }); };
  const update = () => {
    $s("#wk_prev").textContent = sentence() || "Choose an operation";
    const w = op && op.check ? op.check(v, ctx) : [];
    $s("#wk_warn").innerHTML = w.map(x => "• " + esc(x)).join("<br>");
  };
  $s("#wk_ops").onclick = e => {
    const b = e.target.closest(".chip"); if (!b) return; e.preventDefault();
    op = ops.find(o => o.id === b.dataset.v); v = {};
    op.fields.forEach(f => { if (f.def != null) v[f.k] = f.def; });
    $s("#wk_ops").querySelectorAll(".chip").forEach(c => c.classList.toggle("on", c === b)); draw();
  };
  const one = (id, set) => { const g = $s(id); if (g) g.onclick = e => { const b = e.target.closest(".chip"); if (!b) return; e.preventDefault(); set(b.dataset.v); g.querySelectorAll(".chip").forEach(c => c.classList.toggle("on", c.dataset.v === b.dataset.v)); update(); }; };
  one("#wk_time", x => { time = time === x ? "" : x; });
  one("#wk_ph", x => { phase = x; });
  const close = () => back.remove();
  back.addEventListener("click", e => { if (e.target === back) close(); });
  $s("#wk_cancel").onclick = close;
  $s("#wk_add").onclick = () => {
    numify();
    const x = sentence();
    if (!x) { toast(op ? "Fill in the details first" : "Choose an operation"); return; }
    close(); onAdd(x, { op: op.id, values: Object.assign({}, v), time, phase: ctx.bs ? (op.phase || phase) : "" });
  };
  draw();
}
