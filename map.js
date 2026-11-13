// Tree Survey – © 2026 Mark Johnson. All rights reserved. Use only under a written licence from the owner.
/* Tree Survey – map, site plan and positioning without GPS.
   - Map page: trees on a street map (online) and/or the site plan (works offline).
   - Pick on map: pan the map so the cross is on the tree, tap "Use this spot".
   - Measure: two known points + a tape/laser distance from each → where the circles cross.
   - Site plan: load a picture of the plan and pin two points on it to the ground. */
"use strict";

const OSM = { url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  attr: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' };
const R_EARTH = 6371008.8;
const CAT_COL = { A: "#00FF00", B: "#0000FF", C: "#5B5B5B", U: "#7F0000" };  // BS 5837:2012 Table 2

// ---------------------------------------------------------------- local metric frame (site-sized areas)
function frame(lat0, lon0) {
  const k = Math.PI / 180, c = Math.cos(lat0 * k);
  return {
    xy: (lat, lon) => [(lon - lon0) * k * R_EARTH * c, (lat - lat0) * k * R_EARTH],
    ll: (x, y) => [lat0 + y / (R_EARTH * k), lon0 + x / (R_EARTH * k * c)],
  };
}
const dist = (a, b) => { const f = frame(a[0], a[1]); const [x, y] = f.xy(b[0], b[1]); return Math.hypot(x, y); };

// where two circles cross: centres p1, p2 [lat, lon], radii in metres -> {pts: [[lat,lon],[lat,lon]], gap}
function intersect(p1, r1, p2, r2) {
  const f = frame(p1[0], p1[1]);
  const [x2, y2] = f.xy(p2[0], p2[1]);
  const d = Math.hypot(x2, y2);
  if (d < 0.01) return { pts: [], gap: null, msg: "The two points are in the same place." };
  const ux = x2 / d, uy = y2 / d;
  if (d > r1 + r2) {  // circles too far apart: halfway across the gap
    const gap = d - r1 - r2, k = r1 + gap / 2;
    return { pts: [f.ll(ux * k, uy * k)], gap };
  }
  if (d < Math.abs(r1 - r2)) {  // one circle inside the other: halfway between the nearest edges
    const gap = Math.abs(r1 - r2) - d;
    const k = r1 > r2 ? (r1 + d + r2) / 2 : (d - r2 - r1) / 2;
    return { pts: [f.ll(ux * k, uy * k)], gap };
  }
  const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, r1 * r1 - a * a));
  const mx = ux * a, my = uy * a;
  return { pts: [f.ll(mx - uy * h, my + ux * h), f.ll(mx + uy * h, my - ux * h)], gap: 0 };
}

// site plan pinned with two points: pixel (x, y down) <-> lat/lon via a similarity transform
function planTransform(plan) {
  const [A, B] = plan.ctrl;
  const f = frame(A.lat, A.lon);
  const zB = f.xy(B.lat, B.lon);
  const wAx = A.x, wAy = -A.y, wBx = B.x, wBy = -B.y;
  const dwx = wBx - wAx, dwy = wBy - wAy, dzx = zB[0], dzy = zB[1];
  const den = dwx * dwx + dwy * dwy;
  const p = (dzx * dwx + dzy * dwy) / den, q = (dzy * dwx - dzx * dwy) / den;  // a = p + iq
  const toLL = (px, py) => { const wx = px - wAx, wy = -py - wAy; return f.ll(p * wx - q * wy, q * wx + p * wy); };
  return { toLL, metresPerPx: Math.hypot(p, q), rotationDeg: Math.atan2(q, p) * 180 / Math.PI };
}

// ground extent of a pinned plan (Leaflet bounds), and the plan(s) that cover a spot
function planExtent(pl) {
  const t = planTransform(pl);
  return L.latLngBounds([t.toLL(0, 0), t.toLL(pl.w, 0), t.toLL(0, pl.h), t.toLL(pl.w, pl.h)]);
}
function plansAt(job, ll) {
  const area = b => Math.abs((b.getNorth() - b.getSouth()) * (b.getEast() - b.getWest()));
  return (job.plans || []).filter(p => p.blob && p.ctrl && p.ctrl.length === 2)
    .map(p => ({ p, b: planExtent(p) })).filter(x => x.b.contains(ll)).sort((a, b) => area(a.b) - area(b.b)).map(x => x.p);
}
const planLabel = p => esc((p.name || "Site plan").replace(/\.(jpe?g|png|pdf)$/i, ""));
// short names for the picker: drop the words every plan name starts with ("DRAFT 2026 Lambton …")
function planShortNames(plans) {
  const words = plans.map(p => (p.name || "Site plan").replace(/\.(jpe?g|png|pdf)$/i, "").split(/\s+/));
  let k = 0;
  while (plans.length > 1 && words.every(w => w.length > k + 1 && w[k].toLowerCase() === words[0][k].toLowerCase())) k++;
  return new Map(plans.map((p, i) => [p.id, esc(words[i].slice(k).join(" "))]));
}

