// Tree Survey – © 2026 Mark Johnson. All rights reserved. Use only under a written licence from the owner.
/* Mark up a photo (v1.99): lines, arrows, freehand, ovals and short labels drawn over a photograph – a pruning cut,
   a cavity, the limb to take off.

   A marked-up photo record keeps three things:
     p.blob   the picture WITH the marks – what every page shows and what every export, report and works pack uses
     p.orig   the photograph as taken (only once it has been marked)
     p.marks  the marks themselves, so they can be changed or taken off later
   A mark is { k: "line" | "arrow" | "free" | "oval" | "text", c: colour, w: width as a fraction of the picture's long
   side, d: 1 when dashed, pts: [[x, y], …] as fractions of the picture's width and height, t: the label's words }.
   Fractions, so the marks fit whatever size the picture is drawn at, and survive a quarter turn. */
"use strict";

const MARKUP = (() => {
  const COLOURS = [["#e5202e", "Red"], ["#ffd21f", "Yellow"], ["#ffffff", "White"], ["#1f7ae0", "Blue"], ["#111111", "Black"]];
  const WIDTHS = [["Fine", 0.004], ["Medium", 0.007], ["Bold", 0.012]];
  const TOOLS = [["line", "╱", "Line"], ["arrow", "➚", "Arrow"], ["free", "✎", "Draw"], ["oval", "◯", "Oval"], ["text", "T", "Label"]];
  const MAX_TEXT = 60;

  const halo = c => (c === "#111111" || c === "#1f7ae0" || c === "#e5202e") ? "rgba(255,255,255,.9)" : "rgba(0,0,0,.75)";

  // draw the marks on a canvas context whose picture is W × H pixels
  function paint(g, marks, W, H) {
    const L = Math.max(W, H);
    for (const m of marks || []) {
      const pts = (m.pts || []).map(([x, y]) => [x * W, y * H]);
      if (!pts.length) continue;
      const lw = Math.max(1.5, (m.w || WIDTHS[1][1]) * L);
      g.save();
      g.lineCap = "round"; g.lineJoin = "round"; g.lineWidth = lw; g.strokeStyle = g.fillStyle = m.c || COLOURS[0][0];
      g.setLineDash(m.d ? [lw * 3, lw * 2.6] : []);
      if (m.k === "text") {
        const size = Math.max(12, lw * 5.5);
        g.font = `700 ${size}px system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif`;
        g.textBaseline = "middle"; g.setLineDash([]);
        const txt = String(m.t || ""), wide = g.measureText(txt).width;
        const x = Math.max(size * 0.2, Math.min(pts[0][0], W - wide - size * 0.2)), y = Math.max(size * 0.6, Math.min(pts[0][1], H - size * 0.6));
        g.lineWidth = size * 0.22; g.strokeStyle = halo(m.c); g.strokeText(txt, x, y); g.fillText(txt, x, y);
      } else if (m.k === "oval" && pts.length > 1) {
        const [a, b] = [pts[0], pts[pts.length - 1]];
        g.beginPath(); g.ellipse((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, Math.abs(b[0] - a[0]) / 2, Math.abs(b[1] - a[1]) / 2, 0, 0, Math.PI * 2); g.stroke();
      } else {
        g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
        if (pts.length === 1) g.lineTo(pts[0][0] + 0.01, pts[0][1]);
        for (const q of pts.slice(1)) g.lineTo(q[0], q[1]);
        g.stroke();
        if (m.k === "arrow" && pts.length > 1) {
          const [a, b] = [pts[0], pts[pts.length - 1]], ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
          const hl = Math.min(lw * 4.5, Math.hypot(b[0] - a[0], b[1] - a[1]) * 0.6);
          g.setLineDash([]); g.beginPath();
          g.moveTo(b[0] - hl * Math.cos(ang - 0.45), b[1] - hl * Math.sin(ang - 0.45)); g.lineTo(b[0], b[1]);
          g.lineTo(b[0] - hl * Math.cos(ang + 0.45), b[1] - hl * Math.sin(ang + 0.45)); g.stroke();
        }
      }
      g.restore();
    }
  }

  // the photograph with its marks, as a JPEG the size of the photograph
  async function render(blob, marks) {
    const bmp = await createImageBitmap(blob);
    const c = document.createElement("canvas"); c.width = bmp.width; c.height = bmp.height;
    const g = c.getContext("2d"); g.drawImage(bmp, 0, 0); bmp.close && bmp.close();
    paint(g, marks, c.width, c.height);
    return await new Promise(res => c.toBlob(b => res(b || blob), "image/jpeg", 0.9));
  }

  // a quarter turn clockwise, to go with rotate90() on the picture
  const turned = marks => (marks || []).map(m => Object.assign({}, m, { pts: (m.pts || []).map(([x, y]) => [1 - y, x]) }));

  const marked = p => !!(p && p.orig && (p.marks || []).length);

  // store the marks on a photo record (not saved to the device here). No marks = back to the photograph as taken.
  async function apply(p, marks) {
    const base = p.orig || p.blob;
    if (marks && marks.length) { p.blob = await render(base, marks); p.orig = base; p.marks = marks; }
    else { p.blob = base; delete p.orig; delete p.marks; }
    p.updated = Date.now();
    return p;
  }

  let closeOpen = null;   // closes the editor if the page changes underneath it (the device's Back button)

  // the editor: resolves true when the marks were saved, false when it was closed without saving
  function edit(p, title) {
    return new Promise(async done => {
      const base = p.orig || p.blob;
      let bmp;
      try { bmp = await createImageBitmap(base); } catch (e) { toast("This photo can't be opened for marking up"); return done(false); }
      const marks = JSON.parse(JSON.stringify(p.marks || [])), before = JSON.stringify(marks);
      let tool = "line", colour = COLOURS[0][0], width = 1, dashed = false, cur = null, pid = null;
      try { const s = JSON.parse(sessionStorage.getItem("tree-survey-markup") || "{}"); if (TOOLS.some(t => t[0] === s.tool)) tool = s.tool; if (COLOURS.some(c => c[0] === s.colour)) colour = s.colour; if (WIDTHS[s.width]) width = s.width; dashed = !!s.dashed; } catch (e) { }

      const el = document.createElement("div");
      el.className = "mk"; el.setAttribute("role", "dialog"); el.setAttribute("aria-label", "Mark up photo");
      el.innerHTML = `
        <div class="mk-top"><button id="mkCancel">Cancel</button><b>${esc(title || "Mark up photo")}</b><button id="mkSave" class="go">✓ Save</button></div>
        <div class="mk-stage"><canvas id="mkCanvas"></canvas></div>
        <div class="mk-bar">
          <div class="mk-row" id="mkTools">${TOOLS.map(([k, i, l]) => `<button data-tool="${k}" aria-label="${l}"><span>${i}</span>${l}</button>`).join("")}</div>
          <div class="mk-row">
            <span class="mk-cols" id="mkCols">${COLOURS.map(([c, l]) => `<button data-col="${c}" aria-label="${l}" style="background:${c}"></button>`).join("")}</span>
            <button id="mkWidth"></button><button id="mkDash">┄ Dashed</button>
            <button id="mkUndo">↶ Undo</button><button id="mkClear">Clear all</button>
          </div>
          <div class="mk-hint" id="mkHint"></div>
        </div>`;
      document.body.appendChild(el);
      const q = s => el.querySelector(s), cv = q("#mkCanvas"), g = cv.getContext("2d"), stage = q(".mk-stage");
      const HINTS = { line: "Drag from one end of the line to the other – a pruning cut, for instance.", arrow: "Drag from the tail to the point of the arrow.",
        free: "Draw with a finger or the pen.", oval: "Drag across what you want to ring.", text: "Tap where the label should start." };

      function fit() {   // the canvas fills the space it is given, keeping the picture's shape
        const bw = stage.clientWidth, bh = stage.clientHeight; if (!bw || !bh) return;
        const k = Math.min(bw / bmp.width, bh / bmp.height), dpr = Math.min(window.devicePixelRatio || 1, 2);
        const w = Math.max(1, Math.floor(bmp.width * k)), h = Math.max(1, Math.floor(bmp.height * k));
        cv.style.width = w + "px"; cv.style.height = h + "px"; cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
        draw();
      }
      function draw() {
        g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(bmp, 0, 0, cv.width, cv.height);
        paint(g, cur ? marks.concat([cur]) : marks, cv.width, cv.height);
      }
      function show() {
        el.querySelectorAll("[data-tool]").forEach(b => b.classList.toggle("on", b.dataset.tool === tool));
        el.querySelectorAll("[data-col]").forEach(b => b.classList.toggle("on", b.dataset.col === colour));
        q("#mkWidth").textContent = "▬ " + WIDTHS[width][0]; q("#mkDash").classList.toggle("on", dashed);
        q("#mkUndo").disabled = q("#mkClear").disabled = !marks.length;
        q("#mkHint").textContent = HINTS[tool] + (marks.length ? ` ${marks.length} mark${marks.length === 1 ? "" : "s"}.` : "");
        try { sessionStorage.setItem("tree-survey-markup", JSON.stringify({ tool, colour, width, dashed })); } catch (e) { }
      }
      const at = e => { const r = cv.getBoundingClientRect(); return [Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), Math.min(1, Math.max(0, (e.clientY - r.top) / r.height))]; };
      const fresh = (k, pts) => Object.assign({ k, c: colour, w: WIDTHS[width][1], pts }, dashed && k !== "text" ? { d: 1 } : {});

      cv.addEventListener("pointerdown", e => {
        if (pid !== null || (e.pointerType === "mouse" && e.button !== 0)) return;
        e.preventDefault();
        const pt = at(e);
        if (tool === "text") {
          const t = (prompt("Label – a few words, e.g. Cut here:", "") || "").trim().slice(0, MAX_TEXT);
          if (t) { marks.push(Object.assign(fresh("text", [pt]), { t })); draw(); show(); }
          return;
        }
        pid = e.pointerId; try { cv.setPointerCapture(pid); } catch (x) { }
        cur = fresh(tool, tool === "free" ? [pt] : [pt, pt]); draw();
      });
      cv.addEventListener("pointermove", e => {
        if (e.pointerId !== pid || !cur) return;
        e.preventDefault();
        const pt = at(e);
        if (cur.k === "free") { const l = cur.pts[cur.pts.length - 1]; if (Math.hypot((pt[0] - l[0]) * cv.width, (pt[1] - l[1]) * cv.height) >= 2) cur.pts.push(pt); }
        else cur.pts[1] = pt;
        draw();
      });
      const lift = e => {
        if (e.pointerId !== pid) return;
        pid = null;
        if (cur && e.type === "pointerup") {
          const a = cur.pts[0], b = cur.pts[cur.pts.length - 1];
          const span = Math.hypot((b[0] - a[0]) * cv.clientWidth, (b[1] - a[1]) * cv.clientHeight);
          if (cur.k === "free" || span >= 8) {   // a tap with a line tool leaves nothing
            cur.pts = cur.pts.map(([x, y]) => [+x.toFixed(4), +y.toFixed(4)]);
            marks.push(cur);
          }
        }
        cur = null; draw(); show();
      };
      cv.addEventListener("pointerup", lift); cv.addEventListener("pointercancel", lift);

      q("#mkTools").onclick = e => { const b = e.target.closest("[data-tool]"); if (b) { tool = b.dataset.tool; show(); } };
      q("#mkCols").onclick = e => { const b = e.target.closest("[data-col]"); if (b) { colour = b.dataset.col; show(); } };
      q("#mkWidth").onclick = () => { width = (width + 1) % WIDTHS.length; show(); };
      q("#mkDash").onclick = () => { dashed = !dashed; show(); };
      q("#mkUndo").onclick = () => { marks.pop(); draw(); show(); };
      q("#mkClear").onclick = () => { if (marks.length && confirm("Take every mark off this photo?")) { marks.length = 0; draw(); show(); } };

      const close = saved => {
        window.removeEventListener("resize", fit); closeOpen = null;
        bmp.close && bmp.close(); el.remove(); document.body.classList.remove("mk-open"); done(saved);
      };
      closeOpen = () => close(false);
      q("#mkCancel").onclick = () => { if (JSON.stringify(marks) === before || confirm("Close without saving the marks you've just made?")) close(false); };
      q("#mkSave").onclick = async () => {
        if (JSON.stringify(marks) === before) return close(false);
        q("#mkSave").disabled = true; q("#mkSave").textContent = "Saving…";
        try { await apply(p, marks); close(true); }
        catch (e) { console.error(e); q("#mkSave").disabled = false; q("#mkSave").textContent = "✓ Save"; toast("Couldn't save the marks: " + e.message, 5000); }
      };
      document.body.classList.add("mk-open");
      window.addEventListener("resize", fit);
      show(); fit();
    });
  }
  window.addEventListener("hashchange", () => { if (closeOpen) closeOpen(); });

  return { COLOURS, WIDTHS, TOOLS, paint, render, turned, marked, apply, edit };
})();

// Open the editor on a stored photo and save the result. Used by every page that lists photos.
async function markupPhoto(p, job, redraw, title) {
  if (!(await MARKUP.edit(p, title))) return false;
  await DB.put("photos", p);
  if (job) await touchJob(job);
  toast(MARKUP.marked(p) ? "Marked-up photo saved – the original is kept" : "Marks taken off – back to the photo as taken");
  if (redraw) await redraw();
  return true;
}
