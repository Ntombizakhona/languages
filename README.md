# Cloud Languages · Ntombizakhona

My portfolio and blog: 13 articles on the languages of the cloud, from English and HTML to Kubernetes, Terraform, and agentic IDEs. Browsing feels like Instagram; reading feels like WordPress.

**Live site:** https://ntombizakhona.github.io/languages/

<!-- To add a screenshot, save it as images/screenshot.png and remove the comment marks around the next line. -->
<!-- ![Home page: profile header, story circles, and a masonry grid of articles](images/screenshot.png) -->

## Features

- An Instagram-style profile header, with story circles that filter the articles by language
- A level, Instagram-style grid of square tiles, three across, with details on hover
- The bonus article floating below the grid like a ghost
- WordPress-style article pages with a table of contents, tags, categories, search, and previous and next links
- Dark mode by default with a light mode toggle, a layout that works on phones, and no frameworks or build step

## How It Works

GitHub Pages serves the files exactly as they are in this repository. `articles.json` lists the articles, `posts/` holds each one as Markdown, and `js/markdown.js` turns the Markdown into HTML in the browser. It escapes all HTML first, so a post can't run scripts.

| Path | What it is |
|---|---|
| `index.html`, `js/home.js` | Home page: profile, story filters, search, and the grid |
| `post.html`, `js/post.js` | Article page and sidebar |
| `about.html`, `404.html` | About page, and the page for missing links |
| `js/config.js` | Name, bio, and social links |
| `js/common.js` | Theme toggle and data loading, shared by every page |
| `articles.json` | One entry per article |
| `posts/` | The articles, in Markdown |
| `css/style.css` | Every style, including the dark theme |

## Run It Locally

Browsers block `fetch()` for pages opened straight from disk, so serve the folder with Python's built-in web server:

```powershell
python -m http.server 8000
```

Then open http://localhost:8000. Press Ctrl+C to stop the server.

## Add an Article

1. Save it as `posts/14-your-topic.md`, starting with a `# Title` line and a `## Subtitle` line.
2. Add an entry to `articles.json`. Its `slug` is the file name without `.md`:

   ```json
   { "slug": "14-your-topic", "number": 14, "language": "Your topic", "title": "Your topic in the Cloud",
     "subtitle": "Your subtitle", "category": "Infrastructure", "tags": ["tag-one", "tag-two"],
     "cover": "", "medium": "https://medium.com/..." }
   ```

   - `title` follows the series pattern, "Your topic in the Cloud". It shows when someone hovers over the tile.
   - `cover` is an optional image for the top of the article page, such as `images/covers/14-your-topic.png`.
   - `medium` is the article's Medium link. Without it, "Read on Medium" opens the series list.
3. Commit and push. The site updates within a couple of minutes.

To change your name, bio, or social links, edit `js/config.js`. An empty link hides its button.

## Update Articles from Medium

Published articles come from Medium, so the site shows exactly what readers see there. To refresh them, run this in the site folder:

```powershell
python tools/import_medium.py
```

It reads your Medium RSS feed, keeps only safe tags and attributes, and saves each story as `posts/<slug>.html`. It also copies each story's published title and subtitle into `articles.json`. Medium's feed only lists your 10 newest stories, and Medium blocks scripts from downloading story pages. For older stories, download your data from Medium (**Settings → Security and apps → Download your information**), unzip it, and run:

```powershell
python tools/import_medium.py --export "C:\path\to\medium-export\posts"
```

Articles that aren't on Medium yet stay as Markdown in `posts/`.

## Deployment

Every push to `main` publishes the site with GitHub Pages (**Settings → Pages**: deploy from the `main` branch, `/ (root)` folder). The empty `.nojekyll` file tells Pages to publish the files without processing them.

The repository is named `languages`, so GitHub serves it as a project site at `ntombizakhona.github.io/languages/`. The root address, `ntombizakhona.github.io`, is reserved for a future site. Links in `404.html` start with `/languages/`, because GitHub shows that page for missing paths at any depth.

## Built With

Plain HTML, CSS, and JavaScript, written with [Kiro](https://kiro.dev). The articles come from my [Cloud Languages series on Medium](https://ntombizakhona.medium.com/list/cloud-languages-497167b40bbd).
