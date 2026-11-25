// Tree Survey – © 2026 Mark Johnson. All rights reserved. Use only under a written licence from the owner.
/* Tree Survey – site plan of unknown scale, and map layers.
   Scale:  tap two points on the plan you can measure between on site, type the tape / laser distance → metres per pixel.
           A second measurement checks it (and, if the plan is stretched, gives a separate across / down scale).
   Ruler:  measure any distance on the scaled plan.
   Locate: one point on the ground (grid ref, GPS or map) + which way north is → the plan sits on the map, so trees
           can be placed on it and "Measure from 2 points" works.
   Layers: GeoJSON or KML files (survey zones, boundaries, routes, points) drawn on the map; each tree takes the name
           of the zone it stands in. */
"use strict";

const planPx = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);

// metres for a pixel vector, using the across / down scales when the plan is stretched
function planMetres(plan, a, b) {
  const s = plan.scale; if (!s) return null;
  const dx = (b.x - a.x) * (s.mppX || s.mpp), dy = (b.y - a.y) * (s.mppY || s.mpp);
  return Math.hypot(dx, dy);
}

function planView(job, sel) {
  const { w, h } = job.plan;
  const map = L.map(sel, { crs: L.CRS.Simple, minZoom: -6, maxZoom: 4, zoomSnap: 0.25, attributionControl: false });
  liveMap = map;
  const b = [[-h, 0], [0, w]];
  L.imageOverlay(URL.createObjectURL(job.plan.blob), b).addTo(map);
  map.fitBounds(b);
  setTimeout(() => { if (liveMap === map) map.invalidateSize(); }, 50);
  return map;
}
const centrePx = map => { const c = map.getCenter(); return { x: c.lng, y: -c.lat }; };
const pxLL = p => [-p.y, p.x];

