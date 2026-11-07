// Tree Survey – © 2026 Mark Johnson. All rights reserved. Use only under a written licence from the owner.
/* Route notes – the daily site note for highway route surveys (EM / WM network): date, route, what3words, distance,
   team, species (tap once = standard stock, twice = occasional), defects and access in your usual sentences, extra
   notes, up to 3 photos. Save PDF makes "Site_Notes_DD_MM_YYYY_<route>.pdf": the text page, then one photo a page.
   New day keeps the route, team and species. Everything stays on the phone (Settings store). */

const RN_SPECIES = ["Ash", "Birch", "Field maple", "Hawthorn", "Willow", "Oak", "Sycamore", "Elm", "Scots pine", "Blackthorn", "Hazel",
  "Beech", "Alder", "Poplar", "Wild cherry", "Lime", "Horse chestnut", "Holly", "Rowan", "Whitebeam", "Corsican pine", "Larch"];
const RN_DEFECTS = [
  ["Ash dieback", "Ash dieback prevalent."],
  ["Dutch elm disease", "Dutch elm disease prevalent."],
  ["Sooty bark disease", "Sooty bark disease (Cryptostroma corticale) noted in sycamore."],
  ["Dead / moribund trees", "Dead and moribund trees present."],
  ["Deadwood over carriageway", "Deadwood present over the carriageway."],
  ["Hung-up / broken limbs", "Hung-up and broken limbs noted."],
  ["Decay / cavities", "Decay and cavities noted in a number of trees."],
  ["Fungal fruiting bodies", "Fungal fruiting bodies noted."],
  ["Leaning / unstable trees", "Leaning or potentially unstable trees noted."],
  ["Cracks / splits", "Cracks and splits noted in stems and unions."],
  ["Ivy obscuring inspection", "Dense ivy obscuring full inspection of some stems."],
  ["Sight line / sign obstruction", "Vegetation obstructing sight lines and signage."],
  ["Defects in NH woodland", "A number of defects within woodland adopted by NH."],
  ["Mature ash defects → Confirm", "Several mature ash trees with significant defects reported through Confirm."],
  ["3rd party trees with defects", "Occasional 3rd party trees with defects."],
  ["3rd party LA trees with defects", "Occasional 3rd party LA trees with defects."],
  ["Defects marked orange paint", "Defective trees marked with orange paint."],
];
const RN_ACCESS = [
  ["Co-surveyor no ArcGIS", "Co-surveyor had no access to ArcGIS."],
  ["Co-surveyor limited Confirm", "Co-surveyor had limited access to Confirm."],
  ["Dense vegetation", "Dense vegetation restricted access to parts of the route."],
  ["Vegetation prevented tagging", "Vegetation prevented tagging of some trees; these were reported as defects and marked with orange paint."],
  ["Steep embankments", "Steep embankments limited access in places."],
  ["Narrow / no verge", "Narrow or absent verge limited safe access in places."],
  ["Live traffic", "Survey conducted alongside live traffic; some sections viewed from a distance."],
  ["Fencing / boundary", "Boundary fencing restricted access to some trees."],
  ["Private land", "Some trees only visible from the highway due to adjacent private land."],
  ["Ditches / water", "Ditches and wet ground limited access in places."],
  ["Poor signal", "Poor mobile signal affected data upload in places."],
  ["GPS accuracy", "GPS accuracy was poor in places."],
  ["Weather", "Weather conditions limited survey time."],
];

function rnBlank() { return { date: today(), site: "", w3w: "", dist: "", team: "lone", col: "", species: {}, defects: {}, access: {},
  obsExtra: "", conExtra: "", photos: [null, null, null], custom: { species: [], defects: [], access: [] }, sites: [] }; }
async function rnLoad() { const st = await settings(); st.routeNotes = Object.assign(rnBlank(), st.routeNotes || {}); return st; }

