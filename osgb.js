// Tree Survey – © 2026 Mark Johnson. All rights reserved. Use only under a written licence from the owner.
// Latitude / longitude (GPS) <-> OS National Grid reference, e.g. "NZ 15862 57871".
// OSTN15 – Ordnance Survey's definitive transformation – once its shift grid (ostn15_shifts.dat, half a megabyte,
// kept offline with the app) has been read: the position is projected onto the National Grid, then moved by the
// east and north shifts OS publishes for every kilometre of Great Britain. Agrees with OS mapping to about 0.1 m.
// Until the grid is read, where the browser can't unpack it, and outside Great Britain: the earlier conversion
// (one Helmert adjustment for the whole country, out by 1 to 3.5 m depending on where you are).
// OSTN15 data © Ordnance Survey Limited, used under the 2-Clause BSD licence (see THIRD_PARTY_NOTICES.md).
const OSGB = (() => {
  const rad = d => d * Math.PI / 180;

  function toCartesian(lat, lon, a, b) {
    const e2 = 1 - (b * b) / (a * a), sl = Math.sin(lat), cl = Math.cos(lat);
    const nu = a / Math.sqrt(1 - e2 * sl * sl);
    return [nu * cl * Math.cos(lon), nu * cl * Math.sin(lon), (1 - e2) * nu * sl];
  }

  function fromCartesian([x, y, z], a, b) {
    const e2 = 1 - (b * b) / (a * a), p = Math.hypot(x, y);
    let lat = Math.atan2(z, p * (1 - e2));
    for (let i = 0; i < 10; i++) {
      const nu = a / Math.sqrt(1 - e2 * Math.sin(lat) ** 2);
      lat = Math.atan2(z + e2 * nu * Math.sin(lat), p);
    }
    return [lat, Math.atan2(y, x)];
  }

  // WGS84 -> OSGB36 (inverse of the standard OSGB36 -> WGS84 parameters)
  function wgs84ToOsgb36(latDeg, lonDeg) {
    const [x, y, z] = toCartesian(rad(latDeg), rad(lonDeg), 6378137.0, 6356752.3142);
    const tx = -446.448, ty = 125.157, tz = -542.060, s = 20.4894e-6;
    const rx = rad(-0.1502 / 3600), ry = rad(-0.2470 / 3600), rz = rad(-0.8421 / 3600);
    const x2 = tx + (1 + s) * x - rz * y + ry * z;
    const y2 = ty + rz * x + (1 + s) * y - rx * z;
    const z2 = tz - ry * x + rx * y + (1 + s) * z;
    return fromCartesian([x2, y2, z2], 6377563.396, 6356256.909);
  }

  function toEN(lat, lon) {
    const a = 6377563.396, b = 6356256.909, F0 = 0.9996012717;
    const lat0 = rad(49), lon0 = rad(-2), N0 = -100000, E0 = 400000;
    const e2 = 1 - (b * b) / (a * a), n = (a - b) / (a + b);
    const sl = Math.sin(lat), cl = Math.cos(lat), tl = Math.tan(lat);
    const nu = a * F0 / Math.sqrt(1 - e2 * sl * sl);
    const rho = a * F0 * (1 - e2) / Math.pow(1 - e2 * sl * sl, 1.5);
    const eta2 = nu / rho - 1;
    const dl = lat - lat0, sm = lat + lat0;
    const M = b * F0 * ((1 + n + 5 / 4 * n ** 2 + 5 / 4 * n ** 3) * dl
      - (3 * n + 3 * n ** 2 + 21 / 8 * n ** 3) * Math.sin(dl) * Math.cos(sm)
      + (15 / 8 * n ** 2 + 15 / 8 * n ** 3) * Math.sin(2 * dl) * Math.cos(2 * sm)
      - 35 / 24 * n ** 3 * Math.sin(3 * dl) * Math.cos(3 * sm));
    const I = M + N0;
    const II = nu / 2 * sl * cl;
    const III = nu / 24 * sl * cl ** 3 * (5 - tl ** 2 + 9 * eta2);
    const IIIA = nu / 720 * sl * cl ** 5 * (61 - 58 * tl ** 2 + tl ** 4);
    const IV = nu * cl;
    const V = nu / 6 * cl ** 3 * (nu / rho - tl ** 2);
    const VI = nu / 120 * cl ** 5 * (5 - 18 * tl ** 2 + tl ** 4 + 14 * eta2 - 58 * tl ** 2 * eta2);
    const dL = lon - lon0;
    return [E0 + IV * dL + V * dL ** 3 + VI * dL ** 5, I + II * dL ** 2 + III * dL ** 4 + IIIA * dL ** 6];
  }

  function gridRef(E, N, digits = 10) {
    if (!(E >= 0 && E < 700000 && N >= 0 && N < 1300000)) return "";
    const e100k = Math.floor(E / 100000), n100k = Math.floor(N / 100000);
    let l1 = (19 - n100k) - (19 - n100k) % 5 + Math.floor((e100k + 10) / 5);
    let l2 = (19 - n100k) * 5 % 25 + e100k % 5;
    if (l1 > 7) l1++;
    if (l2 > 7) l2++;
    const letters = String.fromCharCode(l1 + 65) + String.fromCharCode(l2 + 65);
    const half = digits / 2, div = Math.pow(10, 5 - half);
    const e = String(Math.floor((E % 100000) / div)).padStart(half, "0");
    const nn = String(Math.floor((N % 100000) / div)).padStart(half, "0");
    return `${letters} ${e} ${nn}`;
  }

  // ---- the earlier conversion: latitude / longitude -> easting, northing
  function earlierEN(lat, lon) {
    const [p, l] = wgs84ToOsgb36(lat, lon);
    return toEN(p, l);
  }


  // ---- the earlier conversion: OS easting / northing -> latitude / longitude (inverse of the above)
  function earlierLatLon(E, N) {
    const a = 6377563.396, b = 6356256.909, F0 = 0.9996012717, lat0 = rad(49), lon0 = rad(-2), N0 = -100000, E0 = 400000;
    const e2 = 1 - (b * b) / (a * a), n = (a - b) / (a + b);
    let lat = lat0, M = 0;
    do {
      lat = (N - N0 - M) / (a * F0) + lat;
      const dl = lat - lat0, sm = lat + lat0;
      M = b * F0 * ((1 + n + 5 / 4 * n ** 2 + 5 / 4 * n ** 3) * dl
        - (3 * n + 3 * n ** 2 + 21 / 8 * n ** 3) * Math.sin(dl) * Math.cos(sm)
        + (15 / 8 * n ** 2 + 15 / 8 * n ** 3) * Math.sin(2 * dl) * Math.cos(2 * sm)
        - 35 / 24 * n ** 3 * Math.sin(3 * dl) * Math.cos(3 * sm));
    } while (N - N0 - M >= 0.00001);
    const sl = Math.sin(lat), cl = Math.cos(lat), tl = Math.tan(lat);
    const nu = a * F0 / Math.sqrt(1 - e2 * sl * sl), rho = a * F0 * (1 - e2) / Math.pow(1 - e2 * sl * sl, 1.5), eta2 = nu / rho - 1;
    const VII = tl / (2 * rho * nu), VIII = tl / (24 * rho * nu ** 3) * (5 + 3 * tl ** 2 + eta2 - 9 * tl ** 2 * eta2);
    const IX = tl / (720 * rho * nu ** 5) * (61 + 90 * tl ** 2 + 45 * tl ** 4);
    const X = 1 / (cl * nu), XI = 1 / (cl * 6 * nu ** 3) * (nu / rho + 2 * tl ** 2);
    const XII = 1 / (cl * 120 * nu ** 5) * (5 + 28 * tl ** 2 + 24 * tl ** 4);
    const XIIA = 1 / (cl * 5040 * nu ** 7) * (61 + 662 * tl ** 2 + 1320 * tl ** 4 + 720 * tl ** 6);
    const dE = E - E0;
    const la = lat - VII * dE ** 2 + VIII * dE ** 4 - IX * dE ** 6;
    const lo = lon0 + X * dE - XI * dE ** 3 + XII * dE ** 5 - XIIA * dE ** 7;
    const [x, y, z] = toCartesian(la, lo, a, b);
    const tx = 446.448, ty = -125.157, tz = 542.060, s = -20.4894e-6;
    const rx = rad(0.1502 / 3600), ry = rad(0.2470 / 3600), rz = rad(0.8421 / 3600);
    const p = fromCartesian([tx + (1 + s) * x - rz * y + ry * z, ty + rz * x + (1 + s) * y - rx * z, tz - ry * x + rx * y + (1 + s) * z],
      6378137.0, 6356752.3142);
    return [p[0] * 180 / Math.PI, p[1] * 180 / Math.PI];
  }

  // "NZ 15862 57871" / "NZ1586257871" / "415862, 557871" -> [E, N] or null
  function parse(text) {
    const s = String(text || "").toUpperCase().replace(/\s+/g, " ").trim();
    const L = "ABCDEFGHJKLMNOPQRSTUVWXYZ";
    let m = /^([A-HJ-Z]{2}) ?(\d+) ?(\d+)?$/.exec(s);
    if (m) {
      const d = (m[2] + (m[3] || "")).replace(/ /g, "");
      if (d.length % 2 || d.length < 4) return null;
      const l1 = L.indexOf(m[1][0]), l2 = L.indexOf(m[1][1]);
      const e100k = ((l1 - 2) % 5) * 5 + (l2 % 5), n100k = (19 - Math.floor(l1 / 5) * 5) - Math.floor(l2 / 5);
      const h = d.length / 2, sc = Math.pow(10, 5 - h);
      return [e100k * 100000 + (+d.slice(0, h)) * sc + (h < 5 ? sc / 2 : 0), n100k * 100000 + (+d.slice(h)) * sc + (h < 5 ? sc / 2 : 0)];
    }
    m = /^(\d{6}(?:\.\d+)?)[ ,;]+(\d{6,7}(?:\.\d+)?)$/.exec(s);
    return m ? [+m[1], +m[2]] : null;
  }

  // ---- a latitude and longitude as typed or pasted (v2.00) – the same reading as the PC's gps_to_kml.read_latlon
  // 54°35'27.6"N 1°48'12.3"W (as Google Earth gives it), 54°35.460'N 1°48.205'W, 54.5910, -1.8034, 54.5910N 1.8034W.
  // -> { lat, lon, signed } or null. signed false = the longitude has no W, E or sign: ask, never take it as east.
  function parseLatLon(text) {
    let s = String(text || "").toUpperCase().replace(/[−–—]/g, "-");
    s = s.replace(/\b(LATITUDE|LONGITUDE|LAT|LONG|LNG|LON|DEGREES|DEGREE|DEG|MINUTES|MINUTE|MIN|SECONDS|SECOND|SEC|NORTH|SOUTH|EAST|WEST)\b\.?/g,
      (m, w) => ["NORTH", "SOUTH", "EAST", "WEST"].includes(w) ? w[0] : " ");
    if (/[A-Z]/.test(s.replace(/[NSEW]/g, ""))) return null;
    const NUM = "[-+]?\\d+(?:\\.\\d+)?", isL = t => "NSEW".includes(t);
    let halves = null;
    const parts = s.split(/[,;]/).filter(h => h.trim());
    if (parts.length === 2) halves = parts;
    else {
      const toks = s.match(new RegExp("[NSEW]|" + NUM, "g")) || [], letters = toks.filter(isL), nums = toks.filter(t => !isL(t));
      if (letters.length === 2) {
        const prefix = isL(toks[0]); let cur = []; const out = [];
        for (const t of toks) {
          if (isL(t)) { if (prefix) { if (cur.length) out.push(cur.join(" ")); cur = [t]; } else { out.push(cur.concat(t).join(" ")); cur = []; } }
          else cur.push(t);
        }
        if (prefix && cur.length) out.push(cur.join(" "));
        halves = out;
      } else if (letters.length <= 1 && [2, 4, 6].includes(nums.length)) {
        let i = toks.map((t, j) => isL(t) ? -1 : j).filter(j => j >= 0)[nums.length / 2];
        if (letters.length && toks.indexOf(letters[0]) === i) i++;
        halves = [toks.slice(0, i).join(" "), toks.slice(i).join(" ")];
      }
    }
    if (!halves || halves.length !== 2) return null;
    const vals = [];
    for (const h of halves) {
      const letters = h.match(/[NSEW]/g) || [], g = h.match(new RegExp(NUM, "g")) || [];
      if (letters.length > 1 || g.length < 1 || g.length > 3) return null;
      const hemi = letters[0] || null, d = parseFloat(g[0]), rest = g.slice(1).map(Number);
      if (rest.some(x => x < 0 || x >= 60) || g.slice(1).some(x => /^[-+]/.test(x))) return null;
      if (rest.length && d !== Math.trunc(d)) return null;
      if (rest.length === 2 && rest[0] !== Math.trunc(rest[0])) return null;
      const neg = g[0][0] === "-";
      if (neg && hemi) return null;
      const v = Math.abs(d) + (rest.length ? rest[0] / 60 : 0) + (rest.length > 1 ? rest[1] / 3600 : 0);
      vals.push({ hemi, v: neg || hemi === "S" || hemi === "W" ? -v : v, signed: !!hemi || /^[-+]/.test(g[0]) });
    }
    let [a, b] = vals;
    if ("EW".includes(a.hemi || "x") || "NS".includes(b.hemi || "x")) [a, b] = [b, a];
    if ("EW".includes(a.hemi || "x") || "NS".includes(b.hemi || "x")) return null;
    if (Math.abs(a.v) > 90 || Math.abs(b.v) > 180) return null;
    return { lat: a.v, lon: b.v, signed: b.signed || b.v === 0 };
  }
  function dms(lat, lon) {
    const one = (v, pos, neg) => {
      let t = Math.round(Math.abs(v) * 36000); const d = Math.floor(t / 36000); t -= d * 36000; const m = Math.floor(t / 600); t -= m * 600;
      return `${d}°${String(m).padStart(2, "0")}'${(t / 10).toFixed(1).padStart(4, "0")}"${v >= 0 ? pos : neg}`;
    };
    return one(lat, "N", "S") + " " + one(lon, "E", "W");
  }
  // Whatever is typed for a position – a grid ref, eastings and northings, or a latitude and longitude.
  // -> null (not a position) | { error } | { ask: true, said } (the longitude has no W or E: call again with west true / false)
  //  | { lat, lon, en: [E, N], ref, how: "grid" | "latlon", said }
  function typed(text, west) {
    const en = parse(text);
    if (en) {
      const ll = toLatLon(en[0], en[1]);
      if (!ll || !isFinite(ll[0])) return { error: "That grid ref is outside the National Grid" };
      return { lat: ll[0], lon: ll[1], en, ref: gridRef(en[0], en[1]), how: "grid", said: gridRef(en[0], en[1]) };
    }
    const p = parseLatLon(text);
    if (!p) return null;
    let { lat, lon } = p;
    if (!p.signed) {
      if (!(lat >= 49 && lat <= 61.5 && Math.abs(lon) <= 9)) return { error: "That latitude and longitude is not in Great Britain" };
      if (west === undefined || west === null) return { ask: true, said: dms(lat, Math.abs(lon)).slice(0, -1) };
      lon = west ? -Math.abs(lon) : Math.abs(lon);
    }
    if (!(lat >= 49 && lat <= 61.5 && lon >= -9 && lon <= 2.5)) return { error: `${dms(lat, lon)} is not in Great Britain – check the figures` };
    const g = fromLatLon(lat, lon);
    return { lat, lon, en: [g.E, g.N], ref: g.ref, how: "latlon", said: dms(lat, lon) };
  }

  // ---- OSTN15
  const GRS80 = [6378137.0, 6356752.3141], F0 = 0.9996012717, LAT0 = rad(49), LON0 = rad(-2), N0 = -100000, E0 = 400000;
  let GRID = null;   // { cols, rows, east0, north0, east: Uint16Array, north: Uint16Array } once the shift grid is read

  function arcM(lat, a, b) {
    const n = (a - b) / (a + b), dl = lat - LAT0, sm = lat + LAT0;
    return b * F0 * ((1 + n + 5 / 4 * n ** 2 + 5 / 4 * n ** 3) * dl
      - (3 * n + 3 * n ** 2 + 21 / 8 * n ** 3) * Math.sin(dl) * Math.cos(sm)
      + (15 / 8 * n ** 2 + 15 / 8 * n ** 3) * Math.sin(2 * dl) * Math.cos(2 * sm)
      - 35 / 24 * n ** 3 * Math.sin(3 * dl) * Math.cos(3 * sm));
  }

  // latitude / longitude in degrees on GRS80 -> easting, northing on the National Grid projection (before the shifts)
  function project(latDeg, lonDeg) {
    const [a, b] = GRS80, e2 = 1 - (b * b) / (a * a), lat = rad(latDeg), lon = rad(lonDeg);
    const sl = Math.sin(lat), cl = Math.cos(lat), tl = Math.tan(lat);
    const nu = a * F0 / Math.sqrt(1 - e2 * sl * sl), rho = a * F0 * (1 - e2) / Math.pow(1 - e2 * sl * sl, 1.5), eta2 = nu / rho - 1;
    const I = arcM(lat, a, b) + N0, II = nu / 2 * sl * cl;
    const III = nu / 24 * sl * cl ** 3 * (5 - tl ** 2 + 9 * eta2), IIIA = nu / 720 * sl * cl ** 5 * (61 - 58 * tl ** 2 + tl ** 4);
    const IV = nu * cl, V = nu / 6 * cl ** 3 * (nu / rho - tl ** 2);
    const VI = nu / 120 * cl ** 5 * (5 - 18 * tl ** 2 + tl ** 4 + 14 * eta2 - 58 * tl ** 2 * eta2), d = lon - LON0;
    return [E0 + IV * d + V * d ** 3 + VI * d ** 5, I + II * d ** 2 + III * d ** 4 + IIIA * d ** 6];
  }

  function unproject(E, N) {
    const [a, b] = GRS80, e2 = 1 - (b * b) / (a * a);
    let lat = LAT0 + (N - N0) / (a * F0);
    for (let i = 0; i < 60; i++) {
      const M = arcM(lat, a, b);
      if (Math.abs(N - N0 - M) < 1e-6) break;
      lat += (N - N0 - M) / (a * F0);
    }
    const sl = Math.sin(lat), cl = Math.cos(lat), tl = Math.tan(lat);
    const nu = a * F0 / Math.sqrt(1 - e2 * sl * sl), rho = a * F0 * (1 - e2) / Math.pow(1 - e2 * sl * sl, 1.5), eta2 = nu / rho - 1;
    const VII = tl / (2 * rho * nu), VIII = tl / (24 * rho * nu ** 3) * (5 + 3 * tl ** 2 + eta2 - 9 * tl ** 2 * eta2);
    const IX = tl / (720 * rho * nu ** 5) * (61 + 90 * tl ** 2 + 45 * tl ** 4);
    const X = 1 / (cl * nu), XI = 1 / (cl * 6 * nu ** 3) * (nu / rho + 2 * tl ** 2);
    const XII = 1 / (cl * 120 * nu ** 5) * (5 + 28 * tl ** 2 + 24 * tl ** 4);
    const XIIA = 1 / (cl * 5040 * nu ** 7) * (61 + 662 * tl ** 2 + 1320 * tl ** 4 + 720 * tl ** 6), dE = E - E0;
    return [(lat - VII * dE ** 2 + VIII * dE ** 4 - IX * dE ** 6) * 180 / Math.PI,
      (LON0 + X * dE - XI * dE ** 3 + XII * dE ** 5 - XIIA * dE ** 7) * 180 / Math.PI];
  }

  // east and north shift (m) at an ETRS89 easting / northing – between the four grid points round it – or null off the grid
  function shifts(e, n) {
    const g = GRID;
    if (!g || !(e >= 0 && e < (g.cols - 1) * 1000 && n >= 0 && n < (g.rows - 1) * 1000)) return null;
    const ek = Math.floor(e / 1000), nk = Math.floor(n / 1000), t = e / 1000 - ek, u = n / 1000 - nk, i = ek + nk * g.cols;
    const at = a => (1 - t) * (1 - u) * a[i] + t * (1 - u) * a[i + 1] + (1 - t) * u * a[i + g.cols] + t * u * a[i + g.cols + 1];
    return [(g.east0 + at(g.east)) / 1000, (g.north0 + at(g.north)) / 1000];
  }

  function ostnEN(lat, lon) {
    const [e, n] = project(lat, lon), s = shifts(e, n);
    return s ? [e + s[0], n + s[1]] : null;
  }

  function ostnLatLon(E, N) {
    let e = E, n = N;
    for (let i = 0; i < 12; i++) {   // the shift is looked up where the answer is, so close in on it
      const s = shifts(e, n);
      if (!s) return null;
      const e2 = E - s[0], n2 = N - s[1], close = Math.abs(e2 - e) < 1e-5 && Math.abs(n2 - n) < 1e-5;
      e = e2; n = n2;
      if (close) break;
    }
    return unproject(e, n);
  }

  // The unpacked body of ostn15_shifts.dat (an ArrayBuffer: east then north, 16-bit, each row stored as differences).
  function setGrid(buf, cols, rows, east0, north0) {
    const count = cols * rows;
    if (new Uint8Array(new Uint16Array([1]).buffer)[0] !== 1 || buf.byteLength !== count * 4) return false;
    const all = new Uint16Array(buf);
    for (let part = 0; part < 2; part++) for (let r = 0; r < rows; r++) {
      let v = 0;
      for (let k = part * count + r * cols, end = k + cols; k < end; k++) { v = (v + all[k]) & 0xFFFF; all[k] = v; }
    }
    GRID = { cols, rows, east0, north0, east: all.subarray(0, count), north: all.subarray(count) };
    return true;
  }

  // The file as it is stored -> { cols, rows, east0, north0, body (still packed) } or null if it isn't the OSTN15 file
  function header(raw) {
    const b = new Uint8Array(raw), magic = [79, 83, 84, 78, 49, 53, 10, 1];   // "OSTN15\n\x01"
    if (b.length < 21 || magic.some((c, i) => b[i] !== c)) return null;
    const v = new DataView(raw);
    return { cols: v.getUint16(8, true), rows: v.getUint16(10, true), east0: v.getInt32(12, true), north0: v.getInt32(16, true), body: b.subarray(20) };
  }

  // Read the shift grid: from the app's offline copy if it is there, else from the network (given a few seconds).
  // Resolves true when OSTN15 is in use, false when the earlier conversion carries on. Never rejects.
  let loading = null;
  function load(url = "ostn15_shifts.dat") {
    if (GRID) return Promise.resolve(true);
    if (loading) return loading;
    loading = (async () => {
      try {
        if (typeof DecompressionStream === "undefined") return false;
        let raw = null;
        try {
          if (typeof caches !== "undefined") { const r = await caches.match(url, { ignoreSearch: true }); if (r && r.ok) raw = await r.arrayBuffer(); }
        } catch (e) { }
        if (!raw) {
          const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 6000);
          try { const r = await fetch(url, { signal: ctl.signal }); if (r.ok) raw = await r.arrayBuffer(); } finally { clearTimeout(timer); }
        }
        const h = raw && header(raw);
        if (!h) return false;
        const body = await new Response(new Blob([h.body]).stream().pipeThrough(new DecompressionStream("deflate"))).arrayBuffer();
        return setGrid(body, h.cols, h.rows, h.east0, h.north0);
      } catch (e) { console.warn("OSTN15 grid not read – using the earlier conversion", e); return false; }
      finally { loading = null; }
    })();
    return loading;
  }

  // ---- what the app calls
  const method = () => GRID ? "OSTN15" : "earlier";

  function fromLatLon(lat, lon, digits = 10) {
    const o = ostnEN(lat, lon), [E, N] = o || earlierEN(lat, lon);
    const e = Math.round(E), n = Math.round(N);
    return { E: e, N: n, ref: gridRef(e, n, digits), raw: [E, N], by: o ? "OSTN15" : "earlier" };
  }

  function toLatLon(E, N) { return ostnLatLon(E, N) || earlierLatLon(E, N); }

  return { fromLatLon, gridRef, toLatLon, parse, parseLatLon, dms, typed, load, method, setGrid, header, earlier: { toEN: earlierEN, toLatLon: earlierLatLon } };
})();
if (typeof module !== "undefined") module.exports = OSGB;