// ---- set the scale from measured distances
async function scalePage(jobId) {
  const job = await DB.get("jobs", jobId);
  if (!job || !job.plan) return go(`#/job/${jobId}/plan`);
  const pts = [], meas = [];
  let map = null, layer = null;
  const shell = (title, hint, extra) => {
    closeMap();
    app.innerHTML = `<div class="mapwrap">
      <header class="top"><button aria-label="Back" onclick="location.replace('#/job/${jobId}/plan')">‹</button><h1>${title}<span class="sub">${esc(job.site)}</span></h1></header>
      <div class="mapbox"><div id="map" class="planview"></div><div class="cross"></div></div>
      <div class="panel"><div class="hint">${hint}</div>${extra}</div></div>`;
    map = planView(job, "map"); layer = L.layerGroup().addTo(map);
    pts.forEach((p, i) => L.circleMarker(pxLL(p), { radius: 6, color: "#fff", weight: 2, fillColor: "#B0007A", fillOpacity: 1 }).addTo(layer)
      .bindTooltip("ABCD"[i], { permanent: true, direction: "top", className: "tlabel" }));
    for (let i = 0; i + 1 < pts.length; i += 2) L.polyline([pxLL(pts[i]), pxLL(pts[i + 1])], { color: "#B0007A", weight: 3, dashArray: "6 4" }).addTo(layer);
    leaveHook = async () => closeMap();
  };
  const pick = (label, next) => {
    shell(`Scale – point ${label}`, `Move the plan so the <b>✛</b> is on point ${label}: something you can measure to on site – a building corner, gatepost, kerb end.` +
      (label === "B" ? " <b>As far from A as you can.</b>" : label === "C" ? " For the check, ideally a line at right angles to A–B." : ""),
      `<button class="btn primary block" id="here">This is point ${label}</button>`);
    $("#here").onclick = () => { pts.push(centrePx(map)); next(); };
  };
  const askDist = (label, next) => {
    const a = pts[pts.length - 2], b = pts[pts.length - 1];
    shell(`Measured distance ${label}`, `Measure <b>${label}</b> on site with your tape or laser.`,
      `<div class="grid2" style="align-items:end"><div><label for="md">Distance ${label} (m)</label><input id="md" inputmode="decimal" autocomplete="off" placeholder="e.g. 38.6"></div>
       <button class="btn primary" id="ok">Use</button></div>`);
    setTimeout(() => $("#md") && $("#md").focus(), 100);
    $("#ok").onclick = () => {
      const m = parseFloat(($("#md").value || "").replace(",", "."));
      if (!(m > 0)) { toast("Enter the measured distance"); return; }
      if (planPx(a, b) < 20) { toast("Those points are too close together on the plan"); return; }
      meas.push({ a, b, m }); next();
    };
  };
  const finish = async () => {
    const [m1, m2] = meas;
    const mpp1 = m1.m / planPx(m1.a, m1.b);
    let s = { mpp: mpp1, base: m1, set: Date.now() }, msg = "";
    if (m2) {
      const pred = planPx(m2.a, m2.b) * mpp1, err = (pred - m2.m) / m2.m * 100;
      s.check = { ...m2, err: +err.toFixed(1) };
      msg = `Check: the plan gives ${pred.toFixed(2)} m for ${m2.m} m measured – ${Math.abs(err).toFixed(1)}% ${err > 0 ? "long" : "short"}.`;
      // stretched plan (photo of paper, scan): one line mostly across, the other mostly down → separate scales
      const ax = v => Math.abs(v.b.x - v.a.x) / planPx(v.a, v.b);
      const across = ax(m1) > 0.8 ? m1 : ax(m2) > 0.8 ? m2 : null, down = ax(m1) < 0.2 ? m1 : ax(m2) < 0.2 ? m2 : null;
      if (Math.abs(err) > 2 && across && down && across !== down) {
        s.mppX = across.m / Math.abs(across.b.x - across.a.x); s.mppY = down.m / Math.abs(down.b.y - down.a.y);
        s.mpp = (s.mppX + s.mppY) / 2;
        msg += ` The plan looks stretched, so separate scales are used: across ${(1 / s.mppX).toFixed(1)} px/m, down ${(1 / s.mppY).toFixed(1)} px/m.`;
      } else if (Math.abs(err) > 2) {
        s.mpp = (mpp1 + m2.m / planPx(m2.a, m2.b)) / 2;
        msg += " The average of the two is used – re-measure if you can.";
      }
    }
    job.plan.scale = s; job.updated = Date.now(); await DB.put("jobs", job);
    const wide = job.plan.w * (s.mppX || s.mpp), a3 = Math.round(wide / 0.40);  // A3 landscape ≈ 400 mm printed width
    closeMap();
    app.innerHTML = `<header class="top"><button aria-label="Back" onclick="location.replace('#/job/${jobId}/plan')">‹</button><h1>Plan scaled<span class="sub">${esc(job.site)}</span></h1></header>
    <main><div class="card"><div class="big">${wide.toFixed(0)} m across the plan</div>
      <div class="meta">≈ 1:${a3.toLocaleString("en-GB")} if printed at A3 · ${(1 / s.mpp).toFixed(2)} pixels per metre</div>
      ${msg ? `<p class="hint">${esc(msg)}</p>` : `<p class="hint">Add a check measurement next time to confirm the scale.</p>`}</div>
      <div class="row"><button class="btn primary" onclick="go('#/job/${jobId}/ruler')">📏 Ruler</button>
        <button class="btn" onclick="go('#/job/${jobId}/locate')">📍 Put it on the map</button></div>
      <p class="hint">“Put it on the map” needs one point's real position and which way north is. Then trees can be placed on the plan.</p></main>`;
  };
  pick("A", () => pick("B", () => askDist("A–B", () => {
    shell("Check the scale?", "A second measurement, ideally at right angles to the first, shows how accurate the plan is – and corrects a stretched photo.",
      `<div class="row"><button class="btn" id="skip">No, finish</button><button class="btn primary" id="chk">Add a check</button></div>`);
    $("#skip").onclick = finish;
    $("#chk").onclick = () => pick("C", () => pick("D", () => askDist("C–D", finish)));
  })));
}

