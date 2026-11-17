# Release Day Sick Note

A joke website for calling in sick on the day GTA 6 comes out. You pick your symptoms, how much effort you want to put in and when you'll be back, and it writes the sick email for you. It's in German, with an English option.

Live: https://kynjii.github.io/release-day-sick-note/

## The news section

The page also lists recent GTA 6 articles from t-online and GIGA. Once an hour, a GitHub Action reads both sites' RSS feeds and saves the GTA articles to `news.json`, which the page loads. Each site keeps its 8 newest articles. If the feeds can't be reached, the site keeps the last list it had.

The sites and their feeds are listed in `lib/news.js`. To add a site, add it there.

## Running it locally

```bash
npm test
npm run news
python -m http.server 8000
```

`npm run news` downloads the latest articles into `news.json`. Then open http://localhost:8000.

## Deploying

Every push to `main` deploys the site, and the news is refreshed once an hour. GitHub stops the hourly run after 60 days without a commit. If that happens, start it again from the Actions tab.

---

Just a joke. Not medical or HR advice, and not connected to any game studio.
