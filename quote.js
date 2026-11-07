// Tree Survey – © 2026 Mark Johnson. All rights reserved. Use only under a written licence from the owner.
/* Quote visits – the site visit before a quote, for consultants and tree surgery contractors.
   Photos with captions (for the site or for one item), the works items (tree / hedge / area and the works),
   access and constraints, and either the survey scope (consultant) or the crew, plant and equipment the job needs
   (contractor – lists from resources.js). Export makes a zip for the PC: Quote visits → Import from phone. */

const Q_ACCESS = ["Narrow side access", "No vehicle access to the tree", "Access through the house", "Overhead lines",
  "Over a road or footpath", "Over a building / conservatory", "Parked cars to move", "Neighbour's garden needed",
  "Underground services", "Steep or soft ground", "Public access – barriers needed", "Water or pond nearby",
  "Protected tree (TPO / CA) – check", "Nesting birds – check", "Possible bat roost", "Take the arisings away",
  "Leave logs on site", "Livestock"];
const Q_SURVEY = ["AMR / tree risk survey", "BS 5837 survey", "TPO / CA application", "Mortgage report", "Subsidence report",
  "Roadside / PROW survey", "Aerial inspection (drone)", "Bat scoping", "Nesting bird check"];
const Q_CKIT = ["Drone", "Ladder", "Binoculars", "Resistance drill", "Sonic tomography", "Endoscope", "Laser rangefinder",
  "MEWP needed", "Climbing inspection"];

