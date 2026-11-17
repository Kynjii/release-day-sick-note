// Runs at build time (and in the dev server): fills index.html with the default language's
// text and the form controls, so the page is complete before any JavaScript runs.
import { LANGS, DEFAULT_LANG, I18N_ATTRS, t } from "../i18n/index.js";
import { FIELDS, SYMPTOMS, TONES, RETURNS, exampleState } from "../content.js";
import { NEWS_FILTERS, ALL_SOURCES } from "../news/news.js";
import { buildEmail, scoreOf, scoreLevel, meterWidth, verdictOf } from "../email.js";
import { countdownNote } from "../countdown.js";
import { labelFor } from "../labels.js";

const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
export const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ESCAPES[c]);

const label = (ref, lang, className = "") =>
  `<span${className ? ` class="${className}"` : ""} data-label="${escapeHtml(ref)}">${escapeHtml(labelFor(ref, lang))}</span>`;
const checked = on => (on ? " checked" : "");

function langButtons(lang) {
  return Object.entries(LANGS).map(([code, l]) =>
    `<button type="button" data-lang="${code}" lang="${code}" aria-pressed="${code === lang}">${escapeHtml(l.label)}</button>`).join("");
}

function fields(state, lang) {
  return FIELDS.map(f => `<label class="field" for="f-${f.id}">${label(`field:${f.id}`, lang)}`
    + `<input type="text" id="f-${f.id}" name="${f.id}" value="${escapeHtml(state[f.id])}" autocomplete="off"></label>`).join("");
}

function symptoms(state, lang) {
  return SYMPTOMS.map(s => `<label class="sym" for="s-${s.id}">`
    + `<input type="checkbox" id="s-${s.id}" name="symptom" value="${s.id}"${checked(state.symptoms.includes(s.id))}>`
    + `<span class="row"><span class="box" aria-hidden="true"></span>`
    + `<span class="text"><span class="code">${escapeHtml(s.code)}</span>${label(`symptom:${s.id}`, lang, "name")}</span>`
    + `<span class="cost">−${s.cost}</span></span></label>`).join("");
}

// Radio buttons drawn as chips or tabs. `kind` is the data-label prefix for the item's text.
function choices(name, ids, selected, lang, kind) {
  return ids.map(id => `<label for="${name}-${id}">`
    + `<input type="radio" name="${name}" id="${name}-${id}" value="${id}"${checked(id === selected)}>`
    + `${label(`${kind}:${id}`, lang)}</label>`).join("");
}

function meter(score, lang) {
  return `<div class="meter-top"><span class="meter-label" data-i18n="believability"></span>`
    + `<span class="meter-num" id="score">${score}%</span></div>`
    + `<div class="bar" id="bar" data-level="${scoreLevel(score)}"><i style="width: ${meterWidth(score)}"></i></div>`
    + `<p class="verdict" id="verdict">${escapeHtml(verdictOf(score, lang))}</p>`;
}

export function renderPage(html, lang = DEFAULT_LANG, now = Date.now()) {
  const state = exampleState(lang);
  const email = buildEmail(state, lang);
  const parts = {
    langs: langButtons(lang),
    fields: fields(state, lang),
    symptoms: symptoms(state, lang),
    tones: choices("tone", TONES.map(i => i.id), state.tone, lang, "tone"),
    returns: choices("ret", RETURNS.map(i => i.id), state.ret, lang, "ret"),
    sources: choices("src", NEWS_FILTERS, ALL_SOURCES, lang, "src"),
    meter: meter(scoreOf(state), lang),
    subject: escapeHtml(email.subject),
    body: escapeHtml(email.body),
    countdownNote: escapeHtml(countdownNote(lang, now)),
  };
  const text = key => {
    const value = t(lang, key);
    if (typeof value !== "string") throw new Error(`"${key}" is not plain text and can't be used in the page`);
    return escapeHtml(value);
  };

  let out = html.replace(/<!--\s*render:(.*?)\s*-->/g, (_, key) => {
    if (!Object.hasOwn(parts, key)) throw new Error(`Unknown placeholder: render:${key}`);
    return parts[key];
  });
  out = out.replace(/<([a-z][a-z0-9]*)\b([^>]*\sdata-i18n="([^"]+)"[^>]*)><\/\1>/g,
    (_, tag, attrs, key) => `<${tag}${attrs}>${text(key)}</${tag}>`);
  for (const [suffix, attr] of Object.entries(I18N_ATTRS)) {
    out = out.replace(new RegExp(`\\sdata-i18n-${suffix}="([^"]+)"`, "g"), (match, key) => `${match} ${attr}="${text(key)}"`);
  }
  return out.replace(/(<html\b[^>]*?\slang=")[^"]*"/, `$1${lang}"`);
}
