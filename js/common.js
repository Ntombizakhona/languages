// Shared by every page: theme toggle, data loading, and small helpers.
// Loaded in <head> without defer, so the saved theme applies before the page draws.
(function () {
  const root = document.documentElement;
  const saved = localStorage.getItem("theme");
  if (saved === "dark" || saved === "light") root.dataset.theme = saved; // dark is the default, set on <html> in each page

  document.addEventListener("DOMContentLoaded", () => {
    const year = document.querySelector("[data-year]");
    if (year) year.textContent = new Date().getFullYear();

    // Sandwich menu: opens and closes the Articles and About links
    const menuBtn = document.querySelector("[data-menu-toggle]");
    const menu = menuBtn && document.getElementById(menuBtn.getAttribute("aria-controls"));
    if (menuBtn && menu) {
      const setOpen = (open) => {
        menu.hidden = !open;
        menuBtn.setAttribute("aria-expanded", String(open));
      };
      menuBtn.addEventListener("click", (e) => { e.stopPropagation(); setOpen(menu.hidden); });
      document.addEventListener("click", (e) => { if (!menu.hidden && !menu.contains(e.target)) setOpen(false); });
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && !menu.hidden) { setOpen(false); menuBtn.focus(); }
      });
    }

    const btn = document.querySelector("[data-theme-toggle]");
    if (!btn) return;
    const update = () => {
      const dark = root.dataset.theme === "dark";
      btn.textContent = dark ? "☀️" : "🌙";
      btn.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
    };
    btn.addEventListener("click", () => {
      root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
      localStorage.setItem("theme", root.dataset.theme);
      update();
    });
    update();
  });

  let articles;
  window.loadArticles = () =>
    (articles ||= fetch("articles.json").then((r) => {
      if (!r.ok) throw new Error("articles.json returned " + r.status);
      return r.json();
    }));

  // Articles imported from Medium are HTML ("format": "html" in articles.json); the rest are Markdown
  window.loadPost = (a) =>
    fetch("posts/" + encodeURIComponent(a.slug) + (a.format === "html" ? ".html" : ".md")).then((r) => {
      if (!r.ok) throw new Error("Post not found: " + a.slug);
      return r.text();
    });

  window.minutesToRead = (text) => Math.max(1, Math.round(text.replace(/<[^>]+>/g, " ").trim().split(/\s+/).length / 230));
  window.pad = (n) => String(n).padStart(2, "0");
  window.esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
})();
