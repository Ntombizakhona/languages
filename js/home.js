// Home page: profile header, story filters, search, the article grid, and the floating bonus article.
document.addEventListener("DOMContentLoaded", async () => {
  const S = window.SITE, $ = (sel) => document.querySelector(sel);
  $("[data-name]").textContent = S.name;
  $("[data-handle]").textContent = S.handle;
  $("[data-bio]").textContent = S.bio;
  const labels = { medium: "Follow on Medium", github: "GitHub", linkedin: "LinkedIn" };
  $("[data-links]").innerHTML = Object.entries(S.links).filter(([, url]) => url)
    .map(([key, url], n) => `<a class="btn${n === 0 ? " primary" : ""}" href="${esc(url)}" target="_blank" rel="me noopener">${esc(labels[key] || key)}</a>`)
    .join("");

  const grid = $("[data-grid]"), ghost = $("[data-ghost]"), search = $("[data-search]"), title = $("[data-grid-title]"), stories = $("[data-stories]");
  let articles;
  try {
    articles = await loadArticles();
  } catch (e) {
    grid.innerHTML = `<p class="empty">Couldn't load the articles. If you opened this file straight from disk, start a local web server instead (see README.md).</p>`;
    return;
  }

  const stats = [[articles.length, "articles"], [articles.filter((a) => !a.bonus).length, "languages"], [S.projects, S.projects === 1 ? "project" : "projects"]];
  $("[data-stats]").innerHTML = stats.map(([n, label]) => `<li><strong>${n}</strong> ${label}</li>`).join("");

  stories.innerHTML = [{ language: "All", number: "All" }, ...articles].map((a) =>
    `<li class="story"><button type="button" data-filter="${esc(a.language)}" aria-pressed="${a.language === "All"}">` +
    `<span class="ring"><span class="dot">${esc(typeof a.number === "number" ? pad(a.number) : a.number)}</span></span>` +
    `<span class="label">${esc(a.language)}</span></button></li>`).join("");

  // Every tile is a square, so the rows stay level, like an Instagram profile grid
  const overlay = (a) =>
    `<span class="overlay" aria-hidden="true"><strong>${esc(a.title)}</strong>` +
    `<span class="meta" data-time="${esc(a.slug)}">${a.minutes ? a.minutes + " min read" : "Read the article"}</span>` +
    `<span class="tags">${a.tags.map((t) => "#" + esc(t)).join(" ")}</span></span>`;
  const link = (a, media) =>
    `<a href="post.html?slug=${encodeURIComponent(a.slug)}">${media}<h3 class="sr-only">${esc(a.title)}: ${esc(a.subtitle)}</h3>${overlay(a)}</a>`;
  const label = (a) =>
    `<span class="tile-label" aria-hidden="true"><span class="num">${pad(a.number)}</span><span class="lang">${esc(a.language)}</span></span>`;

  // Every grid tile is black with white text. Cover images show on the article pages instead.
  const card = (a) => `<article class="card">${link(a, `<span class="media tile">${label(a)}</span>`)}</article>`;

  // The bonus article floats on its own under the grid: the thirteenth ghost
  const ghostCard = (a) => `<article class="card ghost">${link(a,
    `<span class="media ghost-tile"><span class="tile-label" aria-hidden="true"><span class="boo">👻</span>` +
    `<span class="num">Bonus</span><span class="lang">${esc(a.language)}</span>` +
    `<span class="sub">${esc(a.subtitle)}</span></span></span>`)}</article>`;

  let filter = "All";
  search.value = new URLSearchParams(location.search).get("q") || "";

  function draw() {
    const q = search.value.trim().toLowerCase();
    const shown = articles.filter((a) => (filter === "All" || a.language === filter) &&
      (!q || [a.title, a.subtitle, a.language, a.category, ...a.tags].join(" ").toLowerCase().includes(q)));
    title.textContent = filter !== "All" ? filter : q ? `Results for “${search.value.trim()}”` : "All articles";
    const bonus = shown.filter((a) => a.bonus);
    grid.innerHTML = shown.length ? shown.filter((a) => !a.bonus).map(card).join("") : `<p class="empty">No articles match that search.</p>`;
    ghost.innerHTML = bonus.map(ghostCard).join("");
    ghost.hidden = !bonus.length;
  }

  stories.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-filter]");
    if (!btn) return;
    filter = btn.dataset.filter;
    stories.querySelectorAll("[data-filter]").forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
    draw();
  });
  search.addEventListener("input", draw);
  draw();

  // Reading times need each article's text, so they load after the grid is visible
  articles.forEach((a) => loadPost(a).then((text) => {
    a.minutes = minutesToRead(text);
    document.querySelectorAll(`[data-time="${CSS.escape(a.slug)}"]`).forEach((el) => (el.textContent = a.minutes + " min read"));
  }).catch(() => {}));
});
