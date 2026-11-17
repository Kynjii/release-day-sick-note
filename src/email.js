import { SYMPTOMS, TONES, RETURNS, VERDICTS, PS_COST } from "./content.js";
import { LANGS, t } from "./i18n/index.js";

// A form state looks like exampleState() in content.js. Values may come straight from the
// form, so anything missing or unknown falls back to a default instead of throwing.

const text = value => (typeof value === "string" ? value.trim() : "");
const pick = (items, id) => items.find(item => item.id === id) ?? items[0];
const pickedSymptoms = state => {
  const ids = Array.isArray(state.symptoms) ? state.symptoms : [];
  return SYMPTOMS.filter(s => ids.includes(s.id));
};

export function joinList(parts, lang) {
  if (parts.length <= 1) return parts.join("");
  return `${parts.slice(0, -1).join(", ")} ${LANGS[lang].and} ${parts.at(-1)}`;
}

export function buildEmail(state, lang) {
  const name = text(state.name) || t(lang, "fallbackName");
  const boss = text(state.boss) || t(lang, "fallbackBoss");
  const cover = text(state.cover);
  const symptoms = pickedSymptoms(state);
  const tone = pick(TONES, state.tone).text[lang];

  const paragraphs = [tone.open(boss)];
  const symptomLine = symptoms.length ? tone.syms(joinList(symptoms.map(s => s.text[lang].line), lang)) : tone.none;
  if (symptomLine) paragraphs.push(symptomLine);
  if (cover) paragraphs.push(t(lang, "cover")(cover));
  paragraphs.push(pick(RETURNS, state.ret).text[lang].line);
  paragraphs.push(`${tone.sign}\n${name}`);
  if (state.ps === true) paragraphs.push(t(lang, "ps"));

  return { subject: tone.subject(name), body: paragraphs.join("\n\n") };
}

export function scoreOf(state) {
  const cost = pickedSymptoms(state).reduce((sum, s) => sum + s.cost, 0)
    + pick(TONES, state.tone).cost
    + pick(RETURNS, state.ret).cost
    + (state.ps === true ? PS_COST : 0);
  return Math.max(0, Math.min(100, 100 - cost));
}

// Drives the meter colour in CSS.
export function scoreLevel(score) {
  return score >= 60 ? "good" : score >= 30 ? "fair" : "poor";
}

// The meter never shrinks to nothing, so a 0% score still shows a sliver of colour.
export const meterWidth = score => `${Math.max(score, 3)}%`;

export function verdictOf(score, lang) {
  return VERDICTS.find(v => score >= v.min).text[lang];
}
