import { test } from "node:test";
import assert from "node:assert/strict";
import { buildEmail, scoreOf, scoreLevel, meterWidth, verdictOf, joinList } from "./email.js";
import { SYMPTOMS, TONES, RETURNS, VERDICTS, PS_COST, exampleState } from "./content.js";
import { LANGS, t } from "./i18n/index.js";

const langs = Object.keys(LANGS);
const state = (over = {}) => ({ ...exampleState("en"), ...over });
const allSymptoms = SYMPTOMS.map(s => s.id);

// ---------- joinList ----------

test("joinList: 0, 1, 2 and 3+ items, in both languages", () => {
  assert.equal(joinList([], "en"), "");
  assert.equal(joinList(["a"], "en"), "a");
  assert.equal(joinList(["a", "b"], "en"), "a and b");
  assert.equal(joinList(["a", "b", "c"], "en"), "a, b and c");
  assert.equal(joinList(["a", "b", "c", "d"], "en"), "a, b, c and d");
  assert.equal(joinList(["a", "b"], "de"), "a und b");
  assert.equal(joinList(["a", "b", "c"], "de"), "a, b und c");
});

test("joinList: does not change the array it is given", () => {
  const parts = ["a", "b", "c"];
  joinList(parts, "en");
  assert.deepEqual(parts, ["a", "b", "c"]);
});

// ---------- scoreOf ----------

test("scoreOf: the example state is 100 minus the costs of its symptoms", () => {
  const s = exampleState("en");
  const cost = SYMPTOMS.filter(x => s.symptoms.includes(x.id)).reduce((a, x) => a + x.cost, 0);
  assert.equal(scoreOf(s), 100 - cost);
});

test("scoreOf: a clean state with nothing ticked scores 100", () => {
  assert.equal(scoreOf(state({ symptoms: [] })), 100);
});

test("scoreOf: each symptom, tone and return costs exactly what content.js says", () => {
  for (const s of SYMPTOMS) assert.equal(scoreOf(state({ symptoms: [s.id] })), 100 - s.cost, s.id);
  for (const tn of TONES) assert.equal(scoreOf(state({ symptoms: [], tone: tn.id })), 100 - tn.cost, tn.id);
  for (const r of RETURNS) assert.equal(scoreOf(state({ symptoms: [], ret: r.id })), 100 - r.cost, r.id);
});

test("scoreOf: the P.S. costs PS_COST only when ps is exactly true", () => {
  assert.equal(scoreOf(state({ symptoms: [], ps: true })), 100 - PS_COST);
  for (const ps of [false, "on", "true", "false", 1, "1", null, undefined, {}, [], 0, ""]) {
    assert.equal(scoreOf(state({ symptoms: [], ps })), 100, `ps=${JSON.stringify(ps)}`);
  }
});

test("scoreOf: never goes below 0 or above 100, even with everything ticked", () => {
  const worst = state({ symptoms: allSymptoms, tone: "lazy", ret: "hundred", ps: true });
  assert.equal(scoreOf(worst), 0);
  const best = scoreOf(state({ symptoms: [], tone: TONES[0].id, ret: RETURNS[0].id, ps: false }));
  assert.equal(best, 100);
});

test("scoreOf: a duplicate symptom id counts once", () => {
  assert.equal(scoreOf(state({ symptoms: ["fever", "fever", "fever"], tone: "pro", ret: "tomorrow" })), 100 - SYMPTOMS.find(s => s.id === "fever").cost);
});

test("scoreOf: unknown symptom ids cost nothing", () => {
  assert.equal(scoreOf(state({ symptoms: ["nope", "__proto__", "constructor", "", null, 5, {}] })), 100);
});

test("scoreOf: an unknown tone or return falls back to the default (free) one, never NaN", () => {
  for (const bad of ["nope", "", null, undefined, 5, {}, "__proto__", "constructor", "toString"]) {
    const score = scoreOf(state({ symptoms: [], tone: bad, ret: bad }));
    assert.equal(score, 100 - TONES[0].cost - RETURNS[0].cost, JSON.stringify(bad));
  }
});

test("scoreOf: symptoms that are not an array are treated as none", () => {
  for (const bad of [null, undefined, "fever", "fever,thumb", 5, {}, { 0: "fever", length: 1 }, true]) {
    assert.equal(scoreOf(state({ symptoms: bad })), 100, JSON.stringify(bad));
  }
});