// ---- ruler on the plan
async function rulerPage(jobId) {
  const job = await DB.get("jobs", jobId);
  if (!job || !job.plan || !job.plan.scale) return go(`#/job/${jobId}/plan`);
  closeMap();
  app.innerHTML = `<div class="mapwrap">
    <header class="top"><button aria-label="Back" onclick="location.replace('#/job/${jobId}/plan')">‹</button><h1>Ruler<span class="sub">${esc(job.site)}</span></h1></header>
    <div class="mapbox"><div id="map" class="planview"></div><div class="cross"></div></div>
    <div class="panel"><div class="big" id="rd">Move the ✛ to the start and tap Add point</div>
      <div class="row"><button class="btn" id="undo">Undo</button><button class="btn" id="clr">Clear</button><button class="btn primary" id="add">Add point</button></div></div></div>`;
  const map = planView(job, "map"), lay = L.layerGroup().addTo(map), pts = [];
  leaveHook = async () => closeMap();
  const draw = () => {
    lay.clearLayers();
    pts.forEach(p => L.circleMarker(pxLL(p), { radius: 5, color: "#fff", weight: 2, fillColor: "#ff7a1a", fillOpacity: 1 }).addTo(lay));
    if (pts.length > 1) L.polyline(pts.map(pxLL), { color: "#ff7a1a", weight: 3 }).addTo(lay);
    let tot = 0; const legs = [];
    for (let i = 1; i < pts.length; i++) { const m = planMetres(job.plan, pts[i - 1], pts[i]); tot += m; legs.push(m.toFixed(1)); }
    $("#rd").textContent = pts.length < 2 ? (pts.length ? "Move to the next point and tap Add point" : "Move the ✛ to the start and tap Add point")
      : `${tot.toFixed(2)} m` + (legs.length > 1 ? `  (${legs.join(" + ")})` : "");
  };
  // live distance from the last point to the cross
  map.on("move", () => { if (pts.length) { const m = planMetres(job.plan, pts[pts.length - 1], centrePx(map)); $("#rd").dataset.live = m.toFixed(1); } });
  $("#add").onclick = () => { pts.push(centrePx(map)); draw(); };
  $("#undo").onclick = () => { pts.pop(); draw(); };
  $("#clr").onclick = () => { pts.length = 0; draw(); };
}

