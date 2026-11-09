// Tree Survey – © 2026 Mark Johnson. All rights reserved. Use only under a written licence from the owner.
/* Checks – vehicle, trailer and plant pre-use checks, climbing / MEWP kit, drone pre-flight and the on-site
   risk assessment for tree work. The checklists come from checklists.js (made on the PC from Checklists.xlsx).
   Each completed check is kept on the device ("checks" store) with its answers, notes and signatures, and
   exported as a zip (checks.json) that the PC's Compliance window turns into signed Word records. */
"use strict";

const CHECK_ANS = [["ok", "OK"], ["defect", "Defect"], ["na", "N/A"]];
const RESULT_TEXT = { safe: "Safe", minor: "Safe – minor defect reported", unsafe: "NOT safe – out of use / stopped" };
const resultText = c => c.kind === "site" ? { safe: "Safe to start work", unsafe: "NOT safe – work stopped" }[c.result] || "" : RESULT_TEXT[c.result] || "";
const checkList = key => (typeof CHECKLISTS !== "undefined" ? CHECKLISTS : []).find(c => c.key === key);

async function checksPage() {
  const all = (await DB.all("checks")).sort((a, b) => (b.when || "").localeCompare(a.when || ""));
  const lists = typeof CHECKLISTS !== "undefined" ? CHECKLISTS : [];
  const groups = [...new Set(lists.map(c => c.group))];
  const draft = await DB.get("settings", "checkDraft");
  const notExported = all.filter(c => !c.exported).length;
  app.innerHTML = `
  <header class="top"><button aria-label="Back" onclick="go('#/')">‹</button><h1>Checks<span class="sub">Vehicles, plant, kit and site</span></h1></header>
  <main>
    <button class="btn danger block" onclick="go('#/incident/new')">⚠ Report a near miss or accident</button>
    ${draft && draft.rec && checkList(draft.rec.template) ? `<a class="card" href="#/check/new/${draft.rec.template}"><b>Carry on:</b> ${esc(draft.rec.title)}${draft.rec.asset ? " – " + esc(draft.rec.asset) : ""}</a>` : ""}
    ${groups.map(g => `<h3 class="subhead">${esc(g)}</h3><div class="checkbtns">${lists.filter(c => c.group === g).map(c =>
      `<button class="btn" onclick="go('#/check/new/${c.key}')">${esc(c.title)}</button>`).join("")}</div>`).join("")}
    <h3 class="subhead">Done</h3>
    ${all.length ? all.slice(0, 40).map(c => `
      <a class="card job" href="#/check/${c.id}">
        <h3>${esc(c.kind === "incident" ? "⚠ " + (c.type || "Incident") : c.title)}</h3>
        <div class="meta">${esc(c.asset || "")} · ${new Date(c.when).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })} · ${esc(c.by || "")}</div>
        <div class="meta"><b class="${c.result === "safe" ? "" : "no"}">${esc(c.kind === "incident" ? "Near miss / accident report" : resultText(c))}</b>${c.exported ? "" : " · <b class='no'>not exported</b>"}</div>
      </a>`).join("") : `<div class="empty">No checks yet.</div>`}
    <p class="hint">Export sends the checks to your PC – open <b>Compliance → Checks → Import from phone</b> to file them as signed Word records.</p>
    <div class="row">
      <button class="btn ${notExported ? "primary" : ""}" id="exp" ${all.length ? "" : "disabled"}>Export ${notExported ? notExported + " new" : "all"} check${(notExported || all.length) === 1 ? "" : "s"}</button>
      ${notExported && notExported < all.length ? `<button class="btn small" id="expall">Export all</button>` : ""}
    </div>
  </main>`;
  $("#exp").onclick = () => exportChecks(notExported ? all.filter(c => !c.exported) : all);
  if ($("#expall")) $("#expall").onclick = () => exportChecks(all);
}