function rnChips(n, kind) {
  const base = kind === "species" ? RN_SPECIES.map(s => [s, s]) : kind === "defects" ? RN_DEFECTS : RN_ACCESS;
  return base.concat((n.custom[kind] || []).map(c => [c[0], c[1]]));
}
const rnJoin = a => a.length <= 1 ? a.join("") : a.slice(0, -1).join(", ") + " and " + a[a.length - 1];
const rnLc = s => /pine$/i.test(s) && /^(Scots|Corsican)/.test(s) ? s : s.charAt(0).toLowerCase() + s.slice(1);
function rnText(n, kind, label) { const c = rnChips(n, kind).find(x => x[0] === label); return c ? c[1] : label; }
function rnObs(n) {
  const parts = [];
  rnChips(n, "defects").forEach(([l]) => { if (n.defects[l]) parts.push(rnText(n, "defects", l)); });
  const std = [], occ = [];
  rnChips(n, "species").forEach(([l]) => { if (n.species[l] === 1) std.push(rnLc(l)); if (n.species[l] === 2) occ.push(rnLc(l)); });
  if (std.length || occ.length) {
    let s = std.length ? `Standard tree stock of ${rnJoin(std)}` : "Tree stock";
    if (occ.length) s += `${std.length ? ", with" : " of"} occasional ${rnJoin(occ)}`;
    parts.push(s + ".");
  }
  if (n.obsExtra.trim()) parts.push(n.obsExtra.trim());
  return parts.join(" ");
}
function rnCon(n) {
  const parts = [n.team === "lone" ? "Lone working." : (n.col.trim() ? `Working with co-surveyor (${n.col.trim()}).` : "Working with co-surveyor.")];
  rnChips(n, "access").forEach(([l]) => { if (n.access[l]) parts.push(rnText(n, "access", l)); });
  if (n.conExtra.trim()) parts.push(n.conExtra.trim());
  return parts.join(" ");
}
function rnLines(n) {
  const w = n.w3w.trim().replace(/^\/+/, "");
  return [["Date", ukDate(n.date)], ["Site", n.site.trim()], ["W3W", w ? "///" + w : ""], ["Distance", n.dist ? n.dist + "km" : ""],
    ["Observations", rnObs(n)], ["Constraints", rnCon(n)]];
}
function rnFile(n) {
  const [y, m, d] = (n.date || today()).split("-");
  const site = n.site.trim().replace(/&/g, "and").replace(/[^A-Za-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 60);
  return `Site_Notes_${d}_${m}_${y}${site ? "_" + site : ""}.pdf`;
}
function rnScript(src) {
  return new Promise((ok, bad) => { if (window.jspdf) return ok(); const s = document.createElement("script"); s.src = src;
    s.onload = ok; s.onerror = () => bad(new Error("The PDF tool didn't load – open the app once with signal.")); document.head.appendChild(s); });
}
async function rnPDF(n) {
  await rnScript("lib/jspdf.umd.min.js");
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const L = 25, W = 160; let y = 25;
  doc.setFont("helvetica", "normal"); doc.setFontSize(11);
  doc.text("Site Notes", L, y); y += 11;
  rnLines(n).forEach(([k, v]) => {
    const t = doc.splitTextToSize(`${k}: ${v}`, W);
    if (y + t.length * 5.2 > 280) { doc.addPage(); y = 25; }
    doc.text(t, L, y); y += t.length * 5.2 + 6;
  });
  n.photos.filter(Boolean).forEach(p => {
    doc.addPage();
    const r = Math.min(160 / p.w, 247 / p.h), w = p.w * r, h = p.h * r;
    doc.addImage(p.url, "JPEG", (210 - w) / 2, 25, w, h);
  });
  return doc.output("blob");
}

async function routeNotesPage() {
  const st = await rnLoad(), n = st.routeNotes;
  const save = async () => { st.routeNotes = n; await DB.put("settings", st); };
  const draw = () => {
    const chips = kind => rnChips(n, kind).map(([l]) => { const v = n[kind][l];
      return `<button class="chip ${v === 1 ? "on" : ""} ${v === 2 ? "occ" : ""}" data-k="${kind}" data-l="${esc(l)}">${esc(l)}${v === 2 ? " · occ." : ""}</button>`; }).join("");
    app.innerHTML = `
    <header class="top"><button aria-label="Home" onclick="go('#/')">‹</button><h1>Route notes<span class="sub">Daily site note · highway routes</span></h1></header>
    <main>
      <div class="grid2"><div><label for="rn_date">Date</label><input id="rn_date" type="date" value="${esc(n.date)}"></div>
        <div><label for="rn_dist">Distance (km)</label><input id="rn_dist" type="number" inputmode="decimal" step="0.5" min="0" value="${esc(n.dist)}"></div></div>
      <label for="rn_site">Site / route</label><input id="rn_site" list="rn_sites" value="${esc(n.site)}" placeholder="e.g. A5 NB & SB from Old Stratford Rbt.">
      <datalist id="rn_sites">${(n.sites || []).map(s => `<option value="${esc(s)}">`).join("")}</datalist>
      <label for="rn_w3w">what3words</label><input id="rn_w3w" value="${esc(n.w3w)}" placeholder="word.word.word" autocapitalize="off">
      <label>Team</label>
      <div class="chips" id="rn_team"><button class="chip ${n.team === "lone" ? "on" : ""}" data-v="lone">Lone working</button><button class="chip ${n.team === "pair" ? "on" : ""}" data-v="pair">With colleague</button></div>
      ${n.team === "pair" ? `<label for="rn_col">Colleague / company (optional)</label><input id="rn_col" value="${esc(n.col)}" placeholder="e.g. Acorn">` : ""}
      <h2>Species</h2><p class="hint">Tap once = standard stock · twice = occasional · again to clear.</p>
      <div class="chips">${chips("species")}</div>
      <div class="row"><input id="rn_add_species" placeholder="Add another species"><button class="btn small" data-add="species">Add</button></div>
      <h2>Defects and observations</h2><div class="chips">${chips("defects")}</div>
      <div class="row"><input id="rn_add_defects" placeholder="Add another (as a sentence)"><button class="btn small" data-add="defects">Add</button></div>
      <label for="rn_obs">Extra observations</label><textarea id="rn_obs" rows="2">${esc(n.obsExtra)}</textarea>
      <h2>Constraints and access</h2><div class="chips">${chips("access")}</div>
      <div class="row"><input id="rn_add_access" placeholder="Add another (as a sentence)"><button class="btn small" data-add="access">Add</button></div>
      <label for="rn_con">Extra constraints</label><textarea id="rn_con" rows="2">${esc(n.conExtra)}</textarea>
      <h2>Photos</h2><p class="hint">Up to 3 – each on its own page of the PDF.</p>
      <div class="qthumbs">${n.photos.map((p, i) => p ? `<button class="qthumb" data-ph="${i}"><img src="${p.url}" alt=""><span>Tap to remove</span></button>`
        : `<button class="qthumb rnadd" data-add-ph="${i}"><span style="font-size:28px;text-align:center;padding:26px 0">＋</span></button>`).join("")}</div>
      <h2>Preview</h2><div class="card" id="rn_prev" style="white-space:pre-wrap;font-family:Georgia,serif;font-size:14px"></div>
    </main>
    <div class="bar"><button class="btn" id="rn_new">New day</button><button class="btn primary" id="rn_pdf">Save PDF</button></div>`;
    const prev = () => { $("#rn_prev").textContent = "Site Notes\n\n" + rnLines(n).map(([k, v]) => `${k}: ${v}`).join("\n\n"); };
    prev();
    const bind = (id, k) => $(id).oninput = e => { n[k] = e.target.value; prev(); save(); };
    bind("#rn_date", "date"); bind("#rn_dist", "dist"); bind("#rn_site", "site"); bind("#rn_w3w", "w3w"); bind("#rn_obs", "obsExtra"); bind("#rn_con", "conExtra");
    if ($("#rn_col")) bind("#rn_col", "col");
    $("#rn_team").onclick = e => { const b = e.target.closest(".chip"); if (!b) return; n.team = b.dataset.v; save(); draw(); };
    app.querySelectorAll("[data-k]").forEach(b => b.onclick = () => {
      const k = b.dataset.k, l = b.dataset.l, cur = n[k][l] || 0, nxt = cur >= (k === "species" ? 2 : 1) ? 0 : cur + 1;
      if (nxt) n[k][l] = nxt; else delete n[k][l];
      save(); draw();
    });
    app.querySelectorAll("[data-add]").forEach(b => b.onclick = () => {
      const k = b.dataset.add, inp = $("#rn_add_" + k), v = inp.value.trim(); if (!v) return;
      let text = v; if (k !== "species" && !/[.!?]$/.test(text)) text += ".";
      const label = k === "species" ? v : (v.length > 28 ? v.slice(0, 26) + "…" : v);
      if (!rnChips(n, k).some(c => c[0] === label)) n.custom[k].push([label, text]);
      n[k][label] = 1; save(); draw();
    });
    app.querySelectorAll("[data-ph]").forEach(b => b.onclick = () => { if (confirm("Remove this photo?")) { n.photos[+b.dataset.ph] = null; save(); draw(); } });
    app.querySelectorAll("[data-add-ph]").forEach(b => b.onclick = () => pickFiles("#cam", async files => {
      if (!files[0]) return;
      const blob = await shrink(files[0], 1800);
      const bmp = await createImageBitmap(blob), url = await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(blob); });
      n.photos[+b.dataset.addPh] = { url, w: bmp.width, h: bmp.height }; bmp.close && bmp.close();
      await save(); draw();
    }));
    $("#rn_new").onclick = async () => {
      if (!confirm("Start a new day? The route, team and species are kept; the date, what3words, distance, notes and photos are cleared.")) return;
      Object.assign(n, { date: today(), w3w: "", dist: "", obsExtra: "", conExtra: "", photos: [null, null, null] });
      await save(); draw(); window.scrollTo(0, 0); toast("Ready for a new day");
    };
    $("#rn_pdf").onclick = async () => {
      if (!n.site.trim()) { toast("Add the site / route first"); $("#rn_site").focus(); return; }
      let blob;
      try { blob = await rnPDF(n); } catch (e) { toast(e.message, 5000); return; }
      n.sites = [n.site.trim()].concat((n.sites || []).filter(s => s !== n.site.trim())).slice(0, 15); await save();
      const name = rnFile(n), file = new File([blob], name, { type: "application/pdf" });
      let shared = false;
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try { await navigator.share({ files: [file], title: name }); shared = true; } catch (e) { if (e.name === "AbortError") { toast("Not sent"); return; } }
      }
      if (!shared) { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
        setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000); }
      toast(shared ? "Site note sent" : `Saved ${name}`, 4000);
    };
  };
  draw();
}
