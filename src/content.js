// Ids, codes and costs are shared; only the text differs per language.

export const FIELDS = [
  { id: "name",  text: { en: { label: "Your name",             example: "Alex" },
                         de: { label: "Dein Name",             example: "Alex" } } },
  { id: "boss",  text: { en: { label: "Manager",               example: "Jordan" },
                         de: { label: "Führungskraft",         example: "Jordan" } } },
  { id: "cover", text: { en: { label: "Coworker to volunteer", example: "Sam from Accounting" },
                         de: { label: "Freiwillige Vertretung", example: "Sam aus der Buchhaltung" } } },
];

export const SYMPTOMS = [
  { id: "fever",   code: "VC-01", cost: 8,  text: {
      en: { label: "Vice City Fever",         line: "a high temperature and a strong urge to be somewhere with palm trees" },
      de: { label: "Vice-City-Fieber",        line: "erhöhte Temperatur und ein starkes Verlangen nach Palmen" } } },
  { id: "thumb",   code: "TH-02", cost: 10, text: {
      en: { label: "Thumb stiffness",         line: "stiff thumbs that my doctor says need a full day of repetitive motion therapy" },
      de: { label: "Daumensteifheit",         line: "steife Daumen, die laut ärztlichem Rat einen ganzen Tag Bewegungstherapie brauchen" } } },
  { id: "light",   code: "PH-03", cost: 6,  text: {
      en: { label: "Sensitivity to daylight", line: "sensitivity to daylight, so I'll be resting with the curtains closed" },
      de: { label: "Lichtempfindlichkeit",    line: "eine starke Lichtempfindlichkeit, weshalb ich mich bei geschlossenen Vorhängen ausruhe" } } },
  { id: "hearing", code: "AU-04", cost: 12, text: {
      en: { label: "Selective hearing loss",  line: "a hearing problem that blocks out phone calls and Slack notifications" },
      de: { label: "Selektiver Hörverlust",   line: "ein Hörproblem, das Anrufe und Slack-Benachrichtigungen ausblendet" } } },
  { id: "tired",   code: "SL-05", cost: 15, text: {
      en: { label: "Mysterious exhaustion",   line: "exhaustion from being up very late last night for reasons unrelated to any midnight launch" },
      de: { label: "Rätselhafte Erschöpfung", line: "Erschöpfung, weil ich letzte Nacht sehr lange wach war, aus Gründen, die nichts mit einem Mitternachts-Release zu tun haben" } } },
  { id: "wanted",  code: "WL-06", cost: 9,  text: {
      en: { label: "Five-star anxiety",       line: "a racing heart and a constant feeling that I'm being chased" },
      de: { label: "Fünf-Sterne-Angst",       line: "Herzrasen und das ständige Gefühl, verfolgt zu werden" } } },
  { id: "loading", code: "LD-07", cost: 7,  text: {
      en: { label: "Brain buffering",         line: "a foggy head that feels stuck on a loading screen" },
      de: { label: "Hirn-Buffering",          line: "einen vernebelten Kopf, der auf einem Ladebildschirm festhängt" } } },
  { id: "spread",  code: "CX-08", cost: 14, text: {
      en: { label: "Highly contagious",       line: "something highly contagious that mostly affects people aged 18 to 45" },
      de: { label: "Hochansteckend",          line: "etwas Hochansteckendes, das vor allem Menschen zwischen 18 und 45 trifft" } } },
];

