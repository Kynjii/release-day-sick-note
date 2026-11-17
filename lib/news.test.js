import { test } from "node:test";
import assert from "node:assert/strict";
import { decodeEntities, parseFeed, sourceOf, articleKey, isValidArticle, isAboutGta, cleanNews, mergeNews, SOURCES, MAX_ITEMS } from "./news.js";

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

test("links map to their source, and only https links on a source's own host count", () => {
  assert.equal(sourceOf("https://www.t-online.de/digital/a.html"), "tonline");
  assert.equal(sourceOf("https://www.giga.de/spiele/gta-6/news/x"), "giga");
  assert.equal(sourceOf("HTTPS://WWW.GIGA.DE/x"), "giga");
  for (const bad of [
    "javascript:alert(1)",
    "http://www.t-online.de/a",
    "http://www.giga.de/a",
    "https://www.t-online.de.evil.example/a",
    "https://www.giga.de.evil.example/a",
    "https://evil.example/www.giga.de/",
    "https://user:pw@www.t-online.de/a",
    "//www.giga.de/a",
    "/digital/a.html",
    "data:text/html,hi",
    "https://constructor/",
    "https://__proto__/",
    "",
    null,
    { toString: () => "https://www.t-online.de/" },
  ]) {
    assert.equal(sourceOf(bad), null, String(bad));
  }
});

test("every source's home page is a link that maps back to that source", () => {
  for (const [id, s] of Object.entries(SOURCES)) {
    assert.equal(sourceOf(s.home), id);
    for (const feed of s.feeds) assert.equal(sourceOf(feed), id, feed);
  }
});

test("each source keeps its own newest articles even when another source is busier", () => {
  const tonline = Array.from({ length: MAX_ITEMS + 4 }, (_, i) => art({ url: `https://www.t-online.de/${i}`, date: `2026-11-1${i % 10}T0${i % 10}:00:00.000Z` }));
  const giga = [1, 2, 3].map(i => art({ url: `https://www.giga.de/gta-${i}`, date: `2026-10-0${i}T00:00:00.000Z` }));
  const out = cleanNews([...tonline, ...giga]);
  assert.equal(out.filter(a => sourceOf(a.url) === "tonline").length, MAX_ITEMS);
  assert.equal(out.filter(a => sourceOf(a.url) === "giga").length, 3);
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

// t-online and GIGA change an article's link when they edit its headline; the ID in the link stays.
const renamedTonline = {
  old: art({ title: "GTA VI entgeht Verbot in Südkorea nur knapp – der Grund überrascht", date: "2026-11-15T09:00:00.000Z",
    url: "https://www.t-online.de/digital/aktuelles/id_101528244/gta-vi-entgeht-verbot-in-suedkorea-nur-knapp-der-grund-ueberrascht.html" }),
  new: art({ title: "Grand Theft Auto 6 entgeht Verbot in Südkorea nur knapp", date: "2026-11-17T08:00:00.000Z",
    url: "https://www.t-online.de/digital/aktuelles/id_101528244/grand-theft-auto-6-entgeht-verbot-in-suedkorea-nur-knapp.html" }),
};
const renamedGiga = {
  old: art({ title: "GTA 6: Songliste geleakt", date: "2026-11-15T09:00:00.000Z",
    url: "https://www.giga.de/games/gta-6-songliste-geleakt--01KT1MQE8301Z8QCC9FC8DNMDD" }),
  new: art({ title: "GTA 6: Komplette Songliste geleakt", date: "2026-11-16T09:00:00.000Z",
    url: "https://www.giga.de/games/gta-6-komplette-songliste-geleakt-alles-zu-soundtrack--01KT1MQE8301Z8QCC9FC8DNMDD" }),
};

test("a renamed t-online article is listed once, with the fresh headline", () => {
  const out = mergeNews([renamedTonline.old], [renamedTonline.new]);
  assert.deepEqual(out.map(a => a.title), [renamedTonline.new.title]);
});

test("a renamed GIGA article is listed once, with the fresh headline", () => {
  const out = mergeNews([renamedGiga.old], [renamedGiga.new]);
  assert.deepEqual(out.map(a => a.title), [renamedGiga.new.title]);
});

test("both copies already stored (the live list today) collapse to the newer one", () => {
  const out = mergeNews([renamedTonline.new, renamedTonline.old, renamedGiga.new, renamedGiga.old], []);
  assert.deepEqual(out.map(a => a.title).sort(), [renamedTonline.new.title, renamedGiga.new.title].sort());
});

test("tracking parameters and fragments do not make an article look new", () => {
  const out = cleanNews([
    renamedGiga.new,
    { ...renamedGiga.new, url: renamedGiga.new.url + "?utm_source=rss#top" },
    { ...renamedTonline.new, url: renamedTonline.new.url + "?ref=feed" },
    renamedTonline.new,
  ]);
  assert.equal(out.length, 2);
});

test("different articles are never merged, even with the same number on another site", () => {
  assert.notEqual(articleKey("https://www.t-online.de/a/id_1/x.html"), articleKey("https://www.t-online.de/a/id_2/x.html"));
  assert.notEqual(articleKey("https://www.t-online.de/a/id_1/x.html"), articleKey("https://www.t-online.de/a/id_11/x.html"));
  assert.notEqual(articleKey("https://www.giga.de/a--01KT1MQE8301Z8QCC9FC8DNMDD"), articleKey("https://www.giga.de/a--01KT1MQE8301Z8QCC9FC8DNMDE"));
  assert.notEqual(articleKey("https://www.t-online.de/a/id_101528244/x.html"), articleKey("https://www.giga.de/a/id_101528244/x"));
  assert.match(articleKey("https://www.t-online.de/a/id_101528244/x.html"), /^tonline:/);
  assert.match(articleKey("https://www.giga.de/a--01KT1MQE8301Z8QCC9FC8DNMDD"), /^giga:/);
});

test("links without an ID still work and are only merged when identical", () => {
  const a = art({ url: "https://www.giga.de/spiele/gta-6/" });
  const b = art({ url: "https://www.giga.de/spiele/gta-6/news/" });
  assert.equal(cleanNews([a, b]).length, 2);
  assert.equal(cleanNews([a, { ...a }]).length, 1);
  for (const bad of [null, undefined, "", "not a url", "javascript:alert(1)"]) assert.doesNotThrow(() => articleKey(bad));
});

test("every source defines how to find the article ID in its links", () => {
  for (const [id, s] of Object.entries(SOURCES)) assert.ok(s.articleId instanceof RegExp, id);
});

test("when the feeds disagree, the most recently updated copy of an article wins", () => {
  const out = mergeNews([], [renamedTonline.old, renamedTonline.new]);
  assert.deepEqual(out.map(a => a.title), [renamedTonline.new.title]);
});
