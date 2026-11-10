// Route Notes – © 2026 Mark Johnson. All rights reserved.
/* The small shell the notes page runs in when it is its own app: storage on this phone (IndexedDB "route-notes"),
   photo resizing, messages, and a settings page for the what3words key. The notes page itself is routenotes.js –
   the same file the Tree Survey app uses, so the two stay in step. Nothing is sent anywhere: notes and photos stay on
   the phone until you share the PDF. */
const RN_APP_VERSION = "1.0";
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const today = () => new Date().toISOString().slice(0, 10);
const ukDate = iso => iso ? iso.split("-").reverse().join("/") : "";
let toastTimer;
function toast(msg, ms = 2200) { const t = $("#toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), ms); }

const DB = (() => {
  let dbp;
  function open() {
    dbp = dbp || new Promise((res, rej) => {
      const r = indexedDB.open("route-notes", 1);
      r.onupgradeneeded = () => r.result.createObjectStore("settings", { keyPath: "id" });
      r.onsuccess = () => { const d = r.result; d.onversionchange = () => d.close(); res(d); };
      r.onerror = () => rej(r.error);
    });
    return dbp;
  }
  const req = r => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  return {
    get: async (s, id) => req((await open()).transaction(s).objectStore(s).get(id)),
    put: async (s, v) => { const d = await open(); const t = d.transaction(s, "readwrite"); t.objectStore(s).put(v);
      await new Promise((res, rej) => { t.oncomplete = res; t.onerror = () => rej(t.error); t.onabort = () => rej(t.error); }); return v; },
  };
})();
async function settings() { return (await DB.get("settings", "main")) || { id: "main" }; }

function pickFiles(sel, cb) { const inp = $(sel); inp.value = ""; inp.onchange = () => cb([...inp.files]); inp.click(); }
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

const app = $("#app");
const go = h => { const want = h === "#/" ? "#/more" : h; if (location.hash === want) route(); else location.hash = want; };

async function morePage() {
  const st = await settings();
  app.innerHTML = `
  <header class="top"><button aria-label="Back to the notes" onclick="location.hash='#/notes'">‹</button><h1>Route Notes<span class="sub">Settings and help</span></h1></header>
  <main>
    <h2>what3words key (optional)</h2>
    <p class="hint">With your own what3words API key, <b>📍 Here</b> fills in the three words as well as the grid reference, and typing the
      words fills in the grid reference. Without one, the grid reference still comes from GPS and you can paste the words from the
      what3words app. Get a key at what3words.com (developer account). It is kept on this phone only.</p>
    <label for="more_key">what3words API key</label>
    <input id="more_key" value="${esc(st.w3wKey || "")}" autocapitalize="characters" autocomplete="off" spellcheck="false" placeholder="e.g. ABCD1234">
    <h2>How it works</h2>
    <div class="card">
      <p>Fill in the day's route as you go: date, site / route, From and To, distance, who you were with, the species (tap once for
        standard stock, twice for occasional), defects, constraints and access, any extra notes, and photos with captions.</p>
      <p><b>Save PDF</b> makes <i>Site_Notes_DD_MM_YYYY_route.pdf</i> – the note, then the photos four to a page – and offers to share it
        (email, WhatsApp, Drive…).</p>
      <p><b>New day</b> keeps the route, team and species; yesterday's To becomes today's From.</p>
      <p>Everything stays on this phone. Nothing is uploaded. If you clear the browser's data for this site, the current note goes with it –
        save the PDF first.</p>
      <p>Works without signal once it has been opened once. To install: in Chrome, ⋮ → <i>Add to Home screen</i>; on iPhone, Share →
        <i>Add to Home Screen</i>.</p>
    </div>
    <p class="hint">Route Notes ${RN_APP_VERSION} · © 2026 Mark Johnson · part of the Tree Survey app.</p>
  </main>
  <div class="bar"><button class="btn primary" onclick="location.hash='#/notes'">Back to the notes</button></div>`;
  $("#more_key").oninput = async e => { const s = await settings(); s.w3wKey = e.target.value.trim(); await DB.put("settings", s); };
}
