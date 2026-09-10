import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { MAX_CONFIRMED_AREAS } from "@/features/capability/capabilityTypes";
import { analyzeNarrativeWithRules } from "@/features/capability/narrativeAnalysis";

const source = (path: string) => readFileSync(path, "utf8");
const readJson = (path: string) => JSON.parse(source(path)) as Record<string, unknown>;

const START = "src/features/capability/CapabilitySnapshotStart.tsx";
const ACTIONS = "src/features/capability/capabilityActions.ts";

// ---------------------------------------------------------------------------
// Die Rueckfrage selbst
// ---------------------------------------------------------------------------
test("the suggestions arrive unchecked - the question must not answer itself", () => {
  const component = source(START);

  // Vorbelegte Haken sind keine Bestaetigung. Wer drei gesetzte Haken sieht,
  // klickt weiter; genau das wollte die Rueckfrage verhindern.
  assert.match(component, /setChosen\(\[\]\)/);
  assert.match(component, /checked=\{isChosen\}/);
  assert.doesNotMatch(component, /defaultChecked=\{true\}/);
});

test("at most three areas can be confirmed, and none is a valid answer", () => {
  assert.equal(MAX_CONFIRMED_AREAS, 3);

  const component = source(START);
  // Ueber der Grenze werden weitere Vorschlaege gesperrt, statt die Auswahl
  // still zu beschneiden.
  assert.match(component, /current\.length < MAX_CONFIRMED_AREAS/);
  assert.match(component, /const blocked = !isChosen && chosen\.length >= MAX_CONFIRMED_AREAS/);
  // "Bis zu drei" heisst auch: null ist erlaubt und wird gesagt.
  assert.match(component, /confirm\.noneIsFine/);
  assert.doesNotMatch(component, /disabled=\{chosen\.length === 0\}/);
});

test("every suggestion carries the terms it came from", () => {
  const component = source(START);
  assert.match(component, /area\.matchedTerms\.join\(", "\)/);
  assert.match(component, /confirm\.matchedTerms/);
});

test("the page says where the assignment comes from", () => {
  const component = source(START);
  // Traegt jetzt "regelbasiert, kein Modell" und ist der Platz, an dem eine
  // spaetere Modell-Zuordnung gekennzeichnet werden muss.
  assert.match(component, /confirm\.engine\.\$\{analysis\.engine\}/);

  for (const locale of ["de", "en"]) {
    const messages = readJson(`messages/${locale}/capability.json`);
    const engine = (messages.confirm as Record<string, Record<string, string>>).engine;
    assert.ok(engine.rules, `${locale}: Kennzeichnung fuer die Regel-Zuordnung fehlt`);
    assert.ok(engine.model, `${locale}: Kennzeichnung fuer eine Modell-Zuordnung fehlt`);
  }
});

test("the narrative stays readable and editable at the point of confirmation", () => {
  const component = source(START);
  // Ohne den Text davor ist die Frage "war das deine Staerke?" nicht zu
  // beantworten.
  assert.match(component, /confirm\.showNarrative/);
  assert.match(component, /setAnalysis\(null\)/, "zurueck zum Text muss moeglich sein");
});