// ---- locate a scaled plan: one ground point + north
async function locatePage(jobId) {
  const job = await DB.get("jobs", jobId);
  if (!job || !job.plan || !job.plan.scale) return go(`#/job/${jobId}/plan`);
  closeMap();
  app.innerHTML = `<div class="mapwrap">
    <header class="top"><button aria-label="Back" onclick="location.replace('#/job/${jobId}/plan')">‹</button><h1>Put the plan on the map<span class="sub">${esc(job.site)}</span></h1></header>
    <div class="mapbox"><div id="map" class="planview"></div><div class="cross"></div></div>
    <div class="panel"><div class="hint">Move the plan so the <b>✛</b> is on a point whose position you can give – a corner you can stand on, or one with a grid reference.</div>
      <button class="btn primary block" id="here">This point</button></div></div>`;
  const map = planView(job, "map");
  leaveHook = async () => closeMap();
  $("#here").onclick = () => {
    const px = centrePx(map); closeMap();
    app.innerHTML = `<header class="top"><button aria-label="Back" onclick="route()">‹</button><h1>Where is it, and where's north?<span class="sub">${esc(job.site)}</span></h1></header>
    <main>
      <label for="gr">Grid reference (or easting, northing)</label><input id="gr" placeholder="NZ 15862 57871" autocapitalize="characters" autocomplete="off">
      <button class="btn block" id="gps" style="margin-top:8px">📍 I'm standing on it – use my GPS</button><p class="hint" id="gs"></p>
      <label>North on the plan points</label>
      <div class="chips" id="north">${[["0", "Up ↑"], ["90", "Right →"], ["180", "Down ↓"], ["270", "Left ←"]].map(([v, l]) => `<button class="chip ${v === "0" ? "on" : ""}" data-v="${v}">${l}</button>`).join("")}</div>
      <label for="deg">or the plan's north arrow is turned (° clockwise from straight up)</label><input id="deg" inputmode="decimal" placeholder="e.g. 12">
      <button class="btn primary block" id="ok" style="margin-top:16px">Put it on the map</button>
    </main>`;
    let north = 0, fix = null;
    $("#north").onclick = e => { const b = e.target.closest(".chip"); if (!b) return; north = +b.dataset.v; $("#deg").value = ""; $("#north").querySelectorAll(".chip").forEach(c => c.classList.toggle("on", c === b)); };
    $("#gps").onclick = () => { $("#gs").textContent = "Getting your position…"; startGps(c => { fix = c; $("#gs").textContent = `±${Math.round(c.accuracy)} m`; }, st => { if (st === "done" && fix) $("#gs").textContent = `Got it (±${Math.round(fix.accuracy)} m)`; }); };
    $("#ok").onclick = async () => {
      let lat, lon;
      const en = $("#gr").value.trim() ? OSGB.parse($("#gr").value) : null;
      if (en) [lat, lon] = OSGB.toLatLon(en[0], en[1]);
      else if (fix) { lat = fix.latitude; lon = fix.longitude; }
      else { toast("Give a grid reference or use GPS"); return; }
      const deg = $("#deg").value.trim() ? +$("#deg").value.replace(",", ".") : north;
      // plan "up" is turned deg clockwise from north: a plan vector (dx right, dy down) -> east / north metres
      const s = job.plan.scale, th = deg * Math.PI / 180;
      const toEN = (dx, dy) => { const e = dx * (s.mppX || s.mpp), n = -dy * (s.mppY || s.mpp); return [e * Math.cos(th) + n * Math.sin(th), -e * Math.sin(th) + n * Math.cos(th)]; };
      const f = frame(lat, lon), [e2, n2] = toEN(1000, 0), B = f.ll(e2, n2);
      job.plan.ctrl = [{ x: px.x, y: px.y, lat, lon, how: en ? "grid" : "gps" }, { x: px.x + 1000, y: px.y, lat: B[0], lon: B[1], how: "scale" }];
      job.plan.located = { north: deg }; job.updated = Date.now(); await DB.put("jobs", job);
      toast("Plan is on the map", 2500); location.replace(`#/job/${jobId}/map`);
    };
  };
}

// ---------------------------------------------------------------- map layers (zones, boundaries, points)
const LAYER_COLS = ["#3a7bd5", "#ff7a1a", "#2F6B3A", "#B0007A", "#7a5af8", "#c09000"];
const featName = p => { p = p || {}; return String(p.name || p.Name || p.label || p.zone || p.Zone || p.attribute_ || p.category || p.description || "").trim(); };

function kmlToGeoJSON(text) {
  const doc = new DOMParser().parseFromString(text, "text/xml"), feats = [];
  const parse = s => s.trim().split(/\s+/).map(c => c.split(",").map(Number)).filter(c => c.length >= 2 && !isNaN(c[0])).map(c => [c[0], c[1]]);
  doc.querySelectorAll("Placemark").forEach(pm => {
    const name = (pm.querySelector("name") || {}).textContent || "";
    pm.querySelectorAll("Polygon").forEach(pg => { const o = pg.querySelector("outerBoundaryIs coordinates"); if (o) feats.push({ type: "Feature", properties: { name }, geometry: { type: "Polygon", coordinates: [parse(o.textContent)] } }); });
    pm.querySelectorAll("LineString coordinates").forEach(c => feats.push({ type: "Feature", properties: { name }, geometry: { type: "LineString", coordinates: parse(c.textContent) } }));
    pm.querySelectorAll("Point coordinates").forEach(c => feats.push({ type: "Feature", properties: { name }, geometry: { type: "Point", coordinates: parse(c.textContent)[0] } }));
  });
  return { type: "FeatureCollection", features: feats };
}

