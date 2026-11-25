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
// Beside them is one light picture of the whole area (v1.84). The map shows that when zoomed out, and only the pieces
// in view when zoomed in: every piece on the map every time it was drawn – 24 million pixels on a parkland job – was
// more than an older tablet could unpack without slowing down.
const TILE_URLS = {};   // layer id -> promise of {tiles: [{bounds, url}], whole: {url, w} or null}: one set of addresses per visit
const tilesKey = id => "layertiles:" + id;
const WHOLE_PX = 2048;  // the longest side of a whole-area picture made on this device
function dataUrlBlob(u) {
  const i = u.indexOf(","), bin = atob(u.slice(i + 1)), a = new Uint8Array(bin.length);
  for (let k = 0; k < bin.length; k++) a[k] = bin.charCodeAt(k);
  return new Blob([a], { type: (u.slice(0, i).match(/^data:([^;,]+)/) || [])[1] || "image/jpeg" });
}
// The whole-area picture for pieces that came without one (a layer loaded before v1.84): each piece is unpacked once,
// small, and drawn in its place. Done once for the layer, then kept beside the pieces.
async function wholeFromPieces(lay, tiles) {
  const [[S, W], [N, E]] = lay.bounds, wide = (E - W) * Math.cos((S + N) / 2 * Math.PI / 180), high = N - S;
  const k = WHOLE_PX / Math.max(wide, high), cw = Math.max(1, Math.round(wide * k)), ch = Math.max(1, Math.round(high * k));
  const c = document.createElement("canvas"); c.width = cw; c.height = ch;
  const x = c.getContext("2d"); x.fillStyle = "#ebebe6"; x.fillRect(0, 0, cw, ch); x.imageSmoothingQuality = "high";
  const small = [];
  for (const t of tiles) {
    const [[s, w], [n, e]] = t.bounds;
    const x0 = (w - W) / (E - W) * cw, y0 = (N - n) / (N - S) * ch, pw = (e - w) / (E - W) * cw, ph = (n - s) / (N - S) * ch;
    if (!(pw > 0 && ph > 0)) continue;
    small.push({ x0, y0, pw, ph, bmp: await createImageBitmap(t.blob, { resizeWidth: Math.max(1, Math.ceil(pw)), resizeHeight: Math.max(1, Math.ceil(ph)), resizeQuality: "medium" }) });
  }
  // Each piece goes exactly where it belongs, to a fraction of a pixel – a tree may be placed against this picture.
  // All are drawn a touch too big first, so the soft edge of a piece blends into its neighbour and not into the
  // background (no pale lines along the joins).
  for (const p of small) x.drawImage(p.bmp, p.x0 - 1, p.y0 - 1, p.pw + 2, p.ph + 2);
  for (const p of small) { x.drawImage(p.bmp, p.x0, p.y0, p.pw, p.ph); p.bmp.close(); }
  const blob = await new Promise((ok, no) => c.toBlob(b => b ? ok(b) : no(new Error("no picture")), "image/jpeg", 0.85));
  c.width = c.height = 1;
  return { blob, w: cw };
}
function layerTiles(lay) {
  if (TILE_URLS[lay.id]) return TILE_URLS[lay.id];
  const mine = (async () => {
    const rec = (await DB.get("settings", tilesKey(lay.id))) || { id: tilesKey(lay.id), tiles: [] };
    rec.tiles = rec.tiles || [];
    if (!rec.whole && rec.tiles.length > 1 && lay.bounds) {
      try {
        if (typeof toast === "function") toast("Getting the aerial image ready – this happens once", 5000);
        const whole = await wholeFromPieces(lay, rec.tiles);
        // kept only if the layer is still the one asked about (it may have been removed or loaded again meanwhile)
        if (TILE_URLS[lay.id] === mine) { rec.whole = whole; await DB.put("settings", rec); }
      } catch (e) { console.error(e); }
    }
    return { tiles: rec.tiles.map(t => ({ bounds: t.bounds, url: URL.createObjectURL(t.blob) })),
      whole: rec.whole ? { url: URL.createObjectURL(rec.whole.blob), w: rec.whole.w } : null };
  })();
  TILE_URLS[lay.id] = mine;
  mine.catch(() => { if (TILE_URLS[lay.id] === mine) delete TILE_URLS[lay.id]; });
  return mine;
}
function forgetTileUrls(id) {
  const was = TILE_URLS[id]; delete TILE_URLS[id];
  if (was) was.then(p => { p.tiles.concat(p.whole ? [p.whole] : []).forEach(t => { try { URL.revokeObjectURL(t.url); } catch (e) { } }); }).catch(() => { });
}
async function dropLayerTiles(lay) {
  if (!lay || !lay.sharp) return;
  forgetTileUrls(lay.id);
  try { await DB.del("settings", tilesKey(lay.id)); } catch (e) { }
}
// every sharper layer of a job, when the job itself goes (deleted, or replaced by a copy from a zip)
async function dropJobTiles(job) {
  for (const l of (job && job.layers) || []) await dropLayerTiles(l);
  for (const p of (job && job.plans) || []) await dropPlanTiles(job, p);     // and the pieces of its large plans (v1.85)
}

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
// A piece that lies wholly inside the outline needs no trimming – and trimming is work for the device every time the
// map moves (v1.85). Inside means: its four corners are inside, and no side or corner of the outline cuts into it.
function insideClip(lay, b) {
  if (!Array.isArray(lay.clip) || lay.clip.length < 3 || !lay.bounds) return false;
  const [[S, W], [N, E]] = lay.bounds, [[s, w], [n, e]] = b, P = lay.clip;
  const x0 = (w - W) / (E - W), x1 = (e - W) / (E - W), y0 = (N - n) / (N - S), y1 = (N - s) / (N - S);    // the piece, as fractions of the layer's box
  if (![[x0, y0], [x1, y0], [x1, y1], [x0, y1]].every(c => pointInRing(c, P))) return false;
  const cuts = (ax, ay, bx, by, cx, cy, dx, dy) => ((bx - ax) * (cy - ay) - (by - ay) * (cx - ax)) * ((bx - ax) * (dy - ay) - (by - ay) * (dx - ax)) < 0
    && ((dx - cx) * (ay - cy) - (dy - cy) * (ax - cx)) * ((dx - cx) * (by - cy) - (dy - cy) * (bx - cx)) < 0;
  const sides = [[x0, y0, x1, y0], [x1, y0, x1, y1], [x1, y1, x0, y1], [x0, y1, x0, y0]];
  for (let i = 0; i < P.length; i++) {
    const [ax, ay] = P[i], [bx, by] = P[(i + 1) % P.length];
    if (ax > x0 && ax < x1 && ay > y0 && ay < y1) return false;
    if (sides.some(([cx, cy, dx, dy]) => cuts(ax, ay, bx, by, cx, cy, dx, dy))) return false;
  }
  return true;
}
function trimmed(overlay, lay, b) {
  const cp = insideClip(lay, b) ? "" : clipFor(lay, b);
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
    forgetTileUrls(lay.id);
    const rec = { id: tilesKey(lay.id), tiles: pieces.map(t => ({ bounds: t.bounds, blob: dataUrlBlob(t.image) })) };
    try {      // the file's own picture of the whole area: shown when zoomed out, and under the pieces when zoomed in
      const blob = dataUrlBlob(gj.image), bmp = await createImageBitmap(blob);
      rec.whole = { blob, w: bmp.width }; bmp.close();
    } catch (e) { }
    await DB.put("settings", rec);
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

// metres of ground to one pixel of the screen, where the map is centred
function mapMetresPerPixel(map) { return 40075016.686 * Math.cos(map.getCenter().lat * Math.PI / 180) / (256 * Math.pow(2, map.getZoom())); }

// A sharper aerial layer on the map (v1.84). Zoomed out, the whole-area picture is all that is drawn. Zoomed in, the
// pieces in view are added on top of it and those out of view are taken away, so the device holds a handful of pieces
// and never all of them. Nothing is read from the device until the layer is first shown.
// The layer has a small pane of its own inside the pictures' pane. The layer's strength is the pane's, so the
// whole-area picture and the pieces lying on it fade as one; and the pane takes the layer's place in the pile (plans,
// then aerial pictures, in order – the layer list hands the places out), so the pieces sit above any plan.
function sharpLayer(map, lay) {
  const g = L.layerGroup(); g._layId = lay.id;
  const paneName = "aerial-" + lay.id, pane = map.createPane(paneName, map.getPane("overlayPane"));
  pane.style.zIndex = 1; pane.style.opacity = layerStrength(lay); pane.style.pointerEvents = "none";
  g.setZIndex = function (z) { pane.style.zIndex = z; return this; };
  const opt = { pane: paneName, attribution: esc(lay.credit || ""), interactive: false };
  const [[S, W], [N, E]] = lay.bounds || [[0, 0], [0, 0]], across = (E - W) * 111320 * Math.cos((S + N) / 2 * Math.PI / 180);   // metres
  const on = new Map();     // piece number -> its picture on the map
  let pack = null, asked = false, whole = null, near = false;
  // The whole-area picture lies under the pieces only until they have all arrived. Then it is hidden (v1.85), so the
  // device has one picture fewer to lay over the others each time the map moves; it comes back while new pieces are on
  // their way, and whenever the map is zoomed out.
  const settle = () => {
    const el = whole && whole.getElement();
    if (el) el.style.visibility = near && on.size && [...on.values()].every(o => o._ready) ? "hidden" : "";
  };
  const refresh = () => {
    if (!pack || !map._loaded || !map.hasLayer(g)) return;
    // the pieces earn their keep once the whole-area picture would be stretched well past its own detail
    const close = near = !pack.whole || mapMetresPerPixel(map) < across / pack.whole.w * 0.6;
    const view = map.getBounds().pad(0.2);
    pack.tiles.forEach((t, i) => {
      const want = close && view.intersects(t.bounds);
      if (want && !on.has(i)) {
        const o = trimmed(L.imageOverlay(t.url, t.bounds, opt), lay, t.bounds);
        o.once("load", () => { o._ready = true; settle(); });
        on.set(i, o.addTo(g));
      } else if (!want && on.has(i)) { g.removeLayer(on.get(i)); on.delete(i); }
    });
    settle();
  };
  g.on("add", () => {
    if (asked) return refresh();
    asked = true;
    layerTiles(lay).then(p => {
      pack = p;
      if (p.whole) whole = trimmed(L.imageOverlay(p.whole.url, lay.bounds, opt), lay, lay.bounds).addTo(g);
      refresh();
    }).catch(() => { asked = false; });
  });
  g.on("remove", () => { on.forEach(o => g.removeLayer(o)); on.clear(); });    // switched off, or the map closed: let the pieces go
  map.on("moveend zoomend", refresh);
  return g;
}

// ---------------------------------------------------------------- a large plan picture, drawn where it is looked at (v1.85)
// A plan from the PC is up to 4,096 pixels on its long side – 12 million pixels for an A3 sheet – and the map drew all
// of it at every zoom. A plan over PLAN_HEAVY pixels is now cut up on the device, once: a light copy of the whole plan
// and its full detail in pieces, kept beside the survey (settings store, "plantiles:<job id>:<plan id>"), never in the
// job record and never exported – the job keeps the picture itself. The map shows the light copy, and adds the pieces
// in view on top of it once it is zoomed in far enough for their detail to tell. A smaller plan, or one this device
// cannot cut up, is drawn as it always was.
const PLAN_HEAVY = 6000000;   // more pixels than this and the plan is drawn in pieces
const PLAN_TILE = 512;        // a piece, in the plan's own pixels
const PLAN_WHOLE = 3000000;   // pixels in the light copy of the whole plan
const PLAN_URLS = {};         // "<job id>:<plan id>" -> {sig, pack: promise of {w, h, whole: {url, w}, tiles: [{x0, y0, x1, y1, url}]}}
const PLAIN_PLAN_URLS = {};   // "<job id>:<plan id>" -> {sig, url}: one address for a plan picture per visit, so it is unpacked once
const planKey = (job, pl) => "plantiles:" + job.id + ":" + pl.id;
const planSig = pl => [pl.blob.size, pl.w, pl.h].join(":");    // a different picture under the same name gives a different one
function planUrl(job, pl) {
  const key = job.id + ":" + pl.id, sig = planSig(pl), had = PLAIN_PLAN_URLS[key];
  if (had && had.sig === sig) return had.url;
  if (had) try { URL.revokeObjectURL(had.url); } catch (e) { }
  return (PLAIN_PLAN_URLS[key] = { sig, url: URL.createObjectURL(pl.blob) }).url;
}
async function cutPlan(pl) {
  const bmp = await createImageBitmap(pl.blob, { imageOrientation: "from-image" });
  try {
    const W = bmp.width, H = bmp.height, c = document.createElement("canvas"), x = c.getContext("2d");
    const jpeg = q => new Promise((ok, no) => c.toBlob(b => b ? ok(b) : no(new Error("no picture")), "image/jpeg", q));
    const k = Math.min(1, Math.sqrt(PLAN_WHOLE / (W * H)));
    c.width = Math.max(1, Math.round(W * k)); c.height = Math.max(1, Math.round(H * k));
    x.imageSmoothingQuality = "high"; x.drawImage(bmp, 0, 0, c.width, c.height);
    const whole = { blob: await jpeg(0.85), w: c.width };
    const tiles = [];
    for (let y0 = 0; y0 < H; y0 += PLAN_TILE) for (let x0 = 0; x0 < W; x0 += PLAN_TILE) {
      // a piece laps one pixel over its neighbours to the right and below, so no hair-line shows between them
      const x1 = Math.min(W, x0 + PLAN_TILE + 1), y1 = Math.min(H, y0 + PLAN_TILE + 1);
      c.width = x1 - x0; c.height = y1 - y0; x.drawImage(bmp, x0, y0, x1 - x0, y1 - y0, 0, 0, x1 - x0, y1 - y0);
      tiles.push({ x0, y0, x1, y1, blob: await jpeg(0.95) });
    }
    c.width = c.height = 1;
    return { w: W, h: H, whole, tiles };
  } finally { if (bmp.close) bmp.close(); }
}
function planTiles(job, pl) {
  const key = job.id + ":" + pl.id, sig = planSig(pl);
  if (PLAN_URLS[key] && PLAN_URLS[key].sig === sig) return PLAN_URLS[key].pack;
  forgetPlanUrls(key);
  const pack = (async () => {
    let rec = await DB.get("settings", planKey(job, pl));
    if (!rec || rec.sig !== sig || !rec.whole || !(rec.tiles || []).length) {
      if (typeof toast === "function") toast("Getting the plan ready – this happens once", 5000);
      rec = Object.assign({ id: planKey(job, pl), sig }, await cutPlan(pl));
      // kept only if the plan is still the one asked about (it may have been removed or replaced meanwhile)
      if (PLAN_URLS[key] && PLAN_URLS[key].pack === pack) await DB.put("settings", rec);
    }
    return { w: rec.w, h: rec.h, whole: { url: URL.createObjectURL(rec.whole.blob), w: rec.whole.w },
      tiles: rec.tiles.map(t => ({ x0: t.x0, y0: t.y0, x1: t.x1, y1: t.y1, url: URL.createObjectURL(t.blob) })) };
  })();
  PLAN_URLS[key] = { sig, pack };
  pack.catch(() => { if (PLAN_URLS[key] && PLAN_URLS[key].pack === pack) delete PLAN_URLS[key]; });
  return pack;
}
function forgetPlanUrls(key) {
  const was = PLAN_URLS[key]; delete PLAN_URLS[key];
  if (was) was.pack.then(p => { p.tiles.concat([p.whole]).forEach(t => { try { URL.revokeObjectURL(t.url); } catch (e) { } }); }).catch(() => { });
}
// a plan taken off a survey, or the survey itself gone: its pieces go too
async function dropPlanTiles(job, pl) {
  if (!job || !pl || !pl.id) return;
  const key = job.id + ":" + pl.id;
  forgetPlanUrls(key);
  if (PLAIN_PLAN_URLS[key]) { try { URL.revokeObjectURL(PLAIN_PLAN_URLS[key].url); } catch (e) { } delete PLAIN_PLAN_URLS[key]; }
  try { await DB.del("settings", planKey(job, pl)); } catch (e) { }
}
// A pinned plan as a layer for the map. A large one gets a small pane of its own inside the pictures' pane, as a sharper
// aerial layer does: the plan's strength is the pane's, so the light copy and the pieces lying on it fade as one, and the
// pane takes the plan's place in the pile. Nothing is read or cut up until the plan is first shown on the map.
function planPicture(map, job, pl) {
  const t = planTransform(pl), strength = pl.opacity ?? 0.75;
  const plain = opt => L.imageOverlay.rotated(planUrl(job, pl), t.toLL(0, 0), t.toLL(pl.w, 0), t.toLL(0, pl.h), Object.assign({ interactive: false }, opt));
  if (!(pl.w * pl.h > PLAN_HEAVY) || typeof createImageBitmap !== "function") return plain({ opacity: strength });
  const g = L.layerGroup();
  const paneName = "plan-" + pl.id, pane = map.createPane(paneName, map.getPane("overlayPane"));
  pane.style.zIndex = 1; pane.style.opacity = strength; pane.style.pointerEvents = "none";
  g.setZIndex = function (z) { pane.style.zIndex = z; return this; };
  const opt = { pane: paneName, interactive: false };
  const on = new Map(), boxes = [];     // piece number -> its picture on the map; -> the ground it covers
  let pack = null, asked = false, whole = null, near = false;
  // as for a sharper aerial layer: the light copy is hidden once the pieces in view have all arrived
  const settle = () => {
    const el = whole && whole.getElement();
    if (el) el.style.visibility = near && on.size && [...on.values()].every(o => o._ready) ? "hidden" : "";
  };
  const at = (x, y) => t.toLL(x * pl.w / pack.w, y * pl.h / pack.h);     // the picture's own pixels -> the ground
  const refresh = () => {
    if (!pack || !map._loaded || !map.hasLayer(g)) return;
    // the pieces come in a little before the light copy would have to be stretched: a plan has lettering, and
    // stretched lettering is hard to read (an aerial picture waits longer – see sharpLayer)
    const close = near = mapMetresPerPixel(map) < t.metresPerPx * pl.w / pack.whole.w * 0.75;
    const view = map.getBounds().pad(0.25);
    pack.tiles.forEach((p, i) => {
      boxes[i] = boxes[i] || L.latLngBounds([at(p.x0, p.y0), at(p.x1, p.y0), at(p.x0, p.y1), at(p.x1, p.y1)]);
      const want = close && view.intersects(boxes[i]);
      if (want && !on.has(i)) {
        const o = L.imageOverlay.rotated(p.url, at(p.x0, p.y0), at(p.x1, p.y0), at(p.x0, p.y1), opt);
        o.once("load", () => { o._ready = true; settle(); });
        on.set(i, o.addTo(g));
      } else if (!want && on.has(i)) { g.removeLayer(on.get(i)); on.delete(i); }
    });
    settle();
  };
  g.on("add", () => {
    if (asked) return refresh();
    asked = true;
    planTiles(job, pl).then(p => {
      pack = p;
      whole = L.imageOverlay.rotated(p.whole.url, t.toLL(0, 0), t.toLL(pl.w, 0), t.toLL(0, pl.h), opt).addTo(g);
      refresh();
    }).catch(e => { console.error(e); plain(opt).addTo(g); });     // it could not be cut up on this device: the plan as it always was
  });
  g.on("remove", () => { on.forEach(o => g.removeLayer(o)); on.clear(); });    // switched off, or the map closed: let the pieces go
  map.on("moveend zoomend", refresh);
  return g;
}

function drawLayers(map, job, overlays) {
  // aerial photos / drone maps first, so shapes and trees sit on top
  (job.layers || []).filter(l => l.kind === "image").forEach(lay => {
    const opt = { opacity: layerStrength(lay), attribution: esc(lay.credit || ""), interactive: false };
    if (lay.sharp) { const g = sharpLayer(map, lay); if (layerShown(lay)) g.addTo(map); overlays[esc(lay.name)] = g; return; }
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
