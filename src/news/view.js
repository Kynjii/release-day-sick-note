import { el } from "../dom.js";
import { LANGS, t } from "../i18n/index.js";
import { SOURCES, ALL_SOURCES, sourceOf, siteOf } from "./news.js";

const external = (props, ...children) => el("a", { target: "_blank", rel: "noopener noreferrer", ...props }, ...children);

// news is null while loading and an empty list if loading failed.
export function renderNews(list, news, filter, lang) {
  if (news === null) {
    list.replaceChildren(el("li", { className: "news-status" }, t(lang, "newsLoading")));
    return;
  }

  const items = filter === ALL_SOURCES ? news : news.filter(a => sourceOf(a.url) === filter);
  if (items.length === 0) {
    const ids = filter === ALL_SOURCES ? Object.keys(SOURCES) : [filter];
    const links = ids.flatMap((id, i) => [i ? " · " : "", external({ href: SOURCES[id].home }, t(lang, "newsLink")(siteOf(id)))]);
    list.replaceChildren(el("li", { className: "news-status" }, t(lang, "newsEmpty"), " ", ...links));
    return;
  }

  const date = new Intl.DateTimeFormat(LANGS[lang].locale, { day: "numeric", month: "long", year: "numeric" });
  list.replaceChildren(...items.map(a => el("li", {},
    external({ className: "news-item", href: a.url },
      el("time", { className: "tag", dateTime: a.date }, date.format(new Date(a.date))),
      el("span", { lang: "de" },
        el("span", { className: "headline" }, a.title), el("br"),
        el("span", { className: "note" }, a.summary)),
      el("span", { className: "src" }, t(lang, "source")(siteOf(sourceOf(a.url))))))));
}
