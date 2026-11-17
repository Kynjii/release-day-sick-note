import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { renderPage, escapeHtml } from "./page.js";
import { FIELDS, SYMPTOMS, TONES, RETURNS, VERDICTS, RELEASE, exampleState } from "../content.js";
import { LANGS, DEFAULT_LANG, I18N_ATTRS, t } from "../i18n/index.js";
import { SOURCES, NEWS_FILTERS, ALL_SOURCES } from "../news/news.js";
import { buildEmail, scoreOf } from "../email.js";
import { labelFor } from "../labels.js";

const index = readFileSync(new URL("../../index.html", import.meta.url), "utf8");
const langs = Object.keys(LANGS);
const NOW = RELEASE.getTime() - 86400000;

// Independent of escapeHtml, so a bug there can't hide itself.
const unescape = s => s.replace(/&(lt|gt|quot|#39|amp);/g, (_, e) => ({ lt: "<", gt: ">", quot: '"', "#39": "'", amp: "&" })[e]);
const HOSTILE = `<img src=x onerror=alert(1)>"'&amp; </pre></span></script><!-- render:body --> $& $1 $$ \${x}`;
const tags = html => [...html.matchAll(/<([a-z][a-z0-9]*)\b((?:[^>"']|"[^"]*"|'[^']*')*)>/g)].map(m => ({ tag: m[1], attrs: m[2], raw: m[0] }));
const attrNames = attrs => [...attrs.matchAll(/\s([a-zA-Z][\w:-]*)(?:=(?:"[^"]*"|'[^']*'|[^\s>]+))?/g)].map(m => m[1]);
const attr = (tagHtml, name) => tagHtml.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];
const inputs = html => tags(html).filter(x => x.tag === "input");
const render = (lang = "en", html = index, now = NOW) => renderPage(html, lang, now);

// The template has one real <script>; anything beyond that came from the hostile text.
function assertNoInjectedTags(out) {
  assert.doesNotMatch(out, /<img/);
  assert.equal((out.match(/<script/g) ?? []).length, (index.match(/<script/g) ?? []).length);
  assert.equal((out.match(/<\/pre>/g) ?? []).length, (index.match(/<\/pre>/g) ?? []).length);
}

// Temporarily change an exported object while `fn` runs.
function withPatch(target, key, value, fn) {
  const had = Object.hasOwn(target, key);
  const old = target[key];
  target[key] = value;
  try { return fn(); } finally { if (had) target[key] = old; else delete target[key]; }
}

// ---------- escapeHtml ----------

test("escapeHtml: escapes & < > \" ' and nothing else", () => {
  assert.equal(escapeHtml(`<a href="x" title='y'>&</a>`), "&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;&lt;/a&gt;");
  assert.equal(escapeHtml("plain text äöü € 100 %"), "plain text äöü € 100 %");
});

test("escapeHtml: & is escaped first, so entities in the input are shown literally, never decoded", () => {
  assert.equal(escapeHtml("&lt;"), "&amp;lt;");
  assert.equal(escapeHtml("&amp;"), "&amp;amp;");
  assert.equal(unescape(escapeHtml(HOSTILE)), HOSTILE);
});

test("escapeHtml: output never contains a raw < > \" ' and every & starts an entity we made", () => {
  const out = escapeHtml(HOSTILE);
  assert.doesNotMatch(out, /[<>"']/);
  assert.doesNotMatch(out, /&(?!(amp|lt|gt|quot|#39);)/);
});

test("escapeHtml: numbers and other values become text", () => {
  assert.equal(escapeHtml(42), "42");
  assert.equal(escapeHtml(0), "0");
  assert.equal(escapeHtml(""), "");
});

// ---------- placeholders ----------

test("every placeholder name in the real index.html is known", () => {
  const names = [...index.matchAll(/<!--\s*render:([^\s]+?)\s*-->/g)].map(m => m[1]);
  assert.ok(names.length >= 8);
  assert.doesNotThrow(() => render("en"));
});

test("an unknown placeholder throws and names the placeholder", () => {
  assert.throws(() => render("en", "<p><!-- render:nope --></p>"), /Unknown placeholder: render:nope/);
  assert.throws(() => render("en", "<!-- render:constructor -->"), /Unknown placeholder/);
  assert.throws(() => render("en", "<!-- render:__proto__ -->"), /Unknown placeholder/);
  assert.throws(() => render("en", "<!-- render:toString -->"), /Unknown placeholder/);
  assert.throws(() => render("en", "<!-- render:hasOwnProperty -->"), /Unknown placeholder/);
});

test("a malformed placeholder (dash, dot, empty or spaced name) is not silently left in the page", () => {
  for (const bad of ["<!-- render:foo-bar -->", "<!-- render:foo.bar -->", "<!-- render: -->", "<!-- render:fields extra -->", "<!--render:meter-->x<!-- render:a-b -->"]) {
    let out;
    try { out = render("en", bad); } catch { continue; }
    assert.doesNotMatch(out, /render:/, `left in the page: ${bad}`);
  }
});

test("placeholder comments accept any spacing and can repeat", () => {
  const out = render("en", "<!--render:subject--> | <!--   render:subject   --> | <!-- render:subject -->");
  const subject = escapeHtml(buildEmail(exampleState("en"), "en").subject);
  assert.equal(out, `${subject} | ${subject} | ${subject}`);
});

test("ordinary comments and look-alikes are left alone", () => {
  const html = "<!-- a normal comment --><!-- renders:fields --><!-- Render:fields --><!-- xrender:fields -->";
  assert.equal(render("en", html), html);
});

test("$ sequences in generated content are inserted literally", () => {
  const out = withPatch(FIELDS[0].text.en, "example", "$& $1 $$ $` $'", () => render("en", "<!-- render:subject -->|<!-- render:body -->"));
  assert.ok(out.includes("Sick day: $&amp; $1 $$ $` $&#39;"), out);
});

// ---------- data-i18n ----------

test("empty data-i18n elements are filled with the language's text", () => {
  assert.equal(render("en", `<h1 data-i18n="title"></h1>`), `<h1 data-i18n="title">${t("en", "title")}</h1>`);
  assert.equal(render("de", `<h1 data-i18n="title"></h1>`), `<h1 data-i18n="title">${t("de", "title")}</h1>`);
  assert.notEqual(t("en", "title"), t("de", "lede"));
});

test("data-i18n works for other attribute orders, tags and multi-line tags", () => {
  assert.equal(render("en", `<span class="a" data-i18n="days" id="x"></span>`), `<span class="a" data-i18n="days" id="x">days</span>`);
  assert.equal(render("en", `<b\n  id="x"\n  data-i18n="days"\n></b>`), `<b\n  id="x"\n  data-i18n="days"\n>days</b>`);
  assert.equal(render("en", `<h2 data-i18n="days"></h2><h3 data-i18n="hours"></h3>`), `<h2 data-i18n="days">days</h2><h3 data-i18n="hours">hours</h3>`);
});

test("an unknown data-i18n key throws and names the key", () => {
  assert.throws(() => render("en", `<p data-i18n="nope"></p>`), /Missing en text: nope/);
  assert.throws(() => render("de", `<p data-i18n="nope"></p>`), /Missing de text: nope/);
  assert.throws(() => render("en", `<p data-i18n="__proto__"></p>`), /Missing/);
  assert.throws(() => render("en", `<p data-i18n="constructor"></p>`), /Missing/);
});

test("a data-i18n key whose text is a function throws instead of printing the function's source", () => {
  for (const key of Object.keys(LANGS.en.strings).filter(k => typeof LANGS.en.strings[k] === "function")) {
    assert.throws(() => render("en", `<p data-i18n="${key}"></p>`), /not plain text/, key);
    assert.throws(() => render("de", `<p data-i18n="${key}"></p>`), /not plain text/, key);
    assert.throws(() => render("en", `<p data-i18n-aria="${key}"></p>`), /not plain text/, `aria ${key}`);
    assert.throws(() => render("en", `<meta data-i18n-content="${key}">`), /not plain text/, `content ${key}`);
  }
  assert.ok(["countdown", "cover"].every(k => typeof LANGS.en.strings[k] === "function"));
});

test("text from the strings is HTML-escaped when it is filled in", () => {
  const out = withPatch(LANGS.en.strings, "title", HOSTILE, () => render("en", `<h1 data-i18n="title"></h1>`));
  assert.doesNotMatch(out.replace(/^<h1 data-i18n="title">/, ""), /<(?!\/h1>)/);
  assert.equal(unescape(out.slice(`<h1 data-i18n="title">`.length, -"</h1>".length)), HOSTILE);
});

test("data-i18n-aria and data-i18n-content add escaped attributes that cannot break out of the quotes", () => {
  const out = withPatch(LANGS.en.strings, "langLabel", HOSTILE, () => render("en", `<div data-i18n-aria="langLabel"></div>`));
  assert.equal(tags(out).length, 1, out);
  assert.equal(unescape(attr(out, "aria-label")), HOSTILE);
  const out2 = withPatch(LANGS.en.strings, "metaDescription", HOSTILE, () => render("en", `<meta name="description" data-i18n-content="metaDescription">`));
  assert.equal(tags(out2).length, 1, out2);
  assert.equal(unescape(attr(out2, "content")), HOSTILE);
});

test("the attributes named in I18N_ATTRS are the ones that get added, and each is added once", () => {
  for (const [suffix, name] of Object.entries(I18N_ATTRS)) {
    const out = render("en", `<div data-i18n-${suffix}="days"></div>`);
    assert.equal(out, `<div data-i18n-${suffix}="days" ${name}="days"></div>`);
  }
});

test("an unknown data-i18n-aria key throws", () => {
  assert.throws(() => render("en", `<div data-i18n-aria="nope"></div>`), /Missing en text: nope/);
  assert.throws(() => render("en", `<meta data-i18n-content="nope">`), /Missing en text: nope/);
});

test("html without any placeholders or keys comes back unchanged except for the language", () => {
  assert.equal(render("en", `<html lang="de"><body><p>hi</p></body></html>`), `<html lang="en"><body><p>hi</p></body></html>`);
});

// ---------- <html lang> ----------

test("<html lang> is set to the rendered language, whatever the template said", () => {
  for (const lang of langs) {
    assert.match(render(lang), new RegExp(`^<!doctype html>\\s*<html lang="${lang}">`));
    for (const start of ["de", "en", "xx", ""]) assert.equal(render(lang, `<html lang="${start}"><p>x</p>`), `<html lang="${lang}"><p>x</p>`);
  }
});

test("<html lang> is updated even when it is not the first attribute", () => {
  assert.equal(render("en", `<html class="a" lang="de" data-x="1"><body></body>`), `<html class="a" lang="en" data-x="1"><body></body>`);
});

test("the default language is used when none is given", () => {
  assert.match(renderPage(index), new RegExp(`<html lang="${DEFAULT_LANG}">`));
  assert.ok(renderPage(index).includes(t(DEFAULT_LANG, "title")));
});

test("an unknown language throws instead of producing a half-filled page", () => {
  assert.throws(() => renderPage(index, "xx", NOW));
});

// ---------- the real page ----------

for (const lang of langs) {
  const out = render(lang);

  test(`real index.html (${lang}): no placeholder and no empty data-i18n element is left`, () => {
    assert.doesNotMatch(out, /render:/);
    for (const { tag, attrs, raw } of tags(out)) {
      if (!/\sdata-i18n="/.test(raw)) continue;
      const after = out.slice(out.indexOf(raw) + raw.length);
      assert.doesNotMatch(after, new RegExp(`^\\s*</${tag}>`), `empty: ${raw}`);
    }
    assert.doesNotMatch(out, /<(\w+)\b[^>]*\sdata-i18n="[^"]+"[^>]*>\s*<\/\1>/);
  });

  test(`real index.html (${lang}): every data-i18n element holds exactly the ${lang} text for its key`, () => {
    const found = [...out.matchAll(/<(\w+)\b[^>]*\sdata-i18n="([^"]+)"[^>]*>([^<]*)<\/\1>/g)];
    const keys = [...index.matchAll(/\sdata-i18n="([^"]+)"/g)].map(m => m[1]);
    assert.ok(keys.length >= 20);
    // the page adds its own data-i18n elements too (the meter label), so count them in the output
    assert.equal(found.length, (out.match(/\sdata-i18n="/g) ?? []).length, "some data-i18n elements were not filled");
    assert.ok(found.length >= keys.length);
    for (const key of keys) assert.ok(found.some(f => f[2] === key), key);
    for (const [, , key, text] of found) assert.equal(unescape(text), t(lang, key), key);
  });

  test(`real index.html (${lang}): data-i18n-aria and data-i18n-content attributes are all present`, () => {
    for (const [suffix, name] of Object.entries(I18N_ATTRS)) {
      const wanted = tags(out).filter(x => new RegExp(`\\sdata-i18n-${suffix}="`).test(x.raw));
      assert.ok(wanted.length >= 1, suffix);
      for (const x of wanted) assert.equal(unescape(attr(x.raw, name)), t(lang, attr(x.raw, `data-i18n-${suffix}`)), x.raw);
    }
  });

  test(`real index.html (${lang}): no element has the same attribute twice`, () => {
    for (const { raw, attrs } of tags(out)) {
      const names = attrNames(attrs);
      assert.equal(new Set(names).size, names.length, raw);
    }
  });

  test(`real index.html (${lang}): ids are unique and every label/aria reference points at an existing id`, () => {
    const ids = tags(out).map(x => attr(x.raw, "id")).filter(Boolean);
    assert.equal(new Set(ids).size, ids.length, `duplicate ids: ${ids.filter((id, i) => ids.indexOf(id) !== i)}`);
    for (const { raw } of tags(out)) {
      for (const name of ["for", "aria-describedby", "aria-labelledby"]) {
        const ref = attr(raw, name);
        if (ref) assert.ok(ids.includes(ref), `${name}="${ref}" in ${raw}`);
      }
    }
  });

  test(`real index.html (${lang}): every data-label span has non-empty text matching labelFor`, () => {
    const spans = [...out.matchAll(/<span\b[^>]*\sdata-label="([^"]+)"[^>]*>([^<]*)<\/span>/g)];
    const expected = FIELDS.length + SYMPTOMS.length + TONES.length + RETURNS.length + NEWS_FILTERS.length;
    assert.equal(spans.length, expected);
    for (const [, ref, text] of spans) {
      assert.notEqual(text, "", ref);
      assert.equal(unescape(text), labelFor(unescape(ref), lang), ref);
    }
    assert.equal((out.match(/data-label=/g) ?? []).length, expected);
  });

  test(`real index.html (${lang}): the form shows the example state`, () => {
    const state = exampleState(lang);
    const all = inputs(out);
    for (const f of FIELDS) {
      const input = all.find(x => attr(x.raw, "name") === f.id);
      assert.equal(unescape(attr(input.raw, "value")), state[f.id], f.id);
      assert.equal(attr(input.raw, "id"), `f-${f.id}`);
    }
    const boxes = all.filter(x => attr(x.raw, "name") === "symptom");
    assert.deepEqual(boxes.map(x => attr(x.raw, "value")), SYMPTOMS.map(s => s.id), "one checkbox per symptom, in order");
    assert.deepEqual(boxes.filter(x => /\schecked\b/.test(x.raw)).map(x => attr(x.raw, "value")), state.symptoms);
    const ps = all.find(x => attr(x.raw, "name") === "ps");
    assert.ok(ps && !/\schecked\b/.test(ps.raw), "the P.S. box starts unticked");
  });

  test(`real index.html (${lang}): every radio group has all its options and exactly one checked`, () => {
    const radios = inputs(out).filter(x => /\stype="radio"/.test(x.raw));
    const groups = Object.groupBy(radios, x => attr(x.raw, "name"));
    const state = exampleState(lang);
    assert.deepEqual(Object.keys(groups).sort(), ["ret", "src", "tone"]);
    const expected = { tone: [TONES.map(x => x.id), state.tone], ret: [RETURNS.map(x => x.id), state.ret], src: [NEWS_FILTERS, ALL_SOURCES] };
    for (const [name, [ids, selected]] of Object.entries(expected)) {
      assert.deepEqual(groups[name].map(x => attr(x.raw, "value")), ids, name);
      const checked = groups[name].filter(x => /\schecked\b/.test(x.raw));
      assert.equal(checked.length, 1, `${name}: ${checked.length} checked`);
      assert.equal(attr(checked[0].raw, "value"), selected, name);
      for (const r of groups[name]) assert.equal(attr(r.raw, "id"), `${name}-${attr(r.raw, "value")}`);
    }
  });

  test(`real index.html (${lang}): the email, subject and meter match the example state`, () => {
    const state = exampleState(lang);
    const email = buildEmail(state, lang);
    assert.equal(unescape(out.match(/<span class="subj" id="subject">([^]*?)<\/span>/)[1]), email.subject);
    assert.equal(unescape(out.match(/<pre class="email-body" id="body">([^]*?)<\/pre>/)[1]), email.body);
    const score = scoreOf(state);
    assert.ok(out.includes(`<span class="meter-num" id="score">${score}%</span>`));
    assert.ok(out.includes(`style="width: ${score}%"`));
    const verdict = VERDICTS.find(v => score >= v.min).text[lang];
    assert.equal(unescape(out.match(/<p class="verdict" id="verdict">([^]*?)<\/p>/)[1]), verdict);
  });

  test(`real index.html (${lang}): the language buttons mark only the current language as pressed`, () => {
    const buttons = tags(out).filter(x => x.tag === "button" && attr(x.raw, "data-lang"));
    assert.deepEqual(buttons.map(b => attr(b.raw, "data-lang")), langs);
    for (const b of buttons) assert.equal(attr(b.raw, "aria-pressed"), String(attr(b.raw, "data-lang") === lang));
  });

  test(`real index.html (${lang}): the page language, title and description follow ${lang}`, () => {
    assert.match(out, new RegExp(`<html lang="${lang}">`));
    assert.ok(out.includes(`<title data-i18n="docTitle">${t(lang, "docTitle")}</title>`));
    assert.equal(unescape(attr(out.match(/<meta name="description"[^>]*>/)[0], "content")), t(lang, "metaDescription"));
  });
}

test("English output contains no German UI text and German output no English UI text", () => {
  const en = render("en"), de = render("de");
  for (const key of ["step1", "hint1", "lede", "psToggle", "copy", "footer"]) {
    assert.ok(en.includes(escapeHtml(t("en", key))), key);
    assert.ok(!en.includes(escapeHtml(t("de", key))), `en page has de ${key}`);
    assert.ok(de.includes(escapeHtml(t("de", key))), key);
    assert.ok(!de.includes(escapeHtml(t("en", key))), `de page has en ${key}`);
  }
  for (const f of FIELDS) assert.ok(!en.includes(`>${f.text.de.label}<`), f.id);
  for (const s of SYMPTOMS) assert.ok(!en.includes(`>${s.text.de.label}<`), s.id);
  assert.ok(en.includes("Vice City Fever") && de.includes("Vice-City-Fieber"));
});

test("the countdown note shows the date before release and the released text from the release moment on", () => {
  for (const lang of langs) {
    const before = render(lang, "<p><!-- render:countdownNote --></p>", RELEASE.getTime() - 1);
    const at = render(lang, "<p><!-- render:countdownNote --></p>", RELEASE.getTime());
    assert.equal(at, `<p>${escapeHtml(t(lang, "released"))}</p>`);
    assert.notEqual(before, at);
    assert.ok(before.includes("2026"));
  }
});

test("rendering is repeatable and does not change the template string or the example data", () => {
  const copy = structuredClone(exampleState("en"));
  const a = render("en"), b = render("en");
  assert.equal(a, b);
  assert.deepEqual(exampleState("en"), copy);
  assert.equal(render("de"), render("de"));
});

// ---------- hostile content is escaped everywhere it is shown ----------

test("hostile example values are escaped in the value attribute, the subject and the email body", () => {
  const out = withPatch(FIELDS[0].text.en, "example", HOSTILE, () =>
    withPatch(FIELDS[1].text.en, "example", HOSTILE, () =>
      withPatch(FIELDS[2].text.en, "example", HOSTILE, () => render("en"))));
  const name = out.match(/<input[^>]*id="f-name"[^>]*>/)[0];
  assert.equal(unescape(attr(name, "value")), HOSTILE);
  assert.equal(unescape(attr(out.match(/<input[^>]*id="f-boss"[^>]*>/)[0], "value")), HOSTILE);
  assert.equal(unescape(attr(out.match(/<input[^>]*id="f-cover"[^>]*>/)[0], "value")), HOSTILE);
  const subject = out.match(/<span class="subj" id="subject">([^]*?)<\/span>/)[1];
  assert.equal(unescape(subject), `Sick day: ${HOSTILE}`);
  const body = out.match(/<pre class="email-body" id="body">([^]*?)<\/pre>/)[1];
  assert.equal(unescape(body), buildEmail({ ...exampleState("en"), name: HOSTILE, boss: HOSTILE, cover: HOSTILE }, "en").body);
  assertNoInjectedTags(out);
  assert.doesNotMatch(out, /<!--\s*render:/, "a placeholder inside generated text must not be expanded again");
  assert.equal(tags(out).filter(x => x.tag === "input" && attr(x.raw, "name") === "name").length, 1);
});

test("hostile labels, codes, verdicts and source names are escaped", () => {
  const out = withPatch(FIELDS[0].text.en, "label", HOSTILE, () =>
    withPatch(SYMPTOMS[0].text.en, "label", HOSTILE, () =>
      withPatch(SYMPTOMS[0], "code", HOSTILE, () =>
        withPatch(TONES[0].text.en, "label", HOSTILE, () =>
          withPatch(RETURNS[0].text.en, "label", HOSTILE, () =>
            withPatch(SOURCES.giga, "label", HOSTILE, () =>
              withPatch(VERDICTS[1].text, "en", HOSTILE, () => render("en"))))))));
  assertNoInjectedTags(out);
  assert.ok(out.includes(`data-label="field:name">${escapeHtml(HOSTILE)}</span>`));
  assert.ok(out.includes(`data-label="symptom:fever">${escapeHtml(HOSTILE)}</span>`));
  assert.ok(out.includes(`<span class="code">${escapeHtml(HOSTILE)}</span>`));
  assert.ok(out.includes(`data-label="tone:pro">${escapeHtml(HOSTILE)}</span>`));
  assert.ok(out.includes(`data-label="ret:tomorrow">${escapeHtml(HOSTILE)}</span>`));
  assert.ok(out.includes(`data-label="src:giga">${escapeHtml(HOSTILE)}</span>`));
  assert.ok(out.includes(`<p class="verdict" id="verdict">${escapeHtml(HOSTILE)}</p>`));
});

test("hostile language button labels are escaped", () => {
  const out = withPatch(LANGS.en, "label", HOSTILE, () => render("en", "<!-- render:langs -->"));
  assert.doesNotMatch(out, /<img|<script/);
  assert.ok(out.includes(`>${escapeHtml(HOSTILE)}</button>`));
});
