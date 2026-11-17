import de from "./de.js";
import en from "./en.js";

// Order here is the order of the language buttons.
export const LANGS = {
  en: { label: "EN", locale: "en-GB", and: "and", strings: en },
  de: { label: "DE", locale: "de-DE", and: "und", strings: de },
};
export const DEFAULT_LANG = "de";

// Attributes filled from the strings: data-i18n-aria="key" sets aria-label, and so on.
export const I18N_ATTRS = { aria: "aria-label", content: "content" };

export const isLang = code => typeof code === "string" && Object.hasOwn(LANGS, code);

export function t(lang, key) {
  const strings = LANGS[lang].strings;
  if (!Object.hasOwn(strings, key)) throw new Error(`Missing ${lang} text: ${key}`);
  return strings[key];
}
