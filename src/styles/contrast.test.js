import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Reads the colour tokens for each theme straight from tokens.css, so this checks what ships.
const css = readFileSync(new URL("./tokens.css", import.meta.url), "utf8");

function block(selector) {
  const start = css.indexOf(selector);
  assert.notEqual(start, -1, `${selector} not found in tokens.css`);
  const body = css.slice(css.indexOf("{", start) + 1, css.indexOf("}", start));
  return Object.fromEntries([...body.matchAll(/--([a-z-]+):\s*(#[0-9a-f]{6})\b/gi)].map(([, name, hex]) => [name, hex]));
}

const light = block(":root {");
const themes = { light, dark: { ...light, ...block(':root[data-theme="dark"]') } };

function luminance(hex) {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// Every [text, background] pair the stylesheet uses for words.
const TEXT_PAIRS = [
  ["ink", "bg"], ["ink", "surface"],
  ["muted", "bg"], ["muted", "surface"],
  ["hot", "bg"], ["hot", "surface"],
  ["sea", "bg"], ["sea", "surface"],
  ["on-hot", "hot"],
  ["bg", "ink"],
];
// Focus rings and the meter fill only need 3:1 against what is around them.
const UI_PAIRS = [["sea", "bg"], ["sea", "surface"], ["sea", "line"], ["hot", "line"]];

for (const [name, tokens] of Object.entries(themes)) {
  test(`${name} theme: text colours reach 4.5:1`, () => {
    for (const [fg, bg] of TEXT_PAIRS) {
      const ratio = contrast(tokens[fg], tokens[bg]);
      assert.ok(ratio >= 4.5, `--${fg} on --${bg} is ${ratio.toFixed(2)}:1`);
    }
  });

  test(`${name} theme: focus rings and meter colours reach 3:1`, () => {
    for (const [fg, bg] of UI_PAIRS) {
      const ratio = contrast(tokens[fg], tokens[bg]);
      assert.ok(ratio >= 3, `--${fg} against --${bg} is ${ratio.toFixed(2)}:1`);
    }
  });
}

test("the dark theme in the media query matches the explicit dark theme", () => {
  assert.deepEqual(block(':root:not([data-theme="light"])'), block(':root[data-theme="dark"]'));
});
