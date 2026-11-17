import { test } from "node:test";
import assert from "node:assert/strict";
import de from "./de.js";
import en from "./en.js";
import { LANGS, DEFAULT_LANG, I18N_ATTRS, isLang, t } from "./index.js";

test("de and en define exactly the same keys", () => {
  const missingInDe = Object.keys(en).filter(k => !Object.hasOwn(de, k));
  const missingInEn = Object.keys(de).filter(k => !Object.hasOwn(en, k));
  assert.deepEqual(missingInDe, [], "keys missing in de.js");
  assert.deepEqual(missingInEn, [], "keys missing in en.js");
});

test("every key has the same type (text or function) in both languages", () => {
  for (const key of Object.keys(en)) assert.equal(typeof de[key], typeof en[key], key);
});

test("every key is either non-empty text or a function that returns non-empty text", () => {
  for (const [code, { strings }] of Object.entries(LANGS)) for (const [key, value] of Object.entries(strings)) {
    if (typeof value === "function") {
      const out = value("X");
      assert.equal(typeof out, "string", `${code}.${key}`);
      assert.ok(out.trim() !== "", `${code}.${key}`);
    } else {
      assert.equal(typeof value, "string", `${code}.${key}`);
      assert.ok(value.trim() !== "", `${code}.${key}`);
    }
  }
});

test("function texts put their argument into the result in both languages", () => {
  for (const [code, { strings }] of Object.entries(LANGS)) for (const [key, value] of Object.entries(strings)) {
    if (typeof value === "function") assert.ok(value("Zorblax").includes("Zorblax"), `${code}.${key}`);
  }
});

test("each language has a label, a locale, an 'and' word and a strings object; the default exists", () => {
  for (const [code, l] of Object.entries(LANGS)) {
    for (const field of ["label", "locale", "and"]) assert.ok(typeof l[field] === "string" && l[field], `${code}.${field}`);
    assert.equal(typeof l.strings, "object");
    assert.doesNotThrow(() => new Intl.Locale(l.locale));
  }
  assert.ok(isLang(DEFAULT_LANG));
  assert.deepEqual(Object.keys(LANGS).sort(), ["de", "en"]);
});

test("t returns the language's own text", () => {
  assert.equal(t("en", "title"), en.title);
  assert.equal(t("de", "title"), de.title);
  assert.equal(t("en", "copy"), "Copy email");
  assert.equal(typeof t("en", "countdown"), "function");
});

test("t throws a clear error on a missing key, including keys that only exist on Object.prototype", () => {
  for (const key of ["nope", "", "__proto__", "constructor", "toString", "hasOwnProperty", "valueOf", "Title", undefined, null]) {
    assert.throws(() => t("en", key), /Missing en text/, String(key));
    assert.throws(() => t("de", key), /Missing de text/, String(key));
  }
});

test("t throws for an unknown language", () => {
  for (const lang of ["fr", "", undefined, null]) assert.throws(() => t(lang, "title"), String(lang));
});

test("isLang accepts real codes and nothing else", () => {
  assert.equal(isLang("en"), true);
  assert.equal(isLang("de"), true);
  const bad = ["__proto__", "constructor", "toString", "hasOwnProperty", "EN", "en ", "en-GB", "fr", "", null, undefined, 0, 1, true, {}, [], ["en"], { toString: () => "en" }];
  for (const value of bad) assert.equal(isLang(value), false, String(value));
});

test("I18N_ATTRS maps each data-i18n-* suffix to a real attribute name", () => {
  assert.deepEqual(I18N_ATTRS, { aria: "aria-label", content: "content" });
});
