// Tree Survey – © 2026 Mark Johnson. All rights reserved. Use only under a written licence from the owner.
/* Laser rangefinders over Bluetooth Low Energy (Web Bluetooth – Chrome on Android; not iPhone / iPad).
   TruPulse 200i / 360i (Laser Technology): "LTI Data Exchange" service, $PLTIT sentences –
     $PLTIT,HV,<HD>,<u>,<AZ>,D,<INC>,D,<SD>,<u>*cs   horizontal vector (360i gives the azimuth)
     $PLTIT,HT,<height>,<u>*cs                          height routine
     $PLTIT,ML,…                                        missing line
     units M / F / Y; checksum = XOR of the characters between $ and *.
   Leica DISTO (Bluetooth models): a 4-byte little-endian float in metres on each measurement.
   Older Bluetooth-Classic-only lasers (TruPulse 360R / 200X) can't talk to a web app. */
"use strict";

const LASER_PROFILES = [
  { kind: "trupulse", label: "TruPulse", prefixes: ["TP200i", "TP360i"],
    service: "86210100-f831-4395-b29d-e70977d5bf94", notify: "86210102-f831-4395-b29d-e70977d5bf94" },
  { kind: "disto", label: "Leica DISTO", prefixes: ["DISTO"],
    service: "3ab10100-f831-4395-b29d-570977d5bf94", notify: "3ab10101-f831-4395-b29d-570977d5bf94" },
];
const LASER = { dev: null, kind: "", name: "", buf: "", on: null, last: null };
const UNIT_M = { M: 1, F: 0.3048, Y: 0.9144 };

function pltitChecksumOK(line) {
  const star = line.lastIndexOf("*");
  if (star < 0) return true;  // no checksum sent
  let x = 0;
  for (const ch of line.slice(1, star)) x ^= ch.charCodeAt(0);
  return x === parseInt(line.slice(star + 1, star + 3), 16);
}

function parsePLTIT(line) {
  line = String(line || "").trim();
  if (!line.startsWith("$PLTIT,") || !pltitChecksumOK(line)) return null;
  const body = line.slice(7).split("*")[0], f = body.split(","), type = f.shift();
  const num = v => v === "" || v == null || isNaN(+v) ? null : +v;
  const m = (v, u) => num(v) == null ? null : Math.round(num(v) * (UNIT_M[u] || 1) * 100) / 100;
  if (type === "HV" || type === "ML") return { type: type.toLowerCase(), hd: m(f[0], f[1]), az: num(f[2]), inc: num(f[4]), sd: m(f[6], f[7]) };
  if (type === "HT") return { type: "ht", ht: m(f[0], f[1]) };
  return { type: type.toLowerCase(), raw: line };
}

function laserEmit(msg) {
  LASER.last = Object.assign({ when: Date.now() }, msg);
  if (LASER.on) try { LASER.on(msg); } catch (e) { console.error(e); }
  else toast(laserText(msg) + " – open a tree to use it");
}

function laserText(msg) {
  if (msg.type === "ht") return `Height ${msg.ht} m`;
  if (msg.type === "hv" || msg.type === "ml") return [msg.hd != null ? `${msg.hd} m horizontal` : "", msg.az != null ? `bearing ${msg.az}°` : "", msg.inc != null ? `${msg.inc}° incline` : ""].filter(Boolean).join(", ");
  if (msg.type === "dist") return `${msg.d} m`;
  return msg.raw || "";
}

function laserData(prof, dv) {
  if (prof.kind === "disto") {
    if (dv.byteLength >= 4) laserEmit({ type: "dist", d: Math.round(dv.getFloat32(0, true) * 1000) / 1000 });
    return;
  }
  LASER.buf += new TextDecoder().decode(dv);
  let i;
  while ((i = LASER.buf.search(/[\r\n]/)) >= 0) {
    const line = LASER.buf.slice(0, i); LASER.buf = LASER.buf.slice(i + 1);
    const msg = parsePLTIT(line);
    if (msg) laserEmit(msg);
  }
  if (LASER.buf.length > 400) LASER.buf = "";
}

async function laserConnect() {
  if (!navigator.bluetooth) throw new Error("Bluetooth isn't available in this browser – use Chrome on an Android phone or tablet.");
  const dev = await navigator.bluetooth.requestDevice({
    filters: LASER_PROFILES.flatMap(p => p.prefixes.map(namePrefix => ({ namePrefix }))),
    optionalServices: LASER_PROFILES.map(p => p.service),
  });
  const prof = LASER_PROFILES.find(p => p.prefixes.some(x => (dev.name || "").startsWith(x))) || LASER_PROFILES[0];
  const gatt = await dev.gatt.connect();
  const ch = await (await gatt.getPrimaryService(prof.service)).getCharacteristic(prof.notify);
  ch.addEventListener("characteristicvaluechanged", e => laserData(prof, e.target.value));
  await ch.startNotifications();
  dev.addEventListener("gattserverdisconnected", () => { LASER.dev = null; toast("Rangefinder disconnected"); if (LASER.status) LASER.status(); });
  Object.assign(LASER, { dev, kind: prof.kind, name: dev.name || prof.label, buf: "" });
  return LASER;
}

function laserDisconnect() { try { LASER.dev && LASER.dev.gatt.disconnect(); } catch (e) { } LASER.dev = null; }

// position at a horizontal distance (m) along a true bearing (°) from lat / lon
function offsetLL(lat, lon, dist, bearing) {
  const R = 6371008.8, d = dist / R, b = bearing * Math.PI / 180, p1 = lat * Math.PI / 180, l1 = lon * Math.PI / 180;
  const p2 = Math.asin(Math.sin(p1) * Math.cos(d) + Math.cos(p1) * Math.sin(d) * Math.cos(b));
  const l2 = l1 + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(p1), Math.cos(d) - Math.sin(p1) * Math.sin(p2));
  return [p2 * 180 / Math.PI, ((l2 * 180 / Math.PI) + 540) % 360 - 180];
}

// stem radius (m) from the DBH box: "450" → 0.225; "3x200" → 0.1; "200,180" → 0.1
function stemRadius(dbh) {
  const s = String(dbh || "").replace(/#/g, "");
  const x = s.match(/x\s*(\d+(?:\.\d+)?)/i);
  const n = x ? +x[1] : Math.max(0, ...(s.match(/\d+(?:\.\d+)?/g) || []).map(Number));
  return n > 0 && n < 5000 ? n / 2000 : 0;
}
