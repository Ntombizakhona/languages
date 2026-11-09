#!/usr/bin/env python3
"""Import the published versions of your articles from Medium.

Run it from the site folder:

    python tools/import_medium.py                  # your newest stories, from your Medium RSS feed
    python tools/import_medium.py --export PATH    # any story, from a Medium data export

Medium's RSS feed only lists your 10 most recent stories, and Medium blocks scripts from
downloading story pages. For older stories, download your data from Medium (Settings >
Security and apps > Download your information), unzip it, and pass its "posts" folder.

For every article in articles.json whose "medium" link matches an imported story, this
writes posts/<slug>.html and sets "format": "html" in articles.json. Only the tags and
attributes the site needs are kept, so nothing copied from Medium can run scripts.
"""
import argparse
import html
import json
import re
import urllib.request
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path

SITE = Path(__file__).resolve().parent.parent
FEED_URL = "https://medium.com/feed/@ntombizakhona"
CONTENT = "{http://purl.org/rss/1.0/modules/content/}encoded"

KEEP = {"p", "h2", "h3", "h4", "strong", "em", "code", "a", "ul", "ol", "li",
        "blockquote", "figure", "figcaption", "img", "hr", "br"}
# Medium's large headings are h3 and its small ones h4; on the site they become h2 and h3
RENAME = {"h1": "h2", "h3": "h2", "h4": "h3", "h5": "h4", "h6": "h4", "b": "strong", "i": "em"}
DROP = {"script", "style", "noscript", "svg", "button", "form", "input", "textarea", "select",
        "object", "embed", "template", "head", "title", "nav", "header", "footer"}
VOID = {"img", "hr", "br", "source", "meta", "link", "input", "wbr", "embed", "area", "col", "param", "track"}
BLOCKS = {"p", "h2", "h3", "h4", "ul", "ol", "blockquote"}


def story_id(text):
    """Medium story links and export file names end in the story's id, like -337b9bdbbc0b."""
    m = re.search(r"-([0-9a-f]{10,12})(?:\.html)?(?:[/?#]|$)", text or "")
    return m.group(1) if m else None


class Cleaner(HTMLParser):
    """Rebuilds a Medium story with only the tags and attributes the site needs."""

    def __init__(self, story_url, local_links, body_only):
        super().__init__(convert_charrefs=True)
        self.story_url = story_url        # where embeds that can't be copied are linked to
        self.local_links = local_links    # story id -> the same article on this site
        self.body_only = body_only        # Medium exports: read only <section data-field="body">
        self.in_body = not body_only
        self.sections = 0
        self.out, self.stack, self.skip = [], [], []
        self.pre = 0
        self.started = False              # True once body text has been written
        self.subtitle, self.capture = None, None

    def link(self, href):
        href = href.strip()
        if not re.match(r"(https?:|mailto:|#)", href, re.I):
            return ""
        if "medium.com" in href:
            sid = story_id(href.split("?")[0])
            if sid in self.local_links:
                return self.local_links[sid]   # another article in the series: open it on this site
            href = re.sub(r"\?source=[^#]*", "", href)
        return href

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if not self.in_body:
            if tag == "section" and a.get("data-field") == "body":
                self.in_body, self.sections = True, 1
            return
        if self.body_only and tag == "section":
            self.sections += 1
        if self.skip:
            if tag not in VOID:
                self.skip.append(tag)
            return
        if self.capture is not None:      # inside the subtitle: keep only its text
            if tag not in VOID:
                self.stack.append((tag, None))
            return
        cls = a.get("class") or ""
        if tag == "iframe":               # embeds (videos, gists) can't be copied
            self.out.append('<p><a href="%s">View this embed on Medium</a></p>' % html.escape(self.story_url))
            self.skip.append(tag)
            return
        if tag in DROP or "graf--title" in cls:
            if tag not in VOID:
                self.skip.append(tag)
            return
        if "graf--subtitle" in cls or (tag == "h4" and not self.started and self.subtitle is None):
            self.capture = []
            self.stack.append((tag, "#subtitle"))
            return
        if self.pre:                      # code keeps only its text and line breaks
            if tag == "br":
                self.out.append("\n")
            elif tag not in VOID:
                self.stack.append((tag, None))
            return
        if tag == "pre":
            self.started = True
            self.pre += 1
            self.out.append("<pre><code>")
            self.stack.append((tag, "pre"))
            return
        name = RENAME.get(tag, tag)
        if name not in KEEP:              # other tags: keep their content, drop the tag
            if tag not in VOID:
                self.stack.append((tag, None))
            return
        if name == "img":
            src = a.get("src") or ""
            if src.startswith("https://") and "/_/stat" not in src:   # skip Medium's tracking pixel
                self.out.append('<img src="%s" alt="%s" loading="lazy">'
                                % (html.escape(src), html.escape(a.get("alt") or "")))
            return
        if name in ("br", "hr"):
            self.out.append("<%s>" % name)
            return
        if name == "a":
            href = self.link(a.get("href") or "")
            if not href:
                self.stack.append((tag, None))
                return
            self.out.append('<a href="%s">' % html.escape(href))
        else:
            self.out.append("<%s>" % name)
        self.started = self.started or name in BLOCKS
        self.stack.append((tag, name))

    def handle_endtag(self, tag):
        if not self.in_body:
            return
        if self.body_only and tag == "section":
            self.sections -= 1
            if self.sections == 0:
                self.in_body = False
                return
        if self.skip:
            if tag in self.skip:
                while self.skip.pop() != tag:
                    pass
            return
        if tag in VOID:
            return
        for i in range(len(self.stack) - 1, -1, -1):
            if self.stack[i][0] == tag:
                while len(self.stack) > i:
                    self.close_entry(self.stack.pop())
                return

    def close_entry(self, entry):
        tag, name = entry
        if name == "#subtitle":
            self.subtitle = " ".join("".join(self.capture).split()) or None
            self.capture = None
        elif name == "pre":
            self.pre -= 1
            self.out.append("</code></pre>")
        elif name:
            self.out.append("</%s>" % name)

    def handle_data(self, data):
        if not self.in_body or self.skip:
            return
        if self.capture is not None:
            self.capture.append(data)
        else:
            self.out.append(html.escape(data, quote=False))

    def result(self, title):
        while self.stack:
            self.close_entry(self.stack.pop())
        # Medium sometimes splits one code block into several; join them back together
        body = re.sub(r"</code></pre>\s*<pre><code>", "\n", "".join(self.out))
        # Medium exports start each story with a section divider; drop it so the article doesn't open with a line
        body = re.sub(r"^\s*(?:<hr>\s*)+", "", body)
        head = "<h1>%s</h1>\n" % html.escape(title)
        if self.subtitle:
            head += "<h2>%s</h2>\n" % html.escape(self.subtitle)
        return head + body


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) portfolio-importer"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read()