test("the analysis runs in the browser, so the text stays on the device", () => {
  const component = source(START);
  assert.match(component, /"use client"/);
  assert.match(component, /await analyzeNarrativeWithRules\(/);
  // Kein eigener Netzweg fuer die Auswertung. Gespeichert wird erst, was das
  // Formular abschickt.
  assert.doesNotMatch(component, /fetch\(/);
});

// ---------------------------------------------------------------------------
// Was der Server aus der Bestaetigung macht
// ---------------------------------------------------------------------------
test("a confirmed selection is not overruled by the rule engine", () => {
  const actions = source(ACTIONS);

  // Der Kern der Sache: Nach einer Bestaetigung darf die Auswertung nicht
  // mehr laufen, sonst waere die Rueckfrage Theater.
  assert.match(actions, /const analysis = confirmed\s*\n?\s*\? null/);
  assert.match(actions, /const recognised = confirmed \? chosen :/);
});

test("rejecting every suggestion is respected, not treated as no answer", () => {
  const actions = source(ACTIONS);

  // Eine leere Auswahl mit Bestaetigung landet im Auffangwert - nicht in den
  // Bereichen, die die Person gerade abgelehnt hat.
  assert.match(actions, /recognised\.length \? recognised : \["other"\]/);
  assert.match(actions, /formData\.get\("areas_confirmed"\) === "1"/);
});

test("the server caps and deduplicates what the form sends", () => {
  const actions = source(ACTIONS);
  // Das Formular begrenzt schon, aber das Formular ist nicht die Grenze.
  assert.match(actions, /new Set\(/);
  assert.match(actions, /\.slice\(0, MAX_CONFIRMED_AREAS\)/);
});

test("without JavaScript the flow still assigns instead of dead-ending", () => {
  const component = source(START);
  const actions = source(ACTIONS);

  assert.match(component, /<noscript>/);
  assert.match(component, /type="submit"/);
  // Ohne Bestaetigungsmarke ordnet die Server Action selbst zu.
  assert.match(actions, /: await analyzeNarrativeWithRules\(\{ narrative, locale: "de" \}\)/);
});

test("an area that never existed is reported as an area problem", () => {
  const actions = source(ACTIONS);
  assert.match(actions, /inserted\.error\.message\.includes\("area_id"\) \? "area" : "save"/);
});

// ---------------------------------------------------------------------------
// Copy
// ---------------------------------------------------------------------------
test("the confirmation admits it can be wrong", async () => {
  const de = readJson("messages/de/capability.json");
  const confirm = de.confirm as Record<string, string>;

  // Die Rueckfrage soll nicht als Befund auftreten. Das ist keine Kosmetik:
  // Eine selbstsichere Fehlzuordnung uebernehmen Leute, eine vorsichtige
  // korrigieren sie.
  assert.match(confirm.text, /danebenliegen|falsch|kann/i);
  assert.match(confirm.emptyText, /Begriffsliste/);
  // Und der leere Fall darf nicht wie ein Mangel der Person klingen.
  assert.match(confirm.emptyText, /sagt nichts über deine Beschreibung/);
});

test("both locales carry the whole confirmation step", () => {
  const de = readJson("messages/de/capability.json").confirm as Record<string, unknown>;
  const en = readJson("messages/en/capability.json").confirm as Record<string, unknown>;
  assert.deepEqual(Object.keys(de), Object.keys(en));

  for (const key of ["title", "text", "pickLabel", "matchedTerms", "submit", "back", "emptyTitle"]) {
    assert.ok(de[key], `de fehlt confirm.${key}`);
    assert.ok(en[key], `en fehlt confirm.${key}`);
  }
});

test("the notice after a confirmed selection differs from the one after a guess", () => {
  const notices = readJson("messages/de/capability.json").notices as Record<string, string>;
  const page = source("src/app/(product)/profile/page.tsx");

  // Wer schon bestaetigt hat, soll im naechsten Schritt nicht erneut gefragt
  // werden, ob die Zuordnung passt.
  assert.ok(notices.confirmed, "notices.confirmed fehlt");
  assert.doesNotMatch(notices.confirmed, /Prüf, ob das passt/);
  // Unbekannte Schluessel erscheinen als roher Schluesselpfad - die Allowlist
  // muss den neuen Wert kennen.
  assert.match(page, /const NOTICE_KEYS = \["recognised", "confirmed", "unmatched"\]/);
});

// ---------------------------------------------------------------------------
// Die Auswertung, die hinter der Rueckfrage steht
// ---------------------------------------------------------------------------
test("what the confirmation shows is what the rule engine produced", async () => {
  const analysis = await analyzeNarrativeWithRules({
    narrative:
      "Ich habe unseren ersten Enterprise-Kunden von der ersten Ansprache bis zum unterschriebenen Vertrag begleitet.",
    locale: "de",
  });

  assert.ok(analysis.areas.length > 0, "sonst gaebe es nichts zu bestaetigen");
  assert.ok(analysis.areas.length <= MAX_CONFIRMED_AREAS);
  for (const area of analysis.areas) {
    assert.ok(area.matchedTerms.length > 0, `${area.areaId} ohne Begruendung angezeigt`);
  }
  // Unter Regeln gibt es keine abgeleitete Staerke; die Rueckfrage bietet
  // Bereiche an, nicht Formulierungen.
  assert.equal(analysis.strength, null);
  assert.equal(analysis.engine, "rules");
});
