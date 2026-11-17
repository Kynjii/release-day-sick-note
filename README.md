# Release Day Sick Note

GTA 6 comes out and you have work. This site writes the sick email for you.

**Open it here:** https://kynjii.github.io/release-day-sick-note/

## How it works

1. Enter your name, your manager's name and the coworker who will "kindly" cover for you.
2. Pick your symptoms, from Vice City Fever to Brain buffering. Every symptom makes the email less believable, and the number next to it shows by how much.
3. Choose a tone, from Professional to Barely trying.
4. Say when you'll be back, anywhere from Tomorrow to At 100% completion. The longer you're off, the more suspicious it looks.

The email updates as you go, along with a believability score that tells you how likely HR is to buy it. When you're happy, press **Copy email** and paste it into your mail app. If you can't decide, **Random diagnosis** picks for you. You can also tick the box to add a P.S. that quietly tips off your coworkers.

## Also on the page

- A countdown to release day, based on the last announced date.
- The latest GTA 6 news from t-online and GIGA, refreshed every hour. Use the tabs to see one site or both. The articles are in German and open in a new tab.
- The page is in German by default. Use the EN button at the top to switch to English. The site remembers your choice next time.

Your email is put together in your browser. Nothing you type is sent anywhere or saved. The site counts visits with [GoatCounter](https://www.goatcounter.com/), which uses no cookies and collects no personal data.

## Please don't actually send it

This is a joke. It's not medical or HR advice, and it has nothing to do with Rockstar Games or any other game studio. If you do send it, good luck.

## For developers

You need Node 22.12 or newer.

```bash
npm install
npm run news
npm run dev
```

`npm run news` downloads the latest articles, and `npm run dev` starts the site at http://localhost:5173. `npm test` runs the tests, and `npm run build` builds the site into `dist/`.

The page text is in `src/i18n/`, and the symptoms, tones and points are in `src/content.js`. The news sites and their feeds are listed in `src/news/news.js`.
