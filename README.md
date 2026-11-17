# Release Day Sick Note

A joke website for calling in sick on the day GTA 6 comes out. You pick your symptoms, how much effort you want to put in and when you'll be back, and it writes the sick email for you. It's in German, with an English option.

Live: https://kynjii.github.io/release-day-sick-note/

## Running it locally

You need Node 22.12 or newer.

```bash
npm install
npm run news
npm run dev
```

`npm run news` downloads the latest articles into `public/news.json`. `npm run dev` starts the site at http://localhost:5173.

Other commands:

- `npm test` runs the tests.
- `npm run build` builds the site into `dist/`, and `npm run preview` serves that build.

## How the code is laid out

- `index.html` is the page. The German text and the form controls are filled in when the page is built (`src/render/page.js`), so the page is complete before any JavaScript runs.
- `src/main.js` runs in the browser: it updates the email as you fill in the form, switches language, runs the countdown and shows the news.
- `src/i18n/` has the page text in German and English.
- `src/content.js` has the symptoms, tones, return dates and their points.
- `src/email.js` builds the email and the believability score.
- `src/news/` reads the news feeds and shows the articles.
- `src/styles/` has the CSS. Colours, fonts and corner sizes are in `tokens.css`.

## The news section

The page lists recent GTA 6 articles from t-online and GIGA. Once an hour, a GitHub Action reads both sites' RSS feeds and saves the GTA articles to `news.json`, which the page loads. Each site keeps its 8 newest articles. If the feeds can't be reached, the site keeps the last list it had.

The sites and their feeds are listed in `src/news/news.js`. To add a site, add it there.

## Deploying

Every push to `main` deploys the site, and the news is refreshed once an hour. GitHub stops the hourly run after 60 days without a commit. If that happens, start it again from the Actions tab.

---

Just a joke. Not medical or HR advice, and not connected to any game studio.
