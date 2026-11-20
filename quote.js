// Tree Survey – © 2026 Mark Johnson. All rights reserved. Use only under a written licence from the owner.
/* Quote visits – the site visit before a quote, for consultants, tree surgery contractors and landscapers.
   Photos with captions (for the site or for one item), the works items (tree / hedge / area and the works),
   access and constraints, and either the survey scope (consultant) or the crew, plant and equipment the job needs
   (contractor – lists from resources.js). A landscaping visit measures each area or feature (length, width, depth, number)
   so the PC can work out the materials. Export makes a zip for the PC: Quote visits → Import from phone. */

const Q_ACCESS = ["Narrow side access", "No vehicle access to the tree", "Access through the house", "Overhead lines",
  "Over a road or footpath", "Over a building / conservatory", "Parked cars to move", "Neighbour's garden needed",
  "Underground services", "Steep or soft ground", "Public access – barriers needed", "Water or pond nearby",
  "Protected tree (TPO / CA) – check", "Nesting birds – check", "Possible bat roost", "Take the arisings away",
  "Leave logs on site", "Livestock"];
const Q_SURVEY = ["AMR / tree risk survey", "BS 5837 survey", "TPO / CA application", "Mortgage report", "Subsidence report",
  "Roadside / PROW survey", "Aerial inspection (drone)", "Bat scoping", "Nesting bird check"];
const Q_CKIT = ["Drone", "Ladder", "Binoculars", "Resistance drill", "Sonic tomography", "Endoscope", "Laser rangefinder",
  "MEWP needed", "Climbing inspection"];

const Q_ACCESS_LS = ["Narrow side access", "Access through the house", "No vehicle access to the work", "Steps or a slope to the work",
  "Room for a skip", "Skip on the road – permit", "Where deliveries can be tipped", "Parked cars to move", "Neighbour's garden or boundary",
  "Water on site", "Power on site", "Underground services", "Drains or manholes in the area", "Overhead lines", "Soft or wet ground",
  "Existing surface to break out", "Spoil to take away", "Trees or roots in the way", "Protected tree (TPO / CA) – check",
  "Public access – barriers needed", "Pond or water nearby", "Pets or livestock"];
// what a landscaper measures: [name, the PC calculator it feeds, the measurements asked for]
//   lw = length × width · lwd = and a depth in mm · lh = length and height in m · l = length · n = a number
const Q_LS_KINDS = [["Patio / slab paving", "patio", "lw"], ["Block paving", "blocks", "lw"], ["Gravel path / drive", "gravel", "lw"],
  ["Concrete base / slab", "concrete", "lw"], ["Kerbs and edgings", "kerb", "l"], ["Wall", "wall", "lh"], ["Fence", "fence", "lh"],
  ["Decking", "deck", "lw"], ["Raised bed", "bed", "lwd"], ["Trench / land drain", "trench", "l"], ["Excavation", "dig", "lwd"],
  ["Lawn – turf or seed", "lawn", "lw"], ["Mulch / bark", "mulch", "lwd"], ["Planting bed", "plants", "lw"], ["Hedge planting", "hedge", "l"],
  ["Tree planting", "treepit", "n"], ["Other", "", "lwd"]];
const Q_FENCES = ["Panel", "Closeboard", "Post and rail", "Picket / timber palisade", "Stock fence (wire netting)", "Deer fence",
  "Rabbit fence (netting)", "Chain-link", "Steel palisade (security)", "Welded mesh panels (security)"];
const qKind = w => Q_LS_KINDS.find(k => k[0] === w.kind) || null;
const qNum = v => { const x = parseFloat(String(v == null ? "" : v).replace(",", ".")); return isFinite(x) && x > 0 ? x : 0; };
function qMeasure(w) {   // "6 × 4 m = 24 m², 100 mm deep" – what was measured, in words
  const k = qKind(w); if (!k) return "";
  const s = k[2], l = qNum(w.length), wd = qNum(w.width), d = qNum(w.depth), n = qNum(w.qty), out = [];
  const r = x => String(Math.round(x * 100) / 100);
  if (s === "n") { if (n) out.push(`${r(n)} no.`); }
  else if (s === "l") { if (l) out.push(`${r(l)} m long`); }
  else if (s === "lh") { if (l) out.push(`${r(l)} m long`); if (d) out.push(`${r(d)} m high`); }
  else {
    if (qNum(w.area)) out.push(`${r(qNum(w.area))} m²`);
    else if (l && wd) out.push(`${r(l)} × ${r(wd)} m = ${r(l * wd)} m²`);
    else if (l) out.push(`${r(l)} m long`);
    if (s === "lwd" && d) out.push(`${r(d)} mm ${k[1] === "bed" ? "high" : "deep"}`);
  }
  if (s !== "n" && n > 1) out.push(`× ${r(n)}`);
  if (k[1] === "fence" && w.fence) out.push(w.fence);
  return out.join(", ");
}

const isQuote = j => !!j && j.type === "QUOTE";
function qInit(job) {
  for (const k of ["access", "activities", "plant", "equipment", "works"]) job[k] = job[k] || [];
  job.crew = job.crew || [];
  job.consultant = Object.assign({ survey: [], trees: "", hours: "", kit: [], fee: "" }, job.consultant || {});
  return job;
}
function quoteCard(j) {
  return `<a class="card job" href="#/job/${j.id}">
    <h3>${esc(j.site || "Untitled site")}</h3>
    <div class="meta"><span class="badge quote">Quote visit</span> ${esc(j.client || "")} · ${ukDate(j.visitDate)} ·
      ${j.mode === "consultant" ? "survey" : j.mode === "landscaper" ? "landscaping" : "tree work"}</div>
    <div class="meta">${j.exported ? `Exported ${new Date(j.exported).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}${j.updated > j.exported ? " · <b class='no'>changed since</b>" : ""}` : "<b class='no'>Not exported yet</b>"}</div>
  </a>`;
}

