// Tree Survey – © 2026 Mark Johnson. All rights reserved. Use only under a written licence from the owner.
/* Site safety check – the on-arrival (dynamic) risk assessment that goes with the job's RAMS.
   Stored on the job (job.safety, newest last), exported as "Site safety check.txt" in the survey zip. */
"use strict";

const SAFETY_CHECKS = [
  ["weather", "Weather and wind OK for the work (no gales, lightning or poor visibility)"],
  ["access", "Safe parking and access; access point / what3words noted"],
  ["signal", "Phone signal checked; nominated person told of arrival and finish time"],
  ["hazards", "Hazards on site as expected in the RAMS (traffic, lines, water, livestock, public, terrain)"],
  ["ppe", "Correct PPE worn"],
  ["firstaid", "First-aid kit carried"],
];
const SAFETY_EXTRA = {
  roadside: ["traffic", "Hi-vis on; working from verge / footway facing traffic, not in the carriageway"],
  drone: ["drone", "Drone: airspace, permission and weather checked; take-off area clear; pre-flight checks done"],
  site: ["induction", "Construction site: inducted and signed in"],
};
const WIND = ["Calm", "Light", "Moderate", "Strong – stop", "Gale – stop"];

function safetyChecks(job, rec) {
  const list = SAFETY_CHECKS.slice();
  if (roadside(job)) list.push(SAFETY_EXTRA.roadside);
  if ((rec && rec.drone) || job.drone) list.push(SAFETY_EXTRA.drone);
  if (job.type === "BS5837") list.push(SAFETY_EXTRA.site);
  return list;
}

function safetyToday(job) {
  const d = today();
  return (job.safety || []).filter(r => (r.when || "").slice(0, 10) === d).pop();
}

function safetyText(job) {
  const out = [`Site safety check – ${job.site}${job.client ? " (" + job.client + ")" : ""}`, ""];
  for (const r of job.safety || []) {
    out.push(`${new Date(r.when).toLocaleString("en-GB")} – ${r.by || "surveyor"}`);
    out.push(`  Wind: ${r.wind || "not recorded"}${r.weatherNote ? " – " + r.weatherNote : ""}`);
    for (const [k, l] of safetyChecks(job, r)) out.push(`  [${({ yes: "Yes", no: "NO", na: "N/A" })[r.checks?.[k]] || " – "}] ${l}`);
    if (r.access) out.push(`  Access point: ${r.access}`);
    if (r.checkin) out.push(`  Check-in with: ${r.checkin}`);
    if (r.hazards) out.push(`  Additional hazards / action: ${r.hazards}`);
    out.push(`  Safe to proceed: ${r.proceed ? "YES" : "NO – work not started / stopped"}`, "");
  }
  return out.join("\r\n");
}

async function safetyPage(jobId) {
  const job = await DB.get("jobs", jobId), s = await settings();
  const last = (job.safety || []).slice(-1)[0] || {};
  const r = { when: new Date().toISOString(), by: job.consultant || s.consultant || "", checks: {}, wind: "",
    access: last.access || "", checkin: last.checkin || s.checkin || "", drone: !!job.drone, hazards: "", proceed: false };
  const draw = () => {
    const list = safetyChecks(job, r);
    const bad = list.some(([k]) => r.checks[k] === "no") || /stop/.test(r.wind);
    const done = list.every(([k]) => r.checks[k]) && r.wind;
    app.innerHTML = `
    <header class="top"><button aria-label="Back" onclick="go('#/job/${jobId}')">‹</button><h1>Site safety check<span class="sub">${esc(job.site)}</span></h1></header>
    <main>
      <p class="hint">Do this on arrival and whenever conditions change. Any "No" means stop and re-plan.</p>
      <label>Wind</label><div class="chips" id="wind">${WIND.map(w => `<button class="chip ${r.wind === w ? "on" : ""}" data-v="${w}">${w}</button>`).join("")}</div>
      <label for="wn">Weather notes</label><input id="wn" value="${esc(r.weatherNote || "")}" placeholder="e.g. dry, good visibility">
      <label class="check"><input type="checkbox" id="drone" ${r.drone ? "checked" : ""}> Flying the drone today</label>
      ${list.map(([k, l]) => `<div class="safetyrow"><div>${esc(l)}</div><div class="chips" data-k="${k}">
        ${[["yes", "Yes"], ["no", "No"], ["na", "N/A"]].map(([v, t]) => `<button class="chip small ${r.checks[k] === v ? "on" : ""} ${v === "no" ? "danger" : ""}" data-v="${v}">${t}</button>`).join("")}</div></div>`).join("")}
      <label for="acc">Access point (grid ref / what3words)</label><input id="acc" value="${esc(r.access)}">
      <label for="ci">Check-in with (name, phone, times)</label><input id="ci" value="${esc(r.checkin)}">
      <label for="hz">Additional hazards and action taken</label><textarea id="hz" rows="3">${esc(r.hazards)}</textarea>
      <label for="by">Checked by</label><input id="by" value="${esc(r.by)}">
      ${bad ? `<div class="warn">Something isn't safe – don't start (or stop) and re-plan. You can still save the check as a record.</div>` : ""}
      <div class="row" style="margin-top:14px">
        <button class="btn ${bad ? "" : "primary"}" id="ok" ${done && !bad ? "" : "disabled"}>✓ Safe to proceed</button>
        <button class="btn danger" id="stop">✕ Not safe – stopped</button></div>
      ${(job.safety || []).length ? `<h3 class="subhead">Earlier checks</h3>${job.safety.slice().reverse().map(x =>
        `<div class="hint">${new Date(x.when).toLocaleString("en-GB")} – ${esc(x.by || "")} – ${x.proceed ? "safe to proceed" : "NOT safe"}${x.hazards ? " – " + esc(x.hazards) : ""}</div>`).join("")}` : ""}
    </main>`;
    $("#wind").onclick = e => { const b = e.target.closest(".chip"); if (!b) return; r.wind = b.dataset.v; keep(); draw(); };
    app.querySelectorAll("[data-k]").forEach(g => g.onclick = e => { const b = e.target.closest(".chip"); if (!b) return; r.checks[g.dataset.k] = b.dataset.v; keep(); draw(); });
    $("#drone").onchange = () => { keep(); r.drone = $("#drone").checked; draw(); };
    const save = async ok => {
      keep(); r.proceed = ok; r.when = new Date().toISOString();
      job.safety = (job.safety || []).concat([Object.assign({}, r)]);
      if (r.drone) job.drone = true;
      await touchJob(job);
      if (r.checkin && !s.checkin) { s.checkin = r.checkin; await DB.put("settings", s); }
      toast(ok ? "Safety check saved – safe to proceed" : "Saved – work stopped");
      go(`#/job/${jobId}`);
    };
    $("#ok").onclick = () => save(true);
    $("#stop").onclick = () => save(false);
  };
  const keep = () => {
    const v = id => { const el = document.getElementById(id); return el ? el.value : undefined; };
    if (v("wn") !== undefined) { r.weatherNote = v("wn"); r.access = v("acc"); r.checkin = v("ci"); r.hazards = v("hz"); r.by = v("by"); }
  };
  draw();
}