function sigPad(canvas, value, onChange) {
  const r = canvas.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr);
  const ctx = canvas.getContext("2d"); ctx.scale(dpr, dpr);
  const blank = () => { ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, r.width, r.height); };
  blank();
  if (value) { const im = new Image(); im.onload = () => ctx.drawImage(im, 0, 0, r.width, r.height); im.src = value; }
  ctx.lineWidth = 2.2; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = "#111";
  let down = false, last = null, inked = false;
  const pt = e => { const b = canvas.getBoundingClientRect(); return { x: e.clientX - b.left, y: e.clientY - b.top }; };
  canvas.onpointerdown = e => { down = true; last = pt(e); canvas.setPointerCapture(e.pointerId); e.preventDefault(); };
  canvas.onpointermove = e => {
    if (!down) return;
    const p = pt(e); ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(p.x, p.y); ctx.stroke(); last = p; inked = true;
  };
  canvas.onpointerup = canvas.onpointercancel = () => {
    if (down && inked) {  // keep it small: 1× size PNG
      const c2 = document.createElement("canvas"); c2.width = Math.round(r.width); c2.height = Math.round(r.height);
      c2.getContext("2d").drawImage(canvas, 0, 0, c2.width, c2.height); onChange(c2.toDataURL("image/png"));
    }
    down = false;
  };
  return { clear() { blank(); inked = false; onChange(""); } };
}