// world file for the plan in British National Grid (for the PC plan maker / QGIS)
function planWorldFile(plan) {
  const t = planTransform(plan), [A] = plan.ctrl;
  const en = (lat, lon) => OSGB.fromLatLon(lat, lon).raw;
  const eA = en(...t.toLL(A.x, A.y));
  const e1 = en(...t.toLL(A.x + 1000, A.y)), e2 = en(...t.toLL(A.x, A.y + 1000));
  const Aa = (e1[0] - eA[0]) / 1000, Dd = (e1[1] - eA[1]) / 1000, Bb = (e2[0] - eA[0]) / 1000, Ee = (e2[1] - eA[1]) / 1000;
  const C = eA[0] + Aa * (0.5 - A.x) + Bb * (0.5 - A.y), F = eA[1] + Dd * (0.5 - A.x) + Ee * (0.5 - A.y);
  return [Aa, Dd, Bb, Ee, C, F].map(v => v.toFixed(6)).join("\n") + "\n";
}

// ---------------------------------------------------------------- shared map setup
let liveMap = null, liveWatch = null;
function closeMap() {
  if (liveWatch !== null) { navigator.geolocation.clearWatch(liveWatch); liveWatch = null; }
  if (liveMap) { liveMap.remove(); liveMap = null; }
}

function treeColour(job, t) {
  if (job.trial && t.droneFlag) return { Red: "#C8102E", Amber: "#E8A200", Green: "#2F8A3B" }[t.droneFlag] || "#2F6B3A";  // drone triage
  if (job.type === "WORKS") return { done: "#2F8A3B", part: "#E8A200", notdone: "#C8102E" }[t.wstatus] || "#E07000";
  if (job.type === "BS5837") return CAT_COL[(t.category || "")[0]] || "#2F6B3A";
  const r = (t.recs || "").toLowerCase();
  if (/\bfell|\bremove/.test(r)) return "#C00000";
  if (!r.trim() || /no work/.test(r)) return "#2F6B3A";
  return "#E07000";
}

function crownRadius(job, t) {
  if (job.type === "BS5837") {
    const v = ["spreadN", "spreadE", "spreadS", "spreadW"].map(k => parseFloat(t[k])).filter(x => x > 0);
    return v.length ? v.reduce((a, b) => a + b) / v.length : 0;
  }
  const s = parseFloat(t.spread); return s > 0 ? s / 2 : 0;
}

