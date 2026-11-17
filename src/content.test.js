import { test } from "node:test";
import assert from "node:assert/strict";
import { FIELDS, SYMPTOMS, TONES, RETURNS, VERDICTS, PS_COST, RELEASE, EXAMPLE_SYMPTOMS, exampleState } from "./content.js";
import { LANGS } from "./i18n/index.js";

const langs = Object.keys(LANGS);
const nonEmpty = value => typeof value === "string" && value.trim() !== "";

test("at least two languages are configured, so the per-language checks below mean something", () => {
  assert.ok(langs.length >= 2);
});

for (const [name, items] of Object.entries({ FIELDS, SYMPTOMS, TONES, RETURNS })) {
  test(`${name}: ids are non-empty, unique and safe to use in an HTML id and a data-label`, () => {
    const ids = items.map(i => i.id);
    assert.ok(ids.length > 0);
    assert.ok(ids.every(id => /^[a-z][a-z0-9-]*$/.test(id)), `bad id in ${ids}`);
    assert.equal(new Set(ids).size, ids.length);
  });

  test(`${name}: every item has a label in every language and no stray languages`, () => {
    for (const item of items) {
      assert.deepEqual(Object.keys(item.text).sort(), [...langs].sort(), item.id);
      for (const lang of langs) assert.ok(nonEmpty(item.text[lang].label), `${item.id} ${lang} label`);
    }
  });
}

test("ids do not collide across kinds used as radio/checkbox values in one form", () => {
  // tones and returns are separate radio groups, but symptoms and fields share the form's names.
  const names = [...FIELDS.map(f => f.id), "symptom", "tone", "ret", "ps"];
  assert.equal(new Set(names).size, names.length);
});

test("FIELDS: every language has a non-empty example value", () => {
  for (const f of FIELDS) for (const lang of langs) assert.ok(nonEmpty(f.text[lang].example), `${f.id} ${lang}`);
});

test("SYMPTOMS: codes are unique, costs are positive whole numbers, lines exist in every language", () => {
  const codes = SYMPTOMS.map(s => s.code);
  assert.equal(new Set(codes).size, codes.length);
  for (const s of SYMPTOMS) {
    assert.ok(nonEmpty(s.code));
    assert.ok(Number.isInteger(s.cost) && s.cost > 0, `${s.id} cost`);
    for (const lang of langs) assert.ok(nonEmpty(s.text[lang].line), `${s.id} ${lang} line`);
  }
});

test("SYMPTOMS: the labels are distinct inside a language", () => {
  for (const lang of langs) {
    const labels = SYMPTOMS.map(s => s.text[lang].label);
    assert.equal(new Set(labels).size, labels.length, lang);
  }
});

test("TONES: costs are non-negative whole numbers and the first tone is free (it is the default)", () => {
  for (const t of TONES) assert.ok(Number.isInteger(t.cost) && t.cost >= 0, `${t.id} cost`);
  assert.equal(TONES[0].cost, 0);
});

test("TONES: every language has working subject/open/syms functions and none/sign text", () => {
  for (const tone of TONES) for (const lang of langs) {
    const x = tone.text[lang];
    for (const fn of ["subject", "open", "syms"]) assert.equal(typeof x[fn], "function", `${tone.id} ${lang} ${fn}`);
    assert.ok(nonEmpty(x.subject("Alex")), `${tone.id} ${lang} subject`);
    assert.ok(nonEmpty(x.open("Jordan")), `${tone.id} ${lang} open`);
    assert.ok(nonEmpty(x.syms("a and b")), `${tone.id} ${lang} syms`);
    assert.equal(typeof x.none, "string");
    assert.ok(nonEmpty(x.sign), `${tone.id} ${lang} sign`);
  }
});

