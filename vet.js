// Tree Survey – © 2026 Mark Johnson. All rights reserved. Use only under a written licence from the owner.
/* Veteran / ancient tree record – the data sections of the Specialist Survey Method (Fay & de Berker 1997,
   as listed in Lonsdale (ed.) 2013, Ancient and other veteran trees: further guidance on management, Appendix A).
   Labels are ours; the record builds a short summary sentence for the report. */
"use strict";

const VET = {
  form: ["Maiden", "Pollard", "Lapsed pollard", "Coppice", "Coppard", "Phoenix regeneration", "Fallen, still growing", "Multi-stemmed", "Stub / snag"],
  standing: ["Upright", "Leaning", "Partly fallen", "Fallen"],
  live: ["Over 75%", "51–75%", "26–50%", "1–25%", "Dead"],
  crownLoss: ["None", "Under 25%", "25–50%", "51–75%", "Over 75%"],
  epicormic: ["None", "Stem base", "Trunk", "Crown"],
  hollow: ["None", "Partly hollow", "Fully hollow"],
  barkDead: ["None", "Small areas", "Large areas"],
  flux: ["None", "Wet", "Dry", "Bubbly"],
  rot: ["White", "Brown", "Dry", "Wet"],
  epiphytes: ["Lichens", "Mosses", "Ferns", "Ivy", "Mistletoe", "Climbers"],
  fauna: ["Bat signs", "Bird nest", "Woodpecker holes", "Owl / raptor", "Squirrel drey", "Invertebrate activity", "Badger / mammal"],
  context: ["Parkland", "Wood pasture", "Woodland", "Hedgerow", "Field / arable", "Urban / street", "Garden", "Churchyard"],
  damage: ["None", "Lightning", "Ploughing near roots", "Compaction", "Grazing / browsing", "Inappropriate pruning", "Vandalism", "Fire"],
  shade: ["Open", "Light", "Moderate", "Heavy"],
  counts: [["splits", "Split limbs"], ["stubs", "Live stubs >150 mm"], ["holes", "Holes 50–150 mm"], ["pockets", "Water pockets"],
    ["dwAttached", "Attached deadwood >150 mm"], ["dwFallen", "Fallen deadwood >150 mm"], ["fungi", "Fungal fruit bodies"]],
};

function vetSummary(v) {
  if (!v) return "";
  const b = [];
  if (v.girth) b.push(`girth ${v.girth} m at ${v.girthH || "1.3"} m`);
  if (v.form) b.push(v.form.toLowerCase());
  if (v.bole) b.push(`bole ${v.bole} m`);
  if (v.trunks && +v.trunks > 1) b.push(`${v.trunks} trunks`);
  if (v.standing && v.standing !== "Upright") b.push(v.standing.toLowerCase());
  if (v.live) b.push(`live growth ${v.live.toLowerCase()} of crown`);
  if (v.crownLoss && v.crownLoss !== "None") b.push(`crown loss ${v.crownLoss.toLowerCase()}`);
  if (v.hollow && v.hollow !== "None") b.push(v.hollow.toLowerCase() + (v.hollowCrown ? " (trunk and crown)" : ""));
  const c = VET.counts.filter(([k]) => +v[k] > 0).map(([k, l]) => `${v[k]} ${l.toLowerCase()}`);
  if (c.length) b.push(c.join(", "));
  if ((v.rot || []).length) b.push((v.rot || []).join("/").toLowerCase() + " rot");
  if ((v.epiphytes || []).length) b.push((v.epiphytes || []).join(", ").toLowerCase());
  if ((v.fauna || []).length) b.push((v.fauna || []).join(", ").toLowerCase());
  if (v.context) b.push(`in ${v.context.toLowerCase()}`);
  const dmg = (v.damage || []).filter(x => x !== "None");
  if (dmg.length) b.push("damage: " + dmg.join(", ").toLowerCase());
  if (!b.length) return "";
  const s = "Veteran features: " + b.join("; ") + ".";
  return s.charAt(0) + s.slice(1);
}