async function checkForm(key) {
  const cl = checkList(key);
  if (!cl) { toast("That checklist isn't on this device – update the app"); return go("#/checks"); }
  const s = await settings();
  const old = await DB.get("settings", "checkDraft");
  const earlier = (await DB.all("checks")).filter(c => c.template === key).sort((a, b) => (b.when || "").localeCompare(a.when || ""));
  const assets = [...new Set(earlier.map(c => c.asset).filter(Boolean))];
  const again = sessionStorage.getItem("checkAgain"); sessionStorage.removeItem("checkAgain");
  let rec;
  if (old && old.rec && old.rec.template === key) rec = old.rec;
  else {
    rec = { id: uid(), template: key, kind: cl.team ? "site" : "equipment", title: cl.title, assetLabel: cl.asset, asset: again || (assets.length === 1 ? assets[0] : ""),
      fields: {}, by: s.consultant || "", notes: "", sig: "", team: cl.team ? [{ name: "", role: "", sig: "" }] : [],
      answers: [] };
    for (const [sec, items] of cl.sections) for (const it of items) rec.answers.push({ section: sec, item: it, answer: "", note: "" });
  }
  const keep = () => DB.put("settings", { id: "checkDraft", rec }).catch(() => { });
  let i = 0;
  app.innerHTML = `
  <header class="top"><button aria-label="Back" id="back">‹</button><h1>${esc(cl.title)}<span class="sub" id="count"></span></h1></header>
  <main class="checkform">
    ${cl.note ? `<p class="hint">${esc(cl.note)}</p>` : ""}
    <label for="asset">${esc(cl.asset)}</label><input id="asset" list="assets" value="${esc(rec.asset)}">
    <datalist id="assets">${assets.map(a => `<option value="${esc(a)}">`).join("")}</datalist>
    ${cl.fields.map((f, n) => `<label for="f${n}">${esc(f)}</label><input id="f${n}" data-f="${esc(f)}" value="${esc(rec.fields[f] || "")}">`).join("")}
    ${cl.sections.map(([sec, items]) => `<h3 class="subhead">${esc(sec)}</h3>` + items.map(() => {
      const a = rec.answers[i], n = i++;
      return `<div class="safetyrow" data-n="${n}"><div>${esc(a.item)}</div><div class="chips">
        ${CHECK_ANS.map(([v, t]) => `<button class="chip small ${a.answer === v ? "on" : ""} ${v === "defect" ? "danger" : ""}" data-v="${v}">${t}</button>`).join("")}</div>
        <input class="dnote" placeholder="What's wrong / action taken" value="${esc(a.note)}" ${a.answer === "defect" || a.note ? "" : "hidden"}></div>`;
    }).join("")).join("")}
    ${(cl.log || []).length ? `<h3 class="subhead">${cl.group === "Drone" ? "Flight log" : cl.key === "sprayer" ? "Spray record" : "Log"}</h3>` + cl.log.map((f, n) => `<label for="lg${n}">${esc(f)}</label><input id="lg${n}" data-f="${esc(f)}" value="${esc(rec.fields[f] || "")}"${/time$/i.test(f) ? ' placeholder="hh:mm"' : ""}>`).join("") +
      (cl.group === "Drone" ? `<p class="hint">Goes into the Drone flights log on the PC when the checks are imported.</p>` :
       cl.key === "sprayer" ? `<p class="hint">This is your pesticide application record – keep it (with the check) for at least 3 years.</p>` : "") : ""}
    <label for="notes">${cl.team ? "Other hazards and controls" : "Other notes"}</label><textarea id="notes" rows="3">${esc(rec.notes)}</textarea>
    ${cl.team ? `<h3 class="subhead">Team briefing</h3><p class="hint">Each member of the team signs to say they've been briefed on this assessment and the RAMS. The team leader signs at the bottom.</p><div id="team"></div>
      <button class="btn small" id="addp">＋ Add person</button>` : ""}
    <label for="by">${cl.team ? "Team leader" : "Checked by"}</label><input id="by" value="${esc(rec.by)}">
    <label>Signature</label><canvas class="sig" id="sig"></canvas><button class="btn small" id="sigclr">Clear signature</button>
    <div id="msg"></div>
    <div class="stack" style="margin-top:14px">
      <button class="btn primary block" id="safe">✓ ${cl.team ? "Safe to start work" : "Safe to use"}</button>
      ${cl.team ? "" : `<button class="btn warnbtn block" id="minor">Safe – minor defect reported</button>`}
      <button class="btn danger block" id="unsafe">✕ ${cl.team ? "Not safe – work stopped" : "Not safe – taken out of use"}</button>
    </div>
    <button class="btn small danger" id="discard" style="margin-top:18px">Discard this check</button>
  </main>`;
  const count = () => {
    const done = rec.answers.filter(a => a.answer).length, bad = rec.answers.filter(a => a.answer === "defect").length;
    $("#count").textContent = `${done} of ${rec.answers.length} checked${bad ? ` · ${bad} defect${bad > 1 ? "s" : ""}` : ""}`;
  };
  count();
  app.querySelectorAll(".safetyrow[data-n]").forEach(row => {
    const a = rec.answers[+row.dataset.n], note = row.querySelector(".dnote");
    row.querySelector(".chips").onclick = e => {
      const b = e.target.closest(".chip"); if (!b) return;
      a.answer = b.dataset.v;
      row.querySelectorAll(".chip").forEach(c => c.classList.toggle("on", c === b));
      note.hidden = a.answer !== "defect" && !a.note;
      if (a.answer === "defect") note.focus();
      count(); keep();
    };
    note.oninput = () => { a.note = note.value; keep(); };
  });
  $("#asset").oninput = () => { rec.asset = $("#asset").value; keep(); };
  app.querySelectorAll("[data-f]").forEach(el => el.oninput = () => { rec.fields[el.dataset.f] = el.value; keep(); });
  $("#notes").oninput = () => { rec.notes = $("#notes").value; keep(); };
  $("#by").oninput = () => { rec.by = $("#by").value; keep(); };
  const pad = sigPad($("#sig"), rec.sig, v => { rec.sig = v; keep(); });
  $("#sigclr").onclick = () => pad.clear();
  const drawTeam = () => {
    const box = $("#team"); if (!box) return;
    box.innerHTML = rec.team.map((m, n) => `<div class="card" data-m="${n}">
      <div class="row"><input placeholder="Name" class="mn" value="${esc(m.name)}"><input placeholder="Role" class="mr" value="${esc(m.role || "")}"></div>
      <canvas class="sig"></canvas><div class="row"><button class="btn small mclr">Clear</button><button class="btn small danger mdel">Remove</button></div></div>`).join("");
    box.querySelectorAll("[data-m]").forEach(el => {
      const m = rec.team[+el.dataset.m];
      el.querySelector(".mn").oninput = e => { m.name = e.target.value; keep(); };
      el.querySelector(".mr").oninput = e => { m.role = e.target.value; keep(); };
      const p = sigPad(el.querySelector("canvas"), m.sig, v => { m.sig = v; keep(); });
      el.querySelector(".mclr").onclick = () => p.clear();
      el.querySelector(".mdel").onclick = () => { rec.team.splice(+el.dataset.m, 1); keep(); drawTeam(); };
    });
  };
  drawTeam();
  if ($("#addp")) $("#addp").onclick = () => { rec.team.push({ name: "", role: "", sig: "" }); keep(); drawTeam(); };
  $("#back").onclick = () => go("#/checks");
  $("#discard").onclick = async () => { if (confirm("Discard this check?")) { await DB.del("settings", "checkDraft"); go("#/checks"); } };
  const save = async result => {
    const msg = [];
    if (!rec.asset.trim()) msg.push(`Fill in ${cl.asset.toLowerCase()}.`);
    const left = rec.answers.filter(a => !a.answer).length;
    if (left) msg.push(`${left} item${left > 1 ? "s" : ""} not answered.`);
    if (rec.answers.some(a => a.answer === "defect" && !a.note.trim())) msg.push("Say what each defect is.");
    if (result === "safe" && !cl.team && rec.answers.some(a => a.answer === "defect")) msg.push("There's a defect – choose 'minor defect reported' or 'Not safe'.");
    if (!rec.by.trim()) msg.push("Who did the check?");
    if (!rec.sig) msg.push("Sign it.");
    if (cl.team && rec.team.some(m => m.name && !m.sig)) msg.push("Everyone named in the team briefing needs to sign.");
    if (msg.length && result !== "unsafe") { $("#msg").innerHTML = `<div class="warn">${msg.map(esc).join("<br>")}</div>`; $("#msg").scrollIntoView({ block: "center" }); return; }
    if (msg.length && !confirm("Save it as NOT safe anyway?\n\n" + msg.join("\n"))) return;
    rec.result = result; rec.when = new Date().toISOString();
    rec.team = rec.team.filter(m => m.name || m.sig);
    await DB.put("checks", rec); await DB.del("settings", "checkDraft");
    toast(result === "unsafe" ? "Saved – NOT safe" : "Check saved");
    go("#/check/" + rec.id);
  };
  $("#safe").onclick = () => save("safe");
  if ($("#minor")) $("#minor").onclick = () => save("minor");
  $("#unsafe").onclick = () => save("unsafe");
}

