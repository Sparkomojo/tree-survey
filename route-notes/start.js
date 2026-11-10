// Route Notes – © 2026 Mark Johnson. All rights reserved.
// Start-up: which page to show, the menu button, and the offline cache.
async function route() {
  try {
    if (location.hash === "#/more") await morePage(); else await routeNotesPage();
  } catch (e) { app.innerHTML = `<main><div class="card"><b>Something went wrong.</b><p>${esc(e.message || e)}</p></div></main>`; }
  window.scrollTo(0, 0);
}
// the notes page's top-left button is "Home" inside Tree Survey; here it opens Settings and help
new MutationObserver(() => {
  const b = app.querySelector('header.top button[aria-label="Home"]');
  if (b) { b.textContent = "☰"; b.setAttribute("aria-label", "Settings and help"); }
}).observe(app, { childList: true, subtree: true });
window.addEventListener("hashchange", route);
route();
if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});