test("scoreOf: always a whole number from 0 to 100 for random states", () => {
  const pickOne = list => list[Math.floor(Math.random() * list.length)];
  for (let i = 0; i < 300; i++) {
    const s = state({
      symptoms: allSymptoms.filter(() => Math.random() < 0.5),
      tone: pickOne([...TONES.map(x => x.id), "x", null]),
      ret: pickOne([...RETURNS.map(x => x.id), "x", null]),
      ps: Math.random() < 0.5,
    });
    const score = scoreOf(s);
    assert.ok(Number.isInteger(score) && score >= 0 && score <= 100, `${JSON.stringify(s)} -> ${score}`);
  }
});

test("scoreOf: does not change the state it is given", () => {
  const s = state({ symptoms: ["fever", "fever"] });
  const copy = structuredClone(s);
  scoreOf(s);
  assert.deepEqual(s, copy);
});

// ---------- scoreLevel / meterWidth / verdictOf ----------

test("scoreLevel: exact boundaries at 60 and 30", () => {
  assert.equal(scoreLevel(100), "good");
  assert.equal(scoreLevel(60), "good");
  assert.equal(scoreLevel(59), "fair");
  assert.equal(scoreLevel(30), "fair");
  assert.equal(scoreLevel(29), "poor");
  assert.equal(scoreLevel(0), "poor");
});

test("meterWidth: shows the score as a percentage with a 3% minimum", () => {
  assert.equal(meterWidth(100), "100%");
  assert.equal(meterWidth(50), "50%");
  assert.equal(meterWidth(3), "3%");
  assert.equal(meterWidth(2), "3%");
  assert.equal(meterWidth(0), "3%");
});

test("verdictOf: exact boundaries come from VERDICTS, in every language", () => {
  for (const lang of langs) {
    for (const v of VERDICTS) {
      assert.equal(verdictOf(v.min, lang), v.text[lang], `${lang} at ${v.min}`);
      if (v.min > 0) {
        const below = VERDICTS.find(x => v.min - 1 >= x.min);
        assert.equal(verdictOf(v.min - 1, lang), below.text[lang], `${lang} at ${v.min - 1}`);
      }
    }
    assert.equal(verdictOf(100, lang), VERDICTS[0].text[lang]);
    assert.equal(verdictOf(0, lang), VERDICTS.at(-1).text[lang]);
  }
});

test("verdictOf: every score scoreOf can produce has a verdict", () => {
  for (let score = 0; score <= 100; score++) for (const lang of langs) assert.equal(typeof verdictOf(score, lang), "string");
});

test("verdictOf: a fractional score between two thresholds belongs to the lower band", () => {
  const second = VERDICTS[1];
  assert.equal(verdictOf(second.min + 0.5, "en"), second.text.en);
  assert.equal(verdictOf(second.min - 0.5, "en"), VERDICTS[2].text.en);
});

// ---------- buildEmail ----------

test("buildEmail: the example state builds the exact English email", () => {
  const { subject, body } = buildEmail(exampleState("en"), "en");
  assert.equal(subject, "Sick day: Alex");
  assert.equal(body, [
    "Hi Jordan,\n\nI woke up unwell this morning and won't be able to work today.",
    "I'm dealing with a high temperature and a strong urge to be somewhere with palm trees, stiff thumbs that my doctor says need a full day of repetitive motion therapy and sensitivity to daylight, so I'll be resting with the curtains closed.",
    "If anything urgent comes up, Sam from Accounting has kindly agreed to cover for me. They don't know yet.",
    "I expect to be back tomorrow.",
    "Best regards,\nAlex",
  ].join("\n\n"));
});

test("buildEmail: the example state builds the German email with German words", () => {
  const { subject, body } = buildEmail(exampleState("de"), "de");
  assert.equal(subject, "Krankmeldung: Alex");
  assert.ok(body.startsWith("Hallo Jordan,"));
  assert.ok(body.includes("Vice-City") === false);
  assert.ok(body.includes("Daumen"));
  assert.ok(body.includes(" und "));
  assert.ok(body.endsWith("Viele Grüße\nAlex"));
  assert.ok(!body.includes("Best regards"));
});

