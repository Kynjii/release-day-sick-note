import { test } from "node:test";
import assert from "node:assert/strict";
import { labelFor } from "./labels.js";
import { FIELDS, SYMPTOMS, TONES, RETURNS } from "./content.js";
import { SOURCES, ALL_SOURCES, NEWS_FILTERS } from "./news/news.js";
import { LANGS, t } from "./i18n/index.js";

const langs = Object.keys(LANGS);

test("every item of every kind resolves to its own label in every language", () => {
  const kinds = { field: FIELDS, symptom: SYMPTOMS, tone: TONES, ret: RETURNS };
  for (const lang of langs) for (const [kind, items] of Object.entries(kinds)) for (const item of items) {
    assert.equal(labelFor(`${kind}:${item.id}`, lang), item.text[lang].label, `${kind}:${item.id} ${lang}`);
  }
});

test("the same id gives different text per language", () => {
  assert.equal(labelFor("symptom:fever", "en"), "Vice City Fever");
  assert.equal(labelFor("symptom:fever", "de"), "Vice-City-Fieber");
});

test("src: filters give the source name, and 'all' follows the language", () => {
  for (const id of NEWS_FILTERS.filter(f => f !== ALL_SOURCES)) {
    for (const lang of langs) assert.equal(labelFor(`src:${id}`, lang), SOURCES[id].label);
  }
  for (const lang of langs) assert.equal(labelFor(`src:${ALL_SOURCES}`, lang), t(lang, "allSources"));
  assert.notEqual(labelFor("src:all", "en"), "");
});

test("unknown kinds and ids give an empty string", () => {
  for (const ref of ["symptom:nope", "nope:fever", "symptom:", ":fever", ":", "", "src:nope", "src:", "tone:fever", "symptom:Fever", "symptom: fever", "symptom:fever "]) {
    assert.equal(labelFor(ref, "en"), "", JSON.stringify(ref));
  }
});

test("prototype names never leak out as a kind or an id", () => {
  const names = ["__proto__", "constructor", "prototype", "toString", "hasOwnProperty", "valueOf", "length", "find", "label", "text"];
  for (const name of names) {
    assert.equal(labelFor(name, "en"), "", name);
    assert.equal(labelFor(`${name}:fever`, "en"), "", `${name}:fever`);
    for (const kind of ["field", "symptom", "tone", "ret", "src"]) {
      assert.equal(labelFor(`${kind}:${name}`, "en"), "", `${kind}:${name}`);
    }
  }
});

test("a reference without a colon gives an empty string, even if it is a valid id or kind", () => {
  for (const ref of ["fever", "symptom", "src", "all", "tone"]) assert.equal(labelFor(ref, "en"), "", ref);
});

test("a reference with extra parts is malformed and gives an empty string, not another item's label", () => {
  assert.equal(labelFor("symptom:fever:extra", "en"), "");
  assert.equal(labelFor("src:all:x", "en"), "");
  assert.equal(labelFor("symptom:fever:", "en"), "");
});

test("input that is not a string gives an empty string and never throws", () => {
  const inputs = [null, undefined, 0, 1, NaN, true, {}, [], ["symptom:fever"], { toString: () => "symptom:fever" },
    Object.create(null), Symbol("symptom:fever"), () => "symptom:fever", 12n];
  for (const input of inputs) {
    let result;
    assert.doesNotThrow(() => { result = labelFor(input, "en"); }, typeof input);
    assert.equal(result, "", typeof input);
  }
});

test("a very long reference is fine", () => {
  assert.equal(labelFor("symptom:" + "x".repeat(100000), "en"), "");
  assert.equal(labelFor(":".repeat(100000), "en"), "");
});