async function buildMap(el, job, trees, opts = {}) {
  closeMap();
  const map = L.map(el, { zoomControl: true, maxZoom: 22, attributionControl: true, zoomSnap: 0.5 });
  liveMap = map;
  const street = L.tileLayer(OSM.url, { maxNativeZoom: 19, maxZoom: 22, attribution: OSM.attr });
  const blank = L.layerGroup();
  const bases = { "Street map (needs signal)": street, "No background": blank };
  const overlays = {};
  let planLayer = null, planBounds = null;
  // every pinned plan is in the layer list; the one in use is switched on
  for (const pl of (job.plans && job.plans.length ? job.plans : job.plan ? [job.plan] : [])) {
    if (!pl.blob || !pl.ctrl || pl.ctrl.length !== 2) continue;
    const t = planTransform(pl);
    const lay = L.imageOverlay.rotated(URL.createObjectURL(pl.blob), t.toLL(0, 0), t.toLL(pl.w, 0), t.toLL(0, pl.h),
      { opacity: pl.opacity ?? 0.75, interactive: false });
    const label = (job.plans || []).length > 1 ? "Plan: " + esc((pl.name || "Site plan").replace(/\.(jpe?g|png|pdf)$/i, "")) : "Site plan";
    overlays[label] = lay;
    if (pl === job.plan) { planLayer = lay; planBounds = planExtent(pl); }
  }
  (opts.base === "blank" || !navigator.onLine ? blank : street).addTo(map);
  if (planLayer) planLayer.addTo(map);
  if (typeof drawLayers === "function") drawLayers(map, job, overlays);
  const treeLayer = L.layerGroup().addTo(map);
  overlays["Trees"] = treeLayer;
  if (opts.features && typeof drawFeatures === "function") drawFeatures(map, opts.features, overlays, opts.onFeature);
  L.control.layers(bases, overlays, { position: "topright" }).addTo(map);
  L.control.scale({ imperial: false, position: "bottomleft" }).addTo(map);

  const placed = [];
  for (const t of trees) {
    if (t.lat == null || t.lat === "") continue;
    const ll = [+t.lat, +t.lon], col = treeColour(job, t), r = crownRadius(job, t);
    if (t.end && t.end.lat != null) {  // hedge / roadside group: start, bends, end
      const line = [ll].concat((t.via || []).map(p => [+p.lat, +p.lon]), [[+t.end.lat, +t.end.lon]]);
      if (t.closed && line.length >= 3) {  // the outline of a group or woodland
        L.polygon(line, { color: col, weight: 2, dashArray: "4 4", fillColor: col, fillOpacity: 0.18, interactive: false }).addTo(treeLayer);
      } else {
        L.polyline(line, { color: col, weight: Math.max(4, Math.min(14, (r || 2) * 2)), opacity: 0.45, lineCap: "round", interactive: false }).addTo(treeLayer);
        L.polyline(line, { color: col, weight: 2, dashArray: "4 4", interactive: false }).addTo(treeLayer);
      }
      placed.push(line[line.length - 1]);
    } else
    if (r) L.circle(ll, { radius: r, color: col, weight: 1.5, fillOpacity: 0.15, interactive: false }).addTo(treeLayer);
    const wo = job.type === "WORKS";  // works orders: the dot shows the item's status
    const m = L.circleMarker(ll, { radius: wo ? 8 : 5, color: "#fff", weight: wo ? 2 : 1.5, fillColor: wo ? col : "#111", fillOpacity: 1 }).addTo(treeLayer);
    m.bindTooltip(esc(t.tag), { permanent: true, direction: "right", className: "tlabel", offset: [6, 0] });
    m.on("click", () => opts.onTree ? opts.onTree(t, ll) : null);
    placed.push(ll);
  }
  // starting view: trees, else the plan, else where you are
  if (opts.center) map.setView(opts.center, opts.zoom || 20);
  else if (placed.length || (opts.features || []).some(f => f.lat != null)) map.fitBounds(L.latLngBounds(placed.concat((opts.features || []).filter(f => f.lat != null).map(f => [+f.lat, +f.lon]))).pad(0.3), { maxZoom: 20 });
  else if (planBounds) map.fitBounds(planBounds, { maxZoom: 21 });
  else if ((job.layers || []).length) {  // no trees yet: show the site's layers (zones, NTM canopy)
    const b = L.geoJSON({ type: "FeatureCollection", features: job.layers.flatMap(l => (l.geojson && l.geojson.features) || []) }).getBounds();
    job.layers.filter(l => l.kind === "image").forEach(l => b.extend(L.latLngBounds(l.bounds)));
    if (b.isValid()) map.fitBounds(b.pad(0.05), { maxZoom: 19 }); else { map.setView([54.97, -1.61], 13); locateOnce(map); }
  }
  else { map.setView([54.97, -1.61], 13); locateOnce(map); }
  // you are here
  if ("geolocation" in navigator) {
    let me = null, acc = null;
    liveWatch = navigator.geolocation.watchPosition(p => {
      const ll = [p.coords.latitude, p.coords.longitude];
      if (!me) { acc = L.circle(ll, { radius: p.coords.accuracy, color: "#1a73e8", weight: 1, fillOpacity: 0.08, interactive: false }).addTo(map);
        me = L.circleMarker(ll, { radius: 7, color: "#fff", weight: 2, fillColor: "#1a73e8", fillOpacity: 1, interactive: false }).addTo(map); }
      else { me.setLatLng(ll); acc.setLatLng(ll).setRadius(p.coords.accuracy); }
      map._me = ll;
    }, () => { }, { enableHighAccuracy: true, maximumAge: 5000 });
  }
  setTimeout(() => { if (liveMap === map) map.invalidateSize(); }, 50);
  return { map, placed: placed.length, planLayer };
}

function locateOnce(map) {
  if (!("geolocation" in navigator)) return;
  navigator.geolocation.getCurrentPosition(p => map.setView([p.coords.latitude, p.coords.longitude], 18), () => { }, { enableHighAccuracy: true, timeout: 15000 });
}

const mapShell = (title, sub, back) => `
  <div class="mapwrap">
  <header class="top"><button aria-label="Back" onclick="${back}">‹</button><h1>${title}<span class="sub">${sub}</span></h1>
    <button aria-label="Where am I" id="meBtn">◎</button></header>
  <div class="mapbox"><div id="map"></div><div class="cross" id="cross" hidden></div></div>
  <div class="panel" id="panel"></div></div>`;