def from_feed(url):
    """(story id, title, HTML, body_only) for each story in the RSS feed."""
    for item in ET.fromstring(fetch(url)).iter("item"):
        link = (item.findtext("link") or "").split("?")[0]
        yield story_id(link), item.findtext("title") or "", item.findtext(CONTENT) or "", False


def from_export(folder):
    """The same, for each published story in an unzipped Medium data export."""
    files = sorted(Path(folder).glob("*.html"))
    if not files:
        raise SystemExit("No .html files in %s. Pass the export's posts folder." % folder)
    for f in files:
        if f.name.startswith("draft"):
            continue
        text = f.read_text(encoding="utf-8")
        m = re.search(r'<h1 class="p-name">(.*?)</h1>', text, re.S) or re.search(r"<title>(.*?)</title>", text, re.S)
        title = html.unescape(re.sub(r"<[^>]+>", "", m.group(1))).strip() if m else ""
        yield story_id(f.name), title, text, True


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--export", metavar="PATH", help="the posts folder of an unzipped Medium data export")
    ap.add_argument("--feed", default=FEED_URL, help="your Medium RSS feed (default: %(default)s)")
    args = ap.parse_args()

    articles_file = SITE / "articles.json"
    articles = json.loads(articles_file.read_text(encoding="utf-8"))
    by_id = {story_id(a.get("medium")): a for a in articles if story_id(a.get("medium"))}
    local_links = {sid: "post.html?slug=" + a["slug"] for sid, a in by_id.items()}

    done = []
    for sid, title, text, body_only in (from_export(args.export) if args.export else from_feed(args.feed)):
        a = by_id.get(sid)
        if not a or a["slug"] in done:
            continue
        cleaner = Cleaner(a["medium"], local_links, body_only)
        cleaner.feed(text)
        cleaner.close()
        live_title = title.strip() or a["title"]
        note = "<!-- Imported from %s by tools/import_medium.py. Re-run it to update this file. -->\n" % a["medium"]
        (SITE / "posts" / (a["slug"] + ".html")).write_text(note + cleaner.result(live_title) + "\n", encoding="utf-8")
        (SITE / "posts" / (a["slug"] + ".md")).unlink(missing_ok=True)
        # Keep the grid, sidebar, and links in step with the published title and subtitle
        a["title"] = live_title
        if cleaner.subtitle:
            a["subtitle"] = cleaner.subtitle
        a["format"] = "html"
        done.append(a["slug"])

    entries = ",\n  ".join(json.dumps(a, ensure_ascii=False) for a in articles)
    articles_file.write_text("[\n  " + entries + "\n]\n", encoding="utf-8")

    print("Imported %d article(s): %s" % (len(done), ", ".join(done) or "none"))
    missing = [a["slug"] for a in by_id.values() if a.get("format") != "html"]
    if missing:
        print("Still using local Markdown: " + ", ".join(missing))
        if not args.export:
            print("Medium's feed only lists your 10 newest stories. For older ones, use --export (see the top of this file).")


if __name__ == "__main__":
    main()
