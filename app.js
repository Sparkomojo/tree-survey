// Tree Survey – © 2026 Mark Johnson. All rights reserved. Use only under a written licence from the owner.
/* Tree Survey – offline field capture for the AMR / BS5837 report builders.
   Everything is stored on the device (IndexedDB). Export makes a zip:
     Survey.xlsx or BS5837_Survey.xlsx  – columns the report builders read
     Photos/T1 bracket fungi.jpg …      – named the way the builders caption them
     data.json                          – full survey, for the PC importer and for restoring onto another device
*/
"use strict";

// ------------------------------------------------------------------ constants
const APP_VERSION = "1.33";
const AMR_HEAD = ["Site", "Tag", "W3W / Grid Ref", "Species", "Height (m)", "DBH (mm)", "Crown Spread (m)",
  "Comments", "Recommendations", "Ash Dieback", "Constraints", "Latitude", "Longitude", "Accuracy (m)", "Bat PRF"];
const BS_HEAD = ["Tag", "TPO", "Species", "Height (m)", "Stem Diameter (mm)", "No. of Stems", "Crown Spread N",
  "Crown Spread E", "Crown Spread S", "Crown Spread W", "Crown Clearance (m)", "First Branch", "Life Stage",
  "Physiological Condition", "Structural Condition", "Comments", "Recommendations", "ERC (years)", "Category",
  "Retain/Remove", "RPA Incursion", "AIA Notes", "VALID Risk", "QTRA Risk of Harm", "QTRA Target", "QTRA Size",
  "QTRA PoF", "W3W / Grid Ref", "Latitude", "Longitude", "Bat PRF", "QTRA Mass %", "Mx Targets", "THREATS Score", "THREATS Indicator", "CAVAT (£)", "Change Since Last Survey", "Zone", "Veteran Features", "End Grid Ref", "End Latitude", "End Longitude"];
const RISK_HEAD = ["VALID Risk", "QTRA Risk of Harm", "QTRA Target", "QTRA Size", "QTRA PoF", "QTRA Mass %", "Mx Targets", "THREATS Score", "THREATS Indicator"];
const ADB = ["", "Cat. 1: 0-25%", "Cat. 2: 26-50%", "Cat. 3: 51-75%", "Cat. 4: 76-100%"];
// older versions had the categories numbered the other way round – keep the crown loss, fix the number
const adbFix = v => { const m = /(\d+)\s*[-–]\s*(\d+)\s*%/.exec(v || ""); if (!m) return v || ""; const lo = +m[1]; return ADB[lo < 26 ? 1 : lo < 51 ? 2 : lo < 76 ? 3 : 4]; };
// Scottish Woodlands roadside / PROW surveys: bands, five-level VALID scale, constraints
const SW = /scottish\s*woodlands?/i;
const roadside = job => !!job && job.type !== "BS5837" && job.format === "Roadside/PROW";
const BANDS = {
  height: ["0 - 5", "6 - 10", "11 - 15", "16 - 20", "21 - 25", "26+"],
  dbh: ["<100", "100 - 200", "200 - 300", "300 - 400", "400 - 500", "500 - 600", "600 - 700", "700 - 800", "800 - 900", "900 - 1000", ">1000"],
  spread: ["0 - 5", "6 - 10", "11 - 15", "16 - 20", "21 - 25", "26+"],
};
const VALID_SW = ["Acceptable", "Tolerable", "Tolerable?", "Not Tolerable", "Unacceptable"];
const CONS_SW = ["Overhead cables", "Water course", "No mechanical access", "Overhead structures", "Birds", "Highway", "Footpath", "Bridleway"];
const DEFAULT_PHRASES = {
  obs: ["No significant defects observed", "Minor deadwood", "Major deadwood", "Ivy cover", "Basal cavity", "Cavity",
    "Decay", "Bracket fungi", "Included union", "Co-dominant stems", "Crossing branches", "Hanging branch",
    "Stem wound", "Bark damage", "Lean", "Root plate heave", "Crown dieback", "Sparse crown", "Epicormic growth",
    "Previously pollarded", "Previously reduced", "Storm damage", "Asymmetric crown", "Suppressed", "Self-set",
    "Previously laid (hedge)", "Stems removed from hedgerow"],
  recs: ["No work required", "Fell", "Fell to ground level", "Remove deadwood", "Crown lift to 6 m over highway",
    "Crown lift to 3 m over footpath", "Crown reduce by 2 m", "Crown thin by 15%", "Sever ivy at base",
    "Remove hanging branch", "Pollard", "Reduce to monolith", "Advanced inspection (sonic tomography)",
    "Re-inspect in 12 months", "Re-inspect in 18 months", "Monitor"],
  cons: ["Highway", "Footpath", "Public open space", "Property", "Car park", "Overhead lines", "Boundary wall", "Play area"],
  weather: ["Dry", "Overcast", "Sunny", "Light rain", "Light winds", "Good visibility", "Leaf off", "In leaf"],
};
const LIFE = ["Y", "SM", "EM", "M", "OM", "V"], COND = ["Good", "Fair", "Poor", "Dead"], STRUCT = ["Good", "Fair", "Poor"];
const RISK_METHODS = ["VALID", "QTRA", "THREATS", "CAVAT"];
// land ownership; linear routes (road, railway, footpath): which side / direction each tree is on, in the direction of travel
const OWNERSHIP = ["Client", "Third party", "Not known"];
const routeDirs = job => { const r = job.route || {}; const a = r.from || "start", b = r.to || "end";
  return [r.dir1 || `${a} to ${b}`, r.dir2 || `${b} to ${a}`, "Central reserve"]; };
const riskMethods = job => job.riskMethods || (roadside(job) ? ["VALID"] : ["VALID", "QTRA"]);
// QTRA only for a surveyor on the registered-assessor list in Settings
const qtraAllowed = (s, job) => (s.qtraAssessors || []).some(a => {
  const name = a.split(/\s+[–-]\s+/)[0].trim().toLowerCase(), who = (job.consultant || s.consultant || "").trim().toLowerCase();
  return name && who && (who === name || who.includes(name) || name.includes(who));
});
const CROWN_MODES = [["spread", "Spread (diameter)"], ["radius", "Radius"], ["cardinal", "N / E / S / W radii"]];
const ERC = ["<10", "10+", "20+", "40+"], CATS = ["A1", "A2", "A3", "B1", "B2", "B3", "C1", "C2", "C3", "U"];