// ------------------------------------------------------------------ details (new visit or edit)
async function quoteDetailsPage(id) {
  const st = await settings();
  const job = qInit(id ? await DB.get("jobs", id) : { id: uid(), type: "QUOTE", visitDate: today(), mode: st.quoteMode || "contractor", created: Date.now() });
  app.innerHTML = `
  <header class="top"><button aria-label="Back" onclick="go('${id ? "#/job/" + id : "#/"}')">‹</button><h1>${id ? "Visit details" : "New quote visit"}</h1></header>
  <main>
    <label>The quote is for</label>
    <div class="chips" id="qmode">${[["contractor", "Tree work (contractor)"], ["landscaper", "Landscaping"], ["consultant", "A survey / report (consultant)"]].map(([v, t]) =>
      `<button class="chip ${job.mode === v ? "on" : ""}" data-v="${v}">${t}</button>`).join("")}</div>
    <label for="q_client">Client</label><input id="q_client" value="${esc(job.client || "")}" autocomplete="off">
    <label for="q_site">Site</label><input id="q_site" value="${esc(job.site || "")}" placeholder="e.g. 12 Oak Lane – rear garden">
    <label for="q_address">Address</label><textarea id="q_address" rows="2">${esc(job.address || "")}</textarea>
    <div class="grid2">
      <div><label for="q_contact">Contact</label><input id="q_contact" value="${esc(job.contact || "")}"></div>
      <div><label for="q_phone">Phone</label><input id="q_phone" type="tel" value="${esc(job.phone || "")}"></div>
    </div>
    <label for="q_email">Email</label><input id="q_email" type="email" value="${esc(job.email || "")}" autocapitalize="none" autocomplete="off" spellcheck="false">
    <div class="grid2">
      <div><label for="q_date">Visit date</label><input id="q_date" type="date" value="${esc(job.visitDate || today())}"></div>
      <div><label for="q_w3w">what3words</label><input id="q_w3w" value="${esc(job.w3w || "")}" placeholder="///word.word.word"></div>
    </div>
    <button class="btn small" id="q_here" style="margin-top:8px">📍 Use my position</button> <span class="hint" id="q_pos">${job.grid ? esc(job.grid) : ""}</span>
    ${id ? `<button class="btn danger block" style="margin-top:28px" id="q_del">Delete this visit</button>` : ""}
  </main>
  <div class="bar"><button class="btn primary" id="q_save">${id ? "Save" : "Start the visit ›"}</button></div>`;
  $("#qmode").onclick = e => { const b = e.target.closest(".chip"); if (!b) return; job.mode = b.dataset.v;
    $("#qmode").querySelectorAll(".chip").forEach(c => c.classList.toggle("on", c === b)); };
  $("#q_here").onclick = async () => {
    $("#q_pos").textContent = "Finding you…";
    const f = fixRec(await quickFix(15000));
    if (f.lat == null) { $("#q_pos").textContent = "No GPS fix – type the address instead."; return; }
    Object.assign(job, f); $("#q_pos").textContent = `${f.grid} (±${f.acc} m)`;
  };
  $("#q_save").onclick = async () => {
    for (const k of ["client", "site", "address", "contact", "phone", "email", "w3w"]) job[k] = $("#q_" + k).value.trim();
    job.visitDate = $("#q_date").value || today();
    if (!job.site && !job.client) { toast("Fill in the client or the site"); return; }
    job.updated = Date.now(); st.quoteMode = job.mode; await DB.put("settings", st);
    await DB.put("jobs", job); go("#/job/" + job.id);
  };
  if ($("#q_del")) $("#q_del").onclick = async () => {
    if (!confirm("Delete this quote visit and its photos from this phone?\n\nExport it first if you haven't.")) return;
    for (const p of await DB.by("photos", "job", job.id)) await DB.del("photos", p.id);
    await DB.del("jobs", job.id); go("#/");
  };
}

