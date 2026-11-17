// Builds news.json from the RSS feeds and keeps articles that are already on the live site.
// Usage: node scripts/update-news.js <output file> [URL of the live news.json]
import { writeFile } from "node:fs/promises";
import { SOURCES, parseFeed, mergeNews } from "../lib/news.js";

const [out = "news.json", previousUrl] = process.argv.slice(2);
const TIMEOUT_MS = 20_000;
const FEEDS = Object.values(SOURCES).flatMap(s => s.feeds);

async function get(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS), headers: { "user-agent": "release-day-sick-note-news/1.0" } });
  if (!res.ok) throw new Error(`${url} answered ${res.status}`);
  return res;
}

const results = await Promise.allSettled(FEEDS.map(async url => parseFeed(await (await get(url)).text())));
results.filter(r => r.status === "rejected").forEach(r => console.warn("Feed failed:", r.reason.message));
const fresh = results.filter(r => r.status === "fulfilled").flatMap(r => r.value);
if (results.every(r => r.status === "rejected")) {
  // Stop here so the live site keeps its current list.
  console.error("Every feed failed; not publishing.");
  process.exit(1);
}

let previous = [];
if (previousUrl) {
  try {
    previous = await (await get(previousUrl)).json();
  } catch (e) {
    console.warn(`No previous news from ${previousUrl}: ${e.message}`);
  }
}

const news = mergeNews(previous, fresh);
await writeFile(out, JSON.stringify(news, null, 2) + "\n");
console.log(`Wrote ${news.length} articles to ${out} (${fresh.length} feed items, ${Array.isArray(previous) ? previous.length : 0} previous).`);
