// Tree Survey – © 2026 Mark Johnson. All rights reserved. Use only under a written licence from the owner.
/* Works packs – the contractor's side.
   A works pack (zip made by the PC's Works packs window) holds one works order: site, access, dates, the works
   items with their constraints, keep-out zones, plans and the RAMS. It never holds fees, invoices or other jobs.
   On site the contractor reads and signs the RAMS, signs in and out (a text or WhatsApp to whoever issued the
   works), does the site safety check, marks each item done / part done / not done with before and after photos,
   signs off and sends the return zip back. The PC turns the return into a work completion report.
   Part-way through, "Send a progress update" sends the same zip marked as progress (with or without the photos so
   far): the PC files it and updates the works tracker for the contract manager, but makes no completion report.
   Stored as a job of type "WORKS": job.pack (the order), job.wk (progress), job.safety (site checks);
   documents and photos live in the photos store (role "doc", "wbefore", "wafter", "wextra"). */
"use strict";

const W_STATUS = [["", "Not started"], ["started", "In progress"], ["done", "Done"], ["part", "Part done"], ["notdone", "Not done"]];
const W_STATUS_TEXT = Object.fromEntries(W_STATUS);
const W_COL = { done: "#2F8A3B", part: "#E8A200", notdone: "#C8102E", started: "#1F6FB2", "": "#E07000" };
const ZONE_COL = { nest: "#C8102E", eco: "#7A1FA2", invasive: "#1F6FB2" };
const W_ROLES = ["Supervisor", "Climber", "Groundworker", "Chipper operator", "Stump grinder", "Banksman / traffic", "Other"];
const ARISINGS = ["Chipped and left on site", "Chips removed from site", "Logs stacked on site", "All removed from site", "As instructed"];

const isWorks = j => !!j && j.type === "WORKS";
function wk(job) {
  job.wk = job.wk || {};
  for (const [k, v] of [["signins", []], ["briefing", []], ["items", {}], ["completion", {}]]) if (!job.wk[k]) job.wk[k] = v;
  return job.wk;
}
const wItems = job => (job.pack && job.pack.items) || [];
const wState = (job, id) => (wk(job).items[id] = wk(job).items[id] || {});
const onSite = job => { const s = wk(job).signins; return s.length && s[s.length - 1].kind === "in" ? s[s.length - 1] : null; };
const t5 = d => new Date(d).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
const dt5 = d => new Date(d).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" });
const isoFromUk = s => { const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(String(s || "").trim()); return m ? `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}` : ""; };
function wCounts(job) {
  const c = { done: 0, part: 0, notdone: 0, started: 0, "": 0 };
  for (const it of wItems(job)) c[wState(job, it.id).status || ""]++;
  return c;
}
const contactName = job => (job.pack && job.pack.contact && job.pack.contact.name) || "the office";
const wSummary = c => `${c.done} done${c.started ? `, ${c.started} in progress` : ""}${c.part ? `, ${c.part} part done` : ""}${c.notdone ? `, ${c.notdone} not done` : ""}`;

function sendTo(contact, text) {
  const ph = contact && contact.phone;
  if (!ph) { toast("No phone number in the works pack – tell them by phone"); return false; }
  location.href = contact.via === "sms" ? `sms:${ph.replace(/\s/g, "")}?body=${encodeURIComponent(text)}`
    : `https://wa.me/${intlPhone(ph)}?text=${encodeURIComponent(text)}`;
  return true;
}

function quickFix(ms = 15000) {  // one position, or null – never holds things up for long
  return new Promise(res => {
    if (!("geolocation" in navigator)) return res(null);
    navigator.geolocation.getCurrentPosition(p => res(p.coords), () => res(null), { enableHighAccuracy: true, timeout: ms, maximumAge: 60000 });
  });
}
const fixRec = c => c ? { lat: +c.latitude.toFixed(6), lon: +c.longitude.toFixed(6), acc: Math.round(c.accuracy), grid: OSGB.fromLatLon(c.latitude, c.longitude).ref } : {};

async function workerName(job) {
  const s = await settings();
  let n = s.consultant || (wk(job).worker || "");
  if (!n) {
    n = (prompt("Your name (for the sign-in record)") || "").trim();
    if (!n) return "";
    s.consultant = n; await DB.put("settings", s);
  }
  return n;
}

// ------------------------------------------------------------------ open a pack (from importZip)
async function importWorksPack(zip, d) {
  const p = d.pack || {};
  if (!p.id || !Array.isArray(p.items)) throw new Error("This works pack is incomplete.");
  const existing = await DB.get("jobs", p.id);
  if (existing && !confirm(`Works order ${p.ref} is already on this phone. Update it from this pack?\n\nYour signatures, photos and ticks are kept.`)) return;
  const plans = [];
  for (const pl of p.plans || []) {
    const f = pl.file && zip.file(pl.file); if (!f) continue;
    const o = Object.assign({}, pl, { blob: new Blob([await f.async("arraybuffer")], { type: "image/jpeg" }) }); delete o.file; plans.push(o);
  }
  for (const old of await DB.by("photos", "job", p.id)) if (old.role === "doc") await DB.del("photos", old.id);
  for (const doc of p.docs || []) {
    const f = doc.file && zip.file(doc.file); if (!f) continue;
    await DB.put("photos", { id: "doc-" + p.id + "-" + doc.file, jobId: p.id, role: "doc", name: doc.name, kind: doc.kind, file: doc.file,
      blob: new Blob([await f.async("arraybuffer")], { type: doc.type === "pdf" ? "application/pdf" : "application/octet-stream" }), created: Date.now() });
  }
  const job = existing || { id: p.id, type: "WORKS", created: Date.now(), safety: [], wk: {} };
  const pack = Object.assign({}, p); delete pack.plans;
  Object.assign(job, { type: "WORKS", site: p.site, address: p.address, client: p.client || "", surveyDate: isoFromUk(p.start) || today(),
    pack, plans, layers: [] });
  wk(job);
  usePlan(job, p.planId && plans.some(x => x.id === p.planId) ? p.planId : plans[0] ? plans[0].id : null);
  job.updated = Date.now();
  await DB.put("jobs", job);
  toast(`Works order ${p.ref}: ${p.items.length} item${p.items.length === 1 ? "" : "s"} at ${p.site}`, 3500);
  go("#/job/" + p.id);
}