// ---------------------------------------------------------------- map page (browse / pick / measure)
async function mapPage(jobId, mode, treeId) {
  const job = await DB.get("jobs", jobId);
  if (!job) return go("#/");
  const trees = await DB.by("trees", "job", jobId);
  const target = treeId && treeId !== "new" ? trees.find(t => t.id === treeId) : null;
  const backTo = target ? `#/job/${jobId}/tree/${target.id}` : `#/job/${jobId}`;
  const title = mode === "pick" ? `Place ${target ? esc(target.tag) : "tree"}` : mode === "pickend" ? `End of ${target ? esc(target.tag) : "line"}`
    : mode === "pickvia" ? `Bend in ${target ? esc(target.tag) : "line"}` : mode === "pickline" ? `Draw ${target ? esc(target.tag) : "line"}` : mode === "measure" ? `Measure ${target ? esc(target.tag) : "tree"}` : "Map";
  app.innerHTML = mapShell(title, esc(job.site), `location.replace('${backTo}')`);
  leaveHook = async () => closeMap();
  const others = trees.filter(t => !target || t.id !== target.id);
  const center = target && target.lat ? [+target.lat, +target.lon] : null;
  const state = { A: null, B: null, mA: null, mB: null, cand: [] };
  const feats = await DB.by("features", "job", jobId);
  const { map } = await buildMap($("#map"), job, mode === "browse" ? trees : others, {
    center, features: feats,
    onFeature: f => { if (mode === "browse") location.hash = `#/job/${jobId}/feat/${f.kind}/${f.id}`; },
    onTree: (t, ll) => {
      if (mode === "browse") { location.hash = `#/job/${jobId}/tree/${t.id}`; return; }
      map.panTo(ll); toast(`Centred on ${t.tag}`);  // snap the cross onto an existing tree
    },
  });
  $("#meBtn").onclick = () => map._me ? map.setView(map._me, Math.max(map.getZoom(), 19)) : locateOnce(map);
  const panel = $("#panel"), cross = $("#cross");

  async function setTreePos(ll, src, note) {
    let t = target;
    if (!t) {  // new tree from the map
      t = { id: uid(), jobId, tag: nextTag(trees, job), species: "", created: Date.now() };
    }
    t.lat = +ll[0].toFixed(7); t.lon = +ll[1].toFixed(7); t.acc = null; t.grid = OSGB.fromLatLon(t.lat, t.lon).ref;
    t.posSource = src; t.posNote = note || ""; t.updated = Date.now();
    t.zone = zoneFor(job, t.lat, t.lon) || t.zone || "";
    await DB.put("trees", t); job.updated = Date.now(); await DB.put("jobs", job);
    location.replace(`#/job/${jobId}/tree/${t.id}`);
  }

  if (mode === "browse") {
    const unplaced = trees.filter(t => t.lat == null || t.lat === "").length;
    const multi = (job.plans || []).length > 1;
    panel.innerHTML = `${multi ? `<div class="planpick"><label for="planSel">Plan</label><select id="planSel">
        ${(() => { const sn = planShortNames(job.plans); return job.plans.map(p => `<option value="${p.id}" ${p === job.plan ? "selected" : ""}>${sn.get(p.id)}${p.ctrl && p.ctrl.length === 2 ? "" : " (not pinned)"}</option>`).join(""); })()}
        <option value="">No plan</option></select><button class="btn small" id="planHere" title="Plan for where I am">📍 Here</button></div><div id="planHint" class="hint"></div>` : ""}
      <div class="row">
      <button class="btn small" onclick="go('#/job/${jobId}/plan')">🗺 ${multi ? "Plans" : "Site plan"}</button>
      <button class="btn small" onclick="go('#/job/${jobId}/layers')">▦ Layers</button>
      <button class="btn small primary" id="newHere">＋ Tree at the ✛</button></div>
      <div class="hint">${trees.length - unplaced} of ${trees.length} trees shown${unplaced ? ` · ${unplaced} without a position` : ""}. Tap a tree to open it.</div>`;
    cross.hidden = false;
    $("#newHere").onclick = () => setTreePos([map.getCenter().lat, map.getCenter().lng], "map", "Placed on map");
    if (multi) {
      const switchTo = async (id, msg) => { usePlan(job, id); job.updated = Date.now(); await DB.put("jobs", job); if (msg) toast(msg); route(); };
      $("#planSel").onchange = e => switchTo(e.target.value || null);
      const here = ll => {
        const on = plansAt(job, ll);
        return on.length ? on[0] : null;
      };
      $("#planHere").onclick = () => {
        if (map._me) {
          const p = here(map._me);
          if (!p) { toast("None of the pinned plans covers where you are"); return; }
          if (p === job.plan) { toast(`You're on ${planLabel(p)} already`); return; }
          return switchTo(p.id, `Showing ${planLabel(p)}`);
        }
        toast("Waiting for GPS…");
        navigator.geolocation.getCurrentPosition(pos => {
          const p = here([pos.coords.latitude, pos.coords.longitude]);
          if (!p) toast("None of the pinned plans covers where you are"); else if (p !== job.plan) switchTo(p.id, `Showing ${planLabel(p)}`);
        }, () => toast("No GPS fix"), { enableHighAccuracy: true, timeout: 15000 });
      };
      // once GPS is found: suggest the plan you're standing on if it isn't the one shown
      let hinted = false;
      const tick = setInterval(() => {
        if (liveMap !== map) { clearInterval(tick); return; }
        if (hinted || !map._me) return;
        hinted = true; clearInterval(tick);
        const p = here(map._me);
        if (p && p !== job.plan && $("#planHint")) {
          $("#planHint").innerHTML = `You're on <b>${planLabel(p)}</b>. <button class="btn small" id="planSw">Show it</button>`;
          $("#planSw").onclick = () => switchTo(p.id, `Showing ${planLabel(p)}`);
        }
      }, 1500);
    }
    return;
  }
  cross.hidden = false;
  if (mode === "pickline" && target) {
    // several points, one after another: point 1 is the tree's own position, the last is the end, the rest are bends
    const had = target.lat != null && target.lat !== "";
    let pts = (had ? [[+target.lat, +target.lon]] : []).concat((target.via || []).map(p => [+p.lat, +p.lon]), target.end && target.end.lat != null ? [[+target.end.lat, +target.end.lon]] : []);
    let closed = !!target.closed;
    const layer = L.layerGroup().addTo(map);
    const show = () => {
      layer.clearLayers();
      if (pts.length >= 2) (closed && pts.length >= 3 ? L.polygon(pts, { color: "#ff7a1a", weight: 3, fillOpacity: 0.15 }) : L.polyline(pts, { color: "#ff7a1a", weight: 3 })).addTo(layer);
      pts.forEach((p, i) => L.circleMarker(p, { radius: i === 0 ? 7 : 5, color: "#0a120d", weight: 2, fillColor: i === 0 ? "#ff7a1a" : "#fff", fillOpacity: 1, interactive: false }).addTo(layer));
      let len = 0; for (let i = 1; i < pts.length; i++) len += L_dist(pts[i - 1], pts[i]);
      if (closed && pts.length >= 3) len += L_dist(pts[pts.length - 1], pts[0]);
      $("#plInfo").textContent = !pts.length ? "No points yet – the first one is the start." : pts.length === 1 ? "1 point (the start). Move the map and add the next."
        : `${pts.length} points · ${Math.round(len)} m` + (closed && pts.length >= 3 ? ` round · about ${ringArea(pts) >= 10000 ? (ringArea(pts) / 10000).toFixed(2) + " ha" : Math.round(ringArea(pts)) + " m²"}` : "");
      $("#plUndo").disabled = pts.length <= (had ? 1 : 0);
    };
    panel.innerHTML = `<div class="hint">Move the map so the <b>✛</b> is on the next point of ${esc(target.tag)}, then <b>Add point</b>. Work round in order.</div>
      <div class="meta" id="plInfo"></div>
      <label class="check"><input type="checkbox" id="plClosed" ${closed ? "checked" : ""}> Outline – join the last point back to the start</label>
      <div class="row"><button class="btn primary" id="plAdd">＋ Add point</button><button class="btn" id="plUndo">↶ Undo</button></div>
      <div class="row"><button class="btn" onclick="location.replace('${backTo}')">Cancel</button><button class="btn primary" id="plDone">✓ Done</button></div>`;
    $("#plAdd").onclick = () => { const c = map.getCenter(); pts.push([+c.lat.toFixed(7), +c.lng.toFixed(7)]); show(); };
    $("#plUndo").onclick = () => { if (pts.length > (had ? 1 : 0)) { pts.pop(); show(); } };
    $("#plClosed").onchange = e => { closed = e.target.checked; show(); };
    $("#plDone").onclick = async () => {
      if (pts.length < 2) { toast("Add at least two points"); return; }
      if (closed && pts.length < 3) { toast("An outline needs at least three points"); return; }
      const P = p => ({ lat: p[0], lon: p[1], src: "map" });
      if (!had) { target.lat = pts[0][0]; target.lon = pts[0][1]; target.acc = null; target.grid = OSGB.fromLatLon(target.lat, target.lon).ref;
        target.posSource = "map"; target.posNote = "Placed on map"; target.zone = zoneFor(job, target.lat, target.lon) || target.zone || ""; }
      target.via = pts.slice(1, -1).map(P); if (!target.via.length) delete target.via;
      target.end = P(pts[pts.length - 1]);
      if (closed) target.closed = true; else delete target.closed;
      target.updated = Date.now(); await DB.put("trees", target); job.updated = Date.now(); await DB.put("jobs", job);
      location.replace(backTo);
    };
    show();
    return;
  }
  if ((mode === "pickend" || mode === "pickvia") && target) {
    panel.innerHTML = `<div class="hint">Move the map so the <b>✛</b> is on the ${mode === "pickend" ? "<b>far end</b>" : "<b>bend</b>"} of ${esc(target.tag)}.</div>
      <div class="row"><button class="btn" onclick="location.replace('${backTo}')">Cancel</button><button class="btn primary" id="use">Use this spot</button></div>`;
    $("#use").onclick = async () => {
      const c = map.getCenter(), p = { lat: +c.lat.toFixed(7), lon: +c.lng.toFixed(7), src: "map" };
      if (mode === "pickend") target.end = p; else target.via = (target.via || []).concat([p]);
      target.updated = Date.now(); await DB.put("trees", target); job.updated = Date.now(); await DB.put("jobs", job);
      location.replace(backTo);
    };
    return;
  }
  if (mode === "pick") {
    panel.innerHTML = `<div class="hint">Move the map so the <b>✛</b> is on the tree's stem. Pinch to zoom in close. Tap another tree to centre on it.</div>
      <div class="row"><button class="btn" onclick="location.replace('${backTo}')">Cancel</button><button class="btn primary" id="use">Use this spot</button></div>`;
    $("#use").onclick = () => setTreePos([map.getCenter().lat, map.getCenter().lng], "map", "Placed on map");
    return;
  }
  // ---- measure from two known points
  const step = () => {
    if (!state.A || !state.B) {
      const which = state.A ? "B" : "A";
      panel.innerHTML = `<div class="hint"><b>Point ${which}:</b> move the map so the <b>✛</b> is on something you can measure from – a building corner on the plan, a post, or another tree (tap it to centre).</div>
        <div class="grid2" style="align-items:end"><div><label for="d">Distance from ${which} to the tree (m)</label><input id="d" inputmode="decimal" autocomplete="off" placeholder="e.g. 12.4"></div>
        <button class="btn primary" id="setPt">Set point ${which}</button></div>
        ${state.A ? `<div class="hint">A: ${state.A.r} m ✓</div>` : ""}
        <div class="row" style="margin-top:6px"><button class="btn small" onclick="location.replace('${backTo}')">Cancel</button></div>`;
      $("#setPt").onclick = () => {
        const r = parseFloat(($("#d").value || "").replace(",", "."));
        if (!(r > 0)) { toast("Enter the measured distance first"); $("#d").focus(); return; }
        const c = map.getCenter(), ll = [c.lat, c.lng];
        const label = state.A ? "B" : "A";
        const ring = L.circle(ll, { radius: r, color: "#B0007A", weight: 2, dashArray: "6 4", fill: false, interactive: false }).addTo(map);
        const pin = L.circleMarker(ll, { radius: 6, color: "#fff", weight: 2, fillColor: "#B0007A", fillOpacity: 1 }).addTo(map)
          .bindTooltip(label, { permanent: true, direction: "top", className: "tlabel" });
        if (!state.A) { state.A = { ll, r }; state.mA = [ring, pin]; } else { state.B = { ll, r }; state.mB = [ring, pin]; }
        if (state.A && state.B) solve(); else step();
      };
      return;
    }
  };
  const solve = () => {
    cross.hidden = true;
    const res = intersect(state.A.ll, state.A.r, state.B.ll, state.B.r);
    state.cand.forEach(m => map.removeLayer(m)); state.cand = [];
    const note = `Measured: ${state.A.r} m from A, ${state.B.r} m from B`;
    if (!res.pts.length) { panel.innerHTML = `<div class="warn">${res.msg}</div><button class="btn block" id="again">Start again</button>`; $("#again").onclick = restart; return; }
    res.pts.forEach((ll, i) => {
      const m = L.marker(ll, { icon: L.divIcon({ className: "cand", html: `<span>${i + 1}</span>`, iconSize: [34, 34] }) }).addTo(map);
      m.on("click", () => setTreePos(ll, "measured", note)); state.cand.push(m);
    });
    map.fitBounds(L.latLngBounds([state.A.ll, state.B.ll, ...res.pts]).pad(0.25), { maxZoom: 21 });
    panel.innerHTML = res.gap
      ? `<div class="warn">The two circles don't meet – they miss by ${res.gap.toFixed(1)} m. Check the distances or points. The marker shows the nearest spot.</div>
         <div class="row"><button class="btn" id="again">Start again</button><button class="btn primary" id="pick1">Use the marker</button></div>`
      : `<div class="hint">The circles cross in two places. <b>Tap the one where the tree is</b> (1 or 2).</div>
         <div class="row"><button class="btn" id="again">Start again</button><button class="btn" id="pick1">Use 1</button><button class="btn" id="pick2">Use 2</button></div>`;
    $("#again").onclick = restart;
    $("#pick1").onclick = () => setTreePos(res.pts[0], "measured", note + (res.gap ? ` (circles missed by ${res.gap.toFixed(1)} m)` : ""));
    if ($("#pick2")) $("#pick2").onclick = () => setTreePos(res.pts[1], "measured", note);
  };
  const restart = () => {
    [state.mA, state.mB].forEach(g => (g || []).forEach(m => map.removeLayer(m)));
    state.cand.forEach(m => map.removeLayer(m));
    Object.assign(state, { A: null, B: null, mA: null, mB: null, cand: [] }); cross.hidden = false; step();
  };
  step();
}