// ------------------------------------------------------------------ tiny helpers
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
const today = () => new Date().toISOString().slice(0, 10);
const ukDate = iso => iso ? iso.split("-").reverse().join("/") : "";
const safeName = s => String(s || "").replace(/[\\/:*?"<>|#%]+/g, "-").replace(/\s+/g, " ").trim().slice(0, 80);
const tagKey = t => { const m = /^([A-Za-z]*)\s*(\d+)(.*)$/.exec(t || ""); return m ? [m[1].toUpperCase(), +m[2], m[3]] : [String(t || ""), 0, ""]; };
const byTag = (a, b) => { const x = tagKey(a.tag), y = tagKey(b.tag); return x[0] < y[0] ? -1 : x[0] > y[0] ? 1 : x[1] - y[1] || (x[2] < y[2] ? -1 : 1); };
const common = sp => { const p = String(sp || "").split(/\s+[-–]\s+/); return p[1] || p[0] || ""; };

// BS 5837:2012 4.4.2.6 measurement conventions
// heights, spreads, clearance: nearest 0.5 m up to 10 m, nearest 1 m above (spreads rounded UP); stem diameter: nearest 10 mm
function bsRound(v, kind) {
  const s = String(v ?? "").trim();
  if (!/^\d+(\.\d+)?$/.test(s)) return s;  // ranges, multi-stem etc. are left as typed
  const x = +s;
  if (kind === "dia") return String(Math.round(x / 10) * 10);
  const step = x > 10 ? 1 : 0.5, f = kind === "spread" ? Math.ceil : Math.round;
  let r = f(x / step - 1e-9) * step;
  if (kind === "spread" && r < x) r += step;
  return String(+r.toFixed(1));
}
// species for groups / hedges / woodland: several "Botanical - Common" names -> "Bot1, Bot2 - common1, common2 and common3"
function speciesText(t) {
  const all = [...(t.speciesMore || []), t.species].map(x => String(x || "").trim()).filter(Boolean);
  if (all.length < 2) return all[0] || "";
  const bots = [], coms = [];
  for (const x of all) { const p = x.split(/\s+[-–]\s+/); if (p[1]) { bots.push(p[0]); coms.push(p[1]); } else coms.push(p[0]); }
  const c = coms.map((x, i) => i ? x.charAt(0).toLowerCase() + x.slice(1) : x);
  const list = c.length > 1 ? c.slice(0, -1).join(", ") + " and " + c[c.length - 1] : c[0];
  return bots.length ? `${bots.join(", ")} - ${list}` : list;
}
let toastTimer;
function toast(msg, ms = 2200) { const t = $("#toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), ms); }

// ------------------------------------------------------------------ storage (IndexedDB)
const DB = (() => {
  let dbp;
  function open() {
    dbp = dbp || new Promise((res, rej) => {
      const r = indexedDB.open("tree-survey", 3);
      r.onupgradeneeded = e => {
        const d = r.result;
        if (e.oldVersion < 1) {
          d.createObjectStore("jobs", { keyPath: "id" });
          d.createObjectStore("trees", { keyPath: "id" }).createIndex("job", "jobId");
          const p = d.createObjectStore("photos", { keyPath: "id" });
          p.createIndex("job", "jobId"); p.createIndex("tree", "treeId");
          d.createObjectStore("settings", { keyPath: "id" });
        }
        if (e.oldVersion < 2) d.createObjectStore("checks", { keyPath: "id" });  // v1.19: vehicle / plant / site checks
        if (e.oldVersion < 3) d.createObjectStore("features", { keyPath: "id" }).createIndex("job", "jobId");  // v1.21: nests, ecology
      };
      r.onblocked = () => toast("Close the app's other tabs or windows to finish updating", 6000);
      r.onsuccess = () => { const d = r.result; d.onversionchange = () => d.close(); res(d); };
      r.onerror = () => rej(r.error);
    });
    return dbp;
  }
  const req = r => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  async function tx(store, mode, fn) { const d = await open(); const t = d.transaction(store, mode); const out = fn(t.objectStore(store)); await new Promise((res, rej) => { t.oncomplete = res; t.onerror = () => rej(t.error); t.onabort = () => rej(t.error); }); return out; }
  const norm = (s, v) => s === "jobs" ? (Array.isArray(v) ? v.map(normJob) : normJob(v)) : v;
  return {
    get: async (s, id) => norm(s, await req((await open()).transaction(s).objectStore(s).get(id))),
    all: async s => norm(s, await req((await open()).transaction(s).objectStore(s).getAll())),
    by: async (s, idx, v) => req((await open()).transaction(s).objectStore(s).index(idx).getAll(v)),
    put: (s, v) => tx(s, "readwrite", st => st.put(s === "jobs" ? storeJob(v) : v)),
    del: (s, id) => tx(s, "readwrite", st => st.delete(id)),
  };
})();

// several site plans per job: job.plans [{id, name, blob, w, h, ctrl, opacity, scale…}], job.planId = the one shown.
// job.plan is always the plan in use (the same object as its entry in job.plans), so older code keeps working.
function normJob(j) {
  if (!j || typeof j !== "object") return j;
  if (!Array.isArray(j.plans)) {
    j.plans = [];
    if (j.plan && j.plan.blob) { j.plan.id = j.plan.id || "p-" + Date.now().toString(36); j.plans.push(j.plan); j.planId = j.plan.id; }
  }
  j.plan = j.plans.find(p => p.id === j.planId) || null;
  return j;
}
function storeJob(j) {
  if (!j || !Array.isArray(j.plans)) return j;
  if (j.plan && j.plan.blob && !j.plans.includes(j.plan)) {  // a plan set the old way (job.plan = {...})
    j.plan.id = j.plan.id || "p-" + Date.now().toString(36);
    j.plans = j.plans.filter(p => p.id !== j.plan.id).concat([j.plan]); j.planId = j.plan.id;
  }
  if (!j.plan) j.planId = j.plans.some(p => p.id === j.planId) ? j.planId : null;
  const c = Object.assign({}, j); delete c.plan; return c;
}
function usePlan(job, id) { job.planId = id; job.plan = (job.plans || []).find(p => p.id === id) || null; }

async function settings() {
  const s = (await DB.get("settings", "main")) || { id: "main", consultant: "", phrases: {} };
  s.phrases = Object.assign({}, DEFAULT_PHRASES, s.phrases || {});
  return s;
}

// ------------------------------------------------------------------ routing
const app = $("#app");
let leaveHook = null;
async function route() {
  if (leaveHook) { try { await leaveHook(); } catch (e) { console.error(e); } leaveHook = null; }
  if (typeof LASER !== "undefined") { LASER.on = null; LASER.status = null; }
  const h = location.hash.replace(/^#\/?/, "").split("/");
  window.scrollTo(0, 0);
  try {
    if (h[0] === "job" && h[2] === "tree") return await treePage(h[1], h[3]);
    if (h[0] === "job" && h[2] === "wdocs") return await worksDocsPage(h[1]);
    if (h[0] === "job" && h[2] === "witem") return await worksItemPage(h[1], h[3]);
    if (h[0] === "job" && h[2] === "wmap") return await worksMapPage(h[1], h[3]);
    if (h[0] === "job" && h[2] === "wdone") return await worksDonePage(h[1]);
    if (h[0] === "job" && h[2] === "wextra") return await worksExtraPage(h[1]);
    if (h[0] === "job" && h[2] === "qitem") return await quoteItemPage(h[1], h[3]);
    if (h[0] === "quote" && h[1] === "new") return await quoteDetailsPage(null);
    if (h[0] === "notes") return await routeNotesPage();
    if (h[0] === "job" && h[2] === "feat") return await featurePage(h[1], h[3], h[4]);
    if (h[0] === "job" && h[2] === "featmap") return await featMapPage(h[1], h[3]);
    if (h[0] === "job" && h[2] === "eco") return await ecoListPage(h[1]);
    if (h[0] === "job" && h[2] === "nestcheck") return await nestCheckPage(h[1]);
    if (h[0] === "job" && h[2] === "trees") return await jobPage(h[1], true);
    if (h[0] === "job" && h[2] === "details") return await detailsPage(h[1]);
    if (h[0] === "job" && h[2] === "photos") return await sitePhotosPage(h[1]);
    if (h[0] === "job" && h[2] === "map") return await mapPage(h[1], h[3] || "browse", h[4]);
    if (h[0] === "job" && h[2] === "plan") return await planPage(h[1]);
    if (h[0] === "job" && h[2] === "pin") return await pinPage(h[1]);
    if (h[0] === "job" && h[2] === "scale") return await scalePage(h[1]);
    if (h[0] === "job" && h[2] === "ruler") return await rulerPage(h[1]);
    if (h[0] === "job" && h[2] === "locate") return await locatePage(h[1]);
    if (h[0] === "job" && h[2] === "layers") return await layersPage(h[1]);
    if (h[0] === "job" && h[2] === "safety") return await safetyPage(h[1]);
    if (h[0] === "job") return await jobPage(h[1]);
    if (h[0] === "new") return await detailsPage(null);
    if (h[0] === "settings") return await settingsPage();
    if (h[0] === "install") return installPage();
    if (h[0] === "lone") return await lonePage();
    if (h[0] === "checks") return await checksPage();
    if (h[0] === "incident" && h[1] === "new") return await incidentForm();
    if (h[0] === "check" && h[1] === "new") return await checkForm(h[2]);
    if (h[0] === "check") return await checkView(h[1]);
    return await homePage();
  } catch (e) { console.error(e); app.innerHTML = `<main><div class="warn">Something went wrong: ${esc(e.message)}</div><a class="btn" href="#/">Home</a></main>`; }
}
window.addEventListener("hashchange", route);
const go = h => { if (location.hash === h) route(); else location.hash = h; };

// ------------------------------------------------------------------ home
let installEvt = null;
window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); installEvt = e; });
const installed = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
function installApp() { if (installEvt) { installEvt.prompt(); installEvt = null; } else go("#/install"); }

// there's nothing to download: "installing" puts the web app on the home screen / Start menu and keeps it offline
function installPage() {
  app.innerHTML = `
  <header class="top"><button aria-label="Back" onclick="history.length > 1 ? history.back() : go('#/')">‹</button><h1>Install the app</h1></header>
  <main>
    <p>Tree Survey is a <b>web app</b> – there's no file to download or app store to visit. Installing it puts an icon on your
      home screen (or Start menu), opens it full screen and lets it work with no signal. Your surveys stay on this device either way.</p>
    <h3 class="subhead">Android phone or tablet (Chrome)</h3>
    <ol><li>Open this page in <b>Chrome</b>.</li><li>Tap the <b>⋮</b> menu (top right).</li>
      <li>Tap <b>Add to Home screen</b> (or <b>Install app</b>), then <b>Install</b>.</li></ol>
    <h3 class="subhead">iPhone or iPad (Safari)</h3>
    <ol><li>Open this page in <b>Safari</b>.</li><li>Tap the <b>Share</b> button (square with an arrow).</li>
      <li>Tap <b>Add to Home Screen</b>, then <b>Add</b>.</li></ol>
    <h3 class="subhead">Windows PC (Chrome or Edge)</h3>
    <ol><li>Click the <b>install icon</b> at the right-hand end of the address bar (a screen with a small arrow),
      or the <b>⋮ / …</b> menu → <b>Cast, save and share</b> (Chrome) or <b>Apps</b> (Edge) → <b>Install</b>.</li>
      <li>If the address bar shows <b>Open in app</b>, it's <b>already installed</b> – click that, or find
      <b>Tree Survey</b> in the Start menu.</li></ol>
    <p class="hint">Updates arrive by themselves: open the app with signal (open it a second time if the version number in ⚙ Settings hasn't changed).</p>
    <p class="hint">This is version ${APP_VERSION}${installed() ? " – running as an installed app" : ""}.</p>
    <p class="hint">Tree Survey © 2026 Mark Johnson. All rights reserved.</p>
  </main>`;
}

async function homePage() {
  const jobs = (await DB.all("jobs")).sort((a, b) => (b.updated || 0) - (a.updated || 0));
  const st_ = await settings();
  const trees = await DB.all("trees");
  const count = id => trees.filter(t => t.jobId === id).length;
  const worksOnly = jobs.length && jobs.every(isWorks) && !st_.surveyTools;  // a contractor's phone: just their works orders
  app.innerHTML = `
  <header class="top"><h1><img src="icons/favicon-48.png" alt="" class="hlogo">Tree Survey</h1><button aria-label="Settings" onclick="go('#/settings')">⚙</button></header>
  <main>
    ${worksOnly ? "" : `<button class="btn primary block" onclick="go('#/new')">＋ New site survey</button>
    <button class="btn block" style="margin-top:8px" onclick="go('#/quote/new')">📷 ＋ Quote visit – photos, works, crew and kit</button>
    <button class="btn block" style="margin-top:8px" onclick="go('#/notes')">📝 Route notes – daily site note (PDF)</button>`}
    <button class="btn block" style="margin-top:8px" onclick="go('#/checks')">✓ Checks – vehicle, plant, kit and site</button>
    ${loneBanner(st_) || `<button class="btn block" style="margin-top:8px" onclick="go('#/lone')">🛡 Lone working – check in</button>`}
    ${jobs.length ? jobs.map(j => isWorks(j) ? worksCard(j) : isQuote(j) ? quoteCard(j) : `
      <a class="card job" href="#/job/${j.id}">
        <h3>${esc(j.site || "Untitled site")}</h3>
        <div class="meta"><span class="badge ${j.type === "BS5837" ? "bs" : j.type === "NEST" ? "nest" : ""}">${esc(TYPE_LABEL[j.type] || j.type)}</span>
          ${esc(j.client || "")} · ${ukDate(j.surveyDate)} · ${count(j.id)} tree${count(j.id) === 1 ? "" : "s"}</div>
        <div class="meta">${j.exported ? `Exported ${new Date(j.exported).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}${j.updated > j.exported ? " · <b class='no'>changed since</b>" : ""}` : "<b class='no'>Not exported yet</b>"}</div>
      </a>`).join("") : `<div class="empty">No surveys yet.<br>Tap <b>New site survey</b> to start.</div>`}
    <p class="hint">${worksOnly ? "Works orders are saved on this phone and work without signal. Open each one to sign in, record the works and send the return when you've finished."
      : "Surveys are saved on this device and work without signal. Tap <b>Export</b> on each site when you're done to send it to your PC (OneDrive, email…)."}</p>
    <div class="row">
      <button class="btn small" onclick="restoreZip()">Open a zip (works pack, survey or plans)</button>
      ${worksOnly ? `<button class="btn small" id="survtools">Survey tools</button>` : ""}
      ${installed() ? "" : `<button class="btn small" id="install" onclick="installApp()">Install app</button>`}
    </div>
  </main>`;
  if ($("#survtools")) $("#survtools").onclick = async () => { st_.surveyTools = true; await DB.put("settings", st_); route(); };
}

// ------------------------------------------------------------------ local authority from the postcode or GPS (postcodes.io)
async function laLookup(address) {
  const real = v => (v && !/^\(pseudo\)|non-National Park/.test(v)) ? v : "";
  const shape = (r, from) => ({ district: real(r.admin_district), county: real(r.admin_county), park: real(r.national_park), from });
  if (!navigator.onLine) throw new Error("No signal – type the council in, or look it up later.");
  const m = /\b([A-Z]{1,2}\d[A-Z\d]?)\s*(\d[A-Z]{2})\b/i.exec(address || "");
  if (m) {
    const pc = `${m[1]} ${m[2]}`.toUpperCase();
    const r = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(pc)}`);
    if (r.ok) return shape((await r.json()).result, `postcode ${pc}`);
  }
  const pos = await new Promise((ok, bad) => navigator.geolocation ? navigator.geolocation.getCurrentPosition(p => ok(p.coords), () => bad(new Error("No postcode in the address and no GPS – type the council in.")), { enableHighAccuracy: false, timeout: 15000 }) : bad(new Error("No postcode in the address.")));
  const r = await fetch(`https://api.postcodes.io/postcodes?lon=${pos.longitude}&lat=${pos.latitude}&radius=2000&limit=1`);
  const res = r.ok ? ((await r.json()).result || [])[0] : null;
  if (!res) throw new Error("No postcode within 2 km of here – type the council in.");
  return shape(res, "your GPS position");
}

// ------------------------------------------------------------------ job details (new / edit)
async function detailsPage(id) {
  if (id && isQuote(await DB.get("jobs", id))) return quoteDetailsPage(id);
  const s = await settings();
  const job = id ? await DB.get("jobs", id) : { id: uid(), type: "AMR", client: "", site: "", address: "", surveyDate: today(), weather: "", siteDescription: "", notes: "", consultant: s.consultant, created: Date.now() };
  if (!job) return go("#/");
  app.innerHTML = `
  <header class="top"><button aria-label="Back" onclick="history.back()">‹</button><h1>${id ? "Site details" : "New site survey"}</h1></header>
  <main>
    <label>Survey type</label>
    <div class="chips" id="type">${[["AMR", "AMR (management report)"], ["BS5837", "BS5837 (AIA / AMS)"], ["NEST", "Nesting bird check"], ["PROPERTY", "Property (mortgage / subsidence)"], ["ESTAB", "Young tree establishment check"]].map(([t, l]) => `<button class="chip ${job.type === t ? "on" : ""}" data-v="${t}">${l}</button>`).join("")}</div>
    <label for="client">Client</label><input id="client" value="${esc(job.client)}" autocomplete="organization" placeholder="e.g. Patchwork Project">
    <div id="fmtwrap" hidden><label>Report format (Scottish Woodlands)</label>
      <div class="chips" id="format">${[["Roadside/PROW", "Roadside / PROW"], ["Parkland", "Parkland (AMR)"]].map(([v, l]) => `<button class="chip ${job.format === v ? "on" : ""}" data-v="${v}">${l}</button>`).join("")}</div></div>
    <label class="check" id="bandswrap"><input type="checkbox" id="bands" ${job.bands ? "checked" : ""}> Record height, DBH and spread in bands (e.g. 6 - 10 m)</label>
    <label class="check"><input type="checkbox" id="routeOn" ${job.route ? "checked" : ""}> Linear route (road, railway or footpath) – record each tree's direction / side and marker post, for reports in the direction of travel</label>
    <div id="routeWrap" ${job.route ? "" : "hidden"}>
      <div class="grid2"><div><label for="rFrom">Route from</label><input id="rFrom" value="${esc((job.route || {}).from || "")}" placeholder="e.g. A1(M) J63"></div>
        <div><label for="rTo">to</label><input id="rTo" value="${esc((job.route || {}).to || "")}" placeholder="e.g. A1(M) J65"></div></div>
      <div class="grid2"><div><label for="rDir1">Direction 1 name (optional)</label><input id="rDir1" value="${esc((job.route || {}).dir1 || "")}" placeholder="e.g. Northbound"></div>
        <div><label for="rDir2">Direction 2 name (optional)</label><input id="rDir2" value="${esc((job.route || {}).dir2 || "")}" placeholder="e.g. Southbound"></div></div>
      <div class="hint">Direction 1 runs from the start to the end of the route and is reported first. A tree's direction is the carriageway (or side) it stands beside.</div>
    </div>
    <label class="check"><input type="checkbox" id="trial" ${job.trial ? "checked" : ""}> Drone method trial – record the method, a drone flag (red / amber / green), the time and the time beside live traffic for each tree</label>
    <label>Risk / valuation methods on this survey</label>
    <div class="chips" id="riskMethods">${RISK_METHODS.map(m => `<button class="chip ${riskMethods(job).includes(m) ? "on" : ""}" data-v="${m}">${m}</button>`).join("")}</div>
    <div id="cavatwrap" ${riskMethods(job).includes("CAVAT") ? "" : "hidden"}><div class="hint" id="ctiOut"></div></div>
    <div id="crownwrap"><label>Crown recorded as</label>
      <div class="chips" id="crownMode">${CROWN_MODES.map(([v, l]) => `<button class="chip ${(job.crownMode || "spread") === v ? "on" : ""}" data-v="${v}">${l}</button>`).join("")}</div></div>
    <div id="boltwrap"></div>
    <label for="site">Site name</label><input id="site" value="${esc(job.site)}" placeholder="e.g. Bells Haven Wood">
    <label for="address">Address (commas between parts)</label><input id="address" value="${esc(job.address)}" placeholder="Riverside Way, Rowlands Gill, Tyne and Wear, NE39 1DD">
    <label for="cavatLA">Local authority (council)</label>
    <div style="display:flex;gap:8px"><input id="cavatLA" list="laList" value="${esc(job.cavatLA || "")}" placeholder="e.g. Gateshead" autocomplete="off" style="flex:1">
      <button class="btn small" id="laLook" type="button">Look up</button></div>
    <datalist id="laList">${CAVAT_CTI.map(x => `<option value="${esc(x[0])}">`).join("")}</datalist>
    <label for="hwyLA">Highway authority</label><input id="hwyLA" value="${esc(job.highwayAuthority || "")}" placeholder="County council in two-tier areas, else the same council" autocomplete="off">
    <div class="hint" id="laOut">${job.nationalPark ? `In ${esc(job.nationalPark)} – the National Park Authority deals with TPOs and Conservation Areas.` : ""}</div>
    <div class="grid2">
      <div><label for="surveyDate">Survey date</label><input id="surveyDate" type="date" value="${esc(job.surveyDate)}"></div>
      <div><label for="consultant">Surveyor</label><input id="consultant" value="${esc(job.consultant || "")}"></div>
    </div>
    <label for="firstTag">First tag number (optional)</label><input id="firstTag" value="${esc(job.firstTag || "")}" placeholder="T1 – or e.g. 2001 if you use pre-numbered tags" autocapitalize="characters" autocomplete="off">
    <label for="weather">Weather / conditions</label><input id="weather" value="${esc(job.weather)}">
    <div class="chips phr">${s.phrases.weather.map(w => `<button class="chip" data-add="weather" data-sep=", ">${esc(w)}</button>`).join("")}</div>
    <label for="siteDescription">Site description</label><textarea id="siteDescription">${esc(job.siteDescription)}</textarea>
    <label for="notes">Notes (not exported to the report)</label><textarea id="notes">${esc(job.notes)}</textarea>
    ${id ? `<button class="btn danger block" style="margin-top:28px" onclick="deleteJob('${job.id}')">Delete this survey</button>` : ""}
  </main>
  <div class="bar"><button class="btn primary" id="save">${id ? "Save" : "Start surveying"}</button></div>`;
  const showFmt = () => {  // the roadside / parkland choice only appears for Scottish Woodlands AMR jobs
    const sw = SW.test($("#client").value) && job.type !== "BS5837";
    $("#fmtwrap").hidden = !sw;
    $("#bandswrap").hidden = job.type === "BS5837";
    $("#crownwrap").hidden = job.type === "BS5837" || job.type === "NEST";  // BS 5837 always uses the four cardinal radii
    $("#riskMethods").hidden = ["NEST", "PROPERTY", "ESTAB"].includes(job.type);
    if (job.type === "NEST") $("#bandswrap").hidden = true;
    if (sw && !job.format) { job.format = "Roadside/PROW"; job.bands = true; $("#bands").checked = true; }
    $("#format").querySelectorAll(".chip").forEach(c => c.classList.toggle("on", c.dataset.v === job.format));
  };
  $("#type").onclick = e => { const b = e.target.closest(".chip"); if (!b) return; job.type = b.dataset.v; $("#type").querySelectorAll(".chip").forEach(c => c.classList.toggle("on", c === b)); showFmt(); boltDetails(job, s); };
  $("#format").onclick = e => { const b = e.target.closest(".chip"); if (!b) return; job.format = b.dataset.v; if (job.format === "Roadside/PROW") { job.bands = true; $("#bands").checked = true; } showFmt(); };
  $("#bands").onchange = e => { job.bands = e.target.checked; };
  $("#trial").onchange = e => { job.trial = e.target.checked; };
  $("#routeOn").onchange = e => { $("#routeWrap").hidden = !e.target.checked; };
  $("#riskMethods").onclick = e => {
    const b = e.target.closest(".chip"); if (!b) return;
    const cur = new Set(riskMethods(job)); cur.has(b.dataset.v) ? cur.delete(b.dataset.v) : cur.add(b.dataset.v);
    job.riskMethods = RISK_METHODS.filter(m => cur.has(m));
    $("#riskMethods").querySelectorAll(".chip").forEach(c => c.classList.toggle("on", cur.has(c.dataset.v)));
    $("#cavatwrap").hidden = !cur.has("CAVAT");
  };
  const ctiShow = () => { const c = CAVAT.cti($("#cavatLA").value.trim()); $("#ctiOut").textContent = c ? `CAVAT: ${$("#cavatLA").value.trim()} – Community Tree Index ${c}%` : $("#cavatLA").value ? "CAVAT: the local authority isn't in the CTI list – pick from the suggestions" : "CAVAT: set the local authority above"; };
  $("#cavatLA").addEventListener("input", ctiShow); ctiShow();
  $("#laLook").onclick = async () => {
    const out = $("#laOut"); out.textContent = "Looking up…";
    try {
      const r = await laLookup($("#address").value);
      $("#cavatLA").value = r.district; $("#hwyLA").value = r.county || r.district; job.nationalPark = r.park || "";
      out.textContent = (r.from ? `From ${r.from}. ` : "") + (r.park ? `In ${r.park} – the National Park Authority deals with TPOs and Conservation Areas. ` : "") +
        "Check it on sites near a council boundary."; ctiShow();
    } catch (e) { out.textContent = e.message || "Lookup failed – type the council in."; }
  };
  $("#crownMode").onclick = e => { const b = e.target.closest(".chip"); if (!b) return; job.crownMode = b.dataset.v; $("#crownMode").querySelectorAll(".chip").forEach(c => c.classList.toggle("on", c === b)); };
  $("#client").addEventListener("input", showFmt);
  showFmt();
  boltDetails(job, s);
  bindAppendChips();
  $("#save").onclick = async () => {
    for (const f of ["client", "site", "address", "surveyDate", "consultant", "firstTag", "weather", "siteDescription", "notes"]) job[f] = $("#" + f).value.trim();
    job.cavatLA = $("#cavatLA").value.trim();
    job.highwayAuthority = $("#hwyLA").value.trim();
    job.route = $("#routeOn").checked ? { from: $("#rFrom").value.trim(), to: $("#rTo").value.trim(), dir1: $("#rDir1").value.trim(), dir2: $("#rDir2").value.trim() } : null;
    if (!SW.test(job.client) || job.type === "BS5837") job.format = "";
    if (!job.site) { toast("Enter a site name"); $("#site").focus(); return; }
    job.updated = Date.now();
    await DB.put("jobs", job);
    if (job.consultant && job.consultant !== s.consultant) { s.consultant = job.consultant; await DB.put("settings", s); }
    if (id) history.back(); else location.replace("#/job/" + job.id);
  };
}

async function deleteJob(id) {
  if (!confirm("Delete this survey and all its trees and photos from this device?\n\nExport it first if you haven't.")) return;
  for (const t of await DB.by("trees", "job", id)) await DB.del("trees", t.id);
  for (const p of await DB.by("photos", "job", id)) await DB.del("photos", p.id);
  for (const f of await DB.by("features", "job", id)) await DB.del("features", f.id);
  await DB.del("jobs", id);
  location.replace("#/");
}

// append-phrase chips: <button class="chip" data-add="fieldId">Phrase</button>
function bindAppendChips(onChange) {
  app.querySelectorAll("[data-add]").forEach(b => b.onclick = e => {
    e.preventDefault();
    const el = document.getElementById(b.dataset.add), phrase = b.textContent.trim();
    const sep = b.dataset.sep || ". ";
    let v = el.value.trim();
    if (sep === ". ") { if (v && !/[.!?]$/.test(v)) v += "."; el.value = (v ? v + " " : "") + phrase + "."; }
    else el.value = v ? v + sep + phrase : phrase;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    if (onChange) onChange();
  });
}

// ------------------------------------------------------------------ job page (tree list)
async function jobPage(id, treesOnly) {
  const job = await DB.get("jobs", id);
  if (!job) return go("#/");
  if (job.type === "NEST" && !treesOnly) return nestJobPage(job);
  if (isWorks(job)) return worksJobPage(job);  // a contractor's works order (works pack from the PC)
  if (isQuote(job)) return quotePage(job);      // a site visit before quoting (quote.js)
  const bo = bolts(job), feats = await DB.by("features", "job", id);
  const trees = (await DB.by("trees", "job", id)).sort(byTag);
  const photos = await DB.by("photos", "job", id);
  const pc = tid => photos.filter(p => p.treeId === tid).length;
  const sitePc = photos.filter(p => !p.treeId).length;
  app.innerHTML = `
  <header class="top"><button aria-label="Home" onclick="go(${treesOnly ? `'#/job/${id}'` : "'#/'"})">‹</button>
    <h1>${esc(job.site)}<span class="sub">${esc(roadside(job) ? "Roadside / PROW" : TYPE_LABEL[job.type] || job.type)} · ${esc(job.client || "")} · ${ukDate(job.surveyDate)}</span></h1>
    <button aria-label="Site details" onclick="go('#/job/${id}/details')">✎</button></header>
  <main>
    <div class="row">
      <button class="btn small" onclick="go('#/job/${id}/photos')">📷 Photos (${sitePc})</button>
      <button class="btn small" onclick="go('#/job/${id}/map')">🗺 Map</button>
      <button class="btn small green" onclick="exportJob('${id}')">⇪ Export</button>
      ${trees.length ? `<button class="btn small" onclick="resurvey('${id}')">↻ Re-survey</button>` : ""}
      ${bo.nest && job.type !== "NEST" ? `<button class="btn small" onclick="go('#/job/${id}/feat/nest/new')">🐦 ＋ Nest (${feats.filter(f => f.kind === "nest").length})</button>` : ""}
      ${bo.eco ? `<button class="btn small" onclick="go('#/job/${id}/eco')">🦡 Ecology (${feats.filter(f => f.kind === "eco").length})</button>` : ""}
      ${treesOnly ? `<button class="btn small" onclick="go('#/job/${id}')">🐦 Nest check</button>` : ""}
      ${(() => { const c = safetyToday(job); return `<button class="btn small ${c ? (c.proceed ? "" : "danger") : "warnbtn"}" onclick="go('#/job/${id}/safety')">${c ? (c.proceed ? "✓ Safety check done" : "✕ Not safe today") : "⚠ Safety check"}</button>`; })()}
    </div>
    ${trees.length > 6 ? `<input class="search" id="q" placeholder="Find a tree (tag or species)" type="search">` : ""}
    <div id="list">${trees.map(t => `
      <a class="card tree" href="#/job/${id}/tree/${t.id}" data-s="${esc((t.tag + " " + t.species).toLowerCase())}">
        <div class="tag ${job.type === "BS5837" && t.category ? t.category[0] : ""}">${esc(t.tag)}</div>
        <div class="info">
          <div class="name">${t.urgent ? '<span class="no">⚠ </span>' : ""}${esc(common((t.speciesMore || [])[0] || t.species) || "Species?")}${(t.speciesMore || []).length ? ` +${t.speciesMore.length - (t.species ? 0 : 1)}` : ""}${job.type === "BS5837" && t.category ? ` · ${esc(t.category)}` : ""}${t.estimated ? " · est." : ""}</div>
          <div class="meta">${[t.height && `H ${esc(t.height)} m`, t.dbh && `DBH ${esc(t.dbh)}`, pc(t.id) && `📷 ${pc(t.id)}`].filter(Boolean).join(" · ")}
            ${t.lat ? `<span class="ok">· 📍</span>` : `<span class="no">· no GPS</span>`}</div>
          <div class="rec">${esc(t.recs || t.comments || "")}</div>
        </div></a>`).join("") || `<div class="empty">No trees yet.<br>Stand by the first tree and tap <b>＋ Tree</b>.</div>`}</div>
    <p class="hint">${trees.length} tree${trees.length === 1 ? "" : "s"} · ${photos.length} photo${photos.length === 1 ? "" : "s"}</p>
    ${job.trial ? (() => { const n = f => trees.filter(t => t.droneFlag === f).length, g = n("Red") + n("Amber");
      return `<p class="hint">🛩 Drone flags: <b style="color:#C8102E">${n("Red")} red</b> · <b style="color:#B07A00">${n("Amber")} amber</b> · <b style="color:#2F8A3B">${n("Green")} green</b>${g ? ` – ${g} ground check${g === 1 ? "" : "s"} to do` : ""}</p>`; })() : ""}
  </main>
  <button class="btn primary fab" onclick="go('#/job/${id}/tree/new')">＋ Tree</button>`;
  const q = $("#q");
  if (q) q.oninput = () => { const v = q.value.toLowerCase().trim(); app.querySelectorAll("#list .tree").forEach(a => a.hidden = v && !a.dataset.s.includes(v)); };
}

function nextTag(trees, job) {
  // first tree: the survey's starting tag (e.g. 2001 or T2001), otherwise T1
  if (!trees.length) return (job && job.firstTag) ? String(job.firstTag).trim().toUpperCase() : "T1";
  const last = [...trees].sort((a, b) => (a.created || 0) - (b.created || 0)).pop();
  const prefix = roadside(job) ? "T" : tagKey(last.tag)[0];  // keep the same letter – or none, for plain numbers like 2001
  // roadside / PROW: one number series across T and TG (T1, T2, TG3, T4 …)
  const max = Math.max(0, ...trees.map(t => tagKey(t.tag)).filter(k => roadside(job) || k[0] === prefix).map(k => k[1]));
  return prefix + (max + 1);
}

// metres between two [lat, lon] points (good enough for a hedge length)
function L_dist(a, b) {
  const R = 6371000, r = Math.PI / 180, dLat = (b[0] - a[0]) * r, dLon = (b[1] - a[1]) * r;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

// ------------------------------------------------------------------ GPS
let gpsWatch = null, gpsTimer = null;
function stopGps() { if (gpsWatch !== null) navigator.geolocation.clearWatch(gpsWatch); gpsWatch = null; clearTimeout(gpsTimer); }
function startGps(onFix, onState) {
  stopGps();
  if (!("geolocation" in navigator)) return onState("unavailable");
  let best = null;
  onState("searching");
  gpsWatch = navigator.geolocation.watchPosition(p => {
    const c = p.coords;
    if (!best || c.accuracy <= best.accuracy) { best = c; onFix(c); }
    if (c.accuracy <= 4) { stopGps(); onState("done"); }
  }, err => { stopGps(); onState(err.code === 1 ? "denied" : "error", err.message); },
  { enableHighAccuracy: true, maximumAge: 0, timeout: 30000 });
  gpsTimer = setTimeout(() => { stopGps(); onState(best ? "done" : "error", "No fix after 45 s"); }, 45000);
}

// ------------------------------------------------------------------ tree form
async function treePage(jobId, treeId) {
  const job = await DB.get("jobs", jobId);
  if (!job) return go("#/");
  const s = await settings();
  const all = await DB.by("trees", "job", jobId);
  const isNew = treeId === "new";
  const t = isNew ? { id: uid(), jobId, tag: nextTag(all, job), species: "", created: Date.now() } : await DB.get("trees", treeId);
  if (!t) return go("#/job/" + jobId);
  const bs = job.type === "BS5837", rs = roadside(job);
  if (t.adb) t.adb = adbFix(t.adb);
  const bandChips = k => `<div class="chips bands" data-band="${k}">${BANDS[k].map(b => `<button class="chip small ${t[k] === b ? "on" : ""}" data-v="${b}">${b}</button>`).join("")}</div>`;
  let persisted = !isNew, dirty = false, saveTimer = null;
  const opened = Date.now(), sec0 = t.surveySec || 0;  // drone method trial: time spent on this tree
  const stampTime = () => { if (job.trial) t.surveySec = Math.round(sec0 + (Date.now() - opened) / 1000); };
  const recentSpecies = [...new Set(all.sort((a, b) => (b.updated || 0) - (a.updated || 0)).map(x => x.species).filter(Boolean))].slice(0, 6);

  const methods = riskMethods(job), useValid = rs || methods.includes("VALID"), useThreats = methods.includes("THREATS") && !rs;
  const useQtra = methods.includes("QTRA") && qtraAllowed(s, job);
  const th = t.threats || {};
  const useCavat = methods.includes("CAVAT"), cv = t.cavat || {};
  const cvPick = (k, opts) => `<div class="chips" data-cv="${k}">${opts.map(([v, l]) => `<button class="chip small ${String(cv[k]) === String(v) ? "on" : ""}" data-v="${v}">${esc(l)}</button>`).join("")}</div>`;
  const thPick = (k, opts) => `<div class="chips" data-th="${k}">${opts.map(([v, l]) => `<button class="chip small ${String(th[k]) === String(v) ? "on" : ""}" data-v="${v}">${v} – ${esc(l)}</button>`).join("")}</div>`;
  const f = (k, lab, attrs = "") => `<div><label for="f_${k}">${lab}</label><input id="f_${k}" data-f="${k}" value="${esc(t[k] ?? "")}" ${attrs}></div>`;
  const num = (k, lab) => f(k, lab, 'inputmode="decimal" autocomplete="off"');
  const pick = (k, opts) => `<div class="chips" data-pick="${k}">${opts.map(o => `<button class="chip ${t[k] === o ? "on" : ""}" data-v="${esc(o)}">${esc(o)}</button>`).join("")}</div>`;
  const ta = (k, lab, phrases) => `<label for="f_${k}">${lab}</label><textarea id="f_${k}" data-f="${k}">${esc(t[k] ?? "")}</textarea>
    <div class="chips phr">${phrases.map(p => `<button class="chip" data-add="f_${k}"${k === "comments" ? " data-detail" : ""}>${esc(p)}</button>`).join("")}</div>
    ${k === "comments" ? `<div class="row" style="margin-top:6px"><button class="btn small" id="addDefect">＋ Defect / feature</button><button class="btn small" id="addFungus">🍄 Fungus / disease</button><button class="btn small" id="addPest">🐛 Pest / disease</button></div>` : ""}`;

  app.innerHTML = `
  <header class="top"><button aria-label="Back to tree list" id="back">‹</button>
    <h1>${isNew ? "New tree" : "Tree " + esc(t.tag)}<span class="sub">${esc(job.site)}</span></h1>
    ${!isNew ? `<button aria-label="Delete tree" id="del">🗑</button>` : ""}</header>
  <main>
    <div class="grid2" style="align-items:end">
      <div><label for="f_tag">Tag</label><input id="f_tag" data-f="tag" value="${esc(t.tag)}" autocapitalize="characters" autocomplete="off"></div>
      <div class="chips" id="prefix" style="padding-bottom:4px">${(roadside(job) ? ["T", "TG"] : ["T", "G", "H", "W"]).map(p => `<button class="chip" data-p="${p}">${p}</button>`).join("")}</div>
    </div>
    <div id="dupe" class="warn" hidden>Another tree in this survey already has this tag.</div>

    <h2>Location</h2>
    <div class="card gps"><span class="dot" id="gdot"></span>
      <div class="status"><div class="big" id="gref">${t.grid ? esc(t.grid) : "No location yet"}</div><div class="meta" id="gstat">${t.lat ? (t.posSource && t.posSource !== "gps" ? esc(t.posNote || "Placed on map") : `±${Math.round(t.acc || 0)} m GPS`) + ` · ${(+t.lat).toFixed(6)}, ${(+t.lon).toFixed(6)}` : "Stand by the tree and tap Get location"}</div></div>
      <button class="btn small" id="gbtn">${t.lat ? "Update" : "Get location"}</button></div>
    <div class="hint" id="zoneOut">${t.zone ? "Zone: " + esc(t.zone) : ""}</div>
    <div class="row" style="margin-top:8px"><button class="btn small" id="onMap">🗺 Place on map</button><button class="btn small" id="measure">📏 Measure from 2 points</button></div>
    <details class="more" id="laserBox" ${t.posSource === "laser" ? "open" : ""}><summary>🎯 Laser offset – from where you stand</summary>
      <div class="hint">For a tree you can't stand beside, or where GPS is poor under the canopy: stand in the open, get a GPS fix here, aim at the stem and fire. The tree goes at that horizontal distance along the bearing. A rangefinder with a compass (TruPulse 360i) fills both boxes; otherwise type them in (bearing from a hand compass).</div>
      <div class="card"><div class="status"><div class="big" id="stRef">${t.offset ? esc(OSGB.fromLatLon(+t.offset.from.lat, +t.offset.from.lon).ref) : "No standpoint yet"}</div>
        <div class="meta" id="stMeta">${t.offset ? `standpoint ±${Math.round(t.offset.from.acc || 0)} m` : "Stand in the open with a clear view of the tree"}</div></div>
        <button class="btn small" id="stGps">📍 GPS here</button></div>
      <div class="grid2"><div><label for="o_hd">Horizontal distance (m)</label><input id="o_hd" inputmode="decimal" value="${t.offset ? t.offset.hd : ""}"></div>
        <div><label for="o_az">Bearing to the tree (°)</label><input id="o_az" inputmode="decimal" value="${t.offset ? t.offset.az : ""}"></div></div>
      <label class="check"><input type="checkbox" id="o_stem" ${t.offset && !t.offset.add ? "" : "checked"}> Aimed at the stem surface – add half the stem diameter</label>
      <div class="row"><button class="btn small" id="laserBtn">🔗 Connect rangefinder</button><button class="btn small primary" id="o_apply">Use this position</button></div>
      <div class="hint" id="laserStat"></div>
    </details>
    <div class="grid2">${f("w3w", "what3words (optional)", 'placeholder="///word.word.word" autocapitalize="none" autocomplete="off"')}${f("gridManual", "Grid ref override", 'placeholder="NZ 15862 57871" autocapitalize="characters"')}</div>
    ${job.route ? `<label>Direction / side of the route</label>${pick("direction", routeDirs(job))}
      <div class="grid2">${f("markerPost", "Marker post / chainage", 'placeholder="e.g. 123/4" autocomplete="off"')}<div></div></div>` : ""}
    ${job.type === "AMR" || bs ? `<label>Land ownership</label>${pick("ownership", OWNERSHIP)}
      <div id="ownWrap" ${t.ownership === "Third party" ? "" : "hidden"}>${f("landowner", "Landowner / property (if known)", 'placeholder="e.g. Mill Farm, or 12 Station Road" autocomplete="off"')}
        <div class="hint">Trees on third-party land get a letter to the owner (Third-party trees on the PC). Name the property or owner if you can – trees with the same name share a letter.</div></div>` : ""}
    <details class="more" id="lineBox" ${t.end || /^(G|H|TG|W)/i.test(t.tag || "") ? "open" : ""}><summary>Hedge / group as a line (start and end)</summary>
      <div class="hint">The location above is the <b>start</b>. Walk to the other end and record the <b>end</b>; add a bend wherever it changes direction. The plan draws it as a band its crown-spread wide.</div>
      <div class="card"><div class="status"><div class="big" id="endRef">${t.end ? esc(OSGB.fromLatLon(+t.end.lat, +t.end.lon).ref) : "No end yet"}</div>
        <div class="meta" id="lineMeta"></div></div></div>
      <div class="row"><button class="btn small" id="endGps">📍 End – GPS here</button><button class="btn small" id="endMap">🗺 End on map</button></div>
      <div class="row"><button class="btn small" id="viaGps">＋ Bend – GPS here</button><button class="btn small" id="viaMap">＋ Bend on map</button>
        <button class="btn small danger" id="lineClear" ${t.end || (t.via || []).length ? "" : "hidden"}>Clear line</button></div>
    </details>

    <h2>Tree</h2>
    <label for="f_species">Species</label>
    <input id="f_species" data-f="species" list="splist" value="${esc(t.species)}" placeholder="Type common or botanical name" autocomplete="off">
    <datalist id="splist">${SPECIES.map(x => `<option value="${esc(x)}">`).join("")}</datalist>
    <div class="chips" id="moreSp">${(t.speciesMore || []).map((x, i) => `<button class="chip on" data-i="${i}">${esc(common(x))} ✕</button>`).join("")}
      <button class="chip add" id="addSp">＋ Another species</button></div>
    <div class="hint" id="moreSpHint" ${(t.speciesMore || []).length ? "" : "hidden"}>Groups, hedges and woodland: record all woody species present (BS 5837 4.4.2.8). Pick each species in the box and tap ＋.</div>
    ${recentSpecies.length ? `<div class="chips" id="recent">${recentSpecies.map(x => `<button class="chip" data-sp="${esc(x)}">${esc(common(x))}</button>`).join("")}</div>` : ""}
    <div class="grid2">${num("height", "Height (m)")}${f("dbh", bs ? "Stem diameter (mm)" : "DBH (mm)", 'inputmode="decimal" autocomplete="off" placeholder="450 or 3x200"')}</div>
    ${job.bands && !bs ? `<label>Height band (m)</label>${bandChips("height")}<label>DBH band (mm)</label>${bandChips("dbh")}` : ""}
    <div class="hint">Multi-stem: <button class="chip" id="kbd">Switch to full keyboard</button> then type e.g. 200,180,150 or 3x200; groups: 150-300.</div>
    <div class="hint" id="sizeInfo"></div>
    <label class="check"><input type="checkbox" id="fullHeight" ${t.fullHeight ? "checked" : ""}> Tree has reached its full height (growth from now adds strength)</label>
    <label class="check"><input type="checkbox" id="estimated" ${t.estimated ? "checked" : ""}> Dimensions estimated (off-site / no access) – marked # on export</label>
    ${bs ? `<div class="hint">Rounded to BS 5837 4.4.2.6 when you leave a box: 0.5 m up to 10 m, 1 m above (spreads rounded up); stem diameter to 10 mm.</div>` : ""}
    ${bs ? `
      <div class="grid4">${num("spreadN", "Spread N")}${num("spreadE", "E")}${num("spreadS", "S")}${num("spreadW", "W")}</div>
      <div class="grid3">${num("stems", "No. of stems")}${num("clearance", "Clearance (m)")}${f("firstBranch", "First branch", 'placeholder="2.4-N"')}</div>
      <div class="chips" id="fbDir"><span class="hint" style="margin:0 4px 0 0">First branch direction:</span>${["N", "NE", "E", "SE", "S", "SW", "W", "NW"].map(a => `<button class="chip small" data-v="${a}">${a}</button>`).join("")}</div>
      <label>Life stage</label>${pick("lifeStage", LIFE)}
      <label>Physiological condition</label>${pick("physio", COND)}
      <label>Structural condition</label>${pick("struct", STRUCT)}`
    : job.crownMode === "cardinal" ? `<label>Crown radii (m)</label><div class="grid4">${num("spreadN", "N")}${num("spreadE", "E")}${num("spreadS", "S")}${num("spreadW", "W")}</div>`
    : job.crownMode === "radius" ? `<div class="grid2">${num("radius", "Crown radius (m)")}<div></div></div>`
    : `<div class="grid2">${num("spread", "Crown spread (m)")}<div></div></div>${job.bands ? `<label>Spread band (m)</label>${bandChips("spread")}` : ""}`}

    <h2>Assessment</h2>
    <label class="check urgent"><input type="checkbox" id="urgent" ${t.urgent ? "checked" : ""}> ⚠ Needs immediate attention – imminent hazard or serious pest / disease (BS 5837 4.5.9)</label>
    ${ta("comments", "Observations", s.phrases.obs)}
    ${ta("recs", "Recommendations", s.phrases.recs)}
    <div class="row" style="margin-top:6px"><button class="btn small" id="addWorks">＋ Works (BS 3998)</button></div>
    <div class="warn" id="braceWarn" hidden>A union on this tree is naturally braced – thinning, removing the brace or felling a neighbour can overload it. Check before specifying.</div>
    ${bs ? `
      <label>ERC (years)</label>${pick("erc", ERC)}
      <label>Category</label>${pick("category", CATS)}
      <label>Retain / remove</label>${pick("retain", ["Retain", "Remove"])}
      <div class="grid2">${f("rpa", "RPA incursion", 'placeholder="8% – driveway"')}${f("tpo", "TPO ref")}</div>
      <label for="f_aiaNotes">AIA notes</label><input id="f_aiaNotes" data-f="aiaNotes" value="${esc(t.aiaNotes || "")}">`
    : `
      <div id="adbwrap" ${/fraxinus|ash\b/i.test(t.species) || t.adb ? "" : "hidden"}><label>Ash dieback</label>${pick("adb", ADB.slice(1))}</div>
      <label for="f_constraints">Constraints / targets</label><input id="f_constraints" data-f="constraints" value="${esc(t.constraints || "")}">
      <div class="chips phr">${(rs ? CONS_SW : s.phrases.cons).map(p => `<button class="chip" data-add="f_constraints" data-sep=", ">${esc(p)}</button>`).join("")}</div>`}

    <label>Bat roost potential (PRF)</label>${pick("batPrf", ["Yes", "No"])}
    <div class="hint">Leave blank and the report decides from the observations (cavity, decay, splits…). <b>No</b> keeps a tree with a cavity out of the bat section; <b>Yes</b> always includes it.</div>

    <h2>Photos</h2>
    <div class="row"><button class="btn" id="takePhoto">📷 Take photo</button><button class="btn" id="pickPhoto">🖼 From gallery</button></div>
    <div class="photos" id="photos"></div>

    <details class="more" id="riskBox" ${t.valid || t.qtraRoh || t.qtraT || t.threats || rs ? "open" : ""}><summary>Risk rating ${rs ? "(VALID tolerable risk rating)" : "(optional)"}</summary>
      ${useValid ? `<label>VALID</label>${pick("valid", rs ? VALID_SW : ["Acceptable", "Tolerable", "Not acceptable"])}` : ""}
      ${useThreats ? `<h3 class="subhead">THREATS</h3>
      <label>Failure indicator scored</label><select id="th_ind"><option value=""></option>${THREATS.INDICATORS.map((x, i) => `<option value="${i + 1}" ${String(th.ind) === String(i + 1) ? "selected" : ""}>${i + 1}. ${esc(x)}</option>`).join("")}</select>
      <label>Failure score</label>${thPick("f", THREATS.FAILURE)}
      <label>Target score</label>${thPick("t", THREATS.TARGET)}
      <label class="check"><input type="checkbox" id="th_vuln" ${th.vuln ? "checked" : ""}> Unsupervised children / elderly or infirm likely – upgrade target one category</label>
      <label class="check"><input type="checkbox" id="th_child" ${th.child ? "checked" : ""}> Child-specific access</label>
      <label>Impact score</label>${thPick("i", THREATS.IMPACT)}
      <div class="roh" id="thOut"></div>` : ""}
      ${useQtra ? `<h3 class="subhead">QTRA</h3>
      <label>Target type</label>${pick("qtraType", ["Human", "Vehicle", "Property"])}
      <div class="grid3">
        <div><label for="f_qtraT">Target</label><select id="f_qtraT" data-f="qtraT">${["", 1, 2, 3, 4, 5, 6].map(v => `<option ${String(t.qtraT ?? "") === String(v) ? "selected" : ""}>${v}</option>`).join("")}</select></div>
        <div><label for="f_qtraS">Size</label><select id="f_qtraS" data-f="qtraS">${["", 1, 2, 3, 4].map(v => `<option ${String(t.qtraS ?? "") === String(v) ? "selected" : ""}>${v}</option>`).join("")}</select></div>
        <div><label for="f_qtraP">PoF</label><select id="f_qtraP" data-f="qtraP">${["", 1, 2, 3, 4, 5, 6, 7].map(v => `<option ${String(t.qtraP ?? "") === String(v) ? "selected" : ""}>${v}</option>`).join("")}</select></div>
      </div>
      <div class="grid2">
        <div><label for="f_qtraMass">Reduced mass</label><select id="f_qtraMass" data-f="qtraMass">${[["", "Full"], ["50%", "½ (degraded)"], ["25%", "¼ (degraded)"]].map(([v, l]) => `<option value="${v}" ${(t.qtraMass || "") === v ? "selected" : ""}>${l}</option>`).join("")}</select></div>
        ${f("qtraMx", "Multiple targets (Mx)", 'inputmode="numeric" placeholder="1" autocomplete="off"')}
      </div>
      <div class="roh" id="rohOut"></div>
      ${f("qtraRoh", "Risk of Harm (from your QTRA calculator)", 'placeholder="1/250,000" autocomplete="off"')}
      <div class="hint">Work the Risk of Harm out with your QTRA calculator and type it here; the colour shows its band. Size isn't used for property targets.</div>` :
      riskMethods(job).includes("QTRA") ? `<div class="hint">QTRA is only shown for a registered QTRA assessor – add the surveyor and registration number in Settings.</div>` : ""}
    </details>
    ${useCavat ? `<details class="more" id="cavatBox" ${t.cavat ? "open" : ""}><summary>CAVAT value</summary>
      <div class="hint">${job.cavatLA ? `${esc(job.cavatLA)} – CTI ${CAVAT.cti(job.cavatLA) || "?"}%` : "Set the local authority on the site details first."} · UVF £${s.uvf || CAVAT.DEFAULT_UVF} · stem diameter from the box above</div>
      <label>Visibility</label>${cvPick("vis", CAVAT.VIS)}
      <label>Positive attributes (%)</label>${cvPick("pos", CAVAT.ADJ.map(x => [x, x + "%"]))}
      <label>Negative attributes (%)</label>${cvPick("neg", CAVAT.ADJ.map(x => [x, x + "%"]))}
      <label>Primary structure completeness</label>${cvPick("psc", CAVAT.PSC)}
      <label>Primary structure quality</label>${cvPick("psq", CAVAT.QUAL)}
      <label>Crown completeness (%)</label>${cvPick("cc", CAVAT.CC.map(x => [x, x + "%"]))}
      <label>Canopy completeness</label>${cvPick("can", CAVAT.CAN)}
      <label>Crown and canopy quality</label>${cvPick("ccq", CAVAT.QUAL)}
      <label>Life expectancy</label>${cvPick("le", CAVAT.LE)}
      <div class="roh" id="cvOut"></div></details>` : ""}
    ${vetBox(t)}
    ${boltTreeBoxes(t, job, s)}
    ${job.trial ? `<details class="more" id="trialBox" open><summary>🛩 Drone method trial</summary>
      <label>Method for this tree</label>${pick("method", ["Ground", "Drone", "Drone + ground"])}
      <label>Drone flag</label>${pick("droneFlag", ["Red", "Amber", "Green"])}
      <p class="hint">Red – ground check straight away · Amber – ground check · Green – no ground check needed.</p>
      <label for="f_exposure">Time beside live traffic (minutes)</label>
      <input id="f_exposure" data-f="exposureMin" type="number" inputmode="decimal" min="0" step="0.5" value="${esc(t.exposureMin ?? "")}">
      <p class="hint">Time on this tree: <b id="trialTime">${Math.round((t.surveySec || 0) / 60)} min</b> – counted while the tree is open.</p>
    </details>` : ""}
    <div class="saved" id="saved">${persisted ? "Saved" : ""}</div>
  </main>
  <div class="bar"><button class="btn" id="done">✓ Done</button><button class="btn primary" id="next">Save &amp; next tree ›</button></div>`;

  // --- saving: every change is saved automatically
  async function saveNow() {
    clearTimeout(saveTimer);
    if (!dirty) return;
    stampTime();
    t.tag = (t.tag || "").trim().toUpperCase();
    t.updated = Date.now();
    await DB.put("trees", t);
    job.updated = Date.now(); await DB.put("jobs", job);
    persisted = true; dirty = false;
    $("#saved") && ($("#saved").textContent = "Saved ✓");
  }
  const touch = () => { dirty = true; $("#saved").textContent = "Saving…"; clearTimeout(saveTimer); saveTimer = setTimeout(saveNow, 400); };
  // A new tree is only kept once something is entered (or you press Save): the automatic GPS fix on its own doesn't
  // count, so opening ＋ Tree (or Save & next tree) and going back no longer leaves an empty "Species?" tree behind.
  leaveHook = async () => { stopGps(); if (job.trial && persisted) dirty = true;  // keep the time spent on the tree
    if (dirty || (!persisted && hasDetails())) { dirty = true; await saveNow(); } };
  const hasDetails = () => ["species", "height", "dbh", "comments", "recs", "urgent"].some(k => t[k]) || (t.speciesMore || []).length > 0;
  const hasContent = () => hasDetails() || !!t.lat;

  app.querySelectorAll("[data-f]").forEach(el => el.addEventListener("input", () => {
    t[el.dataset.f] = el.value;
    if (el.dataset.f === "tag") checkDupe();
    if (el.dataset.f === "species" && $("#adbwrap")) $("#adbwrap").hidden = !(/fraxinus|ash\b/i.test(el.value) || t.adb);
    touch();
  }));
  app.querySelectorAll("select[data-f]").forEach(el => el.addEventListener("change", () => { t[el.dataset.f] = el.value; touch(); }));
  // QTRA: the Risk of Harm comes from your own QTRA calculator; the app just shows its band colour
  const qtraCalc = () => {
    const prop = t.qtraType === "Property";
    $("#f_qtraS").disabled = prop; if (prop) $("#f_qtraS").value = "";
    const out = $("#rohOut");
    if (t.qtraType === "Vehicle" && String(t.qtraT) === "6") { out.className = "roh roh-amber"; out.textContent = "Vehicles only go to Target 5"; return; }
    const r = QTRA.parse(t.qtraRoh);
    if (!r) { out.className = "roh"; out.textContent = t.qtraRoh ? "Enter the Risk of Harm as 1/250,000" : ""; return; }
    const [b, cls] = QTRA.band(r);
    out.className = "roh " + cls; out.textContent = b;
  };
  if (useQtra) {
    $("[data-pick=qtraType]").addEventListener("click", () => setTimeout(qtraCalc, 0));
    $("#f_qtraRoh").addEventListener("input", qtraCalc);
    qtraCalc();
  }
  // THREATS: failure x target x impact -> Threat Category
  const thCalc = () => {
    const out = $("#thOut"); if (!out) return;
    const sc = THREATS.score(th);
    if (sc == null) { out.className = "roh"; out.textContent = "Choose failure, target and impact scores"; delete t.threatScore; return; }
    const c = THREATS.category(sc);
    t.threatScore = sc; t.threatCat = `${c.n} – ${c.name} (${c.code})`;
    let txt = `${sc} → Category ${c.n} – ${c.name} (${c.code})`;
    if (c.n === 1 && th.child && (th.vuln ? 25 : +th.t) >= 20) txt += " – reinspect within 3 years (child-specific access)";
    out.className = "roh " + c.cls; out.textContent = txt;
  };
  const cvCalc = () => {
    const out = $("#cvOut"); if (!out) return;
    const v = CAVAT.value(cv, t.dbh, s.uvf || CAVAT.DEFAULT_UVF, CAVAT.cti(job.cavatLA));
    if (v == null) { out.className = "roh"; out.textContent = !CAVAT.cti(job.cavatLA) ? "Needs the local authority (site details)" : !CAVAT.stems(t.dbh).length ? "Needs the stem diameter" : "Fill in every factor"; delete t.cavatValue; return; }
    t.cavatValue = v; out.className = "roh roh-green"; out.textContent = "CAVAT value " + CAVAT.money(v);
  };
  bindVet(t, touch);
  window._boltSettings = s; bindBoltTree(t, job, touch);
  if (useCavat) {
    app.querySelectorAll("[data-cv]").forEach(g => g.onclick = e => {
      const b = e.target.closest(".chip"); if (!b) return; e.preventDefault();
      const k = g.dataset.cv; cv[k] = String(cv[k]) === b.dataset.v ? "" : +b.dataset.v;
      g.querySelectorAll(".chip").forEach(c => c.classList.toggle("on", String(cv[k]) === c.dataset.v));
      t.cavat = cv; cvCalc(); touch();
    });
    $("#f_dbh").addEventListener("input", cvCalc);
    cvCalc();
  }
  if (useThreats) {
    app.querySelectorAll("[data-th]").forEach(g => g.onclick = e => {
      const b = e.target.closest(".chip"); if (!b) return; e.preventDefault();
      const k = g.dataset.th; th[k] = String(th[k]) === b.dataset.v ? "" : +b.dataset.v;
      g.querySelectorAll(".chip").forEach(c => c.classList.toggle("on", String(th[k]) === c.dataset.v));
      t.threats = th; thCalc(); touch();
    });
    $("#th_ind").onchange = e => { th.ind = e.target.value; t.threats = th; touch(); };
    $("#th_vuln").onchange = e => { th.vuln = e.target.checked; t.threats = th; thCalc(); touch(); };
    $("#th_child").onchange = e => { th.child = e.target.checked; t.threats = th; thCalc(); touch(); };
    thCalc();
  }
  if (bs) {  // BS 5837 4.4.2.6 rounding when leaving a box
    const kinds = { height: "dim", clearance: "dim", spreadN: "spread", spreadE: "spread", spreadS: "spread", spreadW: "spread", dbh: "dia" };
    for (const [k, kind] of Object.entries(kinds)) {
      const el = $("#f_" + k); if (!el) continue;
      el.addEventListener("blur", () => { const r = bsRound(el.value, kind); if (r !== el.value.trim()) { el.value = r; t[k] = r; touch(); } });
    }
  }
  $("#estimated").onchange = e => { t.estimated = e.target.checked; touch(); };
  $("#fullHeight").onchange = e => { t.fullHeight = e.target.checked; touch(); };
  const sizeShow = () => {
    const c = sizeChange(t), el = $("#sizeInfo");
    el.innerHTML = [c.hd ? `H/D ${c.hd}` : "", c.last ? esc(c.last) : "", c.text ? `<b>${esc(c.text)}</b>` : ""].filter(Boolean).join(" · ");
  };
  ["#f_height", "#f_dbh"].forEach(k => $(k).addEventListener("input", sizeShow)); sizeShow();
  $("#urgent").onchange = e => { t.urgent = e.target.checked; touch(); if (t.urgent) toast("Flagged – tell the client promptly (BS 5837 4.5.9)", 3500); };
  const drawMoreSp = () => {
    const box = $("#moreSp");
    box.innerHTML = (t.speciesMore || []).map((x, i) => `<button class="chip on" data-i="${i}">${esc(common(x))} ✕</button>`).join("") +
      `<button class="chip add" id="addSp">＋ Another species</button>`;
    $("#moreSpHint").hidden = !(t.speciesMore || []).length;
  };
  $("#moreSp").onclick = e => {
    const b = e.target.closest(".chip"); if (!b) return;
    e.preventDefault();
    if (b.id === "addSp") {  // the species in the box joins the list; the box is cleared for the next one
      const v = $("#f_species").value.trim();
      if (!v) { toast("Choose a species first, then tap ＋ to add the next"); $("#f_species").focus(); return; }
      t.speciesMore = (t.speciesMore || []).concat([v]);
      t.species = ""; $("#f_species").value = ""; $("#f_species").focus();
    } else t.speciesMore.splice(+b.dataset.i, 1);
    drawMoreSp(); touch();
  };
  app.querySelectorAll("[data-band]").forEach(g => g.onclick = e => {
    const b = e.target.closest(".chip"); if (!b) return; e.preventDefault();
    const k = g.dataset.band; t[k] = t[k] === b.dataset.v ? "" : b.dataset.v; $("#f_" + k).value = t[k];
    g.querySelectorAll(".chip").forEach(c => c.classList.toggle("on", c.dataset.v === t[k])); touch();
  });
  app.querySelectorAll("[data-pick]").forEach(g => g.onclick = e => {
    const b = e.target.closest(".chip"); if (!b) return;
    const k = g.dataset.pick, v = b.dataset.v;
    t[k] = t[k] === v ? "" : v;
    g.querySelectorAll(".chip").forEach(c => c.classList.toggle("on", c.dataset.v === t[k]));
    if (k === "ownership" && $("#ownWrap")) $("#ownWrap").hidden = t.ownership !== "Third party";
    touch();
  });
  bindAppendChips();
  // observations: size / position / direction panel (Settings → ask for details)
  const addObs = (text, details) => {
    const el = $("#f_comments"); let v = el.value.trim();
    if (v && !/[.!?]$/.test(v)) v += ".";
    el.value = (v ? v + " " : "") + text.replace(/[.\s]+$/, "") + ".";
    t.comments = el.value;
    if (details) t.defects = (t.defects || []).concat([details]);
    braceCheck();
    touch();
  };
  const stemDia = () => { const n = String(t.dbh || "").match(/\d+(?:\.\d+)?/g); return n && n.length === 1 ? +n[0] : null; };
  if (s.askDetails !== false) app.querySelectorAll("[data-detail]").forEach(b => b.onclick = e => {
    e.preventDefault(); defectSheet(b.textContent.trim(), s.phrases.obs, addObs, { dbh: stemDia() });
  });
  $("#addDefect").onclick = e => { e.preventDefault(); defectSheet("", s.phrases.obs, addObs, { dbh: stemDia() }); };
  $("#addFungus").onclick = e => {
    e.preventDefault();
    fungusSheet(speciesText(t) || t.species, f => {
      defectSheet(fungusPhrase(f), s.phrases.obs, (text, details) => {
        addObs(text, details ? Object.assign(details, { fungus: f.sci, significance: f.sig }) : { name: text, fungus: f.sci, significance: f.sig });
        if (f.sig === "High" && !t.recs) toast(`${f.com}: high significance – consider further investigation`, 3500);
      }, { part: f.part, info: fungusInfo(f) });
    });
  };
  $("#addPest").onclick = e => {
    e.preventDefault();
    pestSheet(speciesText(t) || t.species, f => {
      defectSheet(pestPhrase(f), s.phrases.obs, (text, details) => {
        addObs(text, details ? Object.assign(details, { pest: f.sci, significance: f.sig, report: f.report || "" }) : { name: text, pest: f.sci, significance: f.sig, report: f.report || "" });
        if (/notifiable/i.test(f.report || "")) toast(`${f.com} is notifiable – report it through TreeAlert`, 4500);
        else if (f.report) toast(`${f.com}: report it through TreeAlert`, 3500);
        else if (f.sig === "High" && !t.recs) toast(`${f.com}: high significance – consider further investigation`, 3500);
      }, { part: f.part, info: pestInfo(f) });
    });
  };
  const braceCheck = () => {
    const braced = (t.defects || []).some(d => d.union && d.union.brace && d.union.brace !== "None");
    $("#braceWarn").hidden = !(braced && /\b(thin|fell|remov|reduc)/i.test(t.recs || ""));
  };
  $("#f_recs").addEventListener("input", braceCheck);
  $("#addWorks").onclick = e => {
    e.preventDefault();
    const n = v => { const m = String(v ?? "").match(/\d+(?:\.\d+)?/); return m ? +m[0] : null; };
    worksSheet({ bs, height: n(t.height), clearance: n(t.clearance), lifeStage: t.lifeStage, species: speciesText(t) || t.species }, (text, w) => {
      const el = $("#f_recs"); let v = el.value.trim();
      if (/^no work required/i.test(v) && w.op !== "none") v = "";
      if (v && !/[.!?]$/.test(v)) v += ".";
      el.value = (v ? v + " " : "") + text; t.recs = el.value;
      t.works = (t.works || []).concat([w]);
      if (w.time === "Urgent") { t.urgent = true; $("#urgent").checked = true; }
      braceCheck(); touch();
    });
  };
  if ($("#fbDir")) $("#fbDir").onclick = e => {
    const b = e.target.closest(".chip"); if (!b) return;
    const h = (String(t.firstBranch || "").match(/\d+(?:\.\d+)?/) || [""])[0];
    t.firstBranch = `${h ? bsRound(h, "dim") : "?"}-${b.dataset.v}`; $("#f_firstBranch").value = t.firstBranch; touch();
  };
  $("#prefix").onclick = e => {  // T / G / H / W: next free number with that letter
    const b = e.target.closest(".chip"); if (!b) return;
    const p = b.dataset.p, nums = all.filter(x => x.id !== t.id && tagKey(x.tag)[0] === p).map(x => tagKey(x.tag)[1]);
    // pre-numbered tags (a starting number is set): carry on the same number series; otherwise G1, H1…
    const allNums = all.filter(x => x.id !== t.id).map(x => tagKey(x.tag)[1]);
    const start = (job.firstTag || roadside(job)) ? (allNums.length ? Math.max(...allNums) + 1 : tagKey(job.firstTag || "1")[1] || 1) : 1;
    if (roadside(job)) nums.length = 0;  // one number series across T and TG
    t.tag = p + (nums.length ? Math.max(...nums) + 1 : start); $("#f_tag").value = t.tag; checkDupe(); touch();
  };
  const rec = $("#recent"); if (rec) rec.onclick = e => { const b = e.target.closest(".chip"); if (!b) return; t.species = b.dataset.sp; $("#f_species").value = t.species; $("#f_species").dispatchEvent(new Event("input")); };
  $("#kbd").onclick = e => { e.preventDefault(); const d = $("#f_dbh"); d.inputMode = d.inputMode === "text" ? "decimal" : "text"; e.target.textContent = d.inputMode === "text" ? "Back to number pad" : "Switch to full keyboard"; d.blur(); setTimeout(() => d.focus(), 50); };
  function checkDupe() { const tag = (t.tag || "").trim().toUpperCase(); $("#dupe").hidden = !all.some(x => x.id !== t.id && (x.tag || "").toUpperCase() === tag); }
  checkDupe();

  // --- GPS
  const setFix = c => {
    t.lat = +c.latitude.toFixed(7); t.lon = +c.longitude.toFixed(7); t.acc = Math.round(c.accuracy * 10) / 10;
    t.posSource = "gps"; t.posNote = "";
    t.grid = OSGB.fromLatLon(t.lat, t.lon).ref;
    t.zone = zoneFor(job, t.lat, t.lon) || t.zone || "";
    if ($("#zoneOut")) $("#zoneOut").textContent = t.zone ? "Zone: " + t.zone : "";
    $("#gref").textContent = t.grid || `${t.lat.toFixed(6)}, ${t.lon.toFixed(6)}`;
    $("#gstat").textContent = `±${Math.round(t.acc)} m · ${t.lat.toFixed(6)}, ${t.lon.toFixed(6)}`;
    if (persisted || hasDetails()) touch();
  };
  const setState = (st, msg) => {
    const dot = $("#gdot"); if (!dot) return;
    dot.className = "dot " + (st === "searching" ? "live" : st === "done" ? "good" : "");
    $("#gbtn").textContent = st === "searching" ? "Stop" : "Update";
    if (st === "denied") $("#gstat").textContent = "Location permission is off – allow it for this site in your browser settings.";
    else if (st === "error" && !t.lat) $("#gstat").textContent = "No GPS fix: " + (msg || "try again in the open");
    else if (st === "unavailable") $("#gstat").textContent = "This device has no GPS.";
  };
  $("#gbtn").onclick = () => { if (gpsWatch !== null) { stopGps(); setState("done"); } else startGps(setFix, setState); };
  const toMap = async mode => {  // save the tree first so the map can update it
    stopGps(); dirty = true; await saveNow(); leaveHook = null;
    location.hash = `#/job/${jobId}/map/${mode}/${t.id}`;
  };
  $("#onMap").onclick = () => toMap("pick");
  $("#measure").onclick = () => toMap("measure");
  // --- laser offset: GPS standpoint + horizontal distance + bearing (typed, or from a Bluetooth rangefinder)
  let stand = t.offset ? t.offset.from : null;
  const laserStatus = () => {
    const el = $("#laserStat"); if (!el) return;
    el.textContent = LASER.dev ? `Connected to ${LASER.name} – fire it at the tree${LASER.kind === "trupulse" ? " (height routine fills Height)" : ""}.` : "";
    $("#laserBtn").textContent = LASER.dev ? "Disconnect" : "🔗 Connect rangefinder";
  };
  LASER.status = laserStatus;
  LASER.on = msg => {
    if (msg.type === "ht" && msg.ht != null) {
      const h = $("#f_height"); h.value = msg.ht; h.dispatchEvent(new Event("input", { bubbles: true })); h.dispatchEvent(new Event("change", { bubbles: true }));
      toast(`Height ${msg.ht} m`); return;
    }
    const hd = msg.type === "dist" ? msg.d : msg.hd;
    if (hd != null) { $("#laserBox").open = true; $("#o_hd").value = hd; }
    if (msg.az != null) $("#o_az").value = msg.az;
    toast(laserText(msg) + (msg.type === "dist" ? " (use the DISTO's horizontal-distance mode on slopes)" : ""));
  };
  laserStatus();
  $("#laserBtn").onclick = async e => {
    e.preventDefault();
    if (LASER.dev) { laserDisconnect(); laserStatus(); return; }
    try { await laserConnect(); laserStatus(); toast(`Connected to ${LASER.name}`); }
    catch (err) { if (err.name !== "NotFoundError") toast(err.message, 5000); }
  };
  $("#stGps").onclick = e => {
    e.preventDefault();
    linePoint(p => {
      stand = p; $("#stRef").textContent = OSGB.fromLatLon(p.lat, p.lon).ref;
      $("#stMeta").textContent = `standpoint ±${Math.round(p.acc)} m`;
    }, "standpoint");
  };
  $("#o_apply").onclick = async e => {
    e.preventDefault();
    const hd = parseFloat(String($("#o_hd").value).replace(",", ".")), az = parseFloat(String($("#o_az").value).replace(",", "."));
    if (!stand) return toast("Get a GPS fix where you're standing first");
    if (!(hd > 0) || !(az >= 0 && az <= 360)) return toast("Enter the horizontal distance and a bearing (0–360°)");
    const s = await settings(), dec = +s.declination || 0, add = $("#o_stem").checked ? stemRadius(t.dbh) : 0;
    const [lat, lon] = offsetLL(+stand.lat, +stand.lon, hd + add, az + dec);
    t.lat = +lat.toFixed(7); t.lon = +lon.toFixed(7);
    t.acc = Math.round(((stand.acc || 5) + 0.3 + hd * 0.0175) * 10) / 10;  // + ~1° of compass error across the distance
    t.posSource = "laser"; t.offset = { from: stand, hd, az, dec, add: Math.round(add * 100) / 100 };
    t.posNote = `Laser offset ${hd} m at ${az}° from a GPS standpoint (±${Math.round(stand.acc || 0)} m)`;
    t.grid = OSGB.fromLatLon(t.lat, t.lon).ref; t.zone = zoneFor(job, t.lat, t.lon) || t.zone || "";
    stopGps(); $("#gref").textContent = t.grid; $("#gstat").textContent = t.posNote;
    touch(); toast("Position set from the laser offset");
  };
  // --- hedge / group line: start = the tree's position, then bends, then the end
  const lineShow = () => {
    $("#endRef").textContent = t.end ? OSGB.fromLatLon(+t.end.lat, +t.end.lon).ref : "No end yet";
    const pts = t.lat != null && t.lat !== "" && t.end ? [[+t.lat, +t.lon]].concat((t.via || []).map(p => [+p.lat, +p.lon]), [[+t.end.lat, +t.end.lon]]) : null;
    let len = 0;
    if (pts) for (let i = 1; i < pts.length; i++) len += L_dist(pts[i - 1], pts[i]);
    $("#lineMeta").textContent = !t.end ? ((t.via || []).length ? `${t.via.length} bend(s) – now record the end` : "Record the end of the hedge / group")
      : !pts ? "Record the start (the location above) too" : `${Math.round(len)} m long` + ((t.via || []).length ? ` · ${t.via.length} bend(s)` : "") + (t.end.acc ? ` · end ±${Math.round(t.end.acc)} m` : "");
    $("#lineClear").hidden = !(t.end || (t.via || []).length);
  };
  const linePoint = (cb, label) => {
    toast(`Getting a GPS fix for the ${label}…`);
    let best = null;
    startGps(c => { best = c; }, st => {
      if (st === "done" && best) { cb({ lat: +best.latitude.toFixed(7), lon: +best.longitude.toFixed(7), acc: Math.round(best.accuracy * 10) / 10, src: "gps" }); lineShow(); touch(); toast(`${label[0].toUpperCase() + label.slice(1)} recorded (±${Math.round(best.accuracy)} m)`); }
      else if (st === "denied" || st === "error" || st === "unavailable") toast("No GPS fix – use the map instead");
    });
  };
  $("#endGps").onclick = e => { e.preventDefault(); linePoint(p => { t.end = p; }, "end"); };
  $("#viaGps").onclick = e => { e.preventDefault(); linePoint(p => { t.via = (t.via || []).concat([p]); }, "bend"); };
  $("#endMap").onclick = e => { e.preventDefault(); toMap("pickend"); };
  $("#viaMap").onclick = e => { e.preventDefault(); toMap("pickvia"); };
  $("#lineClear").onclick = e => { e.preventDefault(); if (confirm("Clear the end and bends of this line?")) { delete t.end; delete t.via; lineShow(); touch(); } };
  lineShow();
  const lineOpen = () => { if (/^(G|H|TG|W)/i.test($("#f_tag").value)) $("#lineBox").open = true; };
  $("#f_tag").addEventListener("input", lineOpen);
  $("#prefix").addEventListener("click", () => setTimeout(lineOpen, 0));
  if (isNew) startGps(setFix, setState);

  // --- photos
  async function drawPhotos() {
    const list = (await DB.by("photos", "tree", t.id)).sort((a, b) => a.created - b.created);
    const box = $("#photos"); if (!box) return;
    box.querySelectorAll("img").forEach(i => URL.revokeObjectURL(i.src));
    box.innerHTML = list.map(p => `<div class="ph" data-id="${p.id}"><img alt="" src="${URL.createObjectURL(p.blob)}">
      <button class="x" aria-label="Delete photo">×</button><button class="rot" aria-label="Rotate photo">↻</button>
      <input placeholder="Caption, e.g. bracket fungi" value="${esc(p.caption)}"></div>`).join("");
    box.querySelectorAll(".ph").forEach(div => {
      const p = list.find(x => x.id === div.dataset.id);
      div.querySelector("input").onchange = async e => { p.caption = e.target.value.trim(); await DB.put("photos", p); touchJob(job); };
      div.querySelector(".x").onclick = async () => { if (confirm("Delete this photo?")) { await DB.del("photos", p.id); touchJob(job); drawPhotos(); } };
      div.querySelector(".rot").onclick = e => { e.preventDefault(); rotatePhoto(p, job, drawPhotos); };
    });
  }
  const addPhotos = async files => {
    if (!files.length) return;
    toast("Saving photo…");
    for (const file of files) {
      const blob = await shrink(file);
      await DB.put("photos", { id: uid(), jobId, treeId: t.id, role: "tree", caption: "", blob, created: Date.now() });
    }
    dirty = true; await saveNow(); drawPhotos(); toast(files.length > 1 ? `${files.length} photos saved` : "Photo saved");
  };
  $("#takePhoto").onclick = () => pickFiles("#cam", addPhotos);
  $("#pickPhoto").onclick = () => pickFiles("#gallery", addPhotos);
  drawPhotos();

  // --- buttons
  $("#back").onclick = $("#done").onclick = () => go("#/job/" + jobId);
  $("#next").onclick = async () => {
    if (!hasContent() && !persisted) { toast("Nothing entered for this tree yet"); return; }
    dirty = true; await saveNow(); stopGps(); leaveHook = null;
    toast(`${t.tag} saved`);
    if (location.hash.endsWith("/tree/new")) route(); else location.hash = `#/job/${jobId}/tree/new`;
  };
  if ($("#del")) $("#del").onclick = async () => {
    if (!confirm(`Delete ${t.tag} and its photos?`)) return;
    for (const p of await DB.by("photos", "tree", t.id)) await DB.del("photos", p.id);
    await DB.del("trees", t.id); leaveHook = null; stopGps(); await touchJob(job);
    toast(`${t.tag} deleted`); go("#/job/" + jobId);
  };
}

// ------------------------------------------------------------------ repeat inspections
// A new visit to the same site: a copy of the survey with each tree's last measurements kept as "previous",
// so the form can show the change (and the relative strength change, D³/H³ – Rinn) as you re-measure.
async function resurvey(jobId) {
  const old = await DB.get("jobs", jobId);
  if (!confirm(`Start a new visit to ${old.site}? The trees are copied with their last measurements kept for comparison.`)) return;
  const job = Object.assign({}, old, { id: uid(), surveyDate: today(), created: Date.now(), updated: Date.now(), exported: null,
    weather: "", notes: `Re-survey of the ${ukDate(old.surveyDate)} visit`, previousJob: old.id });
  await DB.put("jobs", job);
  for (const t of await DB.by("trees", "job", jobId)) {
    const keep = ["tag", "species", "speciesMore", "lat", "lon", "acc", "grid", "gridManual", "w3w", "posSource", "posNote", "tpo",
      "fullHeight", "kind", "constraints", "category"];
    const n = { id: uid(), jobId: job.id, created: Date.now() };
    keep.forEach(k => { if (t[k] !== undefined) n[k] = t[k]; });
    n.prev = { date: old.surveyDate, height: t.height, dbh: t.dbh, spread: t.spread, spreadN: t.spreadN, spreadE: t.spreadE,
      spreadS: t.spreadS, spreadW: t.spreadW, radius: t.radius, comments: t.comments, recs: t.recs, valid: t.valid,
      threatScore: t.threatScore, history: (t.prev && t.prev.history || []).concat(t.prev ? [{ date: t.prev.date, height: t.prev.height, dbh: t.prev.dbh }] : []) };
    await DB.put("trees", n);
  }
  toast("New visit started – re-measure each tree"); go("#/job/" + job.id);
}
// H/D (slenderness) and change since the last visit
function sizeChange(t) {
  const num = v => { const m = String(v ?? "").match(/\d+(?:\.\d+)?/g); return m && m.length === 1 ? +m[0] : null; };
  const h = num(t.height), d = num(t.dbh), out = {};
  if (h && d) out.hd = Math.round(h / (d / 1000));
  const p = t.prev || {}, ph = num(p.height), pd = num(p.dbh);
  if (p.date && (ph || pd)) {
    const bits = [];
    if (pd && d) bits.push(`DBH ${d - pd >= 0 ? "+" : ""}${d - pd} mm`);
    if (ph && h) bits.push(`height ${h - ph >= 0 ? "+" : ""}${+(h - ph).toFixed(1)} m`);
    if (pd && d && ph && h) {
      const r = Math.pow(d / pd, 3) * Math.pow(ph / h, 3);
      out.strength = Math.round((r - 1) * 100);
      bits.push(`relative strength (D³/H³) ${out.strength >= 0 ? "+" : ""}${out.strength}%`);
    }
    out.text = bits.length ? `Since ${ukDate(p.date)}: ${bits.join(", ")}` : "";
    out.last = `Last visit ${ukDate(p.date)}: ${[ph && ph + " m", pd && pd + " mm"].filter(Boolean).join(", ")}`;
  }
  return out;
}

async function touchJob(job) { job.updated = Date.now(); await DB.put("jobs", job); }

function pickFiles(sel, cb) {
  const inp = $(sel); inp.value = "";
  inp.onchange = () => cb([...inp.files]);
  inp.click();
}

// resize to max 1800 px JPEG (keeps reports small, same as the PC builders do)
async function shrink(file, max = 1800) {
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
    const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
    bmp.close && bmp.close();
    return await new Promise(res => c.toBlob(b => res(b || file), "image/jpeg", 0.85));
  } catch (e) { console.warn("resize failed", e); return file; }
}