// ------------------------------------------------------------------ home card
function worksCard(j) {
  const c = wCounts(j), n = wItems(j).length, p = j.pack || {};
  return `<a class="card job" href="#/job/${j.id}">
    <h3>${esc(j.site || "Works")}</h3>
    <div class="meta"><span class="badge works">Works</span> ${esc(p.ref || "")} · ${esc([p.start, p.finish].filter(Boolean).join(" – "))} · ${c.done}/${n} done</div>
    <div class="meta">${onSite(j) ? "<b>On site</b> · " : ""}${j.exported ? `Return sent ${dt5(j.exported)}${j.updated > j.exported ? " · <b class='no'>changed since</b>" : ""}` : `${j.progressSent ? `Progress sent ${dt5(j.progressSent)} · ` : ""}<b class='no'>Return not sent yet</b>`}</div>
  </a>`;
}

// ------------------------------------------------------------------ the works order page
async function worksJobPage(job) {
  const p = job.pack || {}, w = wk(job), c = wCounts(job), n = wItems(job).length;
  const here = onSite(job), safe = typeof safetyToday === "function" ? safetyToday(job) : null;
  const photos = (await DB.by("photos", "job", job.id)).filter(x => x.role !== "doc");
  const pc = id => photos.filter(x => x.wItem === id).length;
  const allSet = n && !c[""];
  app.innerHTML = `
  <header class="top"><button aria-label="Home" onclick="go('#/')">‹</button>
    <h1>${esc(job.site)}<span class="sub">Works order ${esc(p.ref || "")}${p.start ? " · " + esc([p.start, p.finish].filter(Boolean).join(" – ")) : ""}</span></h1></header>
  <main>
    ${here ? `<div class="card onsite"><b>On site</b> since ${t5(here.when)} · ${esc(here.people || 1)} ${+here.people === 1 ? "person" : "people"}</div>` : ""}
    <div class="card winfo">
      ${p.address ? `<div><b>Address</b> ${esc(p.address)}</div>` : ""}
      ${p.access ? `<div><b>Access</b> ${esc(p.access)}</div>` : ""}
      ${p.w3w ? `<div><b>what3words</b> ///${esc(p.w3w)}</div>` : ""}
      ${p.client ? `<div><b>Client</b> ${esc(p.client)}</div>` : ""}
      ${p.welfare ? `<div><b>Welfare</b> ${esc(p.welfare)}</div>` : ""}
      <div><b>Emergency</b> 999 · A&amp;E: ${esc(p.hospital || "check before you travel")}</div>
      <div class="row" style="margin-top:8px">
        ${p.contact && p.contact.phone ? `<a class="btn small" href="tel:${esc(p.contact.phone.replace(/\s/g, ""))}">📞 Call ${esc(p.contact.name || "")}</a>` : ""}
        ${p.w3w || p.address ? `<a class="btn small" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.address || p.site)}">🧭 Directions</a>` : ""}
      </div>
      ${p.notes ? `<div class="hint" style="margin-top:8px"><b>Notes:</b> ${esc(p.notes)}</div>` : ""}
    </div>
    <div class="stack">
      <button class="btn block ${w.briefing.length ? "" : "warnbtn"}" onclick="go('#/job/${job.id}/wdocs')">📄 RAMS and briefing ${w.briefing.length ? `– signed by ${w.briefing.length}` : "– not signed yet"}</button>
      ${here ? `<button class="btn block" id="wout">🏁 Sign out – leaving site</button>`
             : `<button class="btn primary block" id="win">📍 Sign in – arrived on site</button>`}
      <button class="btn block ${safe ? (safe.proceed ? "" : "warnbtn") : here ? "warnbtn" : ""}" onclick="go('#/job/${job.id}/safety')">✓ Site safety check ${safe ? (safe.proceed ? `– done ${t5(safe.when)}` : "– NOT safe") : "– not done today"}</button>
    </div>
    <h3 class="subhead">Works – ${c.done} of ${n} done${c.started ? `, ${c.started} in progress` : ""}${c.part ? `, ${c.part} part done` : ""}${c.notdone ? `, ${c.notdone} not done` : ""}</h3>
    ${wItems(job).map(it => { const s = wState(job, it.id); return `
      <a class="card job witem" href="#/job/${job.id}/witem/${encodeURIComponent(it.id)}">
        <h3><span class="wdot" style="background:${W_COL[s.status || ""]}"></span>${esc(it.item || it.id)} · ${esc(it.tree)} ${esc(common(it.species))}</h3>
        <div class="meta">${esc(it.works)}</div>
        <div class="meta"><b>${esc(W_STATUS_TEXT[s.status || ""])}</b>${it.time ? " · " + esc(it.time) : ""}${pc(it.id) ? ` · 📷 ${pc(it.id)}` : ""}${it.constraints ? " · <b class='no'>⚠ constraints</b>" : ""}</div>
      </a>`; }).join("")}
    <div class="stack" style="margin-top:10px">
      <button class="btn block" onclick="go('#/job/${job.id}/wmap')">🗺 Map – works and keep-out zones${(p.zones || []).length ? ` (${p.zones.length})` : ""}</button>
      <button class="btn block" onclick="go('#/job/${job.id}/wextra')">📷 Other site photos (${photos.filter(x => x.role === "wextra").length})</button>
      ${w.completion.name ? "" : `<button class="btn block" id="wprog">📈 Send a progress update to ${esc(contactName(job))}${job.progressSent ? ` <span class="sub">(last ${dt5(job.progressSent)})</span>` : ""}</button>`}
      <button class="btn block ${w.completion.name ? "" : allSet ? "warnbtn" : ""}" onclick="go('#/job/${job.id}/wdone')">✍ Finish and sign off ${w.completion.name ? "– signed" : ""}</button>
      <button class="btn ${w.completion.name ? "primary" : ""} block" id="wsend">📤 Send the return to ${esc(contactName(job))}</button>
    </div>
    <p class="hint">Everything is saved on this phone as you go and works without signal. Nothing is sent until you press <b>Send the return</b> (sign in and out send a short message). On a job of more than a day, send a <b>progress update</b> at the end of each day so the office can see where the works are up to.</p>
    <button class="btn small danger" id="wdel" style="margin-top:16px">Remove this works order from the phone</button>
  </main>`;
  if ($("#win")) $("#win").onclick = () => signInOut(job, "in");
  if ($("#wout")) $("#wout").onclick = () => signInOut(job, "out");
  $("#wsend").onclick = () => sendReturn(job.id);
  if ($("#wprog")) $("#wprog").onclick = () => sendProgress(job.id);
  $("#wdel").onclick = async () => {
    if (!job.exported && !confirm("The return hasn't been sent yet. Remove this works order and everything recorded for it anyway?")) return;
    if (job.exported && !confirm("Remove this works order and its photos from the phone?")) return;
    for (const x of await DB.by("photos", "job", job.id)) await DB.del("photos", x.id);
    await DB.del("jobs", job.id); location.replace("#/");
  };
}

async function signInOut(job, kind) {
  const w = wk(job), p = job.pack || {};
  if (kind === "in" && !w.briefing.length && !confirm("Nobody has signed the RAMS briefing yet.\n\nRead the RAMS and sign it before work starts. Sign in anyway?")) return;
  const name = await workerName(job); if (!name) return;
  let people = 1;
  if (kind === "in") {
    const last = w.signins.filter(s => s.kind === "in").pop();
    const v = prompt("How many people on site, including you?", String((last && last.people) || Math.max(1, w.briefing.length) || 1));
    if (v === null) return;
    people = Math.max(1, parseInt(v, 10) || 1);
  }
  toast("Getting your position…", 6000);
  const fx = fixRec(await quickFix());
  const rec = Object.assign({ kind, when: new Date().toISOString(), by: name, people: kind === "in" ? people : (onSite(job) || {}).people || 1 }, fx);
  w.signins.push(rec); w.worker = name;
  await touchJob(job);
  const where = fx.grid ? ` Location ${fx.grid} https://maps.google.com/?q=${fx.lat},${fx.lon}` : "";
  const c = wCounts(job), n = wItems(job).length;
  const who = name + (p.contractor && p.contractor.company ? ` (${p.contractor.company})` : "");
  const text = kind === "in"
    ? `${who}: signed in at ${p.site} (${p.ref}) at ${t5(rec.when)} – ${people} on site.${where}`
    : `${who}: signed out of ${p.site} (${p.ref}) at ${t5(rec.when)} – everyone off site. Works of ${n}: ${wSummary(c)}.`;
  sendTo(p.contact, text);
  setTimeout(() => route(), 800);
}