// ---------------------------------------------------------------- site plan: load + pin two points
async function planPage(jobId) {
  const job = await DB.get("jobs", jobId);
  if (!job) return go("#/");
  closeMap();
  const plan = job.plan || null, plans = job.plans || [];
  const pinnedInfo = pl => {
    if (!(pl.ctrl && pl.ctrl.length === 2)) return pl.scale ? "Scaled, not on the map yet" : "Not pinned yet";
    const t = planTransform(pl), w = pl.w * t.metresPerPx, h = pl.h * t.metresPerPx;
    const km = v => v >= 2000 ? (v / 1000).toFixed(1) + " km" : v.toFixed(0) + " m";
    return `Pinned ✓ · ${km(w)} × ${km(h)}${Math.abs(t.rotationDeg) > 0.5 ? ` · turned ${t.rotationDeg.toFixed(1)}°` : ""}${pl.ctrl[0].how === "pc" ? " · placed on the PC" : ""}`;
  };
  const thumbs = new Map(plans.map(p => [p.id, URL.createObjectURL(p.blob)]));
  app.innerHTML = `
  <header class="top"><button aria-label="Back" onclick="location.replace('#/job/${jobId}/map')">‹</button><h1>Site plans<span class="sub">${esc(job.site)}</span></h1></header>
  <main>
    <p class="hint">Load pictures of the site plans (photos, or screenshots of PDFs) – one or several – then pin each to the ground with two points so it sits on the map. Plans placed on the PC (Site plans → Phone starter) arrive already pinned. They're stored on this device and work without signal. The plan marked <b>In use</b> is shown on the map; switch on the map or here.</p>
    ${plans.map(pl => `<div class="card plancard ${pl === plan ? "inuse" : ""}" data-id="${pl.id}">
      <img src="${thumbs.get(pl.id)}" alt="">
      <div><div class="name">${planLabel(pl)}</div><div class="meta">${pl.w} × ${pl.h} px</div><div class="meta"><b>${pinnedInfo(pl)}</b></div>
      <div class="row">${pl === plan ? `<span class="pill">In use</span>` : `<button class="btn small primary" data-act="use">Use</button>`}
        <button class="btn small" data-act="pin">${pl.ctrl && pl.ctrl.length === 2 ? "Re-pin" : "Pin"}</button>
        <button class="btn small" data-act="ren">Rename</button><button class="btn small danger" data-act="del">Remove</button></div></div></div>`).join("")}
    ${plan ? `<label for="op">Show ${planLabel(plan)} on the map at</label><input id="op" type="range" min="0.2" max="1" step="0.05" value="${plan.opacity ?? 0.75}">` : ""}
    <div class="row"><button class="btn ${plans.length ? "" : "primary"}" id="load">${plans.length ? "＋ Add another plan" : "Load site plan"}</button>
      ${plans.length > 1 ? `<button class="btn" id="none">${plan ? "Hide plans on the map" : "No plan shown"}</button>` : ""}</div>
    ${plan ? `<h2>Plan of unknown scale?</h2>
      <p class="hint">For the plan in use: measure between two points on site and the plan is scaled from that. Then use the ruler, or put the plan on the map with one point and north.</p>
      <div class="row"><button class="btn" onclick="go('#/job/${jobId}/scale')">📐 ${plan.scale ? "Re-scale" : "Set scale by measuring"}</button>
        ${plan.scale ? `<button class="btn" onclick="go('#/job/${jobId}/ruler')">📏 Ruler</button><button class="btn" onclick="go('#/job/${jobId}/locate')">📍 Put on map</button>` : ""}</div>
      ${plan.scale ? `<div class="meta">Scale: ${(plan.w * (plan.scale.mppX || plan.scale.mpp)).toFixed(0)} m across${plan.scale.check ? ` · checked to ${Math.abs(plan.scale.check.err)}%` : ""}</div>` : ""}` : ""}
  </main>`;
  const save = async () => { job.updated = Date.now(); await DB.put("jobs", job); };
  $("#load").onclick = () => pickFiles("#gallery", async files => {
    let last = null;
    for (const f of files) {
      const blob = await shrink(f, 4096);
      const bmp = await createImageBitmap(blob);
      last = { id: uid(), blob, w: bmp.width, h: bmp.height, name: f.name, ctrl: [], opacity: 0.75 };
      job.plans.push(last);
    }
    if (!last) return;
    usePlan(job, last.id); await save();
    if (files.length === 1) location.replace(`#/job/${jobId}/pin`); else { toast(`${files.length} plans added – pin each one`); route(); }
  });
  app.querySelectorAll(".plancard").forEach(card => {
    const pl = plans.find(p => p.id === card.dataset.id);
    card.querySelectorAll("[data-act]").forEach(b => b.onclick = async () => {
      const act = b.dataset.act;
      if (act === "use") { usePlan(job, pl.id); await save(); route(); }
      if (act === "pin") { usePlan(job, pl.id); await save(); go(`#/job/${jobId}/pin`); }
      if (act === "ren") { const n = prompt("Name for this plan", (pl.name || "").replace(/\.(jpe?g|png|pdf)$/i, "")); if (n && n.trim()) { pl.name = n.trim(); await save(); route(); } }
      if (act === "del") {
        if (!confirm(`Remove ${planLabel(pl)} from this survey?`)) return;
        job.plans = job.plans.filter(p => p !== pl);
        if (job.plan === pl) usePlan(job, (job.plans[0] || {}).id || null);
        await save(); route();
      }
    });
  });
  if ($("#none")) $("#none").onclick = async () => { usePlan(job, null); await save(); route(); };
  if ($("#op")) $("#op").onchange = async e => { job.plan.opacity = +e.target.value; await save(); };
}