// turn a photo a quarter turn clockwise (for the odd photo the phone saved sideways)
async function rotate90(blob) {
  const bmp = await createImageBitmap(blob);
  const c = document.createElement("canvas");
  c.width = bmp.height; c.height = bmp.width;
  const g = c.getContext("2d");
  g.translate(c.width, 0); g.rotate(Math.PI / 2); g.drawImage(bmp, 0, 0);
  bmp.close && bmp.close();
  return await new Promise(res => c.toBlob(b => res(b || blob), "image/jpeg", 0.9));
}
async function rotatePhoto(p, job, redraw) { p.blob = await rotate90(p.blob); p.rotated = ((p.rotated || 0) + 90) % 360; await DB.put("photos", p); touchJob(job); redraw(); }

// ------------------------------------------------------------------ site photos (cover / site / plan / general)
async function sitePhotosPage(jobId) {
  const job = await DB.get("jobs", jobId);
  if (!job) return go("#/");
  app.innerHTML = `
  <header class="top"><button aria-label="Back" onclick="go('#/job/${jobId}')">‹</button><h1>Site photos<span class="sub">${esc(job.site)}</span></h1></header>
  <main>
    <p class="hint">Mark one photo as <b>Cover</b> (front page) and one as <b>Site</b> (site description). Others go in the photo appendix with their caption.</p>
    <div class="row"><button class="btn" id="takePhoto">📷 Take photo</button><button class="btn" id="pickPhoto">🖼 From gallery</button></div>
    <div class="photos" id="photos"></div>
  </main>`;
  async function draw() {
    const list = (await DB.by("photos", "job", jobId)).filter(p => !p.treeId).sort((a, b) => a.created - b.created);
    const box = $("#photos");
    box.querySelectorAll("img").forEach(i => URL.revokeObjectURL(i.src));
    box.innerHTML = list.map(p => `<div class="ph" data-id="${p.id}"><img alt="" src="${URL.createObjectURL(p.blob)}">
      <button class="x" aria-label="Delete photo">×</button><button class="rot" aria-label="Rotate photo">↻</button>
      <select>${[["general", "Appendix photo"], ["cover", "Cover"], ["site", "Site"], ["plan", "Plan"]].map(([v, l]) => `<option value="${v}" ${p.role === v ? "selected" : ""}>${l}</option>`).join("")}</select>
      <input placeholder="Caption" value="${esc(p.caption)}"></div>`).join("") || `<div class="empty">No site photos yet.</div>`;
    box.querySelectorAll(".ph").forEach(div => {
      const p = list.find(x => x.id === div.dataset.id);
      div.querySelector(".rot").onclick = e => { e.preventDefault(); rotatePhoto(p, job, draw); };
      div.querySelector("select").onchange = async e => {
        if (e.target.value !== "general") for (const o of list) if (o !== p && o.role === e.target.value) { o.role = "general"; await DB.put("photos", o); }
        p.role = e.target.value; await DB.put("photos", p); touchJob(job); draw();
      };
      div.querySelector("input").onchange = async e => { p.caption = e.target.value.trim(); await DB.put("photos", p); touchJob(job); };
      div.querySelector(".x").onclick = async () => { if (confirm("Delete this photo?")) { await DB.del("photos", p.id); touchJob(job); draw(); } };
    });
  }
  const add = async files => {
    const existing = (await DB.by("photos", "job", jobId)).filter(p => !p.treeId);
    let i = 0;
    for (const file of files) {
      const role = !existing.some(p => p.role === "cover") && i === 0 ? "cover" : "general";
      await DB.put("photos", { id: uid(), jobId, treeId: null, role, caption: "", blob: await shrink(file), created: Date.now() + i++ });
    }
    touchJob(job); draw();
  };
  $("#takePhoto").onclick = () => pickFiles("#cam", add);
  $("#pickPhoto").onclick = () => pickFiles("#gallery", add);
  draw();
}