// ------------------------------------------------------------------ RAMS, documents and the briefing record
async function worksDocsPage(jobId) {
  const job = await DB.get("jobs", jobId); if (!job) return go("#/");
  const p = job.pack || {}, w = wk(job), s = await settings();
  const docs = (await DB.by("photos", "job", jobId)).filter(x => x.role === "doc");
  const rs = p.ramsSummary;
  const draft = { name: "", role: "", read: false, sig: "" };
  if (!w.briefing.some(b => b.name === s.consultant)) draft.name = s.consultant || "";
  const draw = () => {
    app.innerHTML = `
    <header class="top"><button aria-label="Back" onclick="go('#/job/${jobId}')">‹</button><h1>RAMS and briefing<span class="sub">${esc(job.site)} · ${esc(p.ref || "")}</span></h1></header>
    <main>
      <h3 class="subhead">Documents</h3>
      ${docs.length ? `<div class="stack">${docs.map(d => `<button class="btn block" data-doc="${esc(d.id)}">📄 ${esc(d.name)}</button>`).join("")}</div>`
                    : `<div class="warn">No RAMS came with this works order – ask ${esc(contactName(job))} for it before you start.</div>`}
      <div class="card"><b>Emergency</b> – call 999 (112). Give the access point${p.w3w ? ` (///${esc(p.w3w)})` : ""} and what's happened.<br>
        <b>Nearest A&amp;E:</b> ${esc(p.hospital || "check before you travel")}${p.access ? `<br><b>Access point:</b> ${esc(p.access)}` : ""}</div>
      ${rs && rs.hazards && rs.hazards.length ? `
        <h3 class="subhead">Key hazards and controls</h3>
        ${rs.activities && rs.activities.length ? `<p class="hint">Work covered: ${esc(rs.activities.join(", "))}</p>` : ""}
        ${rs.hazards.map(h => `<details class="hz"><summary>${esc(h.hazard)}</summary><ul>${(h.controls || []).map(c => `<li>${esc(c)}</li>`).join("")}</ul></details>`).join("")}
        ${rs.ppe && rs.ppe.length ? `<p class="hint"><b>PPE:</b> ${esc(rs.ppe.join(", "))}</p>` : ""}` : ""}
      <h3 class="subhead">Briefing record</h3>
      <p class="hint">Everyone working on site reads the RAMS (or is briefed on it) and signs here before work starts.</p>
      ${w.briefing.map((b, i) => `<div class="sigline"><img src="${b.sig}" alt=""><div><b>${esc(b.name)}</b>${b.role ? " – " + esc(b.role) : ""}<div class="meta">${dt5(b.when)}</div></div>
        <button class="btn small danger" data-del="${i}" aria-label="Remove">✕</button></div>`).join("") || `<div class="hint"><b class="no">Nobody has signed yet.</b></div>`}
      <div class="card">
        <label for="bn">Name</label><input id="bn" value="${esc(draft.name)}" autocomplete="name">
        <label>Role</label><div class="chips" id="brole">${W_ROLES.map(r => `<button class="chip small ${draft.role === r ? "on" : ""}" data-v="${esc(r)}">${esc(r)}</button>`).join("")}</div>
        <label class="check" style="margin-top:10px"><input type="checkbox" id="bread" ${draft.read ? "checked" : ""}> I have read and understood the risk assessment and method statement for this work and will work to it.</label>
        <label>Signature</label><canvas class="sig" id="bsig"></canvas>
        <div class="row"><button class="btn small" id="bclr">Clear</button><button class="btn primary" id="bok">✓ Sign</button></div>
      </div>
    </main>`;
    app.querySelectorAll("[data-doc]").forEach(b => b.onclick = () => openDoc(docs.find(d => d.id === b.dataset.doc)));
    app.querySelectorAll("[data-del]").forEach(b => b.onclick = async () => {
      if (!confirm("Remove this signature?")) return;
      w.briefing.splice(+b.dataset.del, 1); await touchJob(job); draw();
    });
    $("#brole").onclick = e => { const b = e.target.closest(".chip"); if (!b) return; keep(); draft.role = draft.role === b.dataset.v ? "" : b.dataset.v; draw(); };
    $("#bread").onchange = () => { draft.read = $("#bread").checked; };
    const pad = sigPad($("#bsig"), draft.sig, v => { draft.sig = v; });
    $("#bclr").onclick = () => pad.clear();
    $("#bok").onclick = async () => {
      keep();
      if (!draft.name) return toast("Put your name in");
      if (!draft.read) return toast("Tick to confirm you've read and understood the RAMS");
      if (!draft.sig) return toast("Sign in the box");
      w.briefing.push({ name: draft.name, role: draft.role, when: new Date().toISOString(), sig: draft.sig, read: true });
      await touchJob(job);
      if (!s.consultant) { s.consultant = draft.name; await DB.put("settings", s); }
      toast(`${draft.name} signed`);
      Object.assign(draft, { name: "", role: "", read: false, sig: "" }); draw();
    };
  };
  const keep = () => { const el = $("#bn"); if (el) draft.name = el.value.trim(); };
  draw();
}

function openDoc(d) {
  if (!d || !d.blob) return toast("That document isn't on this phone");
  const url = URL.createObjectURL(d.blob);
  const w = window.open(url, "_blank");
  if (!w) {  // pop-up blocked: download it instead (opens in the phone's PDF viewer)
    const a = document.createElement("a"); a.href = url; a.download = (d.file || d.name || "document").split("/").pop();
    document.body.appendChild(a); a.click(); a.remove();
  }
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

// ------------------------------------------------------------------ one works item
async function worksItemPage(jobId, itemId) {
  const job = await DB.get("jobs", jobId); if (!job) return go("#/");
  itemId = decodeURIComponent(itemId || "");
  const items = wItems(job), i = items.findIndex(x => x.id === itemId), it = items[i];
  if (!it) return go("#/job/" + jobId);
  const s = wState(job, it.id), st = await settings();
  const urls = [];
  const draw = async () => {
    urls.splice(0).forEach(u => URL.revokeObjectURL(u));
    const ph = (await DB.by("photos", "job", jobId)).filter(x => x.wItem === it.id).sort((a, b) => a.created - b.created);
    const thumbs = stage => ph.filter(x => x.role === stage).map(x => { const u = URL.createObjectURL(x.blob); urls.push(u);
      return `<button class="wthumb" data-ph="${x.id}"><img src="${u}" alt=""></button>`; }).join("");
    app.innerHTML = `
    <header class="top"><button aria-label="Back" onclick="go('#/job/${jobId}')">‹</button>
      <h1>${esc(it.item || it.id)} · ${esc(it.tree)}<span class="sub">${esc(it.species || "")}</span></h1></header>
    <main>
      <div class="card"><div class="wworks">${esc(it.works)}</div>
        <div class="meta">${it.time ? esc(it.time) + " · " : ""}${esc([it.grid, it.w3w ? "///" + it.w3w : ""].filter(Boolean).join(" · "))}</div>
        <div class="row" style="margin-top:8px">
          ${it.lat != null ? `<button class="btn small" onclick="go('#/job/${jobId}/wmap/${encodeURIComponent(it.id)}')">🗺 On the map</button>
          <a class="btn small" target="_blank" rel="noopener" href="https://www.google.com/maps/dir/?api=1&destination=${it.lat},${it.lon}">🧭 Directions</a>` : ""}
        </div></div>
      ${it.constraints ? `<div class="warn"><b>⚠ Constraints:</b> ${esc(it.constraints)}</div>` : ""}
      ${it.notes ? `<div class="card"><b>Notes from ${esc(contactName(job))}:</b> ${esc(it.notes)}</div>` : ""}
      <label>Status</label>
      <div class="chips" id="wst">${W_STATUS.map(([v, t]) => `<button class="chip ${v === "notdone" ? "danger" : ""} ${(s.status || "") === v ? "on" : ""}" data-v="${v}">${t}</button>`).join("")}</div>
      ${s.status === "part" || s.status === "notdone" ? `<label for="wr">What's left and why</label><textarea id="wr" rows="3" placeholder="e.g. nest found in the crown – stopped; access blocked by parked cars">${esc(s.reason || "")}</textarea>` : ""}
      <h3 class="subhead">Before</h3><div class="wthumbs">${thumbs("wbefore")}<button class="btn small" id="pb">📷 Before photo</button></div>
      <h3 class="subhead">After</h3><div class="wthumbs">${thumbs("wafter")}<button class="btn small" id="pa">📷 After photo</button></div>
      <button class="btn small" id="pg" style="margin-top:6px">From the gallery…</button>
      <label for="wn">Notes</label><textarea id="wn" rows="3" placeholder="Anything the office should know">${esc(s.notes || "")}</textarea>
      ${s.status === "done" && !ph.some(x => x.role === "wafter") ? `<p class="hint"><b>Add an after photo</b> – it goes in the completion report.</p>` : ""}
      ${s.when ? `<p class="hint">${esc(W_STATUS_TEXT[s.status || ""])} ${dt5(s.when)}${s.by ? " by " + esc(s.by) : ""}</p>` : ""}
      <div class="row" style="margin-top:14px">
        ${i > 0 ? `<button class="btn" onclick="go('#/job/${jobId}/witem/${encodeURIComponent(items[i - 1].id)}')">‹ ${esc(items[i - 1].item || items[i - 1].id)}</button>` : ""}
        <button class="btn" onclick="go('#/job/${jobId}')">Works list</button>
        ${i < items.length - 1 ? `<button class="btn" onclick="go('#/job/${jobId}/witem/${encodeURIComponent(items[i + 1].id)}')">${esc(items[i + 1].item || items[i + 1].id)} ›</button>` : ""}
      </div>
    </main>`;
    $("#wst").onclick = async e => {
      const b = e.target.closest(".chip"); if (!b) return;
      keep(); s.status = b.dataset.v;
      if (s.status) { s.when = new Date().toISOString(); s.by = st.consultant || wk(job).worker || ""; } else { delete s.when; delete s.by; }
      await touchJob(job); draw();
    };
    const add = (sel, role) => pickFiles(sel, async files => {
      if (!files.length) return;
      const fx = fixRec(await Promise.race([quickFix(4000), new Promise(r => setTimeout(() => r(null), 4500))]));
      for (const f of files) {
        await DB.put("photos", Object.assign({ id: uid(), jobId, wItem: it.id, role, blob: await shrink(f), created: Date.now(), when: new Date().toISOString() }, fx));
      }
      await touchJob(job); toast(`${files.length} photo${files.length === 1 ? "" : "s"} added`); draw();
    });
    $("#pb").onclick = () => { keep(); add("#cam", "wbefore"); };
    $("#pa").onclick = () => { keep(); add("#cam", "wafter"); };
    $("#pg").onclick = () => {
      keep();
      const stage = confirm("Are these BEFORE photos?\n\nOK = before, Cancel = after") ? "wbefore" : "wafter";
      add("#gallery", stage);
    };
    app.querySelectorAll("[data-ph]").forEach(b => b.onclick = async () => {
      const x = ph.find(q => q.id === b.dataset.ph);
      if (x && confirm("Delete this photo?")) { await DB.del("photos", x.id); await touchJob(job); draw(); }
    });
  };
  const keep = () => {
    const r = $("#wr"), n = $("#wn");
    if (r) s.reason = r.value.trim();
    if (n) s.notes = n.value.trim();
  };
  leaveHook = async () => { keep(); await DB.put("jobs", job); urls.forEach(u => URL.revokeObjectURL(u)); };
  draw();
}

// ------------------------------------------------------------------ other site photos
async function worksExtraPage(jobId) {
  const job = await DB.get("jobs", jobId); if (!job) return go("#/");
  const urls = [];
  const draw = async () => {
    urls.splice(0).forEach(u => URL.revokeObjectURL(u));
    const ph = (await DB.by("photos", "job", jobId)).filter(x => x.role === "wextra").sort((a, b) => a.created - b.created);
    app.innerHTML = `<header class="top"><button aria-label="Back" onclick="go('#/job/${jobId}')">‹</button><h1>Other site photos<span class="sub">${esc(job.site)}</span></h1></header>
    <main><p class="hint">Access, the site before you start, damage you found, the site when you leave…</p>
      ${ph.map(x => { const u = URL.createObjectURL(x.blob); urls.push(u); return `<div class="card"><img src="${u}" alt="" style="width:100%;border-radius:8px">
        <input data-cap="${x.id}" value="${esc(x.caption || "")}" placeholder="Caption"><button class="btn small danger" data-del="${x.id}">Delete</button></div>`; }).join("")}
      <div class="row"><button class="btn primary" id="xc">📷 Take photo</button><button class="btn" id="xg">From the gallery…</button></div></main>`;
    const add = sel => pickFiles(sel, async files => {
      const fx = fixRec(await Promise.race([quickFix(4000), new Promise(r => setTimeout(() => r(null), 4500))]));
      for (const f of files) await DB.put("photos", Object.assign({ id: uid(), jobId, role: "wextra", blob: await shrink(f), created: Date.now(), when: new Date().toISOString(), caption: "" }, fx));
      await touchJob(job); draw();
    });
    $("#xc").onclick = () => add("#cam"); $("#xg").onclick = () => add("#gallery");
    app.querySelectorAll("[data-cap]").forEach(el => el.onchange = async () => { const x = ph.find(q => q.id === el.dataset.cap); x.caption = el.value.trim(); await DB.put("photos", x); await touchJob(job); });
    app.querySelectorAll("[data-del]").forEach(b => b.onclick = async () => { if (confirm("Delete this photo?")) { await DB.del("photos", b.dataset.del); await touchJob(job); draw(); } });
  };
  leaveHook = async () => urls.forEach(u => URL.revokeObjectURL(u));
  draw();
}

// ------------------------------------------------------------------ map: works and keep-out zones
async function worksMapPage(jobId, itemId) {
  const job = await DB.get("jobs", jobId); if (!job) return go("#/");
  const p = job.pack || {};
  itemId = itemId ? decodeURIComponent(itemId) : "";
  const pts = wItems(job).filter(it => it.lat != null).map(it => ({ id: it.id, tag: `${it.item || it.id} ${it.tree}`.trim(), lat: it.lat, lon: it.lon,
    wstatus: wState(job, it.id).status || "" }));
  const target = pts.find(x => x.id === itemId);
  app.innerHTML = mapShell("Works map", esc(job.site), `location.replace('${target ? `#/job/${jobId}/witem/${encodeURIComponent(itemId)}` : `#/job/${jobId}`}')`);
  let timer = null;
  leaveHook = async () => { clearInterval(timer); closeMap(); };
  const { map } = await buildMap($("#map"), job, pts, {
    center: target ? [+target.lat, +target.lon] : null,
    onTree: t => { location.hash = `#/job/${jobId}/witem/${encodeURIComponent(t.id)}`; },
  });
  const zl = L.layerGroup().addTo(map);
  for (const z of p.zones || []) {
    if (z.lat == null) continue;
    const col = ZONE_COL[z.kind] || "#555";
    L.circle([+z.lat, +z.lon], { radius: +z.r || 5, color: col, weight: 2, dashArray: "6 4", fillColor: col, fillOpacity: 0.18 })
      .bindPopup(esc(z.label)).addTo(zl);
  }
  if (!target && !pts.length && (p.zones || []).length) map.fitBounds(L.latLngBounds(p.zones.map(z => [+z.lat, +z.lon])).pad(0.5), { maxZoom: 19 });
  $("#meBtn").onclick = () => map._me ? map.setView(map._me, Math.max(map.getZoom(), 19)) : locateOnce(map);
  const panel = $("#panel");
  const legend = `<div class="hint">${Object.entries({ "": "To do", started: "In progress", done: "Done", part: "Part done", notdone: "Not done" }).map(([k, t]) =>
    `<span class="wdot" style="background:${W_COL[k]}"></span>${t}`).join(" &nbsp; ")}${(p.zones || []).length ? " &nbsp; <span class='wring'></span>Keep-out zone (tap for why)" : ""}</div>`;
  const check = () => {
    const me = map._me;
    const inside = me ? (p.zones || []).filter(z => z.lat != null && L_dist(me, [+z.lat, +z.lon]) <= (+z.r || 0)) : [];
    panel.innerHTML = (inside.length ? `<div class="warn danger"><b>⚠ You're inside a keep-out zone:</b> ${inside.map(z => esc(z.label)).join("; ")}</div>` : "") + legend;
  };
  check();
  timer = setInterval(() => { if (!document.body.contains(panel)) return clearInterval(timer); check(); }, 2000);
}

