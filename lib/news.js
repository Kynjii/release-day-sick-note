// News helpers used by both the page and the update script.

// A source's article links must be on the same host as its home page.
// articleId finds the article's ID in a link. Sites change the rest of the link when they edit a headline.
export const SOURCES = {
  tonline: {
    label: "T-Online",
    home: "https://www.t-online.de/digital/gaming/",
    articleId: /\/id_(\d+)\//,
    feeds: [
      "https://www.t-online.de/themen/rockstar-games/feed.rss",
      "https://www.t-online.de/digital/aktuelles/feed.rss",
      "https://www.t-online.de/digital/gaming/feed.rss",
      "https://www.t-online.de/digital/feed.rss",
    ],
  },
  giga: {
    label: "GIGA",
    home: "https://www.giga.de/spiele/gta-6/",
    articleId: /--([0-9A-Z]{26})\/?$/,
    feeds: [
      "https://www.giga.de/feed/spiele/gta-6/",
      "https://www.giga.de/feed/games/",
    ],
  },
};
export const MAX_ITEMS = 8; // per source
const MAX_SUMMARY = 220;
const TOPIC = /\bGTA\b|Grand Theft Auto/i;
const SOURCE_BY_HOST = Object.fromEntries(Object.entries(SOURCES).map(([id, s]) => [new URL(s.home).host, id]));

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

// Decode in one pass so "&amp;lt;" becomes "&lt;", not "<".
export function decodeEntities(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code) => {
    if (code[0] === "#") {
      const n = code[1] === "x" || code[1] === "X" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isInteger(n) && n > 0 && n <= 0x10FFFF ? String.fromCodePoint(n) : match;
    }
    return Object.hasOwn(ENTITIES, code.toLowerCase()) ? ENTITIES[code.toLowerCase()] : match;
  });
}

function tagText(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, "i"));
  if (!m) return "";
  const cdata = m[1].match(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/);
  const raw = cdata ? cdata[1] : decodeEntities(m[1]);
  return raw.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function shorten(text, max) {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const space = cut.lastIndexOf(" ");
  return (space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,.;:–-]+$/, "") + "…";
}

// Which source an https link belongs to, or null if it isn't on a known site.
export function sourceOf(url) {
  if (typeof url !== "string") return null;
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" || u.username || u.password) return null;
    return Object.hasOwn(SOURCE_BY_HOST, u.host) ? SOURCE_BY_HOST[u.host] : null;
  } catch {
    return null;
  }
}

// The same key for every version of an article: "source:ID", or the link itself if it has no ID.
export function articleKey(url) {
  const id = sourceOf(url);
  if (id === null) return String(url);
  const m = new URL(url).pathname.match(SOURCES[id].articleId);
  return m ? `${id}:${m[1]}` : url;
}

// news.json comes from the network, so check every field before using it.
export function isValidArticle(a) {
  return a !== null && typeof a === "object"
    && typeof a.title === "string" && a.title.trim() !== ""
    && typeof a.summary === "string"
    && typeof a.date === "string" && !Number.isNaN(Date.parse(a.date))
    && sourceOf(a.url) !== null;
}

export function isAboutGta(a) {
  return TOPIC.test(`${a.title} ${a.summary}`);
}

export function parseFeed(xml) {
  if (typeof xml !== "string") return [];
  const items = [];
  for (const [, body] of xml.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item>/gi)) {
    const time = Date.parse(tagText(body, "pubDate"));
    items.push({
      title: tagText(body, "title"),
      url: tagText(body, "link"),
      summary: shorten(tagText(body, "description"), MAX_SUMMARY),
      date: Number.isNaN(time) ? "" : new Date(time).toISOString(),
    });
  }
  return items;
}

// GTA articles, newest first, up to `max` per source. If an article appears more than once,
// keep the most recently updated copy (on a tie, the first one).
export function cleanNews(list, max = MAX_ITEMS) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  const perSource = {};
  return list
    .filter(a => isValidArticle(a) && isAboutGta(a))
    .map(({ title, url, summary, date }) => ({ title, url, summary, date }))
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
    .filter(a => {
      const key = articleKey(a.url);
      return !seen.has(key) && seen.add(key);
    })
    .filter(a => {
      const id = sourceOf(a.url);
      perSource[id] = (perSource[id] ?? 0) + 1;
      return perSource[id] <= max;
    });
}

// Fresh items go first so they win a tie with the stored copy.
export function mergeNews(previous, fresh, max = MAX_ITEMS) {
  return cleanNews([...(Array.isArray(fresh) ? fresh : []), ...(Array.isArray(previous) ? previous : [])], max);
}
