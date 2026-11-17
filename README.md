# Release Day Sick Note

A joke page for calling in sick on GTA 6 release day. Pick your symptoms, choose a tone and a return date, and copy an email that HR will absolutely believe. German by default, with an English switch.

**Live site:** https://kynjii.github.io/release-day-sick-note/

## How it works

- `index.html` is the whole page. No build step, no dependencies.
- The "Latest on GTA 6" section reads `news.json`, built from the RSS feeds of t-online (Rockstar Games topic, digital, digital news, gaming) and GIGA (GTA 6 topic, games). Only articles about GTA are kept, newest first, up to 8 per source. Tabs above the list show all sources together (default) or one at a time; the choice is remembered.
- Sources, their feeds and the hosts their links may point to are all defined in `SOURCES` in `lib/news.js`. To add a source, add an entry there.
- `.github/workflows/deploy.yml` deploys the site to GitHub Pages on every push to `main` and once an hour. Each run fetches the feeds, merges them with the `news.json` already live (so articles stay listed after they drop off the feeds), and publishes the result. If every feed fails, the run stops and the live site keeps its current list.
- `lib/news.js` holds the parsing and filtering rules. The page uses the same file to check `news.json` before showing it.

## Run locally

```bash
npm test
npm run news
python -m http.server 8000
```

`npm run news` writes `news.json` next to `index.html` (it's git-ignored). Then open http://localhost:8000.

GitHub pauses scheduled workflows in public repos after 60 days without commits. Run the workflow by hand from the Actions tab, or push any commit, to start it again.

Not medical advice, not HR advice, and not affiliated with any game studio.
