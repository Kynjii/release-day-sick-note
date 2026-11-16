// Pure news helpers shared by the page (browser) and the update script (Node).

export const FEEDS = [
  "https://www.t-online.de/themen/rockstar-games/feed.rss",
  "https://www.t-online.de/digital/aktuelles/feed.rss",
  "https://www.t-online.de/digital/gaming/feed.rss",
  "https://www.t-online.de/digital/feed.rss",
];
export const NEWS_HOME = "https://www.t-online.de/digital/gaming/";
export const MAX_ITEMS = 8;
const MAX_SUMMARY = 220;
const ALLOWED_HOST = new URL(NEWS_HOME).host;
const TOPIC = /\bGTA\b|Grand Theft Auto/i;

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

// Single pass, so "&amp;lt;" becomes "&lt;" and not "<".
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

export function isSafeUrl(url) {
  if (typeof url !== "string") return false;
  try {
    const u = new URL(url);
    return u.protocol === "https:" && u.host === ALLOWED_HOST && !u.username && !u.password;
  } catch {
    return false;
  }
}

// An article is usable only if every field is the right type and the link stays on t-online.
export function isValidArticle(a) {
  return a !== null && typeof a === "object"
    && typeof a.title === "string" && a.title.trim() !== ""
    && typeof a.summary === "string"
    && typeof a.date === "string" && !Number.isNaN(Date.parse(a.date))
    && isSafeUrl(a.url);
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

// Valid GTA articles, one per URL (the first one listed wins), newest first.
export function cleanNews(list, max = MAX_ITEMS) {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  return list
    .filter(a => isValidArticle(a) && isAboutGta(a))
    .filter(a => !seen.has(a.url) && seen.add(a.url))
    .map(({ title, url, summary, date }) => ({ title, url, summary, date }))
    .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
    .slice(0, max);
}

// Fresh feed items take precedence over the previously published copy of the same article.
export function mergeNews(previous, fresh, max = MAX_ITEMS) {
  return cleanNews([...(Array.isArray(fresh) ? fresh : []), ...(Array.isArray(previous) ? previous : [])], max);
}