function checkText(c) {
  const out = [`${c.title}`, `${c.assetLabel || "Item"}: ${c.asset || ""}`];
  for (const [k, v] of Object.entries(c.fields || {})) if (v) out.push(`${k}: ${v}`);
  out.push(`Date: ${new Date(c.when).toLocaleString("en-GB")}`, `Checked by: ${c.by || ""}`, "");
  let sec = null;
  for (const a of c.answers) {
    if (a.section !== sec) { sec = a.section; out.push(sec.toUpperCase()); }
    out.push(`  [${({ ok: "OK", defect: "DEFECT", na: "N/A" })[a.answer] || " – "}] ${a.item}${a.note ? " – " + a.note : ""}`);
  }
  if (c.notes) out.push("", "Notes: " + c.notes);
  if ((c.team || []).length) out.push("", "Team briefed: " + c.team.map(m => m.name + (m.role ? ` (${m.role})` : "")).join(", "));
  out.push("", "Result: " + resultText(c));
  return out.join("\r\n");
}

async function checkView(id) {
  const c = await DB.get("checks", id);
  if (!c) return go("#/checks");
  if (c.kind === "incident") return incidentView(c);
  let sec = null;
  app.innerHTML = `
  <header class="top"><button aria-label="Back" onclick="go('#/checks')">‹</button><h1>${esc(c.title)}<span class="sub">${esc(c.asset || "")}</span></h1></header>
  <main class="checkview">
    <div class="card">
      <div><b>${esc(c.assetLabel || "Item")}:</b> ${esc(c.asset || "")}</div>
      ${Object.entries(c.fields || {}).filter(([, v]) => v).map(([k, v]) => `<div><b>${esc(k)}:</b> ${esc(v)}</div>`).join("")}
      <div><b>Date:</b> ${new Date(c.when).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</div>
      <div><b>${checkList(c.template)?.team ? "Team leader" : "Checked by"}:</b> ${esc(c.by || "")}</div>
      <div class="${c.result === "safe" ? "" : "no"}" style="margin-top:6px"><b>${esc(resultText(c))}</b></div>
    </div>
    ${c.answers.map(a => {
      const h = a.section !== sec ? `<h3 class="subhead">${esc(sec = a.section)}</h3>` : "";
      return h + `<div class="ans ${a.answer}"><span class="mark">${({ ok: "✓", defect: "✕", na: "–" })[a.answer] || "?"}</span>
        <span>${esc(a.item)}${a.note ? `<br><b>${esc(a.note)}</b>` : ""}</span></div>`;
    }).join("")}
    ${c.notes ? `<h3 class="subhead">Notes</h3><p>${esc(c.notes)}</p>` : ""}
    ${(c.team || []).length ? `<h3 class="subhead">Team briefing</h3>${c.team.map(m => `<div class="sigline"><span>${esc(m.name)}${m.role ? ` (${esc(m.role)})` : ""}</span>${m.sig ? `<img src="${m.sig}" alt="signature">` : ""}</div>`).join("")}` : ""}
    <h3 class="subhead">Signed</h3><div class="sigline"><span>${esc(c.by || "")}</span>${c.sig ? `<img src="${c.sig}" alt="signature">` : ""}</div>
    <div class="row noprint" style="margin-top:16px">
      <button class="btn primary" id="again">Do this check again</button>
      <button class="btn" id="share">Share as text</button>
      <button class="btn" onclick="window.print()">Print / PDF</button>
    </div>
    <button class="btn small danger noprint" id="del" style="margin-top:18px">Delete</button>
  </main>`;
  $("#again").onclick = () => { sessionStorage.setItem("checkAgain", c.asset || ""); go("#/check/new/" + c.template); };
  $("#share").onclick = async () => {
    const text = checkText(c);
    try { if (navigator.share) { await navigator.share({ title: c.title, text }); return; } } catch (e) { if (e.name === "AbortError") return; }
    try { await navigator.clipboard.writeText(text); toast("Copied – paste it into a message or email"); } catch (e) { toast("Couldn't share"); }
  };
  $("#del").onclick = async () => {
    if (!confirm(c.exported ? "Delete this check from the phone? (The PC copy is kept.)" : "This check hasn't been exported. Delete it anyway?")) return;
    await DB.del("checks", id); go("#/checks");
  };
}