// pin: step through A and B. For each: tap the point on the plan, then say where it is on the ground.
async function pinPage(jobId) {
  const job = await DB.get("jobs", jobId);
  if (!job || !job.plan) return go(`#/job/${jobId}/plan`);
  const ctrl = [];
  const showPlan = which => {
    closeMap();
    app.innerHTML = `<div class="mapwrap">
      <header class="top"><button aria-label="Back" onclick="location.replace('#/job/${jobId}/plan')">‹</button><h1>Pin plan – point ${which}<span class="sub">${esc(job.site)}</span></h1></header>
      <div class="mapbox"><div id="map" class="planview"></div><div class="cross"></div></div>
      <div class="panel"><div class="hint">Move the <b>plan</b> so the <b>✛</b> is on point ${which} – something you can find on the ground or on a map: a building corner, gatepost, manhole${which === "B" ? ", <b>well away from point A</b>" : ""}.</div>
      <button class="btn primary block" id="here">This is point ${which}</button></div></div>`;
    const { w, h } = job.plan;
    const map = L.map("map", { crs: L.CRS.Simple, minZoom: -6, maxZoom: 4, zoomSnap: 0.25, attributionControl: false });
    liveMap = map;
    const b = [[-h, 0], [0, w]];
    L.imageOverlay(URL.createObjectURL(job.plan.blob), b).addTo(map);
    map.fitBounds(b);
    ctrl.forEach((c, i) => L.circleMarker([-c.y, c.x], { radius: 7, color: "#fff", weight: 2, fillColor: "#B0007A", fillOpacity: 1 }).addTo(map).bindTooltip("A", { permanent: true, direction: "top", className: "tlabel" }));
    setTimeout(() => { if (liveMap === map) map.invalidateSize(); }, 50);
    leaveHook = async () => closeMap();
    $("#here").onclick = () => { const c = map.getCenter(); askGround(which, { x: c.lng, y: -c.lat }); };
  };
  const askGround = (which, px) => {
    closeMap();
    app.innerHTML = `<header class="top"><button aria-label="Back" id="bk">‹</button><h1>Where is point ${which}?<span class="sub">${esc(job.site)}</span></h1></header>
    <main>
      <p class="hint">Give point ${which}'s real position in one of these ways:</p>
      <label for="gr">Grid reference or easting, northing (from the plan's grid, a topo survey or OS map)</label>
      <div class="grid2" style="grid-template-columns:1fr auto;align-items:end"><input id="gr" placeholder="NZ 15862 57871  or  415862, 557871" autocapitalize="characters" autocomplete="off"><button class="btn" id="useGr">Use</button></div>
      <button class="btn block" id="useGps" style="margin-top:12px">📍 I'm standing on it – use my GPS</button>
      <button class="btn block" id="useMap" style="margin-top:12px">🗺 Find it on the street map (needs signal)</button>
      <p class="hint" id="gpsStat"></p>
    </main>`;
    $("#bk").onclick = () => showPlan(which);
    const done = async (lat, lon, how) => {
      ctrl.push(Object.assign({}, px, { lat, lon, how }));
      if (ctrl.length < 2) return showPlan("B");
      const d = dist([ctrl[0].lat, ctrl[0].lon], [ctrl[1].lat, ctrl[1].lon]);
      if (d < 5) { toast("A and B are too close together on the ground – choose points further apart", 4000); ctrl.pop(); return showPlan("B"); }
      job.plan.ctrl = ctrl; job.updated = Date.now(); await DB.put("jobs", job);
      const t = planTransform(job.plan);
      toast(`Plan pinned – ${(job.plan.w * t.metresPerPx).toFixed(0)} m wide`, 3000);
      location.replace(`#/job/${jobId}/map`);
    };
    $("#useGr").onclick = () => {
      const en = OSGB.parse($("#gr").value);
      if (!en) { toast("That doesn't look like a grid reference"); return; }
      const [lat, lon] = OSGB.toLatLon(en[0], en[1]); done(lat, lon, "grid");
    };
    $("#useGps").onclick = () => {
      $("#gpsStat").textContent = "Getting your position… stand still for a moment.";
      let best = null;
      startGps(c => { best = c; $("#gpsStat").textContent = `±${Math.round(c.accuracy)} m…`; }, st => {
        if (st === "done" && best) done(best.latitude, best.longitude, "gps");
        else if (st !== "searching") $("#gpsStat").textContent = "Couldn't get a GPS position here.";
      });
    };
    $("#useMap").onclick = async () => {
      app.innerHTML = mapShell(`Point ${which} on the map`, esc(job.site), "void 0");
      app.querySelector(".top button").onclick = () => { closeMap(); askGround(which, px); };
      const { map } = await buildMap($("#map"), Object.assign({}, job, { plan: null }), [], { base: "street", center: ctrl[0] ? [ctrl[0].lat, ctrl[0].lon] : null, zoom: 19 });
      $("#cross").hidden = false;
      $("#meBtn").onclick = () => map._me ? map.setView(map._me, 19) : locateOnce(map);
      $("#panel").innerHTML = `<div class="hint">Move the map so the <b>✛</b> is on point ${which}.</div><button class="btn primary block" id="ok">This is point ${which}</button>`;
      $("#ok").onclick = () => { const c = map.getCenter(); closeMap(); done(c.lat, c.lng, "map"); };
    };
  };
  showPlan("A");
}