// ------------------------------------------------------------------ the visit
async function quotePage(job) {
  qInit(job);
  const con = job.mode === "consultant", ls = job.mode === "landscaper";
  const accessList = ls ? Q_ACCESS_LS : Q_ACCESS;
  const workList = ls ? RESOURCES.works.filter(w => w.key.startsWith("ls_")).concat(RESOURCES.works.filter(w => !w.key.startsWith("ls_"))) : RESOURCES.works;
  const urls = [];
  const qs = qqSet(await settings());
  const draw = async () => {
    urls.splice(0).forEach(u => URL.revokeObjectURL(u));
    const ph = (await DB.by("photos", "job", job.id)).filter(p => p.role === "quote").sort((a, b) => a.created - b.created);
    const thumb = p => { const u = URL.createObjectURL(p.blob); urls.push(u);
      return `<button class="qthumb" data-ph="${p.id}"><img src="${u}" alt=""><span>${esc(p.caption || "")}</span></button>`; };
    const crewN = r => (job.crew.find(c => c[0] === r) || [0, 0])[1];
    app.innerHTML = `
    <header class="top"><button aria-label="Home" onclick="go('#/')">‹</button>
      <h1>${esc(job.site || job.client || "Quote visit")}<span class="sub">${esc(job.client || "")} · ${ukDate(job.visitDate)}</span></h1>
      <button aria-label="Visit details" onclick="go('#/job/${job.id}/details')">✎</button></header>
    <main>
      <div class="row"><button class="btn green" id="q_export">⇪ Export to the PC</button><button class="btn" id="q_quick">£ Quick quote</button></div>
      ${job.quote && job.quote.made ? `<p class="hint">Quick quote ${esc(job.quote.ref)} made ${ukDate(job.quote.date)}: ${qqMoney(job.quote.total)}${job.quote.rate ? " with VAT" : ""}.${qqStale(job, qs) ? ` <b class="no">The prices have changed since – make it again if the client needs the new figure.</b>` : ""}</p>` : ""}
      <h2>Photos</h2>
      <div class="qthumbs">${ph.filter(p => !p.item).map(thumb).join("")}</div>
      <div class="row"><button class="btn small" id="q_cam">📷 Photo</button><button class="btn small" id="q_gal">From the gallery…</button></div>
      <p class="hint">Tap a photo to add a caption or delete it. Photos of one ${ls ? "area" : "tree"} go on its item below.</p>
      <h2>${con ? "Trees and areas" : ls ? "Areas and features" : "Works"}</h2>
      ${job.works.map((w, i) => `<a class="card job" href="#/job/${job.id}/qitem/${w.id}"><h3>${i + 1}. ${esc(w.what || w.kind || "Item")}</h3>
        <div class="meta">${esc([w.what ? w.kind : "", qMeasure(w), w.works].filter(Boolean).join(" · "))}${w.price ? ` · £${esc(w.price)}` : ""} · 📷 ${ph.filter(p => p.item === w.id).length}</div></a>`).join("")}
      <button class="btn small" id="q_item">＋ ${con ? "Tree or area" : ls ? "Area or feature" : "Works item"}</button>
      ${ls ? `<p class="hint">Measure each area or feature – the PC works out the materials from the sizes when the visit is imported.</p>` : ""}
      <h2>Access and constraints</h2>
      <div class="chips" id="q_access">${[...new Set(accessList.concat(job.access))].map(a =>
        `<button class="chip ${job.access.includes(a) ? "on" : ""}" data-v="${esc(a)}">${esc(a)}</button>`).join("")}
        <button class="chip" id="q_access_add">＋ Other…</button></div>
      ${con ? `
      <h2>Survey</h2>
      <div class="chips" id="q_survey">${Q_SURVEY.map(s => `<button class="chip ${job.consultant.survey.includes(s) ? "on" : ""}" data-v="${esc(s)}">${esc(s)}</button>`).join("")}</div>
      <div class="grid2">
        <div><label for="q_trees">Trees (estimate)</label><input id="q_trees" type="number" min="0" inputmode="numeric" value="${esc(job.consultant.trees || "")}"></div>
        <div><label for="q_hours">Time on site (hours)</label><input id="q_hours" type="number" min="0" step="0.5" inputmode="decimal" value="${esc(job.consultant.hours || "")}"></div>
      </div>
      <label for="q_fee">Fee £ before VAT (optional)</label><input id="q_fee" type="number" min="0" step="1" inputmode="decimal" value="${esc(job.consultant.fee || "")}">
      <p class="hint">With a fee, the PC drafts the fee proposal when this visit is imported, and £ Quick quote can send a short quotation now.</p>
      <label>Equipment</label>
      <div class="chips" id="q_ckit">${Q_CKIT.map(s => `<button class="chip ${job.consultant.kit.includes(s) ? "on" : ""}" data-v="${esc(s)}">${esc(s)}</button>`).join("")}</div>`
      : `
      <h2>The work</h2>
      <p class="hint">Tick each kind of work – the usual crew, plant and kit are ticked for you. Change anything.${ls ? " Landscaping work is listed first." : ""}</p>
      <div class="chips" id="q_work">${workList.map(w => `<button class="chip ${job.activities.includes(w.key) ? "on" : ""}" data-v="${w.key}">${esc(w.name)}</button>`).join("")}</div>
      <label for="q_days">Days on site (estimate)</label><input id="q_days" type="number" min="0.5" step="0.5" inputmode="decimal" value="${esc(job.days || "")}">
      <h2>Crew</h2>
      <div id="q_crew">${RESOURCES.crew.map(r => { const n = crewN(r);
        return `<div class="qcrew ${n ? "on" : ""}"><span>${esc(r)}</span><button data-r="${esc(r)}" data-d="-1" aria-label="One fewer">−</button><b>${n}</b><button data-r="${esc(r)}" data-d="1" aria-label="One more">＋</button></div>`; }).join("")}</div>
      <h2>Plant</h2>
      <div class="chips" id="q_plant">${RESOURCES.plant.map(p => `<button class="chip ${job.plant.includes(p) ? "on" : ""}" data-v="${esc(p)}">${esc(p)}</button>`).join("")}</div>
      <h2>Equipment</h2>
      ${[...new Set(RESOURCES.equipment.map(e => e[0]))].map(cat => `<details class="qcat" ${RESOURCES.equipment.some(e => e[0] === cat && job.equipment.includes(e[1])) ? "open" : ""}>
        <summary>${esc(cat)} (${RESOURCES.equipment.filter(e => e[0] === cat && job.equipment.includes(e[1])).length})</summary>
        <div class="chips">${RESOURCES.equipment.filter(e => e[0] === cat).map(e => `<button class="chip ${job.equipment.includes(e[1]) ? "on" : ""}" data-eq="${esc(e[1])}">${esc(e[1])}</button>`).join("")}</div></details>`).join("")}`}
      <h2>Notes</h2>
      <textarea id="q_notes" rows="4" placeholder="Anything for the quote – client's wishes, timing, parking…">${esc(job.notes || "")}</textarea>
    </main>`;
    const save = async () => { job.updated = Date.now(); await DB.put("jobs", job); };
    const toggle = (arr, v) => { const i = arr.indexOf(v); i < 0 ? arr.push(v) : arr.splice(i, 1); };
    $("#q_cam").onclick = () => qAddPhotos(job, "#cam", "", draw);
    $("#q_gal").onclick = () => qAddPhotos(job, "#gallery", "", draw);
    app.querySelectorAll("[data-ph]").forEach(b => b.onclick = () => qPhotoMenu(ph.find(p => p.id === b.dataset.ph), job, draw));
    $("#q_item").onclick = async () => { const w = { id: uid().slice(0, 8), what: "", works: "" }; job.works.push(w); await save(); go(`#/job/${job.id}/qitem/${w.id}`); };
    $("#q_access").onclick = async e => {
      const b = e.target.closest(".chip"); if (!b) return;
      if (b.id === "q_access_add") { const a = (prompt("Access or constraint:") || "").trim(); if (a) job.access.push(a); }
      else toggle(job.access, b.dataset.v);
      await save(); draw();
    };
    if (con) {
      $("#q_survey").onclick = async e => { const b = e.target.closest(".chip"); if (!b) return; toggle(job.consultant.survey, b.dataset.v); b.classList.toggle("on"); await save(); };
      $("#q_ckit").onclick = async e => { const b = e.target.closest(".chip"); if (!b) return; toggle(job.consultant.kit, b.dataset.v); b.classList.toggle("on"); await save(); };
      for (const k of ["trees", "hours", "fee"]) $("#q_" + k).oninput = e => { job.consultant[k] = e.target.value; save(); };
    } else {
      $("#q_work").onclick = async e => {
        const b = e.target.closest(".chip"); if (!b) return;
        const k = b.dataset.v, on = !job.activities.includes(k);
        toggle(job.activities, k);
        if (on) qSuggest(job, k);
        await save(); draw();
      };
      $("#q_days").oninput = e => { job.days = e.target.value; save(); };
      $("#q_crew").onclick = async e => {
        const b = e.target.closest("button[data-r]"); if (!b) return;
        const r = b.dataset.r; let c = job.crew.find(x => x[0] === r);
        if (!c) { c = [r, 0]; job.crew.push(c); }
        c[1] = Math.max(0, Math.min(20, c[1] + +b.dataset.d));
        job.crew = job.crew.filter(x => x[1] > 0);
        await save(); draw();
      };
      $("#q_plant").onclick = async e => { const b = e.target.closest(".chip"); if (!b) return; toggle(job.plant, b.dataset.v); b.classList.toggle("on"); await save(); };
      app.querySelectorAll("[data-eq]").forEach(b => b.onclick = async () => { toggle(job.equipment, b.dataset.eq); b.classList.toggle("on"); await save(); });
    }
    $("#q_notes").oninput = e => { job.notes = e.target.value; save(); };
    $("#q_export").onclick = () => qExport(job.id);
    $("#q_quick").onclick = () => go(`#/job/${job.id}/qquote`);
  };
  leaveHook = async () => { const n = $("#q_notes"); if (n) job.notes = n.value; await DB.put("jobs", job); urls.forEach(u => URL.revokeObjectURL(u)); };
  draw();
}

function qSuggest(job, key) {  // the same rule as the PC: add, never remove
  const w = RESOURCES.works.find(x => x.key === key); if (!w) return;
  for (const [r, n] of w.crew) { const c = job.crew.find(x => x[0] === r); if (c) c[1] = Math.max(c[1], n); else job.crew.push([r, n]); }
  for (const p of w.plant) if (!job.plant.includes(p)) job.plant.push(p);
  for (const e of w.equipment.concat(RESOURCES.basic)) if (!job.equipment.includes(e)) job.equipment.push(e);
}

async function qAddPhotos(job, sel, item, after) {
  pickFiles(sel, async files => {
    if (!files.length) return;
    const fx = fixRec(await Promise.race([quickFix(4000), new Promise(r => setTimeout(() => r(null), 4500))]));
    for (const f of files) {
      await DB.put("photos", Object.assign({ id: uid(), jobId: job.id, role: "quote", item: item || "", caption: "", blob: await shrink(f),
        created: Date.now(), when: new Date().toISOString() }, fx));
    }
    job.updated = Date.now(); await DB.put("jobs", job);
    toast(`${files.length} photo${files.length === 1 ? "" : "s"} added`); after();
  });
}