// ------------------------------------------------------------------ finish and sign off
async function worksDonePage(jobId) {
  const job = await DB.get("jobs", jobId); if (!job) return go("#/");
  const w = wk(job), cp = w.completion, s = await settings();
  const d = Object.assign({ arisings: "", tidy: "", damage: "", damageNote: "", notes: "", name: cp.name || s.consultant || w.worker || "", sig: cp.sig || "" }, cp);
  const left = wItems(job).filter(it => ["", "started", "part", "notdone"].includes(wState(job, it.id).status || ""));
  const draw = () => {
    app.innerHTML = `
    <header class="top"><button aria-label="Back" onclick="go('#/job/${jobId}')">‹</button><h1>Finish and sign off<span class="sub">${esc(job.site)} · ${esc((job.pack || {}).ref || "")}</span></h1></header>
    <main>
      ${left.length ? `<div class="warn"><b>Not finished:</b><br>${left.map(it => { const x = wState(job, it.id); return `${esc(it.item || it.id)} ${esc(it.tree)} – ${esc(W_STATUS_TEXT[x.status || ""])}${x.reason ? ": " + esc(x.reason) : (x.status ? " <b>(add the reason)</b>" : "")}`; }).join("<br>")}</div>`
                    : `<div class="card onsite">All ${wItems(job).length} items done.</div>`}
      <label>Arisings</label><div class="chips" id="ar">${ARISINGS.map(a => `<button class="chip small ${d.arisings === a ? "on" : ""}" data-v="${esc(a)}">${esc(a)}</button>`).join("")}</div>
      <label>Site left clean and tidy</label><div class="chips" data-k="tidy">${[["yes", "Yes"], ["no", "No"]].map(([v, t]) => `<button class="chip ${d.tidy === v ? "on" : ""}" data-v="${v}">${t}</button>`).join("")}</div>
      <label>Any damage to property, services, fences, paths or ground?</label><div class="chips" data-k="damage">${[["no", "No"], ["yes", "Yes"]].map(([v, t]) => `<button class="chip ${v === "yes" ? "danger" : ""} ${d.damage === v ? "on" : ""}" data-v="${v}">${t}</button>`).join("")}</div>
      ${d.damage === "yes" ? `<label for="dn">What was damaged, and what you did</label><textarea id="dn" rows="3">${esc(d.damageNote)}</textarea><p class="hint">Photograph it under <b>Other site photos</b>, and report it to ${esc(contactName(job))} straight away.</p>` : ""}
      <label for="cn">Notes for the office</label><textarea id="cn" rows="3">${esc(d.notes)}</textarea>
      <label for="cname">Name</label><input id="cname" value="${esc(d.name)}">
      <label>Signature</label><canvas class="sig" id="csig"></canvas>
      <div class="row"><button class="btn small" id="cclr">Clear</button><button class="btn primary" id="cok">✓ Sign off</button></div>
      <p class="hint">Then press <b>Send the return</b> on the works page.</p>
    </main>`;
    $("#ar").onclick = e => { const b = e.target.closest(".chip"); if (!b) return; keep(); d.arisings = d.arisings === b.dataset.v ? "" : b.dataset.v; draw(); };
    app.querySelectorAll("[data-k]").forEach(g => g.onclick = e => { const b = e.target.closest(".chip"); if (!b) return; keep(); d[g.dataset.k] = b.dataset.v; draw(); });
    const pad = sigPad($("#csig"), d.sig, v => { d.sig = v; });
    $("#cclr").onclick = () => pad.clear();
    $("#cok").onclick = async () => {
      keep();
      if (!d.tidy || !d.damage) return toast("Answer the tidy and damage questions");
      if (d.damage === "yes" && !d.damageNote) return toast("Say what was damaged");
      if (left.some(it => ["part", "notdone"].includes(wState(job, it.id).status) && !wState(job, it.id).reason)) return toast("Add the reason for each item not finished");
      if (!d.name || !d.sig) return toast("Put your name in and sign");
      w.completion = Object.assign({}, d, { when: new Date().toISOString() });
      await touchJob(job); toast("Signed off – now send the return"); go("#/job/" + jobId);
    };
  };
  const keep = () => {
    const v = id => { const el = document.getElementById(id); return el ? el.value.trim() : undefined; };
    if (v("cn") !== undefined) { d.notes = v("cn"); d.name = v("cname"); }
    if (v("dn") !== undefined) d.damageNote = v("dn");
  };
  draw();
}

