import { FIELDS, SYMPTOMS, TONES, RETURNS } from "./content.js";
import { SOURCES, ALL_SOURCES } from "./news/news.js";
import { t } from "./i18n/index.js";

const LISTS = { field: FIELDS, symptom: SYMPTOMS, tone: TONES, ret: RETURNS };

// Text for a data-label="kind:id" reference, e.g. "symptom:fever". Used when the page is built
// and again when the visitor switches language, so both always agree.
export function labelFor(ref, lang) {
  const parts = typeof ref === "string" ? ref.split(":") : [];
  if (parts.length !== 2) return "";
  const [kind, id] = parts;
  if (kind === "src") return id === ALL_SOURCES ? t(lang, "allSources") : SOURCES[id]?.label ?? "";
  const item = Object.hasOwn(LISTS, kind) ? LISTS[kind].find(i => i.id === id) : undefined;
  return item ? item.text[lang].label : "";
}