async function exportChecks(list) {
  if (!list.length) return;
  const zip = new JSZip();
  zip.file("checks.json", JSON.stringify({ format: "tree-survey-checks", version: 1, app: APP_VERSION, exported: new Date().toISOString(), checks: list }, null, 1));
  zip.file("Checks.txt", list.map(c => c.kind === "incident" ? incidentText(c) : checkText(c)).join("\r\n\r\n" + "-".repeat(60) + "\r\n\r\n"));
  const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
  const fname = `Checks ${today()} ${new Date().toTimeString().slice(0, 5).replace(":", "")}.zip`;
  const file = new File([blob], fname, { type: "application/zip" });
  let shared = false;
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: fname, text: `${list.length} check${list.length > 1 ? "s" : ""}` }); shared = true; }
    catch (e) { if (e.name === "AbortError") { toast("Export cancelled"); return; } }
  }
  if (!shared) {
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = fname;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
  }
  const now = Date.now();
  for (const c of list) { c.exported = now; await DB.put("checks", c); }
  toast(shared ? "Exported" : `Saved ${fname} to Downloads`, 3500);
  if (location.hash === "#/checks") route();
}

// ------------------------------------------------------------------ near miss / accident report
const INCIDENT_TYPES = ["Near miss", "Accident – no injury", "Injury – first aid only", "Injury – hospital / doctor",
  "Damage to property or vehicle", "Dangerous occurrence", "Ill health"];
const PERSON_ROLES = ["Self", "Employee", "Contractor", "Member of the public", "Other"];
const riddorFlag = r => ["Injury – hospital / doctor", "Dangerous occurrence", "Ill health"].includes(r.type) || r.offWork ||
  (r.type || "").startsWith("Injury") && (r.people || []).some(p => p.role === "Member of the public");
const blobToData = b => new Promise(res => { const f = new FileReader(); f.onload = () => res(f.result); f.readAsDataURL(b); });