// ------------------------------------------------------------------ settings
async function settingsPage() {
  const s = await settings();
  let est = "";
  try { const e = await navigator.storage.estimate(); est = `${(e.usage / 1048576).toFixed(1)} MB used`; } catch (e) { }
  let persisted = false;
  try { persisted = await navigator.storage.persisted(); } catch (e) { }
  const area = (k, lab) => `<label for="p_${k}">${lab} (one per line)</label><textarea id="p_${k}" rows="6">${esc(s.phrases[k].join("\n"))}</textarea>`;
  app.innerHTML = `
  <header class="top"><button aria-label="Back" onclick="go('#/')">‹</button><h1>Settings</h1></header>
  <main>
    <label for="consultant">Surveyor name</label><input id="consultant" value="${esc(s.consultant)}">
    <label for="qtraAssessors">Registered QTRA assessors (one per line: name – registration no.)</label>
    <textarea id="qtraAssessors" rows="3" placeholder="Mark Johnson – 1234">${esc((s.qtraAssessors || []).join("\n"))}</textarea>
    <p class="hint">QTRA appears on a survey only when its surveyor is listed here. Check each registration on qtra.co.uk.</p>
    <label for="decl">Magnetic declination for laser bearings (°, east +)</label><input id="decl" inputmode="decimal" value="${esc(s.declination ?? 0)}">
    <p class="hint">Added to compass bearings to make them true. In the UK it's within a degree or two of zero – the BGS declination calculator gives today's figure. Leave 0 if your rangefinder is already set to true north.</p>
    <label for="uvf">CAVAT Unit Value Factor (£)</label><input id="uvf" inputmode="decimal" value="${esc(s.uvf || CAVAT.DEFAULT_UVF)}">
    <p class="hint">Check the current figure with the LTOA each year.</p>
    <h2>Bats</h2>
    <label for="batLicence">Natural England bat licence number (if you hold one)</label><input id="batLicence" value="${esc(s.batLicence || "")}">
    <label class="check"><input type="checkbox" id="batEndoscope" ${s.batEndoscope ? "checked" : ""}> I've done the BCT endoscope training for arborists (Secondary Roost Surveys) and work to the BCT method statement</label>
    <p class="hint">This sets what the bat checks let you do. With neither, they keep you on the ground. The training certificates recommend a refresher within 5 years.</p>
    <h2>Quick phrases</h2>
    <label class="check"><input type="checkbox" id="askDetails" ${s.askDetails !== false ? "checked" : ""}> Ask for position, size and direction when I tap an observation</label>
    <p class="hint">These are the tap-to-add buttons under each box. Change them to your own wording.</p>
    ${area("obs", "Observations")}${area("recs", "Recommendations")}${area("cons", "Constraints / targets")}${area("weather", "Weather")}
    <button class="btn small" id="reset" style="margin-top:8px">Reset phrases to defaults</button>
    <h2>Storage</h2>
    <p class="hint">${est}. ${persisted ? "✓ Protected – the browser won't clear it to save space." : "Not yet protected from automatic clean-up. Installing the app (menu ⋮ → Install app) usually fixes this."}</p>
    <p class="hint">Tree Survey ${APP_VERSION} · © 2026 Mark Johnson. All rights reserved.</p>
  </main>
  <div class="bar"><button class="btn primary" id="save">Save</button></div>`;
  $("#reset").onclick = () => { for (const k of Object.keys(DEFAULT_PHRASES)) $("#p_" + k).value = DEFAULT_PHRASES[k].join("\n"); };
  $("#save").onclick = async () => {
    s.consultant = $("#consultant").value.trim();
    s.askDetails = $("#askDetails").checked;
    s.uvf = +$("#uvf").value.replace(",", ".") || CAVAT.DEFAULT_UVF;
    s.declination = +String($("#decl").value).replace(",", ".") || 0;
    s.qtraAssessors = $("#qtraAssessors").value.split("\n").map(x => x.trim()).filter(Boolean);
    s.batLicence = $("#batLicence").value.trim();
    s.batEndoscope = $("#batEndoscope").checked;
    for (const k of Object.keys(DEFAULT_PHRASES)) s.phrases[k] = $("#p_" + k).value.split("\n").map(x => x.trim()).filter(Boolean);
    await DB.put("settings", s); toast("Settings saved"); go("#/");
  };
}