// ------------------------------------------------------------------ the return zip
function dataUrlBlob(u) {
  const m = /^data:([^;]+);base64,(.*)$/.exec(u || ""); if (!m) return null;
  const b = atob(m[2]), a = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) a[i] = b.charCodeAt(i);
  return new Blob([a], { type: m[1] });
}

async function buildWorksReturn(jobId, opt = {}) {
  const job = await DB.get("jobs", jobId), p = job.pack || {}, w = wk(job);
  const photos = opt.noPhotos ? [] : (await DB.by("photos", "job", jobId)).filter(x => x.role !== "doc").sort((a, b) => a.created - b.created);
  const zip = new JSZip(), used = new Set();
  const uniq = base => { let n = base, i = 2; while (used.has(n.toLowerCase())) n = `${base} (${i++})`; used.add(n.toLowerCase()); return n; };
  const sigFile = (u, base) => { const b = dataUrlBlob(u); if (!b) return ""; const f = `Signatures/${uniq(safeName(base))}.png`; zip.file(f, b); return f; };
  const items = wItems(job).map(it => {
    const s = wState(job, it.id), mine = photos.filter(x => x.wItem === it.id);
    const out = [];
    for (const stage of ["wbefore", "wafter"]) mine.filter(x => x.role === stage).forEach((x, k) => {
      const f = `Photos/${uniq(safeName(`${it.item || it.id} ${it.tree} ${stage === "wbefore" ? "before" : "after"} ${k + 1}`))}.jpg`;
      zip.file(f, x.blob, { binary: true });
      out.push({ file: f, stage: stage === "wbefore" ? "before" : "after", when: x.when || new Date(x.created).toISOString(), lat: x.lat, lon: x.lon, grid: x.grid });
    });
    return { id: it.id, item: it.item, tree: it.tree, species: it.species, works: it.works, status: s.status || "", reason: s.reason || "",
      notes: s.notes || "", by: s.by || "", when: s.when || "", photos: out };
  });
  const extras = photos.filter(x => x.role === "wextra").map((x, k) => {
    const f = `Photos/${uniq(safeName(`Site ${k + 1}${x.caption ? " " + x.caption : ""}`))}.jpg`;
    zip.file(f, x.blob, { binary: true });
    return { file: f, caption: x.caption || "", when: x.when || new Date(x.created).toISOString(), lat: x.lat, lon: x.lon };
  });
  const briefing = w.briefing.map((b, k) => ({ name: b.name, role: b.role, when: b.when, read: !!b.read, sig: sigFile(b.sig, `Briefing ${k + 1} ${b.name}`) }));
  const cp = Object.assign({}, w.completion); if (cp.sig) cp.sig = sigFile(cp.sig, "Completion " + (cp.name || ""));
  const safety = (job.safety || []).map(r => Object.assign({}, r, { labels: Object.fromEntries(safetyChecks(job, r)) }));
  zip.file("works_return.json", JSON.stringify({
    format: "works-return", version: 1, kind: opt.progress ? "progress" : "final", app: APP_VERSION, exported: new Date().toISOString(),
    pack: { id: p.id, ref: p.ref, site: p.site, made: p.made }, contractor: { name: w.worker || (w.briefing[0] || {}).name || "", company: (p.contractor || {}).company || "" },
    signins: w.signins, briefing, safety, items, extras, completion: cp,
  }, null, 1));
  const blob = await zip.generateAsync({ type: "blob", mimeType: "application/zip" });
  return { blob, fname: `${safeName(p.site)} ${safeName(p.ref)} works ${opt.progress ? "progress" : "return"} ${today()}${opt.progress ? " " + t5(Date.now()).replace(":", "") : ""}.zip`,
    job, items: items.length, photos: photos.length };
}