async function incidentForm() {
  const s = await settings();
  const jobs = (await DB.all("jobs")).sort((a, b) => (b.updated || 0) - (a.updated || 0));
  const assets = [...new Set((await DB.all("checks")).filter(c => c.kind !== "incident").map(c => c.asset).filter(Boolean))];
  const old = await DB.get("settings", "incidentDraft");
  const now = new Date(), local = new Date(now - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  const rec = old && old.rec ? old.rec : { id: uid(), kind: "incident", template: "incident", title: "Near miss / accident report",
    type: "", happened: local, site: jobs[0] ? jobs[0].site || "" : "", job: "", place: "", grid: "", lat: null, lon: null,
    people: [{ name: s.consultant || "", role: "Self" }], injury: "", offWork: false, what: "", action: "", witnesses: "",
    equipment: "", prevent: "", photos: [], by: s.consultant || "", sig: "" };
  const keep = () => DB.put("settings", { id: "incidentDraft", rec }).catch(() => { });
  const injury = () => /^Injury|Ill health/.test(rec.type);
  app.innerHTML = `
  <header class="top"><button aria-label="Back" id="back">‹</button><h1>Near miss / accident<span class="sub">Report it the same day</span></h1></header>
  <main class="checkform">
    <div class="warn">In an emergency call <b>999 / 112</b> first. Make the area safe, give first aid, then report.</div>
    <label>What kind?</label><div class="chips" id="itype">${INCIDENT_TYPES.map(t => `<button class="chip ${rec.type === t ? "on" : ""}" data-v="${esc(t)}">${esc(t)}</button>`).join("")}</div>
    <label for="i_when">When</label><input id="i_when" type="datetime-local" value="${esc(rec.happened)}">
    <label for="i_site">Site</label><input id="i_site" list="i_sites" value="${esc(rec.site)}">
    <datalist id="i_sites">${[...new Set(jobs.map(j => j.site).filter(Boolean))].map(x => `<option value="${esc(x)}">`).join("")}</datalist>
    <div class="card gps"><div class="status"><div class="big" id="i_grid">${esc(rec.grid || "No location yet")}</div><div class="meta">Where it happened</div></div>
      <button class="btn small" id="i_gps">📍 GPS here</button></div>
    <label for="i_place">Exact spot</label><input id="i_place" value="${esc(rec.place)}" placeholder="e.g. footpath by T12, layby on the A68">
    <h3 class="subhead">People involved</h3><div id="i_people"></div><button class="btn small" id="i_addp">＋ Add person</button>
    <div id="i_injbox" ${injury() ? "" : "hidden"}>
      <label for="i_injury">Injury – what and where on the body</label><textarea id="i_injury" rows="2">${esc(rec.injury)}</textarea>
      <label class="check"><input type="checkbox" id="i_off" ${rec.offWork ? "checked" : ""}> Off work or unable to do normal work afterwards</label>
    </div>
    <div id="i_dambox" ${injury() ? "hidden" : ""}><label for="i_damage">Damage (if any)</label><textarea id="i_damage" rows="2">${esc(injury() ? "" : rec.injury)}</textarea></div>
    <label for="i_what">What happened</label><textarea id="i_what" rows="4" placeholder="What were you doing, what went wrong, what was the result">${esc(rec.what)}</textarea>
    <label for="i_action">Immediate action / first aid given</label><textarea id="i_action" rows="2">${esc(rec.action)}</textarea>
    <label for="i_wit">Witnesses (names and phone)</label><input id="i_wit" value="${esc(rec.witnesses)}">
    <label for="i_eq">Equipment or vehicle involved</label><input id="i_eq" list="i_assets" value="${esc(rec.equipment)}">
    <datalist id="i_assets">${assets.map(a => `<option value="${esc(a)}">`).join("")}</datalist>
    <label for="i_prev">How could it be stopped happening again?</label><textarea id="i_prev" rows="2">${esc(rec.prevent)}</textarea>
    <h3 class="subhead">Photos</h3><div class="photos" id="i_photos"></div>
    <div class="row"><button class="btn small" id="i_cam">📷 Take photo</button><button class="btn small" id="i_gal">Add from gallery</button></div>
    <div id="i_riddor" class="warn" ${riddorFlag(rec) ? "" : "hidden"}>This may be <b>reportable to HSE under RIDDOR</b> – serious injuries and dangerous occurrences straight away, over-7-day absences within 15 days. Export it today and check on the PC (Compliance → Near misses and accidents).</div>
    <label for="i_by">Reported by</label><input id="i_by" value="${esc(rec.by)}">
    <label>Signature</label><canvas class="sig" id="i_sig"></canvas><button class="btn small" id="i_sigclr">Clear signature</button>
    <div id="i_msg"></div>
    <div class="stack" style="margin-top:14px"><button class="btn primary block" id="i_save">Save report</button></div>
    <button class="btn small danger" id="i_discard" style="margin-top:18px">Discard</button>
  </main>`;
  const flag = () => { $("#i_riddor").hidden = !riddorFlag(rec); };
  const drawPeople = () => {
    $("#i_people").innerHTML = rec.people.map((m, n) => `<div class="prow" data-m="${n}"><input class="pn" placeholder="Name" value="${esc(m.name)}">
      <select class="pr">${PERSON_ROLES.map(r => `<option ${m.role === r ? "selected" : ""}>${r}</option>`).join("")}</select>
      <button class="btn small danger pd" aria-label="Remove">✕</button></div>`).join("");
    $("#i_people").querySelectorAll("[data-m]").forEach(el => {
      const m = rec.people[+el.dataset.m];
      el.querySelector(".pn").oninput = e => { m.name = e.target.value; keep(); };
      el.querySelector(".pr").onchange = e => { m.role = e.target.value; keep(); flag(); };
      el.querySelector(".pd").onclick = () => { rec.people.splice(+el.dataset.m, 1); keep(); drawPeople(); flag(); };
    });
  };
  drawPeople();
  const drawPhotos = () => {
    $("#i_photos").innerHTML = rec.photos.map((p, n) => `<div class="ph" data-n="${n}"><img alt="" src="${p.data}">
      <button class="x" aria-label="Delete photo">×</button><input placeholder="Caption" value="${esc(p.caption || "")}"></div>`).join("");
    $("#i_photos").querySelectorAll(".ph").forEach(el => {
      const ph = rec.photos[+el.dataset.n];
      el.querySelector("input").oninput = e => { ph.caption = e.target.value; keep(); };
      el.querySelector(".x").onclick = () => { rec.photos.splice(+el.dataset.n, 1); keep(); drawPhotos(); };
    });
  };
  drawPhotos();
  const addPhotos = async files => {
    for (const f of files) rec.photos.push({ data: await blobToData(await shrink(f, 1200)), caption: "" });
    keep(); drawPhotos();
  };
  $("#i_cam").onclick = () => pickFiles("#cam", addPhotos);
  $("#i_gal").onclick = () => pickFiles("#gallery", addPhotos);
  $("#itype").onclick = e => {
    const b = e.target.closest(".chip"); if (!b) return;
    rec.type = b.dataset.v; $("#itype").querySelectorAll(".chip").forEach(c => c.classList.toggle("on", c === b));
    $("#i_injbox").hidden = !injury(); $("#i_dambox").hidden = injury(); keep(); flag();
  };
  const bind = (id, k, ev = "input") => { $(id)[`on${ev}`] = () => { rec[k] = $(id).value; keep(); }; };
  bind("#i_when", "happened"); bind("#i_site", "site"); bind("#i_place", "place"); bind("#i_what", "what"); bind("#i_action", "action");
  bind("#i_wit", "witnesses"); bind("#i_eq", "equipment"); bind("#i_prev", "prevent"); bind("#i_by", "by");
  $("#i_injury").oninput = () => { rec.injury = $("#i_injury").value; keep(); };
  $("#i_damage").oninput = () => { rec.injury = $("#i_damage").value; keep(); };
  $("#i_off").onchange = () => { rec.offWork = $("#i_off").checked; keep(); flag(); };
  $("#i_addp").onclick = () => { rec.people.push({ name: "", role: "Employee" }); keep(); drawPeople(); };
  $("#i_gps").onclick = () => {
    toast("Getting a GPS fix…"); let best = null;
    startGps(c => { best = c; }, st => {
      if (st === "done" && best) {
        rec.lat = +best.latitude.toFixed(7); rec.lon = +best.longitude.toFixed(7); rec.grid = OSGB.fromLatLon(rec.lat, rec.lon).ref;
        $("#i_grid").textContent = rec.grid; keep(); toast(`Location recorded (±${Math.round(best.accuracy)} m)`);
      } else if (st === "denied" || st === "error" || st === "unavailable") toast("No GPS fix – describe the spot instead");
    });
  };
  const pad = sigPad($("#i_sig"), rec.sig, v => { rec.sig = v; keep(); });
  $("#i_sigclr").onclick = () => pad.clear();
  $("#back").onclick = () => go("#/checks");
  $("#i_discard").onclick = async () => { if (confirm("Discard this report?")) { await DB.del("settings", "incidentDraft"); go("#/checks"); } };
  $("#i_save").onclick = async () => {
    const msg = [];
    if (!rec.type) msg.push("Choose what kind of incident it was.");
    if (!rec.what.trim()) msg.push("Say what happened.");
    if (!rec.by.trim()) msg.push("Who is reporting it?");
    if (msg.length) { $("#i_msg").innerHTML = `<div class="warn">${msg.map(esc).join("<br>")}</div>`; $("#i_msg").scrollIntoView({ block: "center" }); return; }
    const j = jobs.find(x => x.site === rec.site);
    rec.job = j ? [j.client, j.site].filter(Boolean).join(" – ") : "";
    rec.asset = rec.site; rec.assetLabel = "Site"; rec.result = rec.type;
    rec.people = rec.people.filter(m => m.name || m.role !== "Self");
    rec.when = new Date().toISOString();
    await DB.put("checks", rec); await DB.del("settings", "incidentDraft");
    toast(riddorFlag(rec) ? "Saved – export it today (RIDDOR check)" : "Report saved – export it to the PC");
    go("#/check/" + rec.id);
  };
}

function incidentText(c) {
  return [`Near miss / accident report – ${c.type}`, `When: ${(c.happened || "").replace("T", " ")}`,
    `Where: ${[c.site, c.place, c.grid].filter(Boolean).join(", ")}`,
    `People: ${(c.people || []).map(p => p.name + (p.role ? ` (${p.role})` : "")).join(", ")}`,
    c.injury ? `Injury / damage: ${c.injury}${c.offWork ? " – off normal work" : ""}` : "",
    `What happened: ${c.what}`, c.action ? `Immediate action: ${c.action}` : "", c.witnesses ? `Witnesses: ${c.witnesses}` : "",
    c.equipment ? `Equipment: ${c.equipment}` : "", c.prevent ? `To stop it happening again: ${c.prevent}` : "",
    `Reported by: ${c.by}`].filter(Boolean).join("\r\n");
}

function incidentView(c) {
  const row = (k, v) => v ? `<div><b>${esc(k)}:</b> ${esc(v)}</div>` : "";
  app.innerHTML = `
  <header class="top"><button aria-label="Back" onclick="go('#/checks')">‹</button><h1>${esc(c.type)}<span class="sub">${esc(c.site || "")}</span></h1></header>
  <main class="checkview">
    ${riddorFlag(c) ? `<div class="warn">May be reportable under RIDDOR – export it and check on the PC today.</div>` : ""}
    <div class="card">${row("When", (c.happened || "").replace("T", " "))}${row("Site", c.site)}${row("Exact spot", c.place)}${row("Grid ref", c.grid)}
      ${row("People", (c.people || []).map(p => p.name + (p.role ? ` (${p.role})` : "")).join(", "))}
      ${row(/^Injury|Ill/.test(c.type) ? "Injury" : "Damage", c.injury)}${c.offWork ? "<div><b>Off normal work</b></div>" : ""}</div>
    <h3 class="subhead">What happened</h3><p>${esc(c.what)}</p>
    ${c.action ? `<h3 class="subhead">Immediate action</h3><p>${esc(c.action)}</p>` : ""}
    <div class="card">${row("Witnesses", c.witnesses)}${row("Equipment", c.equipment)}${row("To stop it happening again", c.prevent)}</div>
    ${(c.photos || []).length ? `<h3 class="subhead">Photos</h3><div class="photos">${c.photos.map(p => `<div class="ph"><img alt="" src="${p.data}"><div class="hint">${esc(p.caption || "")}</div></div>`).join("")}</div>` : ""}
    <h3 class="subhead">Reported by</h3><div class="sigline"><span>${esc(c.by || "")}</span>${c.sig ? `<img src="${c.sig}" alt="signature">` : ""}</div>
    <p class="hint">${c.exported ? "Exported to the PC." : "<b class='no'>Not exported yet</b> – export it from the Checks page."}</p>
    <div class="row noprint" style="margin-top:16px"><button class="btn" id="share">Share as text</button><button class="btn" onclick="window.print()">Print / PDF</button></div>
    <button class="btn small danger noprint" id="del" style="margin-top:18px">Delete</button>
  </main>`;
  $("#share").onclick = async () => {
    const text = incidentText(c);
    try { if (navigator.share) { await navigator.share({ title: "Near miss / accident report", text }); return; } } catch (e) { if (e.name === "AbortError") return; }
    try { await navigator.clipboard.writeText(text); toast("Copied – paste it into a message or email"); } catch (e) { toast("Couldn't share"); }
  };
  $("#del").onclick = async () => {
    if (!confirm(c.exported ? "Delete this report from the phone? (The PC copy is kept.)" : "This report hasn't been exported. Delete it anyway?")) return;
    await DB.del("checks", c.id); go("#/checks");
  };
}