const isQuote = j => !!j && j.type === "QUOTE";
function qInit(job) {
  for (const k of ["access", "activities", "plant", "equipment", "works"]) job[k] = job[k] || [];
  job.crew = job.crew || [];
  job.consultant = job.consultant || { survey: [], trees: "", hours: "", kit: [] };
  return job;
}
function quoteCard(j) {
  return `<a class="card job" href="#/job/${j.id}">
    <h3>${esc(j.site || "Untitled site")}</h3>
    <div class="meta"><span class="badge quote">Quote visit</span> ${esc(j.client || "")} · ${ukDate(j.visitDate)} ·
      ${j.mode === "consultant" ? "survey" : "tree work"}</div>
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
    <div class="chips" id="qmode">${[["contractor", "Tree work (contractor)"], ["consultant", "A survey / report (consultant)"]].map(([v, t]) =>
      `<button class="chip ${job.mode === v ? "on" : ""}" data-v="${v}">${t}</button>`).join("")}</div>
    <label for="q_client">Client</label><input id="q_client" value="${esc(job.client || "")}" autocomplete="off">
    <label for="q_site">Site</label><input id="q_site" value="${esc(job.site || "")}" placeholder="e.g. 12 Oak Lane – rear garden">
    <label for="q_address">Address</label><textarea id="q_address" rows="2">${esc(job.address || "")}</textarea>
    <div class="grid2">
      <div><label for="q_contact">Contact</label><input id="q_contact" value="${esc(job.contact || "")}"></div>
      <div><label for="q_phone">Phone</label><input id="q_phone" type="tel" value="${esc(job.phone || "")}"></div>
    </div>
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
    for (const k of ["client", "site", "address", "contact", "phone", "w3w"]) job[k] = $("#q_" + k).value.trim();
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
  const con = job.mode === "consultant";
  const urls = [];
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
      <div class="row"><button class="btn green" id="q_export">⇪ Export to the PC</button></div>
      <h2>Photos</h2>
      <div class="qthumbs">${ph.filter(p => !p.item).map(thumb).join("")}</div>
      <div class="row"><button class="btn small" id="q_cam">📷 Photo</button><button class="btn small" id="q_gal">From the gallery…</button></div>
      <p class="hint">Tap a photo to add a caption or delete it. Photos of one tree go on its item below.</p>
      <h2>${con ? "Trees and areas" : "Works"}</h2>
      ${job.works.map((w, i) => `<a class="card job" href="#/job/${job.id}/qitem/${w.id}"><h3>${i + 1}. ${esc(w.what || "Item")}</h3>
        <div class="meta">${esc(w.works || "")}${w.price ? ` · £${esc(w.price)}` : ""} · 📷 ${ph.filter(p => p.item === w.id).length}</div></a>`).join("")}
      <button class="btn small" id="q_item">＋ ${con ? "Tree or area" : "Works item"}</button>
      <h2>Access and constraints</h2>
      <div class="chips" id="q_access">${[...new Set(Q_ACCESS.concat(job.access))].map(a =>
        `<button class="chip ${job.access.includes(a) ? "on" : ""}" data-v="${esc(a)}">${esc(a)}</button>`).join("")}
        <button class="chip" id="q_access_add">＋ Other…</button></div>
      ${con ? `
      <h2>Survey</h2>
      <div class="chips" id="q_survey">${Q_SURVEY.map(s => `<button class="chip ${job.consultant.survey.includes(s) ? "on" : ""}" data-v="${esc(s)}">${esc(s)}</button>`).join("")}</div>
      <div class="grid2">
        <div><label for="q_trees">Trees (estimate)</label><input id="q_trees" type="number" min="0" inputmode="numeric" value="${esc(job.consultant.trees || "")}"></div>
        <div><label for="q_hours">Time on site (hours)</label><input id="q_hours" type="number" min="0" step="0.5" inputmode="decimal" value="${esc(job.consultant.hours || "")}"></div>
      </div>
      <label>Equipment</label>
      <div class="chips" id="q_ckit">${Q_CKIT.map(s => `<button class="chip ${job.consultant.kit.includes(s) ? "on" : ""}" data-v="${esc(s)}">${esc(s)}</button>`).join("")}</div>`
      : `
      <h2>The work</h2>
      <p class="hint">Tick each kind of work – the usual crew, plant and kit are ticked for you. Change anything.</p>
      <div class="chips" id="q_work">${RESOURCES.works.map(w => `<button class="chip ${job.activities.includes(w.key) ? "on" : ""}" data-v="${w.key}">${esc(w.name)}</button>`).join("")}</div>
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
      for (const k of ["trees", "hours"]) $("#q_" + k).oninput = e => { job.consultant[k] = e.target.value; save(); };
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
  const con = job.mode === "consultant", n = job.works.indexOf(w) + 1;
  const urls = [];
  const draw = async () => {
    urls.splice(0).forEach(u => URL.revokeObjectURL(u));
    const ph = (await DB.by("photos", "job", jobId)).filter(p => p.role === "quote" && p.item === w.id).sort((a, b) => a.created - b.created);
    app.innerHTML = `
    <header class="top"><button aria-label="Back" id="qi_back">‹</button><h1>Item ${n}<span class="sub">${esc(job.site || "")}</span></h1>
      <button aria-label="Delete item" id="qi_del">🗑</button></header>
    <main>
      <label for="qi_what">${con ? "Tree / group / area" : "Tree, hedge or area"}</label>
      <input id="qi_what" value="${esc(w.what || "")}" placeholder="${con ? "e.g. Oak by the gate, or the woodland strip" : "e.g. T1 Sycamore, rear garden"}">
      <label for="qi_works">${con ? "What's needed" : "Works"}</label>
      <textarea id="qi_works" rows="3" placeholder="${con ? "e.g. risk assessment, decay at the base" : "e.g. Reduce the crown by 2 m all round; remove deadwood"}">${esc(w.works || "")}</textarea>
      <label for="qi_notes">Notes</label><textarea id="qi_notes" rows="2" placeholder="Access, size, anything for the quote">${esc(w.notes || "")}</textarea>
      ${con ? "" : `<label for="qi_price">Price £ (optional)</label><input id="qi_price" type="number" min="0" step="1" inputmode="decimal" value="${esc(w.price || "")}">`}
      <h2>Photos</h2>
      <div class="qthumbs">${ph.map(p => { const u = URL.createObjectURL(p.blob); urls.push(u);
        return `<button class="qthumb" data-ph="${p.id}"><img src="${u}" alt=""><span>${esc(p.caption || "")}</span></button>`; }).join("")}</div>
      <div class="row"><button class="btn small" id="qi_cam">📷 Photo</button><button class="btn small" id="qi_gal">From the gallery…</button></div>
    </main>
    <div class="bar"><button class="btn" id="qi_done">✓ Done</button><button class="btn primary" id="qi_next">＋ Next item ›</button></div>`;
    const keep = () => { w.what = $("#qi_what").value.trim(); w.works = $("#qi_works").value.trim(); w.notes = $("#qi_notes").value.trim();
      if ($("#qi_price")) w.price = $("#qi_price").value; };
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
    leaveHook = async () => { keep(); if (!w.what && !w.works && !ph.length) job.works.splice(job.works.indexOf(w), 1);
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
  zip.file("quote_visit.json", JSON.stringify({
    format: "quote-visit", version: 1, app: APP_VERSION, exported: new Date().toISOString(), id: job.id,
    job: { client: job.client, site: job.site, address: job.address, contact: job.contact, phone: job.phone, w3w: job.w3w,
      lat: job.lat, lon: job.lon, grid: job.grid, visitDate: job.visitDate, mode: job.mode, by: st.consultant || "",
      access: job.access, notes: job.notes, days: job.days, consultant: job.mode === "consultant" ? job.consultant : null },
    works: job.works.filter(w => w.what || w.works).map(w => ({ id: w.id, what: w.what, works: w.works, notes: w.notes || "", price: w.price || "" })),
    activities: job.activities, crew: job.crew, plant: job.plant, equipment: job.equipment, photos: out,
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