// ------------------------------------------------------------------ export
// far end of a hedge / roadside group (start = the tree's own position)
const endCells = t => t.end && t.end.lat != null ? [OSGB.fromLatLon(+t.end.lat, +t.end.lon).ref, +t.end.lat, +t.end.lon] : ["", "", ""];

function treeRow(t, job, withRisk, withCavat, withChange, withZone, withVet, withLine) {
  const loc = [t.w3w && (t.w3w.startsWith("///") ? t.w3w : "///" + t.w3w.replace(/^\/+/, "")), t.gridManual || t.grid].filter(Boolean).join("\n");
  const n0 = v => (v === "" || v == null || isNaN(+v)) ? (v ?? "") : +v;
  // estimated dimensions are suffixed "#" (BS 5837 4.4.2.6 c)
  const n = v => t.estimated && v !== "" && v != null ? String(v).replace(/#$/, "") + "#" : n0(v);
  const recs = t.urgent ? ("URGENT – requires immediate attention. " + (t.recs || "")).trim() : t.recs;
  const sp = speciesText(t);
  const qSize = t.qtraType === "Property" && (t.qtraT || t.qtraP) ? "P" : n0(t.qtraS);
  if (job.type === "BS5837") {
    return [t.tag, t.tpo, sp, n(t.height), n(t.dbh), n0(t.stems), n(t.spreadN), n(t.spreadE), n(t.spreadS), n(t.spreadW),
      n(t.clearance), t.firstBranch, t.lifeStage, t.physio, t.struct, t.comments, recs, t.erc, t.category, t.retain, t.rpa,
      t.aiaNotes, t.valid, t.qtraRoh, n0(t.qtraT), qSize, n0(t.qtraP), loc, t.lat ?? "", t.lon ?? "", t.batPrf || "",
      t.qtraMass || "", n0(t.qtraMx), thScore(t), thInd(t), t.cavatValue ?? "", sizeChange(t).text || "", t.zone || "", vetSummary(t.vet), ...endCells(t)].map(v => v ?? "");
  }
  const row = [job.site, t.tag, loc, sp, n(t.height), n(t.dbh), crownValue(t, job, n), t.comments, recs, adbFix(t.adb), t.constraints,
    t.lat ?? "", t.lon ?? "", t.acc ?? "", t.batPrf || ""];
  if (withRisk) row.push(t.valid, t.qtraRoh, n0(t.qtraT), qSize, n0(t.qtraP), t.qtraMass || "", n0(t.qtraMx), thScore(t), thInd(t));
  if (withCavat) row.push(t.cavatValue ?? "");
  if (withChange) row.push(sizeChange(t).text || "");
  if (withZone) row.push(t.zone || "");
  if (withVet) row.push(vetSummary(t.vet));
  if (withLine) row.push(...endCells(t));
  return row.map(v => v ?? "");
}

// THREATS export: "F x T x I" keeps the scores visible; the builders multiply it out
const thScore = t => { const th = t.threats || {}; const sc = THREATS.score(th); if (sc == null) return "";
  return `${th.f} x ${th.vuln ? THREATS.TARGET[Math.max(0, THREATS.TARGET.findIndex(x => x[0] === +th.t) - 1)][0] : th.t} x ${th.i}`; };
const thInd = t => { const i = +((t.threats || {}).ind); return i ? THREATS.INDICATORS[i - 1] : ""; };
// crown as recorded for this job: spread (diameter), radius, or N/E/S/W radii
function crownValue(t, job, n) {
  if (job.crownMode === "radius") return n(t.radius);
  if (job.crownMode === "cardinal") return ["N", "E", "S", "W"].map(d => t["spread" + d] !== undefined && t["spread" + d] !== "" ? `${d} ${t["spread" + d]}` : "").filter(Boolean).join(", ");
  return n(t.spread);
}
const crownHead = job => job.crownMode === "radius" ? "Crown Radius (m)" : job.crownMode === "cardinal" ? "Crown Radii N/E/S/W (m)" : "Crown Spread (m)";

function photoFileNames(trees, photos, feats = []) {
  const used = new Set(), names = new Map();
  const unique = base => { let n = base, i = 2; while (used.has(n.toLowerCase())) n = `${base} (${i++})`; used.add(n.toLowerCase()); return n; };
  const treeById = new Map(trees.map(t => [t.id, t]).concat(feats.map(f => [f.id, { tag: f.ref }])));
  for (const role of ["cover", "site", "plan"]) {
    const p = photos.find(x => !x.treeId && x.role === role); if (p) names.set(p.id, unique(role) + ".jpg");
  }
  let g = 1;
  for (const p of [...photos].sort((a, b) => a.created - b.created)) {
    if (names.has(p.id)) continue;
    const t = treeById.get(p.treeId);
    const base = t ? safeName(`${t.tag}${p.caption ? " " + p.caption : ""}`) : safeName(p.caption || `Site photo ${g++}`);
    names.set(p.id, unique(base) + ".jpg");
  }
  return names;
}

async function buildZip(jobId) {
  const job = await DB.get("jobs", jobId);
  const trees = (await DB.by("trees", "job", jobId)).sort(byTag);
  const photos = await DB.by("photos", "job", jobId);
  const bs = job.type === "BS5837";
  const withRisk = !bs && trees.some(t => t.valid || t.qtraRoh || t.qtraT || thScore(t) !== "");
  const withCavat = !bs && trees.some(t => t.cavatValue != null);
  const withChange = !bs && trees.some(t => sizeChange(t).text);
  const withZone = !bs && trees.some(t => t.zone);
  const withVet = !bs && trees.some(t => vetSummary(t.vet));
  const withLine = !bs && trees.some(t => t.end && t.end.lat != null);
  const withRoute = !!job.route || trees.some(t => t.direction || t.markerPost);
  const withOwn = trees.some(t => t.ownership || t.landowner);
  const extraHead = (withRoute ? ["Direction", "Marker Post"] : []).concat(withOwn ? ["Ownership", "Landowner"] : []);
  const extra = t => (withRoute ? [t.direction || "", t.markerPost || ""] : []).concat(withOwn ? [t.ownership || "", t.landowner || ""] : []);
  const head0 = bs ? BS_HEAD : AMR_HEAD.map(h => h === "Crown Spread (m)" ? crownHead(job) : h).concat(withRisk ? RISK_HEAD : [], withCavat ? ["CAVAT (£)"] : [], withChange ? ["Change Since Last Survey"] : [], withZone ? ["Zone"] : [], withVet ? ["Veteran Features"] : [], withLine ? ["End Grid Ref", "End Latitude", "End Longitude"] : []);
  const head = head0.concat(extraHead);
  const ws = XLSX.utils.aoa_to_sheet([head, ...trees.map(t => treeRow(t, job, withRisk, withCavat, withChange, withZone, withVet, withLine).concat(extra(t)))]);
  ws["!cols"] = head.map(h => ({ wch: /Comments|Recommend|Notes/.test(h) ? 50 : /Species|Grid/.test(h) ? 30 : Math.max(8, h.length + 2) }));
  ws["!freeze"] = { xSplit: 0, ySplit: 1 };
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, bs ? "BS5837 Survey" : "All Sites");
  const zip = new JSZip();
  const xlsxName = bs ? "BS5837_Survey.xlsx" : "Survey.xlsx";
  zip.file(xlsxName, XLSX.write(wb, { type: "array", bookType: "xlsx" }));
  const feats = await DB.by("features", "job", jobId);
  const names = photoFileNames(trees, photos, feats);
  const folder = zip.folder("Photos");
  for (const p of photos) folder.file(names.get(p.id), p.blob, { binary: true });
  const strip = o => { const c = Object.assign({}, o); delete c.blob; return c; };
  let planOut = null;
  const plansOut = [], used = new Set();
  for (const pl of job.plans || []) {
    if (!pl.blob) continue;
    let base = safeName(pl.name ? pl.name.replace(/\.(jpe?g|png|pdf)$/i, "") : "Site plan") || "Site plan", n = 2, b = base;
    while (used.has(b.toLowerCase())) b = `${base} (${n++})`;
    used.add(b.toLowerCase());
    zip.folder("Plans").file(b + ".jpg", pl.blob, { binary: true });
    if (pl.ctrl && pl.ctrl.length === 2) zip.folder("Plans").file(b + ".jgw", planWorldFile(pl));
    const o = Object.assign(strip(pl), { file: `Plans/${b}.jpg` });
    plansOut.push(o);
    if (pl === job.plan) planOut = o;
  }
  if ((job.safety || []).length) zip.file("Site safety check.txt", safetyText(job));
  zip.file("data.json", JSON.stringify({
    format: "tree-survey", version: 1, app: APP_VERSION, exported: new Date().toISOString(),
    job: Object.assign(strip(job), { plan: planOut, plans: plansOut, layers: (job.layers || []).filter(l => l.kind !== "image") }), trees, photos: photos.map(p => Object.assign(strip(p), { file: "Photos/" + names.get(p.id) })), surveyFile: xlsxName, features: feats,
  }, null, 1));
  const blob = await zip.generateAsync({ type: "blob", mimeType: "application/zip" });
  const fname = `${safeName(job.site)} ${job.surveyDate || today()} survey.zip`;
  return { blob, fname, job, trees: trees.length, photos: photos.length };
}