export const TONES = [
  { id: "pro", cost: 0, text: {
      en: { label: "Professional",
            subject: n => `Sick day: ${n}`,
            open: b => `Hi ${b},\n\nI woke up unwell this morning and won't be able to work today.`,
            syms: l => `I'm dealing with ${l}.`,
            none: "I'd rather not go into detail.",
            sign: "Best regards," },
      de: { label: "Professionell",
            subject: n => `Krankmeldung: ${n}`,
            open: b => `Hallo ${b},\n\nich bin heute Morgen krank aufgewacht und kann heute leider nicht arbeiten.`,
            syms: l => `Ich habe ${l}.`,
            none: "Die Details erspare ich uns lieber.",
            sign: "Viele Grüße" } } },
  { id: "drama", cost: 10, text: {
      en: { label: "Dramatic",
            subject: () => `I may not survive the day`,
            open: b => `Dear ${b},\n\nI write to you from what may be my deathbed.`,
            syms: l => `My symptoms include ${l}. Doctors are baffled. One of them wept.`,
            none: "My symptoms are too terrible to describe.",
            sign: "With what strength I have left," },
      de: { label: "Dramatisch",
            subject: () => `Ich überlebe den Tag vielleicht nicht`,
            open: b => `Hallo ${b},\n\nich melde mich von meinem womöglichen Sterbebett.`,
            syms: l => `Ich habe ${l}. Die Ärzte sind ratlos. Einer hat geweint.`,
            none: "Meine Symptome sind zu schrecklich, um sie zu beschreiben.",
            sign: "Mit letzter Kraft" } } },
  { id: "detail", cost: 18, text: {
      en: { label: "Suspiciously detailed",
            subject: () => `Absence notice (please read all 4 sections)`,
            open: b => `Hi ${b},\n\nAt exactly 6:00 AM this morning, which is a completely normal time to be awake on a Thursday, I came down with something.`,
            syms: l => `Specifically, I have ${l}. I have documented all of this in a spreadsheet, available on request.`,
            none: "I have documented the symptoms in a spreadsheet, available on request.",
            sign: "Thanks in advance for not asking follow-up questions," },
      de: { label: "Verdächtig detailliert",
            subject: () => `Abwesenheitsmeldung (bitte alle 4 Abschnitte lesen)`,
            open: b => `Hallo ${b},\n\nheute Morgen um exakt 6:00 Uhr, eine völlig normale Uhrzeit, um an einem Donnerstag wach zu sein, hat es mich erwischt.`,
            syms: l => `Konkret habe ich ${l}. Ich habe alles in einer Tabelle dokumentiert, die ich auf Anfrage gern zur Verfügung stelle.`,
            none: "Die Symptome habe ich in einer Tabelle dokumentiert, die ich auf Anfrage gern zur Verfügung stelle.",
            sign: "Danke im Voraus für keine Rückfragen" } } },
  { id: "lazy", cost: 25, text: {
      en: { label: "Barely trying",
            subject: () => `sick`,
            open: b => `hey ${b.toLowerCase()}\n\nsick. not coming in.`,
            syms: l => `symptoms: ${l.toLowerCase()}.`,
            none: "",
            sign: "ttyl," },
      de: { label: "Minimaler Aufwand",
            subject: () => `krank`,
            open: b => `hey ${b.toLowerCase()}\n\nkrank. komm nicht.`,
            syms: l => `symptome: ${l.toLowerCase()}.`,
            none: "",
            sign: "bis dann" } } },
];

export const RETURNS = [
  { id: "tomorrow", cost: 0, text: {
      en: { label: "Tomorrow",              line: "I expect to be back tomorrow." },
      de: { label: "Morgen",                line: "Ich bin voraussichtlich morgen wieder da." } } },
  { id: "monday", cost: 8, text: {
      en: { label: "Next week",             line: "I should be well enough to return early next week." },
      de: { label: "Nächste Woche",         line: "Anfang nächster Woche sollte ich wieder fit sein." } } },
  { id: "story", cost: 30, text: {
      en: { label: "After the main story",  line: "I expect to be back once I finish the main story. Recovery time varies." },
      de: { label: "Nach der Hauptstory",   line: "Ich bin zurück, sobald ich die Hauptstory durchgespielt habe. Die Genesungsdauer kann variieren." } } },
  { id: "hundred", cost: 45, text: {
      en: { label: "At 100% completion",    line: "I'll be back when I reach 100% completion. Please don't give away my desk." },
      de: { label: "Bei 100 % Abschluss",   line: "Ich bin zurück, wenn ich 100 % erreicht habe. Bitte vergebt meinen Schreibtisch nicht." } } },
];

export const VERDICTS = [
  { min: 80, text: { en: "HR will never know.",                        de: "Die Personalabteilung wird es nie erfahren." } },
  { min: 60, text: { en: "Your manager raises one eyebrow.",           de: "Deine Führungskraft hebt eine Augenbraue." } },
  { min: 40, text: { en: "Your manager checks your online status.",    de: "Deine Führungskraft prüft deinen Online-Status." } },
  { min: 20, text: { en: "Your manager has also called in sick.",      de: "Deine Führungskraft hat sich auch krankgemeldet." } },
  { min: 0,  text: { en: "Just send a screenshot of the title screen.", de: "Schick einfach einen Screenshot vom Titelbildschirm." } },
];

export const PS_COST = 10;
export const RELEASE = new Date(2026, 10, 19, 0, 0, 0); // last announced release date
export const EXAMPLE_SYMPTOMS = ["fever", "thumb", "light"];

// The form as it looks before the visitor changes anything.
export function exampleState(lang) {
  const example = id => FIELDS.find(f => f.id === id).text[lang].example;
  return {
    name: example("name"),
    boss: example("boss"),
    cover: example("cover"),
    symptoms: [...EXAMPLE_SYMPTOMS],
    tone: TONES[0].id,
    ret: RETURNS[0].id,
    ps: false,
  };
}