async function qPhotoMenu(p, job, after) {
  if (!p) return;
  const c = prompt("Caption (leave empty for none). To delete the photo, type DELETE:", p.caption || "");
  if (c === null) return;
  if (c.trim().toUpperCase() === "DELETE") { if (confirm("Delete this photo?")) await DB.del("photos", p.id); }
  else { p.caption = c.trim(); await DB.put("photos", p); }
  job.updated = Date.now(); await DB.put("jobs", job); after();
}

// ------------------------------------------------------------------ one works item (or tree / area)
async function quoteItemPage(jobId, itemId) {
  const job = qInit(await DB.get("jobs", jobId)); if (!job) return go("#/");
  const w = job.works.find(x => x.id === itemId); if (!w) return go("#/job/" + jobId);
  const con = job.mode === "consultant", ls = job.mode === "landscaper", n = job.works.indexOf(w) + 1;
  const urls = [];
  const draw = async () => {
    urls.splice(0).forEach(u => URL.revokeObjectURL(u));
    const ph = (await DB.by("photos", "job", jobId)).filter(p => p.role === "quote" && p.item === w.id).sort((a, b) => a.created - b.created);
    app.innerHTML = `
    <header class="top"><button aria-label="Back" id="qi_back">‹</button><h1>Item ${n}<span class="sub">${esc(job.site || "")}</span></h1>
      <button aria-label="Delete item" id="qi_del">🗑</button></header>
    <main>
      ${ls ? `<label>What is it?</label>
      <div class="chips" id="qi_kind">${Q_LS_KINDS.map(k => `<button class="chip ${w.kind === k[0] ? "on" : ""}" data-v="${esc(k[0])}">${esc(k[0])}</button>`).join("")}</div>` : ""}
      <label for="qi_what">${con ? "Tree / group / area" : ls ? "Where" : "Tree, hedge or area"}</label>
      <input id="qi_what" value="${esc(w.what || "")}" placeholder="${con ? "e.g. Oak by the gate, or the woodland strip" : ls ? "e.g. Rear patio, or the front boundary" : "e.g. T1 Sycamore, rear garden"}">
      ${ls ? (() => { const k = qKind(w), s = k ? k[2] : "";
        const f = (id, lab, v, step) => `<div><label for="qi_${id}">${lab}</label><input id="qi_${id}" type="number" min="0" step="${step}" inputmode="decimal" value="${esc(v || "")}"></div>`;
        if (!k) return `<p class="hint">Pick what it is to enter the measurements.</p>`;
        const cells = [];
        if (s !== "n") cells.push(f("length", "Length (m)", w.length, "0.1"));
        if (s === "lw" || s === "lwd") cells.push(f("width", "Width (m)", w.width, "0.1"));
        if (s === "lh") cells.push(f("depth", "Height (m)", w.depth, "0.1"));
        if (s === "lwd") cells.push(f("depth", k[1] === "bed" ? "Height (mm)" : "Depth (mm)", w.depth, "5"));
        if (s === "lw" || s === "lwd") cells.push(f("area", "or the area (m²)", w.area, "0.1"));
        cells.push(f("qty", s === "n" ? "Number" : "How many the same", w.qty, "1"));
        return `<h2>Measurements</h2><div class="grid2">${cells.join("")}</div>
          ${k[1] === "fence" ? `<label for="qi_fence">Fence type</label><select id="qi_fence"><option value="">–</option>${Q_FENCES.map(t => `<option ${w.fence === t ? "selected" : ""}>${esc(t)}</option>`).join("")}</select>` : ""}
          <p class="hint" id="qi_sum">${esc(qMeasure(w))}</p>
          <p class="hint">An awkward shape: measure it in pieces and add an item for each, or type the total area.</p>`; })() : ""}
      <label for="qi_works">${con ? "What's needed" : ls ? "What's wanted" : "Works"}</label>
      <textarea id="qi_works" rows="3" placeholder="${con ? "e.g. risk assessment, decay at the base" : ls ? "e.g. Lift the old flags; lay Indian sandstone with a soldier-course edge" : "e.g. Reduce the crown by 2 m all round; remove deadwood"}">${esc(w.works || "")}</textarea>
      <label for="qi_notes">Notes</label><textarea id="qi_notes" rows="2" placeholder="Access, size, anything for the quote">${esc(w.notes || "")}</textarea>
      ${con ? "" : `<label for="qi_price">Price £ (optional)</label><input id="qi_price" type="number" min="0" step="1" inputmode="decimal" value="${esc(w.price || "")}">`}
      <h2>Photos</h2>
      <div class="qthumbs">${ph.map(p => { const u = URL.createObjectURL(p.blob); urls.push(u);
        return `<button class="qthumb" data-ph="${p.id}"><img src="${u}" alt=""><span>${esc(p.caption || "")}</span></button>`; }).join("")}</div>
      <div class="row"><button class="btn small" id="qi_cam">📷 Photo</button><button class="btn small" id="qi_gal">From the gallery…</button></div>
    </main>
    <div class="bar"><button class="btn" id="qi_done">✓ Done</button><button class="btn primary" id="qi_next">＋ Next item ›</button></div>`;
    const keep = () => { w.what = $("#qi_what").value.trim(); w.works = $("#qi_works").value.trim(); w.notes = $("#qi_notes").value.trim();
      if ($("#qi_price")) w.price = $("#qi_price").value;
      if (ls) { for (const k of ["length", "width", "depth", "area", "qty"]) w[k] = $("#qi_" + k) ? $("#qi_" + k).value : "";
        w.fence = $("#qi_fence") ? $("#qi_fence").value : ""; } };
    if (ls) {
      $("#qi_kind").onclick = async e => { const b = e.target.closest(".chip"); if (!b) return; keep();
        if (w.kind !== b.dataset.v) { w.kind = b.dataset.v; w.depth = ""; }      // a depth in mm must not turn into a height in m
        job.updated = Date.now(); await DB.put("jobs", job); draw(); };
      app.querySelectorAll("#qi_length,#qi_width,#qi_depth,#qi_area,#qi_qty,#qi_fence").forEach(el => el.oninput = () => { keep(); $("#qi_sum").textContent = qMeasure(w); });
    }
    $("#qi_cam").onclick = () => { keep(); qAddPhotos(job, "#cam", w.id, draw); };
    $("#qi_gal").onclick = () => { keep(); qAddPhotos(job, "#gallery", w.id, draw); };
    app.querySelectorAll("[data-ph]").forEach(b => b.onclick = () => { keep(); qPhotoMenu(ph.find(p => p.id === b.dataset.ph), job, draw); });
    $("#qi_back").onclick = $("#qi_done").onclick = () => go("#/job/" + jobId);
    $("#qi_next").onclick = async () => { keep(); const nw = { id: uid().slice(0, 8), what: "", works: "" }; job.works.push(nw); await DB.put("jobs", job); leaveHook = null; go(`#/job/${jobId}/qitem/${nw.id}`); };
    $("#qi_del").onclick = async () => {
      if (!confirm(`Delete item ${n}${ph.length ? " and its photos" : ""}?`)) return;
      for (const p of ph) await DB.del("photos", p.id);
      job.works.splice(job.works.indexOf(w), 1); job.updated = Date.now(); await DB.put("jobs", job); leaveHook = null; go("#/job/" + jobId);
    };
    leaveHook = async () => { keep(); if (!w.what && !w.works && !w.kind && !ph.length) job.works.splice(job.works.indexOf(w), 1);
      job.updated = Date.now(); await DB.put("jobs", job); urls.forEach(u => URL.revokeObjectURL(u)); };
  };
  draw();
}

