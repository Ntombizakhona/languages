---
inclusion: always
---
# Design rules

- The look: Instagram meets WordPress. Instagram for browsing: a profile header
  and an image-led grid. WordPress for reading: a comfortable article layout,
  categories, tags, and search.
- Dark theme by default. The light theme is a pure white page (#ffffff).
  The theme toggle sits in the exact middle of the black navbar and remembers
  the choice; Articles and About sit in a sandwich (hamburger) menu on the
  right. The navbar stays black in both themes.
- A clean sans-serif font for the interface and a serif font for article text.
- Plain HTML, CSS, and JavaScript. No frameworks and no build step: GitHub Pages
  serves the files exactly as they are in the repository.
- Small libraries are fine if they're pinned to an exact version and saved in vendor/.
- Relative links (css/style.css, not /css/style.css), so the site still works
  if it ever moves into a subfolder. Exception: 404.html, which GitHub Pages
  serves for any missing path.
- Accessible: semantic HTML, alt text on every image, visible keyboard focus,
  and text contrast of at least 4.5:1.
- Check every change at 375 px (phone) and 1280 px (laptop) wide.
- Articles show in a level grid of square black tiles with white text, three
  across on every screen size, like an Instagram profile. Tiles show the number
  as 01 (never "No. 01") in terminal green (#33ff00), and the language; hovering shows the article's live Medium
  title (the 12 language titles end in "in the Cloud"; the bonus is "Agentic IDEs"). The bonus article ("bonus": true in
  articles.json) floats alone below the grid as a ghost.
- The highlight circles under the profile have black centres with white
  numbers, inside a terminal green (#33ff00) ring. The site title in the
  navbar is terminal green too. Only the profile photo keeps the Instagram
  gradient ring.
- Article text comes from the published Medium posts, imported by
  tools/import_medium.py into posts/<slug>.html ("format": "html"). Don't edit
  those files by hand; re-run the importer instead.
- Site settings live in js/config.js and the article list in articles.json.
  Never invent article dates or links; ask instead.
