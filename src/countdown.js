import { RELEASE } from "./content.js";
import { LANGS, t } from "./i18n/index.js";

// Time left until `release`, split for display. A partly used second still counts as a whole one,
// so it only reads zero (and `done`) from the release moment on. All zero once it has passed.
export function timeLeft(release, now) {
  const total = Math.max(0, Math.ceil((release - now) / 1000));
  return {
    done: total === 0,
    days: Math.floor(total / 86400),
    hours: Math.floor(total / 3600) % 24,
    minutes: Math.floor(total / 60) % 60,
    seconds: total % 60,
  };
}

export function countdownNote(lang, now) {
  if (timeLeft(RELEASE, now).done) return t(lang, "released");
  const date = RELEASE.toLocaleDateString(LANGS[lang].locale, { day: "numeric", month: "short", year: "numeric" });
  return t(lang, "countdown")(date);
}
