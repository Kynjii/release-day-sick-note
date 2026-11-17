import { DEFAULT_LANG, I18N_ATTRS, isLang, t } from "./i18n/index.js";
import { FIELDS, RELEASE } from "./content.js";
import { buildEmail, scoreOf, scoreLevel, meterWidth, verdictOf } from "./email.js";
import { timeLeft, countdownNote } from "./countdown.js";
import { labelFor } from "./labels.js";
import { cleanNews, NEWS_FILTERS, ALL_SOURCES } from "./news/news.js";
import { renderNews } from "./news/view.js";
import { load, save } from "./storage.js";

const LANG_KEY = "sick-note-lang";
const SOURCE_KEY = "sick-note-source";
const $ = id => document.getElementById(id);
const form = $("note");

// The HTML arrives in DEFAULT_LANG with the example filled in; everything below keeps it in step.
let lang = DEFAULT_LANG;
let news = null;
let newsFilter = ALL_SOURCES;

function readForm() {
  const data = new FormData(form);
  return {
    ...Object.fromEntries(FIELDS.map(f => [f.id, data.get(f.id)])),
    symptoms: data.getAll("symptom"),
    tone: data.get("tone"),
    ret: data.get("ret"),
    ps: data.get("ps") !== null,
  };
}

function showEmail() {
  const state = readForm();
  const { subject, body } = buildEmail(state, lang);
  const score = scoreOf(state);
  $("subject").textContent = subject;
  $("body").textContent = body;
  $("score").textContent = `${score}%`;
  $("bar").dataset.level = scoreLevel(score);
  $("bar").firstElementChild.style.width = meterWidth(score);
  $("verdict").textContent = verdictOf(score, lang);
}

function showCountdown() {
  const left = timeLeft(RELEASE, Date.now());
  const pad = n => String(n).padStart(2, "0");
  $("cd-d").textContent = left.days;
  $("cd-h").textContent = pad(left.hours);
  $("cd-m").textContent = pad(left.minutes);
  $("cd-s").textContent = pad(left.seconds);
  $("cd-note").textContent = countdownNote(lang, Date.now());
}

const showNews = () => renderNews($("news-list"), news, newsFilter, lang);

function setLang(next) {
  const prev = lang;
  lang = isLang(next) ? next : DEFAULT_LANG;
  document.documentElement.lang = lang;

  // Only swap the example text, never what the visitor typed
  for (const f of FIELDS) {
    const input = form.elements[f.id];
    if (input.value === f.text[prev].example) input.value = f.text[lang].example;
  }

  document.querySelectorAll("[data-i18n]").forEach(node => { node.textContent = t(lang, node.dataset.i18n); });
  for (const [suffix, attr] of Object.entries(I18N_ATTRS)) {
    document.querySelectorAll(`[data-i18n-${suffix}]`).forEach(node => {
      node.setAttribute(attr, t(lang, node.getAttribute(`data-i18n-${suffix}`)));
    });
  }
  document.querySelectorAll("[data-label]").forEach(node => { node.textContent = labelFor(node.dataset.label, lang); });
  document.querySelectorAll("#lang [data-lang]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.lang === lang)));

  save(LANG_KEY, lang);
  showCountdown();
  showEmail();
  showNews();
}

let toastTimer;
function toast(message) {
  $("toast").textContent = message;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { $("toast").textContent = ""; }, 2400);
}

function copyEmail() {
  const text = `${t(lang, "subject")}: ${$("subject").textContent}\n\n${$("body").textContent}`;
  const selectInstead = () => {
    const range = document.createRange();
    range.selectNodeContents($("body"));
    getSelection().removeAllRanges();
    getSelection().addRange(range);
    toast(t(lang, "selected"));
  };
  try {
    navigator.clipboard.writeText(text).then(() => toast(t(lang, "copied")), selectInstead);
  } catch {
    selectInstead();
  }
}

function shuffle() {
  const random = list => list[Math.floor(Math.random() * list.length)];
  form.querySelectorAll('input[name="symptom"]').forEach(box => { box.checked = Math.random() < 0.4; });
  for (const name of ["tone", "ret"]) random(form.querySelectorAll(`input[name="${name}"]`)).checked = true;
  form.elements.ps.checked = Math.random() < 0.5;
  showEmail();
  toast(t(lang, "shuffled"));
}

async function loadNews() {
  try {
    const res = await fetch("news.json", { cache: "no-cache" });
    news = res.ok ? cleanNews(await res.json()) : [];
  } catch {
    news = [];
  }
  showNews();
}

form.addEventListener("input", showEmail);
form.addEventListener("change", showEmail);
form.addEventListener("submit", e => e.preventDefault());
// Browsers can restore form values on back/forward navigation without firing input events
window.addEventListener("pageshow", showEmail);
$("copy").addEventListener("click", copyEmail);
$("shuffle").addEventListener("click", shuffle);
$("lang").addEventListener("click", e => {
  const button = e.target.closest("[data-lang]");
  if (button && button.dataset.lang !== lang) setLang(button.dataset.lang);
});
$("news-source").addEventListener("change", e => {
  if (!NEWS_FILTERS.includes(e.target.value)) return;
  newsFilter = e.target.value;
  save(SOURCE_KEY, newsFilter);
  showNews();
});

const savedFilter = load(SOURCE_KEY);
if (NEWS_FILTERS.includes(savedFilter)) {
  newsFilter = savedFilter;
  $(`src-${newsFilter}`).checked = true;
}
setLang(load(LANG_KEY));
loadNews();
setInterval(showCountdown, 1000);