// GeoJSON in British National Grid (EPSG:27700) -> WGS84 for the map
function toWGS84(gj) {
  const bng = /27700/.test(JSON.stringify(gj.crs || "")) || (() => { const f = (gj.features || [])[0]; const c = JSON.stringify(f && f.geometry && f.geometry.coordinates || []).match(/-?\d+(\.\d+)?/); return c && Math.abs(+c[0]) > 1000; })();
  if (!bng) return gj;
  const conv = c => typeof c[0] === "number" ? (([la, lo]) => [lo, la])(OSGB.toLatLon(c[0], c[1])) : c.map(conv);
  return Object.assign({}, gj, { crs: undefined, features: gj.features.map(f => Object.assign({}, f, { geometry: f.geometry && Object.assign({}, f.geometry, { coordinates: conv(f.geometry.coordinates) }) })) });
}

function pointInRing(pt, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < (xj - xi) * (pt[1] - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
// the zone (polygon name) a position falls in, from the job's layers
function zoneFor(job, lat, lon) {
  if (lat == null || lat === "") return "";
  const pt = [+lon, +lat];
  for (const lay of job.layers || []) {
    if (lay.zones === false || lay.kind === "image") continue;
    for (const f of lay.geojson.features || []) {
      const g = f.geometry || {};
      const polys = g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : [];
      if (polys.some(p => pointInRing(pt, p[0]) && !p.slice(1).some(h => pointInRing(pt, h)))) return featName(f.properties) || lay.name;
    }
  }
  return "";
}

// how strongly a layer is drawn: 1 = as made, down to 0.2 = faint (set per layer on the Map layers page)
function layerStrength(lay) { const o = +lay.opacity; return o >= 0.2 && o <= 1 ? o : 1; }
// A layer can be switched off without being removed (v1.83): the tick on the Map layers page, or its tick box in the
// map's own layer list. It stays on the job, keeps its slider, and its areas still name the trees' zones.
function layerShown(lay) { return !(lay && lay.hidden); }
function setLayerShown(lay, on) { if (on) delete lay.hidden; else lay.hidden = true; }

// A sharper aerial image comes as several pieces (v1.78). The pieces are kept out of the job record – in the settings
// store under "layertiles:<layer id>" – so saving a tree does not rewrite megabytes of picture each time.
const TILE_URLS = {};   // layer id -> [{bounds, url}]: one set of addresses per visit, however often the map is drawn
const tilesKey = id => "layertiles:" + id;
function dataUrlBlob(u) {
  const i = u.indexOf(","), bin = atob(u.slice(i + 1)), a = new Uint8Array(bin.length);
  for (let k = 0; k < bin.length; k++) a[k] = bin.charCodeAt(k);
  return new Blob([a], { type: (u.slice(0, i).match(/^data:([^;,]+)/) || [])[1] || "image/jpeg" });
}
async function layerTiles(lay) {
  if (!TILE_URLS[lay.id]) {
    const rec = await DB.get("settings", tilesKey(lay.id));
    TILE_URLS[lay.id] = ((rec && rec.tiles) || []).map(t => ({ bounds: t.bounds, url: URL.createObjectURL(t.blob) }));
  }
  return TILE_URLS[lay.id];
}
async function dropLayerTiles(lay) {
  if (!lay || !lay.sharp) return;
  (TILE_URLS[lay.id] || []).forEach(t => { try { URL.revokeObjectURL(t.url); } catch (e) { } });
  delete TILE_URLS[lay.id];
  try { await DB.del("settings", tilesKey(lay.id)); } catch (e) { }
}
// every sharper layer of a job, when the job itself goes (deleted, or replaced by a copy from a zip)
async function dropJobTiles(job) { for (const l of (job && job.layers) || []) await dropLayerTiles(l); }

// A picture that was cut to a shape (an area of interest) carries its outline as fractions of its own box (v1.79):
// [[across, down], …]. Each picture on the map is trimmed to it, so the street map shows round the edge, not white.
function clipFor(lay, b) {
  if (!Array.isArray(lay.clip) || lay.clip.length < 3 || !lay.bounds) return "";
  const [[S, W], [N, E]] = lay.bounds, [[s, w], [n, e]] = b;
  return "polygon(" + lay.clip.map(([fx, fy]) => {
    const lon = W + fx * (E - W), lat = N - fy * (N - S);
    return ((lon - w) / (e - w) * 100).toFixed(3) + "% " + ((n - lat) / (n - s) * 100).toFixed(3) + "%";
  }).join(", ") + ")";
}
function trimmed(overlay, lay, b) {
  const cp = clipFor(lay, b);
  if (cp) overlay.on("add", () => { const el = overlay.getElement(); if (el) { el.style.clipPath = cp; el.style.webkitClipPath = cp; } });
  return overlay;
}

// An aerial picture file made on the PC (Aerial image → phone) -> the layer record for a job. A sharper one has its
// pieces put beside the job. id: given by a starter zip (so loading the starter again replaces the layer), else new.
async function imageLayer(gj, fallbackName, id) {
  if (!gj || gj.type !== "ImageOverlay" || !gj.image || !gj.bounds) throw new Error("That image layer is incomplete – make it again on the PC.");
  const lay = { id: id || uid(), kind: "image", name: gj.name || fallbackName || "Aerial image", bounds: gj.bounds, credit: gj.credit || "", zones: false };
  if (Array.isArray(gj.clip) && gj.clip.length >= 3 && gj.clip.every(p => Array.isArray(p) && p.length === 2 && isFinite(p[0]) && isFinite(p[1]))) lay.clip = gj.clip;
  const pieces = Array.isArray(gj.tiles) ? gj.tiles.filter(t => t && t.image && Array.isArray(t.bounds)) : [];
  if (pieces.length) {          // the sharper version: keep its pieces beside the job, not in it
    (TILE_URLS[lay.id] || []).forEach(t => { try { URL.revokeObjectURL(t.url); } catch (e) { } }); delete TILE_URLS[lay.id];
    await DB.put("settings", { id: tilesKey(lay.id), tiles: pieces.map(t => ({ bounds: t.bounds, blob: dataUrlBlob(t.image) })) });
    lay.sharp = true; lay.pieces = pieces.length;
  } else lay.image = gj.image;
  return lay;
}
// A starter zip from the PC carries the job's map layers. Its own layers have ids like l-0123abcdef; anything added on
// this device has a different kind of id and is never touched here.
const STARTER_LAYER = /^l-[0-9a-f]{10}$/;
// the aerial layers a starter carries (job.imageLayers: [{id, file}]) -> layer records, pieces stored
async function starterImageLayers(zip, job) {
  const out = [];
  for (const it of job.imageLayers || []) {
    const f = it && it.file && zip.file(it.file);
    if (!f) continue;
    try { out.push(await imageLayer(JSON.parse(await f.async("string")), String(it.file).replace(/^.*\//, "").replace(/\.json$/i, ""), it.id)); }
    catch (e) { console.error(e); }
  }
  return out;
}

function drawLayers(map, job, overlays) {
  // aerial photos / drone maps first, so shapes and trees sit on top
  (job.layers || []).filter(l => l.kind === "image").forEach(lay => {
    const opt = { opacity: layerStrength(lay), attribution: esc(lay.credit || ""), interactive: false };
    if (lay.sharp) {      // its pieces are read from the device and added as they arrive
      const g = L.layerGroup(); g._layId = lay.id; if (layerShown(lay)) g.addTo(map); overlays[esc(lay.name)] = g;
      // The layer list gives every picture its place in the pile (plans, then aerial pictures, in order). It does that
      // before the pieces are here, so the place is kept and given to each piece as it arrives – without it the pieces
      // sat underneath any plan and any other aerial picture.
      g.setZIndex = function (z) { this._place = z; return L.LayerGroup.prototype.setZIndex.call(this, z); };
      layerTiles(lay).then(ts => ts.forEach(t => {
        const o = trimmed(L.imageOverlay(t.url, t.bounds, opt), lay, t.bounds).addTo(g);
        if (g._place != null) o.setZIndex(g._place);
      })).catch(() => { });
      return;
    }
    const im = trimmed(L.imageOverlay(lay.image, lay.bounds, opt), lay, lay.bounds);
    im._layId = lay.id; if (layerShown(lay)) im.addTo(map); overlays[esc(lay.name)] = im;
  });
  (job.layers || []).filter(l => l.kind !== "image").forEach((lay, i) => {
    const ntm = /National Tree Map/.test(lay.credit || "");
    const col = ntm ? "#4E8A4A" : LAYER_COLS[i % LAYER_COLS.length];
    const k = layerStrength(lay);
    const g = L.geoJSON(lay.geojson, {
      attribution: esc(lay.credit || ""),
      style: f => { const own = f && f.properties && /^#[0-9a-f]{6}$/i.test(f.properties.colour || "") ? f.properties.colour : "";   // usage zones carry their band's colour
        return ntm ? ({ color: col, weight: 1, opacity: k, fillColor: "#8FB98B", fillOpacity: 0.25 * k }) : own ? ({ color: own, weight: 2, opacity: k, fillColor: own, fillOpacity: 0.28 * k }) : ({ color: col, weight: 2, opacity: k, fillOpacity: 0.08 * k }); },
      pointToLayer: (f, ll) => L.circleMarker(ll, { radius: 5, color: "#fff", weight: 1.5, opacity: k, fillColor: col, fillOpacity: k }),
      onEachFeature: (f, l) => { const n = featName(f.properties); if (n) l.bindTooltip(esc(n), { sticky: true, className: "tlabel" }); },
      interactive: true,
    });
    g._layId = lay.id; if (layerShown(lay)) g.addTo(map); overlays[esc(lay.name)] = g;
  });
}

async function addLayerFile(job, file) {
  const text = await file.text();
  let gj = /\.kml$/i.test(file.name) || /<kml/i.test(text.slice(0, 500)) ? kmlToGeoJSON(text) : JSON.parse(text);
  if (gj.type === "ImageOverlay") {  // aerial photo / drone map made on the PC by "Aerial image → phone"
    const lay = await imageLayer(gj, file.name.replace(/\.json$/i, ""));
    job.layers = (job.layers || []).concat([lay]);
    job.updated = Date.now(); await DB.put("jobs", job);
    return lay.sharp ? "sharper aerial image" : "aerial image";
  }
  if (gj.type === "Feature") gj = { type: "FeatureCollection", features: [gj] };
  gj = toWGS84(gj);
  const n = (gj.features || []).length;
  if (!n) throw new Error("No shapes found in that file.");
  job.layers = (job.layers || []).concat([{ id: uid(), name: file.name.replace(/\.(geo)?json$|\.kml$/i, ""), geojson: gj,
    zones: gj.zones !== false, credit: gj.credit || "" }]);
  job.updated = Date.now(); await DB.put("jobs", job);
  return n;
}

async function layersPage(jobId) {
  const job = await DB.get("jobs", jobId);
  if (!job) return go("#/");
  const ls = job.layers || [];
  app.innerHTML = `<header class="top"><button aria-label="Back" onclick="location.replace('#/job/${jobId}/map')">‹</button><h1>Map layers<span class="sub">${esc(job.site)}</span></h1></header>
  <main>
    <p class="hint">Add survey zones, site boundaries, routes or target points as <b>GeoJSON</b> or <b>KML</b> (Google Earth), or an aerial photo / drone map made on the PC with <b>Aerial image → phone</b>. Each layer has a tick to show it on the map or switch it off (it stays here, and its areas still name the trees' zones) and a slider for how strongly it shows. Shapefiles: convert them on the PC with <b>Map layers</b> (Import survey folder) or in QGIS. Trees take the name of the zone they stand in.</p>
    ${ls.map(l => `<div class="card"><div class="name">${esc(l.name)}</div><div class="meta">${l.kind === "image" ? "Aerial image" + (l.sharp ? ` – sharper, in ${l.pieces || "several"} pieces` : "") : (l.geojson.features || []).length + " shapes"}${l.credit ? " · " + esc(l.credit) : ""}</div>
      ${l.kind === "image" ? "" : `<label class="check"><input type="checkbox" data-z="${l.id}" ${l.zones !== false ? "checked" : ""}> Use its areas as zones for trees</label>`}
      <label class="check"><input type="checkbox" data-show="${l.id}" ${layerShown(l) ? "checked" : ""}> Show on the map</label>
      <label for="lo_${l.id}">Show on the map at <b data-pc="${l.id}">${Math.round(layerStrength(l) * 100)}%</b></label><input id="lo_${l.id}" data-op="${l.id}" type="range" min="0.2" max="1" step="0.05" value="${layerStrength(l)}" style="display:block;width:100%;margin:4px 0 10px">
      <button class="btn small danger" data-del="${l.id}">Remove</button></div>`).join("") || `<div class="empty">No layers yet.</div>`}
    <button class="btn primary block" id="add">＋ Add a layer file</button>
    <button class="btn block" id="rezone" ${ls.length ? "" : "hidden"} style="margin-top:8px">Update every tree's zone</button>
    <input type="file" id="layin" accept=".geojson,.json,.kml,application/json,application/vnd.google-earth.kml+xml" hidden>
  </main>`;
  $("#add").onclick = () => { const i = $("#layin"); i.value = ""; i.onchange = async () => {
    try { const n = await addLayerFile(job, i.files[0]); toast(typeof n === "number" ? `${n} shapes added` : n === "sharper aerial image" ? "Sharper aerial image added" : "Aerial image added"); await rezone(job); route(); }
    catch (e) { toast("Couldn't read that file: " + e.message, 5000); } }; i.click(); };
  app.querySelectorAll("[data-del]").forEach(b => b.onclick = async () => { await dropLayerTiles(ls.find(l => l.id === b.dataset.del)); job.layers = ls.filter(l => l.id !== b.dataset.del); await DB.put("jobs", job); await rezone(job); route(); });
  app.querySelectorAll("[data-z]").forEach(b => b.onchange = async () => { ls.find(l => l.id === b.dataset.z).zones = b.checked; await DB.put("jobs", job); });
  app.querySelectorAll("[data-show]").forEach(b => b.onchange = async () => { setLayerShown(ls.find(l => l.id === b.dataset.show), b.checked); await DB.put("jobs", job); });
  app.querySelectorAll("[data-op]").forEach(b => {
    b.oninput = () => { const pc = app.querySelector(`[data-pc="${b.dataset.op}"]`); if (pc) pc.textContent = Math.round(+b.value * 100) + "%"; };
    b.onchange = async () => { ls.find(l => l.id === b.dataset.op).opacity = +b.value; await DB.put("jobs", job); };
  });
  $("#rezone").onclick = async () => { const n = await rezone(job); toast(`${n} trees given a zone`); };
}

async function rezone(job) {
  let n = 0;
  for (const t of await DB.by("trees", "job", job.id)) {
    const z = zoneFor(job, t.lat, t.lon);
    if ((t.zone || "") !== z) { t.zone = z; await DB.put("trees", t); }
    if (z) n++;
  }
  return n;
}