function vetBox(t) {
  const v = t.vet || {};
  const one = (k, opts) => `<div class="chips" data-vone="${k}">${opts.map(o => `<button class="chip small ${v[k] === o ? "on" : ""}" data-v="${esc(o)}">${esc(o)}</button>`).join("")}</div>`;
  const many = (k, opts) => `<div class="chips" data-vmany="${k}">${opts.map(o => `<button class="chip small ${(v[k] || []).includes(o) ? "on" : ""}" data-v="${esc(o)}">${esc(o)}</button>`).join("")}</div>`;
  const inp = (k, l, ph = "") => `<div><label for="v_${k}">${l}</label><input id="v_${k}" data-vin="${k}" inputmode="decimal" autocomplete="off" placeholder="${ph}" value="${esc(v[k] ?? "")}"></div>`;
  return `<details class="more" id="vetBox" ${t.vet || t.lifeStage === "V" ? "open" : ""}><summary>Veteran / ancient tree record</summary>
    <div class="hint">Specialist Survey Method data sections. Fill in what applies – the report gets a one-line summary.</div>
    <div class="grid3">${inp("girth", "Girth (m)", "4.2")}${inp("girthH", "measured at (m)", "1.3")}${inp("bole", "Pollard bole (m)")}</div>
    <div class="grid3">${inp("trunks", "No. of trunks", "1")}<div></div><div></div></div>
    <label>Tree form</label>${one("form", VET.form)}
    <label>Standing / fallen</label>${one("standing", VET.standing)}
    <label>Live growth in the crown</label>${one("live", VET.live)}
    <label>Crown loss (shed from the original)</label>${one("crownLoss", VET.crownLoss)}
    <label>Vigorous epicormic growth</label>${one("epicormic", VET.epicormic)}
    <h3 class="subhead">Habitat</h3>
    <label>Hollowing</label>${one("hollow", VET.hollow)}
    <label class="check"><input type="checkbox" id="v_hollowCrown" ${v.hollowCrown ? "checked" : ""}> Hollowing extends into the mature crown</label>
    <label>Dead bark</label>${one("barkDead", VET.barkDead)}
    <label>Bark fluxes</label>${one("flux", VET.flux)}
    <label class="check"><input type="checkbox" id="v_scars" ${v.scars ? "checked" : ""}> Tears / scars / lightning strike</label>
    <div class="grid3">${VET.counts.map(([k, l]) => inp(k, l, "0")).join("")}</div>
    <label>Rot types</label>${many("rot", VET.rot)}
    <h3 class="subhead">Associated species</h3>
    <label>Epiphytes and climbers</label>${many("epiphytes", VET.epiphytes)}
    <label>Birds, mammals, invertebrates</label>${many("fauna", VET.fauna)}
    <h3 class="subhead">Setting and management</h3>
    <label>Context</label>${one("context", VET.context)}
    <label>Damage</label>${many("damage", VET.damage)}
    <label>Shade on the crown</label>${one("shade", VET.shade)}
    <label for="v_mgmt">Management in the last two years</label><input id="v_mgmt" data-vtxt="mgmt" value="${esc(v.mgmt || "")}" placeholder="e.g. halo release, re-pollarded">
    <div class="hint" id="vetOut">${esc(vetSummary(v))}</div>
  </details>`;
}

function bindVet(t, touch) {
  const box = document.getElementById("vetBox"); if (!box) return;
  const v = () => (t.vet = t.vet || {});
  const show = () => { const o = document.getElementById("vetOut"); if (o) o.textContent = vetSummary(t.vet); };
  box.querySelectorAll("[data-vone]").forEach(g => g.onclick = e => {
    const b = e.target.closest(".chip"); if (!b) return; e.preventDefault();
    const k = g.dataset.vone; v()[k] = v()[k] === b.dataset.v ? "" : b.dataset.v;
    g.querySelectorAll(".chip").forEach(c => c.classList.toggle("on", c.dataset.v === v()[k])); show(); touch();
  });
  box.querySelectorAll("[data-vmany]").forEach(g => g.onclick = e => {
    const b = e.target.closest(".chip"); if (!b) return; e.preventDefault();
    const k = g.dataset.vmany, s = new Set(v()[k] || []); s.has(b.dataset.v) ? s.delete(b.dataset.v) : s.add(b.dataset.v);
    v()[k] = [...s]; b.classList.toggle("on"); show(); touch();
  });
  box.querySelectorAll("[data-vin]").forEach(i => i.oninput = () => { v()[i.dataset.vin] = i.value.replace(",", ".").trim(); show(); touch(); });
  box.querySelectorAll("[data-vtxt]").forEach(i => i.oninput = () => { v()[i.dataset.vtxt] = i.value; show(); touch(); });
  ["hollowCrown", "scars"].forEach(k => { const c = document.getElementById("v_" + k); if (c) c.onchange = () => { v()[k] = c.checked; show(); touch(); }; });
}