// ------------------------------------------------------------------ export
async function buildQuoteZip(jobId) {
  const job = qInit(await DB.get("jobs", jobId));
  const photos = (await DB.by("photos", "job", jobId)).filter(p => p.role === "quote").sort((a, b) => a.created - b.created);
  const zip = new JSZip(), used = new Set();
  const uniq = base => { let n = base, i = 2; while (used.has(n.toLowerCase())) n = `${base} (${i++})`; used.add(n.toLowerCase()); return n; };
  const num = id => job.works.findIndex(w => w.id === id) + 1;
  const out = photos.map((p, k) => {
    const f = `Photos/${uniq(safeName(p.item ? `Item ${num(p.item)}${p.caption ? " " + p.caption : ""}` : `Site ${k + 1}${p.caption ? " " + p.caption : ""}`))}.jpg`;
    zip.file(f, p.blob, { binary: true });
    return { file: f, caption: p.caption || "", item: p.item ? String(num(p.item)) : "", when: p.when || new Date(p.created).toISOString(), lat: p.lat, lon: p.lon, grid: p.grid };
  });
  const st = await settings();
  let quote = null;
  if (job.quote && job.quote.made) {
    const q = job.quote, rec = await DB.get("photos", "qq-" + job.id);
    quote = { ref: q.ref, date: q.date, net: q.net, vatRate: q.rate, vat: q.vatAmount, total: q.total, validDays: Math.round(qNum(q.valid)) || 30,
      itemised: !!q.itemised, lump: job.mode === "consultant" ? 0 : qNum(q.lump), notes: q.notes || "", changedSince: qqStale(job, qqSet(st)), file: "" };
    if (rec && rec.blob) { quote.file = qqFile(job); zip.file(quote.file, rec.blob, { binary: true }); }
  }
  zip.file("quote_visit.json", JSON.stringify({
    format: "quote-visit", version: 1, app: APP_VERSION, exported: new Date().toISOString(), id: job.id,
    job: { client: job.client, site: job.site, address: job.address, contact: job.contact, phone: job.phone, email: job.email || "", w3w: job.w3w,
      lat: job.lat, lon: job.lon, grid: job.grid, visitDate: job.visitDate, mode: job.mode, by: st.consultant || "",
      access: job.access, notes: job.notes, days: job.days, consultant: job.mode === "consultant" ? job.consultant : null },
    works: job.works.filter(w => w.what || w.works || w.kind).map(w => Object.assign({ id: w.id, what: w.what || (job.mode === "landscaper" ? w.kind || "" : ""), works: w.works, notes: w.notes || "", price: w.price || "" },
      job.mode === "landscaper" && qKind(w) ? { kind: w.kind, calc: qKind(w)[1], length: qNum(w.length), width: qNum(w.width), depth: qNum(w.depth), area: qNum(w.area),
        qty: qNum(w.qty), fence: w.fence || "", measure: qMeasure(w) } : {})),
    activities: job.activities, crew: job.crew, plant: job.plant, equipment: job.equipment, photos: out, quote,
  }, null, 1));
  const blob = await zip.generateAsync({ type: "blob", mimeType: "application/zip" });
  return { blob, fname: `${safeName(job.site || job.client)} quote visit ${job.visitDate || today()}.zip`, job, photos: out.length };
}

async function qExport(jobId) {
  toast("Preparing the visit…", 8000);
  let out;
  try { out = await buildQuoteZip(jobId); } catch (e) { console.error(e); toast("Couldn't export: " + e.message, 5000); return; }
  const file = new File([out.blob], out.fname, { type: "application/zip" });
  let shared = false;
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: out.fname, text: `Quote visit – ${out.job.site || out.job.client}: ${out.photos} photos` }); shared = true; }
    catch (e) { if (e.name === "AbortError") { toast("Not sent"); return; } }
  }
  if (!shared) {
    const a = document.createElement("a"); a.href = URL.createObjectURL(out.blob); a.download = out.fname;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
  }
  out.job.exported = Date.now(); out.job.updated = out.job.exported - 1; await DB.put("jobs", out.job);
  toast(shared ? "Visit sent" : `Saved ${out.fname} to Downloads – open it on the PC with Quote visits → Import from phone`, 5000);
  route();
}

// ------------------------------------------------------------------ quick quote: a short PDF made on the phone
/* A priced quotation to send from site: the items and prices (or one price for the job), VAT, the firm's standard wording,
   logo and contact details – all typed once in Settings → Quick quotes and kept on this device only. The PDF travels to the
   PC inside the visit's export, where the full quotation or fee proposal is drafted from the same figures. */
const QQ_WORDING = {
  contractor: ["Work to BS 3998:2010 Tree work – Recommendations, where it applies.",
    "Trees covered by a Tree Preservation Order or in a Conservation Area need the council's consent or notice before work starts.",
    "Work stops if an active bird's nest is found, and resumes when it is lawful."],
  landscaper: ["Sizes were measured on site and are approximate; the price is for the work described.",
    "Any extra work found to be needed once the job has started is agreed with you before it is done."],
  consultant: ["The fee covers the site visit and the report described above.",
    "Our full fee proposal and terms of business follow by email."],
};
function qqSet(st) {   // the firm's own details for quick quotes, with the defaults filled in
  const q = Object.assign({ name: "", phone: "", email: "", web: "", footer: "", vatReg: true, vatRate: 20, validDays: 30, logo: null }, st.quote || {});
  q.wording = Object.assign({}, QQ_WORDING, q.wording || {});
  return q;
}
const qqMoney = v => "£" + (Math.round(v * 100) / 100).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const qqItems = job => job.works.filter(w => w.what || w.works || w.kind);
function qqRef(job, date) {   // the same form as the PC's quotation reference: Q-yymmdd-ABC
  const d = (date || today()).replace(/-/g, "").slice(2);
  return `Q-${d}-${((job.client || "X").toUpperCase().replace(/[^A-Z]/g, "") || "X").slice(0, 3)}`;
}
function qqTotals(job, qs) {
  const q = job.quote || {}, con = job.mode === "consultant", items = qqItems(job);
  const lump = qNum(con ? job.consultant.fee : q.lump);
  const sum = items.reduce((a, w) => a + qNum(w.price), 0);
  const unpriced = items.filter(w => !qNum(w.price)).length;
  const net = Math.round((lump || (con ? 0 : sum)) * 100) / 100;
  const rate = q.vat ? qNum(qs.vatRate) : 0;
  const vat = Math.round(net * rate) / 100;
  return { net, rate, vat, total: Math.round((net + vat) * 100) / 100, itemised: !lump && !con && items.length > 0 && !unpriced,
    lump: !!lump, ready: net > 0 && (!!lump || (!con && items.length > 0 && !unpriced)), unpriced };
}
// the standard PDF fonts only hold Western European characters: swap what they can't show
const qqText = s => String(s == null ? "" : s).replace(/[‘’′]/g, "'").replace(/[“”″]/g, '"').replace(/[–—−]/g, "-")
  .replace(/…/g, "...").replace(/ /g, " ").replace(/[•●]/g, "-").replace(/≥/g, ">=").replace(/≤/g, "<=")
  .replace(/[^\x09\x0A\x20-\x7E¡-ÿ]/g, "");
