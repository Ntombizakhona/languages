// A small, safe Markdown renderer for the articles in posts/.
// All text is HTML-escaped first, so only the tags this file creates can appear.
(function () {
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

  function safeUrl(url) {
    url = url.trim();
    // Links between posts, such as ../12-terraform/README.md, open on this site
    const post = url.match(/^\.\.\/([\w-]+)\/README\.md(#[\w-]*)?$/i);
    if (post) return "post.html?slug=" + post[1] + (post[2] || "");
    // Block javascript:, data:, and every other scheme except http, https, and mailto
    if (/^[a-z][a-z0-9+.-]*:/i.test(url) && !/^(https?|mailto):/i.test(url)) return "#";
    return url;
  }

  // Takes text that is already escaped
  function inline(text) {
    const codes = [];
    text = text.replace(/`([^`]+)`/g, (_, c) => "\u0000" + (codes.push(c) - 1) + "\u0000");
    text = text
      .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_, alt, src) => `<img src="${safeUrl(src)}" alt="${alt}" loading="lazy">`)
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, href) => `<a href="${safeUrl(href)}">${t}</a>`)
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^\w*])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>")
      .replace(/ {2}$/, "<br>");
    return text.replace(/\u0000(\d+)\u0000/g, (_, n) => `<code>${codes[n]}</code>`);
  }

  const LIST = /^\s*([-*]|\d+\.) /;
  const isBlockStart = (l) => /^(#{1,6} |```|> ?|\|)/.test(l) || LIST.test(l) || /^-{3,}\s*$/.test(l);

  function makeId(text, ids) {
    const base = text.toLowerCase().replace(/[^\w]+/g, "-").replace(/^-+|-+$/g, "") || "section";
    let id = base, n = 2;
    while (ids[id]) id = base + "-" + n++;
    ids[id] = true;
    return id;
  }

  // onHeading(level, text, id) is called for every heading, for the table of contents
  function render(md, onHeading, ids = {}) {
    let lines = md.replace(/\r\n?/g, "\n").split("\n");
    // Some posts are indented as a whole: remove the first line's indentation from every line
    const first = lines.find((l) => l.trim()) || "";
    const cut = first.match(/^ */)[0].length;
    if (cut) lines = lines.map((l) => l.replace(new RegExp("^ {0," + cut + "}"), ""));

    const out = [];
    let i = 0, m;
    while (i < lines.length) {
      const line = lines[i];
      if (!line.trim()) { i++; continue; }
      if ((m = line.match(/^```\s*([\w+-]*)/))) {
        const buf = [];
        i++;
        while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
        i++;
        out.push(`<pre><code${m[1] ? ` class="lang-${m[1]}"` : ""}>${esc(buf.join("\n"))}</code></pre>`);
      } else if ((m = line.match(/^(#{1,6}) (.*)$/))) {
        const level = m[1].length, text = m[2].trim(), id = makeId(text, ids);
        if (onHeading) onHeading(level, text, id);
        out.push(`<h${level} id="${id}">${inline(esc(text))}</h${level}>`);
        i++;
      } else if (/^(-{3,}|\*{3,})\s*$/.test(line)) {
        out.push("<hr>");
        i++;
      } else if (/^> ?/.test(line)) {
        const buf = [];
        while (i < lines.length && /^> ?/.test(lines[i])) buf.push(lines[i++].replace(/^> ?/, ""));
        out.push(`<blockquote>${render(buf.join("\n"), null, ids)}</blockquote>`);
      } else if (LIST.test(line)) {
        const ordered = /^\s*\d+\. /.test(line), items = [];
        while (i < lines.length && LIST.test(lines[i])) {
          items.push(lines[i++].replace(LIST, ""));
          while (i < lines.length && /^\s{2,}\S/.test(lines[i]) && !LIST.test(lines[i])) items[items.length - 1] += " " + lines[i++].trim();
        }
        const tag = ordered ? "ol" : "ul";
        out.push(`<${tag}>${items.map((t) => `<li>${inline(esc(t))}</li>`).join("")}</${tag}>`);
      } else if (/^\|/.test(line)) {
        const rows = [];
        while (i < lines.length && /^\|/.test(lines[i])) rows.push(lines[i++]);
        const cells = (r) => r.trim().replace(/^\||\|$/g, "").split(/(?<!\\)\|/).map((c) => inline(esc(c.trim().replace(/\\\|/g, "|"))));
        const [head, ...rest] = rows.filter((r, n) => !(n === 1 && /^[\s|:-]+$/.test(r)));
        out.push(`<div class="table-wrap"><table><thead><tr>${cells(head).map((c) => `<th>${c}</th>`).join("")}</tr></thead>` +
          `<tbody>${rest.map((r) => `<tr>${cells(r).map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`);
      } else {
        const buf = [line];
        i++;
        while (i < lines.length && lines[i].trim() && !isBlockStart(lines[i])) buf.push(lines[i++]);
        out.push(`<p>${buf.map((l) => inline(esc(l))).join("\n")}</p>`);
      }
    }
    return out.join("\n");
  }

  window.renderMarkdown = render;
})();