async function exportJob(jobId) {
  toast("Preparing export…", 8000);
  let out;
  try { out = await buildZip(jobId); } catch (e) { console.error(e); toast("Export failed: " + e.message, 5000); return; }
  const file = new File([out.blob], out.fname, { type: "application/zip" });
  let shared = false;
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: out.fname, text: `${out.job.site} – ${out.trees} trees, ${out.photos} photos` }); shared = true; }
    catch (e) { if (e.name === "AbortError") { toast("Export cancelled"); return; } }
  }
  if (!shared) {
    const a = document.createElement("a"); a.href = URL.createObjectURL(out.blob); a.download = out.fname;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
  }
  out.job.exported = Date.now(); out.job.updated = out.job.exported - 1; await DB.put("jobs", out.job);
  toast(shared ? "Exported" : `Saved ${out.fname} to Downloads`, 3500);
  if (location.hash.startsWith("#/job/")) route();
}

// ------------------------------------------------------------------ restore a zip (another device, or after clearing)
function restoreZip() { pickFiles("#zipin", async files => { if (files[0]) await importZip(files[0]); }); }
async function importZip(file) {
  try {
    const zip = await JSZip.loadAsync(file);
    const dj = zip.file("data.json");
    if (!dj) throw new Error("This zip wasn't made by Tree Survey (no data.json).");
    const d = JSON.parse(await dj.async("string"));
    if (d.format === "works-pack") return await importWorksPack(zip, d);
    const existing = await DB.get("jobs", d.job.id);
    const zipPlans = async () => {  // plans in the zip -> [{… blob}] (older zips carry just job.plan)
      const list = (d.job.plans && d.job.plans.length ? d.job.plans : d.job.plan ? [d.job.plan] : []), out = [];
      for (const pl of list) {
        const f = pl.file && zip.file(pl.file); if (!f) continue;
        const o = Object.assign({}, pl, { id: pl.id || "p-" + Math.random().toString(36).slice(2, 9), blob: new Blob([await f.async("arraybuffer")], { type: "image/jpeg" }) });
        delete o.file; out.push(o);
      }
      const act = d.job.planId || (d.job.plan && d.job.plan.id);
      return { list: out, active: (out.find(p => p.id === act) || out.find(p => d.job.plan && p.name === d.job.plan.name) || out[0] || {}).id || null };
    };
    if (d.starter && existing) {  // starter file from the PC: update the plans and blank details, keep the trees
      for (const k of ["client", "site", "address", "consultant"]) if (!existing[k] && d.job[k]) existing[k] = d.job[k];
      const zp = await zipPlans();
      const idMap = {};
      for (const pl of zp.list) {  // same name = replace (keeps its id and place in the list), otherwise add
        const i = existing.plans.findIndex(q => (q.name || "") === (pl.name || "") || q.id === pl.id);
        if (i >= 0) { idMap[pl.id] = existing.plans[i].id; pl.id = existing.plans[i].id; existing.plans[i] = pl; }
        else { idMap[pl.id] = pl.id; existing.plans.push(pl); }
      }
      usePlan(existing, (zp.active && idMap[zp.active]) || existing.planId);
      existing.updated = Date.now(); await DB.put("jobs", existing);
      toast(`${zp.list.length} plan${zp.list.length === 1 ? "" : "s"} updated for ${existing.site} – your trees are kept`, 3500); go("#/job/" + existing.id); return;
    }
    if (existing && !confirm(`"${d.job.site}" is already on this device. Replace it with the copy in the zip?`)) return;
    for (const t of await DB.by("trees", "job", d.job.id)) await DB.del("trees", t.id);
    for (const p of await DB.by("photos", "job", d.job.id)) await DB.del("photos", p.id);
    for (const f of await DB.by("features", "job", d.job.id)) await DB.del("features", f.id);
    for (const f of d.features || []) await DB.put("features", f);
    const zp = await zipPlans();
    d.job.plans = zp.list; usePlan(d.job, zp.active);
    await DB.put("jobs", d.job);
    for (const t of d.trees) await DB.put("trees", t);
    for (const p of d.photos) {
      const f = zip.file(p.file); if (!f) continue;
      const blob = new Blob([await f.async("arraybuffer")], { type: "image/jpeg" });
      const rec = Object.assign({}, p, { blob }); delete rec.file; await DB.put("photos", rec);
    }
    toast(`Restored ${d.job.site}: ${d.trees.length} trees`); go("#/job/" + d.job.id);
  } catch (e) { console.error(e); toast("Couldn't restore: " + e.message, 5000); }
}

// ------------------------------------------------------------------ start
if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
  navigator.serviceWorker.register("sw.js").catch(e => console.warn("offline cache not available", e));
}
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => { });
window.addEventListener("DOMContentLoaded", () => {
  if ((typeof boltDetails !== "function" || typeof worksJobPage !== "function") && !sessionStorage.getItem("reloaded")) {  // part-updated files: fetch them again
    sessionStorage.setItem("reloaded", "1"); location.reload(); return;
  }
  route();
});  // after map.js has loaded