async function shareZip(out, text) {  // -> true (shared), false (saved to Downloads) or null (cancelled)
  const file = new File([out.blob], out.fname, { type: "application/zip" });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: out.fname, text }); return true; }
    catch (e) { if (e.name === "AbortError") return null; }
  }
  const a = document.createElement("a"); a.href = URL.createObjectURL(out.blob); a.download = out.fname;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
  return false;
}

// a progress update part-way through: the same zip marked "progress" – the PC updates the works tracker, no completion report
async function sendProgress(jobId) {
  const job = await DB.get("jobs", jobId), c = wCounts(job);
  const n = (await DB.by("photos", "job", jobId)).filter(x => x.role !== "doc").length;
  const withPhotos = n ? confirm(`Send the ${n} photo${n === 1 ? "" : "s"} taken so far with the progress update?\n\nOK = with photos, Cancel = just the ticks and notes (smaller – fine on poor signal)`) : false;
  toast("Preparing the progress update…", 8000);
  let out;
  try { out = await buildWorksReturn(jobId, { progress: true, noPhotos: !withPhotos }); } catch (e) { console.error(e); toast("Couldn't make the update: " + e.message, 5000); return; }
  const p = out.job.pack || {};
  const shared = await shareZip(out, `Works progress – ${out.job.site} (${p.ref}): ${wSummary(c)} of ${out.items}`);
  if (shared === null) { toast("Not sent"); return; }
  out.job.progressSent = Date.now(); await DB.put("jobs", out.job);
  toast(shared ? "Progress update sent" : `Saved ${out.fname} to Downloads – send it to ${contactName(out.job)}`, 4000);
  route();
}

