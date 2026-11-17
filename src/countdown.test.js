import { test } from "node:test";
import assert from "node:assert/strict";
import { timeLeft, countdownNote } from "./countdown.js";
import { RELEASE } from "./content.js";
import { LANGS, t } from "./i18n/index.js";

const R = RELEASE.getTime();
const SEC = 1000, MIN = 60 * SEC, HOUR = 60 * MIN, DAY = 24 * HOUR;
const zero = { done: true, days: 0, hours: 0, minutes: 0, seconds: 0 };
const oneSecond = { done: false, days: 0, hours: 0, minutes: 0, seconds: 1 };

test("exactly at the release it is done and everything is zero", () => {
  assert.deepEqual(timeLeft(RELEASE, R), zero);
});

test("after the release it stays done and never goes negative", () => {
  for (const after of [1, 999, SEC, MIN, DAY, 400 * DAY]) assert.deepEqual(timeLeft(RELEASE, R + after), zero, `${after}ms after`);
});

test("one second before the release shows 1 second and is not done", () => {
  assert.deepEqual(timeLeft(RELEASE, R - SEC), oneSecond);
});

test("less than a second before the release is not done yet and shows 1 second", () => {
  for (const ms of [1, 500, 999]) assert.deepEqual(timeLeft(RELEASE, R - ms), oneSecond, `${ms}ms before`);
});

test("fractional milliseconds around the release are not rounded away", () => {
  assert.equal(timeLeft(RELEASE, R - 0.5).done, false);
  assert.equal(timeLeft(RELEASE, R - 1000.5).seconds, 2);
  assert.equal(timeLeft(RELEASE, R + 0.5).done, true);
});

test("a second and a millisecond before shows 2 seconds", () => {
  assert.equal(timeLeft(RELEASE, R - SEC - 1).seconds, 2);
});

test("days, hours, minutes and seconds are split correctly", () => {
  const left = 3 * DAY + 4 * HOUR + 5 * MIN + 6 * SEC;
  assert.deepEqual(timeLeft(RELEASE, R - left), { done: false, days: 3, hours: 4, minutes: 5, seconds: 6 });
});

test("unit rollovers: 59s, 60s, 59m59s, 1h, 23h59m59s, 1 day", () => {
  assert.deepEqual(timeLeft(RELEASE, R - 59 * SEC), { done: false, days: 0, hours: 0, minutes: 0, seconds: 59 });
  assert.deepEqual(timeLeft(RELEASE, R - 60 * SEC), { done: false, days: 0, hours: 0, minutes: 1, seconds: 0 });
  assert.deepEqual(timeLeft(RELEASE, R - (HOUR - SEC)), { done: false, days: 0, hours: 0, minutes: 59, seconds: 59 });
  assert.deepEqual(timeLeft(RELEASE, R - HOUR), { done: false, days: 0, hours: 1, minutes: 0, seconds: 0 });
  assert.deepEqual(timeLeft(RELEASE, R - (DAY - SEC)), { done: false, days: 0, hours: 23, minutes: 59, seconds: 59 });
  assert.deepEqual(timeLeft(RELEASE, R - DAY), { done: false, days: 1, hours: 0, minutes: 0, seconds: 0 });
});

test("a long way off still splits cleanly", () => {
  const left = 1000 * DAY + 23 * HOUR + 59 * MIN + 59 * SEC;
  assert.deepEqual(timeLeft(RELEASE, R - left), { done: false, days: 1000, hours: 23, minutes: 59, seconds: 59 });
});

test("now can be a Date or a number", () => {
  assert.deepEqual(timeLeft(RELEASE, new Date(R - DAY)), timeLeft(RELEASE, R - DAY));
});

test("the parts always add up to the time left, for many instants", () => {
  for (let i = 0; i < 500; i++) {
    const ms = Math.floor(Math.random() * 90 * DAY) - 2 * SEC;
    const l = timeLeft(RELEASE, R - ms);
    assert.equal(l.days * 86400 + l.hours * 3600 + l.minutes * 60 + l.seconds, Math.max(0, Math.ceil(ms / SEC)), `${ms}ms`);
    assert.ok(l.hours < 24 && l.minutes < 60 && l.seconds < 60);
    assert.equal(l.done, ms <= 0);
  }
});

test("the countdown note shows the release date before release, in each language", () => {
  for (const lang of Object.keys(LANGS)) {
    const note = countdownNote(lang, R - DAY);
    assert.notEqual(note, t(lang, "released"));
    assert.ok(note.includes("2026"), `${lang}: ${note}`);
    assert.ok(note.includes("19"), `${lang}: ${note}`);
  }
  assert.ok(countdownNote("en", R - DAY).includes("19 Nov 2026"));
  assert.ok(countdownNote("de", R - DAY).includes("19. Nov"));
});

test("the countdown note switches to the released text at the exact release moment, and stays", () => {
  for (const lang of Object.keys(LANGS)) {
    assert.equal(countdownNote(lang, R), t(lang, "released"));
    assert.equal(countdownNote(lang, R + 1), t(lang, "released"));
    assert.equal(countdownNote(lang, R + 365 * DAY), t(lang, "released"));
  }
});

test("the countdown note does not say 'released' while any part of a second is left", () => {
  for (const lang of Object.keys(LANGS)) {
    for (const ms of [1, 500, 999, SEC]) assert.notEqual(countdownNote(lang, R - ms), t(lang, "released"), `${lang} ${ms}ms before`);
  }
});
