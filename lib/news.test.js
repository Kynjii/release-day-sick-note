import { test } from "node:test";
import assert from "node:assert/strict";
import { decodeEntities, parseFeed, isSafeUrl, isValidArticle, isAboutGta, cleanNews, mergeNews, MAX_ITEMS } from "./news.js";

const item = (fields) => `<item>${Object.entries(fields).map(([k, v]) => `<${k}>${v}</${k}>`).join("")}</item>`;
const feed = (...items) => `<?xml version="1.0"?><rss><channel><title>t-online</title>${items.join("")}</channel></rss>`;
const art = (over = {}) => ({
  title: "GTA 6 ist da",
  url: "https://www.t-online.de/digital/aktuelles/id_1/gta.html",
  summary: "Alles zum Start.",
  date: "2026-11-13T13:34:22.000Z",
  ...over,
});

test("entities are decoded once, never twice", () => {
  assert.equal(decodeEntities("&amp;lt;b&amp;gt;"), "&lt;b&gt;");
  assert.equal(decodeEntities("Tom &amp; Jerry &quot;GTA&quot; &#39;6&#39; &#x2013; &#8364;"), `Tom & Jerry "GTA" '6' – €`);
});

test("bad numeric entities are left alone instead of throwing", () => {
  assert.equal(decodeEntities("&#0;"), "&#0;");
  assert.equal(decodeEntities("&#x110000;"), "&#x110000;");
  assert.equal(decodeEntities("&#99999999999999999999;"), "&#99999999999999999999;");
  assert.equal(decodeEntities("&bogus; &constructor; &__proto__;"), "&bogus; &constructor; &__proto__;");
});

test("parses titles, CDATA, encoded markup and dates from a real-looking feed", () => {
  const items = parseFeed(feed(
    item({ title: "<![CDATA[„GTA 6“ & mehr]]>", link: "https://www.t-online.de/a.html", description: "&lt;p&gt;Text &amp;amp; mehr&lt;/p&gt;", pubDate: "Fri, 13 Nov 2026 13:34:22 GMT" }),
  ));
  assert.deepEqual(items, [{ title: "„GTA 6“ & mehr", url: "https://www.t-online.de/a.html", summary: "Text &amp; mehr", date: "2026-11-13T13:34:22.000Z" }]);
});

test("encoded script tags in a description come out as plain text", () => {
  const [a] = parseFeed(feed(item({ title: "GTA", link: "https://www.t-online.de/a", description: "&lt;script&gt;alert(1)&lt;/script&gt; GTA", pubDate: "Fri, 13 Nov 2026 13:34:22 GMT" })));
  assert.ok(!a.summary.includes("<"));
});

test("an item without a usable date is dropped, not shown as 1970", () => {
  const items = parseFeed(feed(item({ title: "GTA 6", link: "https://www.t-online.de/a", description: "x", pubDate: "soon" })));
  assert.equal(cleanNews(items).length, 0);
});

test("non-feed input gives an empty list", () => {
  for (const bad of [undefined, null, 42, "", "<html>nope</html>", "<items><title>GTA</title></items>"]) {
    assert.deepEqual(parseFeed(bad), []);
  }
});

test("long summaries are shortened at a word boundary with an ellipsis", () => {
  const words = Array.from({ length: 80 }, (_, i) => `wort${i}`).join(" ");
  const [a] = parseFeed(feed(item({ title: "GTA", link: "https://www.t-online.de/a", description: words, pubDate: "Fri, 13 Nov 2026 13:34:22 GMT" })));
  assert.ok(a.summary.length <= 221, `length ${a.summary.length}`);
  assert.ok(a.summary.endsWith("…"));
  assert.ok(words.startsWith(a.summary.slice(0, -1)), "cut mid-word");
  const [b] = parseFeed(feed(item({ title: "GTA", link: "https://www.t-online.de/a", description: "x".repeat(500), pubDate: "Fri, 13 Nov 2026 13:34:22 GMT" })));
  assert.ok(b.summary.length <= 221);
});

test("only https links on t-online itself are allowed", () => {
  assert.ok(isSafeUrl("https://www.t-online.de/digital/a.html"));
  for (const bad of [
    "javascript:alert(1)",
    "http://www.t-online.de/a",
    "https://www.t-online.de.evil.example/a",
    "https://evil.example/www.t-online.de/",
    "https://user:pw@www.t-online.de/a",
    "//www.t-online.de/a",
    "/digital/a.html",
    "data:text/html,hi",
    "",
    null,
    { toString: () => "https://www.t-online.de/" },
  ]) {
    assert.equal(isSafeUrl(bad), false, String(bad));
  }
});

test("articles with missing or wrongly typed fields are rejected", () => {
  for (const bad of [null, undefined, "x", 1, [], art({ title: "  " }), art({ title: 5 }), art({ summary: null }), art({ date: "nope" }), art({ url: "javascript:alert(1)" })]) {
    assert.equal(isValidArticle(bad), false, JSON.stringify(bad));
  }
});

test("matches GTA as a word, not as letters inside German words", () => {
  assert.ok(isAboutGta(art({ title: "„GTA 6“-Release", summary: "" })));
  assert.ok(isAboutGta(art({ title: "Neues", summary: "Fans von GTA-Spielen" })));
  assert.ok(isAboutGta(art({ title: "Grand Theft Auto VI erscheint", summary: "" })));
  assert.ok(!isAboutGta(art({ title: "Wegtauchen am Bergtal", summary: "Zelda und Mario" })));
});

test("cleanNews sorts newest first, removes duplicates and caps the list", () => {
  const list = Array.from({ length: MAX_ITEMS + 3 }, (_, i) => art({ url: `https://www.t-online.de/${i}`, date: `2026-11-${String(i + 1).padStart(2, "0")}T00:00:00.000Z` }));
  list.push({ ...list[list.length - 1], title: "GTA duplicate of the newest" });
  const out = cleanNews(list);
  assert.equal(out.length, MAX_ITEMS);
  assert.equal(out[0].url, `https://www.t-online.de/${MAX_ITEMS + 2}`);
  assert.equal(new Set(out.map(a => a.url)).size, out.length);
  for (let i = 1; i < out.length; i++) assert.ok(out[i - 1].date >= out[i].date);
});

test("cleanNews drops extra fields so nothing unexpected reaches the page", () => {
  const [a] = cleanNews([{ ...art(), html: "<img onerror=alert(1)>" }]);
  assert.deepEqual(Object.keys(a).sort(), ["date", "summary", "title", "url"]);
});

test("cleanNews survives JSON that is not a list", () => {
  for (const bad of [null, undefined, {}, "[]", 0, { length: 2, 0: art() }]) {
    assert.deepEqual(cleanNews(bad), []);
  }
});

test("a fresh feed copy replaces the stored copy of the same article", () => {
  const out = mergeNews([art({ title: "GTA old title" })], [art({ title: "GTA new title" })]);
  assert.deepEqual(out.map(a => a.title), ["GTA new title"]);
});

test("stored articles are kept when they have dropped off the feed", () => {
  const old = art({ url: "https://www.t-online.de/old", date: "2026-11-01T00:00:00.000Z" });
  const out = mergeNews([old], [art()]);
  assert.deepEqual(out.map(a => a.url), [art().url, old.url]);
});

test("a broken previous news.json does not wipe the fresh results", () => {
  for (const prev of [null, "oops", { error: true }]) {
    assert.equal(mergeNews(prev, [art()]).length, 1);
  }
});