async function sendReturn(jobId) {
  const job = await DB.get("jobs", jobId), w = wk(job);
  const c = wCounts(job);
  if (onSite(job) && !confirm("You're still signed in. Send the return anyway? (Sign out when you leave site.)")) return;
  if (!w.completion.name && !confirm("The works haven't been signed off yet. Send the return anyway?")) return;
  if (c[""] && !confirm(`${c[""]} item${c[""] === 1 ? " hasn't" : "s haven't"} been marked done, part done or not done. Send anyway?`)) return;
  if (c.started && !confirm(`${c.started} item${c.started === 1 ? " is" : "s are"} still marked in progress. Send the final return anyway? (For part-way through, use Send a progress update.)`)) return;
  toast("Preparing the return…", 8000);
  let out;
  try { out = await buildWorksReturn(jobId); } catch (e) { console.error(e); toast("Couldn't make the return: " + e.message, 5000); return; }
  const shared = await shareZip(out, `Works return – ${out.job.site} (${(out.job.pack || {}).ref}): ${c.done} of ${out.items} done, ${out.photos} photos`);
  if (shared === null) { toast("Not sent"); return; }
  out.job.exported = Date.now(); out.job.updated = out.job.exported - 1; await DB.put("jobs", out.job);
  toast(shared ? "Return sent" : `Saved ${out.fname} to Downloads – send it to ${contactName(out.job)}`, 4000);
  route();
}
