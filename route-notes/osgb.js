// Route Notes – © 2026 Mark Johnson. All rights reserved.
// WGS84 (phone GPS) -> OS National Grid reference, e.g. "NZ 15862 57871".
// Helmert transform + Transverse Mercator; accurate to a few metres (better than phone GPS).
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

  function fromLatLon(lat, lon, digits = 10) {
    const [p, l] = wgs84ToOsgb36(lat, lon);
    const [E, N] = toEN(p, l);
    const e = Math.round(E), n = Math.round(N);
    return { E: e, N: n, ref: gridRef(e, n, digits), raw: [E, N] };
  }


  // OS easting/northing -> WGS84 lat/lon (inverse of the above)
  function toLatLon(E, N) {
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

  return { fromLatLon, gridRef, toLatLon, parse };
})();
if (typeof module !== "undefined") module.exports = OSGB;