test("TONES: the name, manager and symptom list actually reach the text", () => {
  for (const tone of TONES) for (const lang of langs) {
    const x = tone.text[lang];
    assert.ok(x.open("Zorblax").toLowerCase().includes("zorblax"), `${tone.id} ${lang} open`);
    assert.ok(x.syms("Quuxsymptom").toLowerCase().includes("quuxsymptom"), `${tone.id} ${lang} syms`);
  }
});

test("TONES: text functions return the same value when called twice (no hidden state)", () => {
  for (const tone of TONES) for (const lang of langs) {
    const x = tone.text[lang];
    assert.equal(x.open("B"), x.open("B"));
    assert.equal(x.syms("L"), x.syms("L"));
  }
});

test("RETURNS: costs are non-negative whole numbers, the first is free, every language has a line", () => {
  for (const r of RETURNS) {
    assert.ok(Number.isInteger(r.cost) && r.cost >= 0, `${r.id} cost`);
    for (const lang of langs) assert.ok(nonEmpty(r.text[lang].line), `${r.id} ${lang} line`);
  }
  assert.equal(RETURNS[0].cost, 0);
});

test("VERDICTS: every whole score from 0 to 100 gets a verdict in every language", () => {
  for (let score = 0; score <= 100; score++) {
    const verdict = VERDICTS.find(v => score >= v.min);
    assert.ok(verdict, `no verdict for ${score}`);
    for (const lang of langs) assert.ok(nonEmpty(verdict.text[lang]), `${score} ${lang}`);
  }
});

test("VERDICTS: ordered from highest minimum to lowest, so the first match is the right one; the last starts at 0", () => {
  const mins = VERDICTS.map(v => v.min);
  assert.deepEqual(mins, [...mins].sort((a, b) => b - a));
  assert.equal(new Set(mins).size, mins.length);
  assert.equal(mins.at(-1), 0);
  assert.ok(mins[0] <= 100);
  for (const v of VERDICTS) assert.deepEqual(Object.keys(v.text).sort(), [...langs].sort());
});

test("VERDICTS: the lowest and highest scores get different verdicts", () => {
  assert.notEqual(VERDICTS.find(v => 0 >= v.min).text.en, VERDICTS.find(v => 100 >= v.min).text.en);
});

test("PS_COST is a positive whole number and RELEASE is a valid date", () => {
  assert.ok(Number.isInteger(PS_COST) && PS_COST > 0);
  assert.ok(RELEASE instanceof Date);
  assert.ok(!Number.isNaN(RELEASE.getTime()));
});

test("EXAMPLE_SYMPTOMS only names existing symptoms, once each", () => {
  const ids = SYMPTOMS.map(s => s.id);
  for (const id of EXAMPLE_SYMPTOMS) assert.ok(ids.includes(id), id);
  assert.equal(new Set(EXAMPLE_SYMPTOMS).size, EXAMPLE_SYMPTOMS.length);
});

test("exampleState: has the documented shape and only valid ids in every language", () => {
  for (const lang of langs) {
    const s = exampleState(lang);
    assert.deepEqual(Object.keys(s).sort(), ["boss", "cover", "name", "ps", "ret", "symptoms", "tone"]);
    for (const f of FIELDS) assert.equal(s[f.id], f.text[lang].example);
    assert.ok(TONES.some(t => t.id === s.tone));
    assert.ok(RETURNS.some(r => r.id === s.ret));
    assert.equal(s.ps, false);
    assert.deepEqual(s.symptoms, EXAMPLE_SYMPTOMS);
  }
});

test("exampleState: every call returns its own symptoms array, so changing one never changes the next", () => {
  const first = exampleState("en");
  const before = [...EXAMPLE_SYMPTOMS];
  first.symptoms.push("hearing");
  assert.deepEqual(EXAMPLE_SYMPTOMS, before);
  assert.deepEqual(exampleState("en").symptoms, before);
  assert.notEqual(exampleState("en").symptoms, exampleState("en").symptoms);
});

test("exampleState: an unknown language throws instead of returning a half-empty state", () => {
  assert.throws(() => exampleState("xx"));
});