const qqDataUrl = blob => new Promise((ok, bad) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = () => bad(r.error); r.readAsDataURL(blob); });
async function qqLogoFrom(file) {   // a logo for the letterhead: on white (PDFs have no see-through JPEGs), 700 px at most
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, 700 / Math.max(bmp.width, bmp.height)), c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(bmp.width * k)); c.height = Math.max(1, Math.round(bmp.height * k));
  const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); g.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close && bmp.close();
  return { url: c.toDataURL("image/jpeg", 0.9), w: c.width, h: c.height };
}

async function qqPDF(job, qs, photos) {
  await rnScript("lib/jspdf.umd.min.js");
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const q = job.quote, t = qqTotals(job, qs), con = job.mode === "consultant", items = qqItems(job);
  const L = 18, R = 192, W = R - L, BOTTOM = 272;
  let y = 16;
  const font = (size, bold, grey) => { doc.setFont("helvetica", bold ? "bold" : "normal"); doc.setFontSize(size); doc.setTextColor(grey ? 95 : 20); };
  const room = h => { if (y + h > BOTTOM) { doc.addPage(); y = 20; } };
  const para = (text, size = 10, gap = 4.6, x = L, w = W, bold = false) => {
    font(size, bold);
    for (const line of doc.splitTextToSize(qqText(text), w)) { room(gap); doc.text(line, x, y); y += gap; }
  };
  const head = text => { y += 3; room(12); font(11.5, true); doc.text(qqText(text), L, y); y += 6; };
  // letterhead: logo on the left, the firm's name and contact details on the right
  let top = y;
  if (qs.logo && qs.logo.url) {
    const k = Math.min(58 / qs.logo.w, 24 / qs.logo.h), w = qs.logo.w * k, h = qs.logo.h * k;
    try { doc.addImage(qs.logo.url, "JPEG", L, y - 4, w, h); top = y - 4 + h; } catch (e) { console.warn(e); }
  }
  let ry = y;
  if (qs.name) { font(13, true); doc.text(qqText(qs.name), R, ry, { align: "right" }); ry += 6; }
  font(9.5, false, true);
  for (const line of [qs.phone, qs.email, qs.web].filter(Boolean)) { doc.text(qqText(line), R, ry, { align: "right" }); ry += 4.6; }
  y = Math.max(top, ry) + 6;
  doc.setDrawColor(190); doc.setLineWidth(0.3); doc.line(L, y, R, y); y += 10;
  font(17, true); doc.text(con ? "Fee quotation" : "Quotation", L, y); y += 9;
  // who and where, with the reference and date alongside
  const d = q.date || today();
  const who = job.contact && job.client && job.client.toLowerCase().includes(job.contact.toLowerCase()) ? job.client : [job.contact, job.client].filter(Boolean).join(", ");
  const left = [["To", who], ["Site", [job.site, job.address].filter(Boolean).join(", ")]].filter(r => r[1]);
  const right = [["Reference", q.ref], ["Date", ukDate(d)], ["Valid for", `${Math.round(qNum(q.valid) || qs.validDays || 30)} days`]];
  const y0 = y; let yl = y0, yr = y0;
  for (const [k, v] of left) {
    font(9.5, true); doc.text(k, L, yl);
    font(9.5); const ls = doc.splitTextToSize(qqText(v), 92); doc.text(ls, L + 14, yl); yl += ls.length * 4.6 + 1.6;
  }
  for (const [k, v] of right) { font(9.5, true); doc.text(k, 132, yr); font(9.5); doc.text(qqText(v), 154, yr); yr += 6.2; }
  y = Math.max(yl, yr) + 5;
  // the items
  const desc = w => [w.what && w.kind && w.what !== w.kind ? `${w.kind} - ${w.what}` : (w.what || w.kind || ""), qMeasure(w), w.works].filter(Boolean);
  const cols = t.itemised ? [L, L + 10, R - 30] : [L, L + 10, R];
  const dw = cols[2] - cols[1] - 3;
  head(con ? "The survey" : job.mode === "landscaper" ? "The work" : "Works");
  if (con && job.consultant.survey.length) { para(job.consultant.survey.join(", ") + ".", 10, 4.8); y += 3; }
  if (items.length) {
    font(9, true, true); room(8);
    doc.text("Item", cols[0], y); doc.text(con ? "Tree, group or area" : "Description", cols[1], y);
    if (t.itemised) doc.text("Price", R, y, { align: "right" });
    y += 2; doc.setDrawColor(150); doc.line(L, y, R, y); y += 5;
    items.forEach((w, i) => {
      const parts = desc(w), lines = [];
      parts.forEach((p, k) => doc.splitTextToSize(qqText(p), dw).forEach(s => lines.push([s, k === 0])));
      room(Math.min(lines.length, 6) * 4.6 + 3);
      font(10); doc.text(String(i + 1), cols[0], y);
      if (t.itemised) doc.text(qqMoney(qNum(w.price)), R, y, { align: "right" });
      for (const [s, first] of lines) { room(4.6); font(10, first); doc.text(s, cols[1], y); y += 4.6; }
      y += 1.2; doc.setDrawColor(215); doc.line(L, y - 3, R, y - 3); y += 2;
    });
  }
  // the price
  y += 2; room(26);
  const rows = t.rate ? [[con ? "Fee (ex VAT)" : "Price (ex VAT)", qqMoney(t.net)], [`VAT (${t.rate}%)`, qqMoney(t.vat)], ["Total", qqMoney(t.total)]]
    : [[con ? "Fee" : "Price", qqMoney(t.net)]];
  rows.forEach(([k, v], i) => { const last = i === rows.length - 1; font(last ? 11.5 : 10, last);
    doc.text(k, R - 62, y); doc.text(v, R, y, { align: "right" }); y += last ? 7 : 5.6; });
  if (!t.rate && q.noVatNote) para(q.noVatNote, 9, 4.4);
  // wording, notes, acceptance
  const words = (qs.wording[job.mode] || []).map(s => String(s).trim()).filter(Boolean);
  if (words.length) {
    head("Please note");
    for (const s of words) { room(5); font(10); doc.text("-", L, y); para(s, 10, 4.8, L + 4, W - 4); y += 1; }
  }
  if ((q.notes || "").trim()) { head("Notes"); q.notes.trim().split(/\n+/).forEach(s => { para(s, 10, 4.8); y += 1.2; }); }
  head("Acceptance");
  para(`To accept this quotation, reply to ${[qs.email, qs.phone].filter(Boolean).join(" or ") || "us"} quoting ${q.ref}, or sign below.`, 10, 4.8);
  y += 10; room(14); doc.setDrawColor(120);
  doc.line(L, y, L + 70, y); doc.line(L + 85, y, L + 125, y);
  font(8.5, false, true); doc.text("Signed for the client", L, y + 4); doc.text("Date", L + 85, y + 4); y += 10;
  // photos, four to a page
  const CW = 84, CH = 96, GX = 6, CAP = 14;
  (photos || []).forEach((p, i) => {
    const k = i % 4;
    if (k === 0) { doc.addPage(); font(11.5, true); doc.text("Photographs from the site visit", L, 20); }
    const cx = L + (k % 2) * (CW + GX), cy = 26 + Math.floor(k / 2) * (CH + CAP + 6);
    const r = Math.min(CW / p.w, CH / p.h), w = p.w * r, h = p.h * r;
    doc.addImage(p.url, "JPEG", cx + (CW - w) / 2, cy + (CH - h) / 2, w, h);
    font(9); doc.text(doc.splitTextToSize(qqText(p.cap), CW).slice(0, 2), cx, cy + CH + 5);
  });
  // the footer on every page: the firm's own registered / legal line, and the page number
  const n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i); font(8, false, true);
    const f = doc.splitTextToSize(qqText(qs.footer || ""), W - 20).slice(0, 3);
    if (f.length && f[0]) doc.text(f, 105, 284, { align: "center" });
    doc.text(`${q.ref} - page ${i} of ${n}`, R, 292, { align: "right" });
  }
  return doc.output("blob");
}