test("buildEmail: every tone, return and language builds without throwing and has no 'undefined'/'null'/'[object'", () => {
  for (const lang of langs) for (const tone of TONES) for (const ret of RETURNS) for (const ps of [true, false]) {
    for (const symptoms of [[], ["fever"], allSymptoms]) {
      const { subject, body } = buildEmail({ ...exampleState(lang), tone: tone.id, ret: ret.id, ps, symptoms }, lang);
      for (const part of [subject, body]) {
        assert.equal(typeof part, "string");
        assert.doesNotMatch(part, /undefined|null|NaN|\[object|\{|\}/, `${lang} ${tone.id} ${ret.id}`);
      }
      assert.ok(subject.trim() !== "");
      assert.ok(!body.includes("\n\n\n"), `blank paragraph in ${lang} ${tone.id}`);
      assert.ok(!body.startsWith("\n") && !body.endsWith("\n"));
    }
  }
});

test("buildEmail: the symptom list uses 'and' only before the last item and follows the content order", () => {
  const { body } = buildEmail(state({ symptoms: ["tired", "fever", "hearing"], tone: "pro" }), "en");
  const a = SYMPTOMS.find(s => s.id === "fever").text.en.line;
  const b = SYMPTOMS.find(s => s.id === "hearing").text.en.line;
  const c = SYMPTOMS.find(s => s.id === "tired").text.en.line;
  assert.ok(body.includes(`I'm dealing with ${a}, ${b} and ${c}.`), body);
});

test("buildEmail: a single symptom has no 'and' or comma", () => {
  const { body } = buildEmail(state({ symptoms: ["wanted"], tone: "pro" }), "en");
  assert.ok(body.includes("I'm dealing with a racing heart and a constant feeling that I'm being chased."));
  assert.ok(!body.includes("dealing with a racing heart, "));
});

test("buildEmail: no symptoms uses the tone's 'none' line, or no line at all for the lazy tone", () => {
  for (const lang of langs) {
    const pro = buildEmail({ ...exampleState(lang), symptoms: [], tone: "pro" }, lang).body;
    assert.ok(pro.includes(TONES[0].text[lang].none), lang);
    const lazy = buildEmail({ ...exampleState(lang), symptoms: [], tone: "lazy", cover: "" }, lang).body;
    // greeting (two blocks), return line and sign-off only
    assert.equal(lazy.split("\n\n").length, 4, lazy);
    assert.ok(!lazy.includes("\n\n\n"));
  }
});

test("buildEmail: the P.S. appears last, and only when ps is exactly true", () => {
  for (const lang of langs) {
    const ps = t(lang, "ps");
    assert.ok(buildEmail({ ...exampleState(lang), ps: true }, lang).body.endsWith(`\n\n${ps}`), lang);
    for (const bad of [false, "on", "true", "false", 1, "1", null, undefined, {}, [], 0, ""]) {
      assert.ok(!buildEmail({ ...exampleState(lang), ps: bad }, lang).body.includes(ps), `${lang} ps=${JSON.stringify(bad)}`);
    }
  }
});

test("buildEmail: a blank or missing name falls back to the localised placeholder, in the signature and the subject", () => {
  for (const lang of langs) for (const bad of ["", "   ", "\n\t ", null, undefined, 5, {}, []]) {
    const { subject, body } = buildEmail({ ...exampleState(lang), name: bad }, lang);
    assert.ok(subject.includes(t(lang, "fallbackName")) || subject === TONES.find(x => x.id === "pro").text[lang].subject(t(lang, "fallbackName")), `${lang} ${JSON.stringify(bad)}`);
    assert.ok(body.endsWith(`\n${t(lang, "fallbackName")}`), `${lang} ${JSON.stringify(bad)}`);
  }
});

test("buildEmail: a blank or missing manager falls back to the localised placeholder in the greeting", () => {
  for (const lang of langs) for (const bad of ["", "  ", null, undefined, 7, {}]) {
    const { body } = buildEmail({ ...exampleState(lang), boss: bad }, lang);
    assert.ok(body.startsWith(TONES[0].text[lang].open(t(lang, "fallbackBoss"))), `${lang} ${JSON.stringify(bad)}`);
  }
});

test("buildEmail: names are trimmed, and inner spaces are kept", () => {
  const { subject, body } = buildEmail(state({ name: "  Alex  Smith \n", boss: "\t Jordan  " }), "en");
  assert.equal(subject, "Sick day: Alex  Smith");
  assert.ok(body.startsWith("Hi Jordan,"));
  assert.ok(body.endsWith("Best regards,\nAlex  Smith"));
});

test("buildEmail: the cover line only appears when a coworker is named", () => {
  for (const lang of langs) {
    const line = t(lang, "cover");
    assert.ok(buildEmail({ ...exampleState(lang), cover: "Sam" }, lang).body.includes(line("Sam")));
    for (const bad of ["", "   ", null, undefined, 3, {}]) {
      const body = buildEmail({ ...exampleState(lang), cover: bad }, lang).body;
      assert.ok(!body.includes(line("MARK").split("MARK")[0]), `${lang} ${JSON.stringify(bad)}`);
      assert.doesNotMatch(body, /undefined|null|\[object/);
    }
  }
});

test("buildEmail: hostile text is passed through as plain text, not interpreted", () => {
  const evil = `<script>alert("x")</script> & 'q' $& $1 \${x} %s`;
  const { subject, body } = buildEmail(state({ name: evil, boss: evil, cover: evil }), "en");
  assert.ok(subject.includes(evil));
  assert.equal(body.split(evil).length - 1, 3, "boss, cover and name (signature), once each");
});

test("buildEmail: unknown, missing and prototype-name tone/return ids fall back to the first of each", () => {
  const base = buildEmail(state({ tone: TONES[0].id, ret: RETURNS[0].id }), "en");
  for (const bad of ["nope", "", null, undefined, 3, {}, "__proto__", "constructor", "toString", "length"]) {
    assert.deepEqual(buildEmail(state({ tone: bad, ret: bad }), "en"), base, JSON.stringify(bad));
  }
});

test("buildEmail: unknown, duplicate and malformed symptom values never throw and are handled sensibly", () => {
  const once = buildEmail(state({ symptoms: ["fever"] }), "en");
  assert.deepEqual(buildEmail(state({ symptoms: ["fever", "fever", "nope", null, 4, {}, "__proto__"] }), "en"), once);
  const none = buildEmail(state({ symptoms: [] }), "en");
  for (const bad of [null, undefined, "fever", 5, {}, true]) assert.deepEqual(buildEmail(state({ symptoms: bad }), "en"), none, JSON.stringify(bad));
});

test("buildEmail: a state with every field missing still builds a full email", () => {
  for (const lang of langs) {
    const { subject, body } = buildEmail({}, lang);
    assert.ok(subject.includes(t(lang, "fallbackName")));
    assert.ok(body.includes(t(lang, "fallbackBoss")));
    assert.ok(body.endsWith(`\n${t(lang, "fallbackName")}`));
  }
});

test("buildEmail: very long text is not cut off", () => {
  const long = "x".repeat(100000);
  const { subject, body } = buildEmail(state({ name: long, boss: long, cover: long }), "en");
  assert.ok(subject.includes(long));
  assert.equal(body.split(long).length - 1, 3);
});

test("buildEmail: lazy tone lower-cases the manager and the symptoms but keeps the name's case", () => {
  const { body, subject } = buildEmail(state({ tone: "lazy", boss: "JORDAN", name: "ALEX", symptoms: ["fever"] }), "en");
  assert.ok(body.startsWith("hey jordan\n\nsick. not coming in."));
  assert.ok(body.includes("symptoms: a high temperature"));
  assert.ok(body.endsWith("ttyl,\nALEX"));
  assert.equal(subject, "sick");
});

test("buildEmail: does not change the state it is given", () => {
  const s = state({ symptoms: ["thumb", "fever", "fever"], ps: true });
  const copy = structuredClone(s);
  buildEmail(s, "en");
  assert.deepEqual(s, copy);
});

test("buildEmail: the same state always gives the same email", () => {
  const s = state({ ps: true, symptoms: allSymptoms });
  assert.deepEqual(buildEmail(s, "de"), buildEmail(s, "de"));
});

test("buildEmail: an unknown language throws instead of returning a broken email", () => {
  assert.throws(() => buildEmail(exampleState("en"), "xx"));
});
