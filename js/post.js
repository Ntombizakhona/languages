// Article page: shows posts/<slug>.html (imported from Medium) or posts/<slug>.md,
// then fills the table of contents and sidebar.
document.addEventListener("DOMContentLoaded", async () => {
  const S = window.SITE, $ = (sel) => document.querySelector(sel);
  const slug = new URLSearchParams(location.search).get("slug") || "";
  const content = $("[data-content]");
  const link = (a) => `post.html?slug=${encodeURIComponent(a.slug)}`;
  $("[data-about]").textContent = S.bio;

  // Imported HTML is already cleaned by tools/import_medium.py. As a second safeguard, parse it
  // in an inert document and strip anything that could run code before it reaches the page.
  const cleanHtml = (text) => {
    const doc = new DOMParser().parseFromString(text, "text/html");
    doc.querySelectorAll("script, style, iframe, object, embed, link, meta, form").forEach((el) => el.remove());
    doc.querySelectorAll("*").forEach((el) => [...el.attributes].forEach(({ name, value }) => {
      if (!["href", "src", "alt", "loading"].includes(name) || /^\s*(javascript|data|vbscript):/i.test(value)) el.removeAttribute(name);
    }));
    return [...doc.body.childNodes];
  };
  const makeId = (text, ids) => {
    const base = text.toLowerCase().replace(/[^\w]+/g, "-").replace(/^-+|-+$/g, "") || "section";
    let id = base, n = 2;
    while (ids[id]) id = base + "-" + n++;
    ids[id] = true;
    return id;
  };

  let articles = [];
  try { articles = await loadArticles(); } catch (e) { /* the sidebar stays empty */ }
  const a = articles.find((x) => x.slug === slug);
  if (!a) {
    document.title = "Article not found · Cloud Languages";
    content.innerHTML = `<h1>Article not found</h1><p><a href="./">See all articles</a></p>`;
    return;
  }
  document.title = `${a.title} · Cloud Languages`;
  $("[data-kicker]").textContent = `${pad(a.number)} · ${a.language} · ${a.category}`;

  try {
    const text = await loadPost(a), toc = [];
    if (a.format === "html") {
      content.replaceChildren(...cleanHtml(text));
      const ids = {};
      content.querySelectorAll("h2, h3").forEach((h) => {
        h.id = makeId(h.textContent, ids);
        toc.push({ level: Number(h.tagName[1]), text: h.textContent, id: h.id });
      });
    } else {
      content.innerHTML = renderMarkdown(text, (level, t, id) => { if (level === 2 || level === 3) toc.push({ level, text: t, id }); });
    }

    // Reading time, tags, and the Medium link go under the title and subtitle
    const meta = $("[data-meta]");
    meta.innerHTML = `<span>${minutesToRead(text)} min read</span>` +
      a.tags.map((t) => `<a href="./?q=${encodeURIComponent(t)}">#${esc(t)}</a>`).join("") +
      `<a href="${esc(a.medium || S.seriesUrl)}" target="_blank" rel="noopener">Read on Medium</a>`;
    const h1 = content.querySelector("h1");
    if (h1) (h1.nextElementSibling && h1.nextElementSibling.tagName === "H2" ? h1.nextElementSibling : h1).after(meta);
    // Medium posts bring their own cover image, so the local one is only for Markdown posts
    if (a.cover && a.format !== "html") { const img = $("[data-cover]"); img.src = a.cover; img.hidden = false; meta.after(img); }

    // The subtitle sits right under the title; it isn't a section, so it stays out of "On this page"
    const sections = toc.filter((t) => document.getElementById(t.id)?.previousElementSibling?.tagName !== "H1");
    $("[data-toc]").innerHTML = sections.map((t) => `<li class="lvl-${t.level}"><a href="#${t.id}">${esc(t.text.replace(/[*`]/g, ""))}</a></li>`).join("");
    if (location.hash) document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView();
  } catch (e) {
    content.innerHTML = `<p>Couldn't load this article. <a href="./">See all articles</a></p>`;
  }

  const i = articles.indexOf(a), prev = articles[i - 1], next = articles[i + 1];
  const navLink = (x, label) => (x ? `<a href="${link(x)}"><small>${label}</small>${esc(x.title)}</a>` : "<span></span>");
  $("[data-post-nav]").innerHTML = navLink(prev, "← Previous") + navLink(next, "Next →");

  const categories = [...new Set(articles.map((x) => x.category))];
  $("[data-categories]").innerHTML = categories.map((c) =>
    `<li><a href="./?q=${encodeURIComponent(c)}">${esc(c)}</a> (${articles.filter((x) => x.category === c).length})</li>`).join("");
  const tags = [...new Set(articles.flatMap((x) => x.tags))].sort();
  $("[data-tags]").innerHTML = tags.map((t) => `<a class="chip" href="./?q=${encodeURIComponent(t)}">#${esc(t)}</a>`).join("");
  $("[data-recent]").innerHTML = articles.slice(-5).reverse().map((x) => `<li><a href="${link(x)}">${esc(x.title)}</a></li>`).join("");
});