async function qqPhotos(job) {   // up to eight of the visit's photos, as the PDF needs them
  const ph = (await DB.by("photos", "job", job.id)).filter(p => p.role === "quote").sort((a, b) => a.created - b.created).slice(0, 8);
  const num = id => job.works.findIndex(w => w.id === id) + 1, out = [];
  for (const p of ph) {
    try {
      const bmp = await createImageBitmap(p.blob), k = Math.min(1, 1200 / Math.max(bmp.width, bmp.height)), c = document.createElement("canvas");
      c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k); c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
      bmp.close && bmp.close();
      out.push({ url: c.toDataURL("image/jpeg", 0.8), w: c.width, h: c.height, cap: [p.item && num(p.item) ? `Item ${num(p.item)}` : "", p.caption].filter(Boolean).join(" - ") });
    } catch (e) { console.warn("photo left out of the quote", e); }
  }
  return out;
}
const qqFile = job => `Quick quote ${safeName(job.quote.ref)}.pdf`;
async function qqShare(blob, fname, text) {   // → true when it went to the share sheet, false when it was saved to Downloads
  const file = new File([blob], fname, { type: "application/pdf" });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: fname, text }); return true; }
    catch (e) { if (e.name === "AbortError") return null; }
  }
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = fname;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
  return false;
}

async function quickQuotePage(jobId) {
  const job = await DB.get("jobs", jobId); if (!job || !isQuote(job)) return go("#/");
  qInit(job);
  const st = await settings(), qs = qqSet(st), con = job.mode === "consultant", ls = job.mode === "landscaper";
  const q = job.quote = Object.assign({ vat: !!qs.vatReg, valid: qs.validDays, lump: "", notes: "", photos: false }, job.quote || {});
  const items = qqItems(job);
  const save = async () => { job.updated = Date.now(); await DB.put("jobs", job); };
  const sums = () => {
    const t = qqTotals(job, qs);
    $("#qq_sum").innerHTML = t.net ? `${con ? "Fee" : "Price"} ${qqMoney(t.net)}${t.rate ? ` + VAT ${qqMoney(t.vat)} = <b>${qqMoney(t.total)}</b>` : ""}` : "No price yet.";
    $("#qq_why").textContent = t.ready ? "" : con ? "Type the fee." : !items.length ? "Type one price for the whole job (or go back and add the works items)."
      : `Price ${t.unpriced === items.length ? "the items" : `the other ${t.unpriced} item${t.unpriced === 1 ? "" : "s"}`}, or type one price for the whole job.`;
    $("#qq_make").disabled = !t.ready;
  };
  const sentLine = () => q.made ? `Last made ${new Date(q.made).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}: ${esc(q.ref)} for ${qqMoney(q.total)}.` : "";
  app.innerHTML = `
  <header class="top"><button aria-label="Back" onclick="go('#/job/${jobId}')">‹</button><h1>Quick quote<span class="sub">${esc(job.site || job.client || "")}</span></h1></header>
  <main>
    ${qs.name ? "" : `<p class="hint"><b class="no">Your business details aren't set yet.</b> Add your name, phone, email and logo once in <a href="#/settings">⚙ Settings → Quick quotes</a> – they go at the top of every quote.</p>`}
    <p class="hint">A short priced quotation as a PDF, to send before you leave site. It goes to the PC with the visit's export, where the full ${con ? "fee proposal" : "quotation"} is drafted from the same figures.</p>
    <div class="grid2">
      <div><label for="qq_ref">Reference</label><input id="qq_ref" value="${esc(q.ref || qqRef(job))}" autocapitalize="characters" autocomplete="off"></div>
      <div><label for="qq_valid">Valid for (days)</label><input id="qq_valid" type="number" min="1" step="1" inputmode="numeric" value="${esc(q.valid || qs.validDays)}"></div>
    </div>
    ${con ? `<h2>The fee</h2>
      <p class="hint">${esc(job.consultant.survey.join(", ") || "Tick the kind of survey on the visit page.")}${items.length ? ` · ${items.length} tree${items.length === 1 ? "" : "s"} or area${items.length === 1 ? "" : "s"} listed` : ""}</p>
      <label for="qq_lump">Fee £ (before VAT)</label><input id="qq_lump" type="number" min="0" step="1" inputmode="decimal" value="${esc(job.consultant.fee || "")}">`
    : `<h2>Prices</h2>
      ${items.map((w, i) => `<div class="qqrow"><label for="qq_p${i}">${i + 1}. ${esc(w.what || w.kind || "Item")}${w.works ? `<span>${esc(w.works)}</span>` : ""}</label>
        <input id="qq_p${i}" data-i="${i}" type="number" min="0" step="1" inputmode="decimal" placeholder="£" value="${esc(w.price || "")}"></div>`).join("") || `<p class="hint">No ${ls ? "areas or features" : "works items"} on this visit yet.</p>`}
      <label for="qq_lump">${items.length ? "Or one price for the whole job £" : "Price for the job £"} (before VAT)</label>
      <input id="qq_lump" type="number" min="0" step="1" inputmode="decimal" value="${esc(q.lump || "")}">
      ${items.length ? `<p class="hint">With one price for the job, the items are listed without their own prices.</p>` : ""}`}
    <label class="check"><input type="checkbox" id="qq_vat" ${q.vat ? "checked" : ""}> Add VAT at ${esc(qs.vatRate)}%</label>
    <p class="hint" id="qq_sum" style="font-size:16px"></p>
    <label for="qq_notes">Notes for the client (optional)</label>
    <textarea id="qq_notes" rows="3" placeholder="e.g. Earliest start the week of 7 December. Access needed through the side gate.">${esc(q.notes || "")}</textarea>
    <label class="check"><input type="checkbox" id="qq_photos" ${q.photos ? "checked" : ""}> Add the visit's photos (the first 8)</label>
    <p class="hint">The standard wording under the price comes from ⚙ Settings → Quick quotes.</p>
    <p class="hint" id="qq_sent">${sentLine()}</p>
    <p class="hint no" id="qq_why"></p>
  </main>
  <div class="bar">${q.made ? `<button class="btn" id="qq_again">Send the last one again</button>` : ""}<button class="btn primary" id="qq_make">Make the PDF ›</button></div>`;
  const keep = () => {
    q.ref = $("#qq_ref").value.trim() || qqRef(job); q.valid = $("#qq_valid").value; q.vat = $("#qq_vat").checked;
    q.notes = $("#qq_notes").value; q.photos = $("#qq_photos").checked;
    if (con) job.consultant.fee = $("#qq_lump").value; else q.lump = $("#qq_lump").value;
    app.querySelectorAll("[data-i]").forEach(el => { items[+el.dataset.i].price = el.value; });
  };
  app.querySelectorAll("main input, main textarea").forEach(el => el.oninput = el.onchange = () => { keep(); sums(); save(); });
  sums();
  leaveHook = async () => { if ($("#qq_ref")) keep(); await DB.put("jobs", job); };
  $("#qq_make").onclick = async () => {
    keep();
    const t = qqTotals(job, qs); if (!t.ready) return;
    toast("Making the quote…", 8000);
    try {
      q.date = today();
      const blob = await qqPDF(job, qs, q.photos ? await qqPhotos(job) : []);
      await DB.put("photos", { id: "qq-" + job.id, jobId: job.id, role: "quotepdf", blob, created: Date.now() });
      Object.assign(q, { made: Date.now(), net: t.net, rate: t.rate, vatAmount: t.vat, total: t.total, itemised: t.itemised });
      await save();
      const how = await qqShare(blob, qqFile(job), `${con ? "Fee quotation" : "Quotation"} ${q.ref} – ${job.site || job.client}: ${qqMoney(t.total)}`);
      toast(how === null ? "Quote made – not sent yet" : how ? "Quote sent" : `Saved ${qqFile(job)} to Downloads`, 4000);
      leaveHook = null; go("#/job/" + jobId);
    } catch (e) { console.error(e); toast("Couldn't make the quote: " + e.message, 6000); }
  };
  if ($("#qq_again")) $("#qq_again").onclick = async () => {
    const rec = await DB.get("photos", "qq-" + job.id);
    if (!rec) { toast("The last quote isn't on this device any more – make it again"); return; }
    await qqShare(rec.blob, qqFile(job), `Quotation ${q.ref} – ${job.site || job.client}: ${qqMoney(q.total)}`);
  };
}
// has anything on the visit changed the price since the quick quote was made?
function qqStale(job, qs) { const q = job.quote; if (!q || !q.made) return false; const t = qqTotals(job, qs); return Math.abs(t.total - q.total) > 0.005; }

// ---- Settings → Quick quotes (the firm's own details, kept on this device)
function qqSettingsHtml(st) {
  const q = qqSet(st);
  const box = (k, lab, ph = "", type = "text") => `<label for="qq_s_${k}">${lab}</label><input id="qq_s_${k}" type="${type}" value="${esc(q[k] || "")}" placeholder="${esc(ph)}" autocomplete="off">`;
  const area = (k, lab) => `<label for="qq_w_${k}">${lab} (one point per line)</label><textarea id="qq_w_${k}" rows="4">${esc((q.wording[k] || []).join("\n"))}</textarea>`;
  return `<h2>Quick quotes</h2>
    <p class="hint">Your own details for the quote PDFs made from a quote visit. They stay on this device – type them on each phone or tablet that sends quotes.</p>
    ${box("name", "Business name")}${box("phone", "Phone", "", "tel")}${box("email", "Email", "", "email")}${box("web", "Website")}
    <label for="qq_s_footer">Footer line</label><textarea id="qq_s_footer" rows="3" placeholder="e.g. your registered name and office, company number, VAT number">${esc(q.footer || "")}</textarea>
    <label>Logo</label>
    <div class="row"><img id="qq_s_logo" alt="" style="max-height:56px;max-width:160px;background:#fff;border:1px solid var(--line);border-radius:6px" ${q.logo && q.logo.url ? `src="${q.logo.url}"` : "hidden"}>
      <button class="btn small" id="qq_s_pick">Choose a logo…</button><button class="btn small" id="qq_s_nologo" ${q.logo && q.logo.url ? "" : "hidden"}>Remove</button></div>
    <label class="check"><input type="checkbox" id="qq_s_vatReg" ${q.vatReg ? "checked" : ""}> VAT registered – add VAT to quotes</label>
    <div class="grid2"><div>${box("vatRate", "VAT rate (%)", "", "number")}</div><div>${box("validDays", "Quotes valid for (days)", "", "number")}</div></div>
    ${area("contractor", "Wording under the price – tree work")}${area("landscaper", "Wording under the price – landscaping")}${area("consultant", "Wording under the price – surveys and reports")}`;
}
function qqSettingsBind(st) {
  let logo = qqSet(st).logo;
  const show = () => { const im = $("#qq_s_logo"); if (logo && logo.url) { im.src = logo.url; im.hidden = false; } else im.hidden = true; $("#qq_s_nologo").hidden = !(logo && logo.url); };
  $("#qq_s_pick").onclick = () => pickFiles("#gallery", async files => {
    if (!files[0]) return;
    try { logo = await qqLogoFrom(files[0]); show(); } catch (e) { toast("That picture couldn't be read – try a PNG or JPEG"); }
  });
  $("#qq_s_nologo").onclick = () => { logo = null; show(); };
  return () => {   // called by Save
    const lines = k => $("#qq_w_" + k).value.split("\n").map(x => x.trim()).filter(Boolean);
    st.quote = { name: $("#qq_s_name").value.trim(), phone: $("#qq_s_phone").value.trim(), email: $("#qq_s_email").value.trim(), web: $("#qq_s_web").value.trim(),
      footer: $("#qq_s_footer").value.trim(), vatReg: $("#qq_s_vatReg").checked, vatRate: qNum($("#qq_s_vatRate").value) || 20,
      validDays: Math.round(qNum($("#qq_s_validDays").value)) || 30, logo,
      wording: { contractor: lines("contractor"), landscaper: lines("landscaper"), consultant: lines("consultant") } };
  };
}
