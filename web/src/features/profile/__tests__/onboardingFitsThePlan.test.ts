import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Jede Frage im Einstieg hat Antworten, die zu ihr passen - und zwar für den,
 * der sie bekommt.
 *
 * ---------------------------------------------------------------------------
 * WAS SCHIEFGING
 * ---------------------------------------------------------------------------
 *
 * Maria am 29.09.2026, nach einem Test als Advisor: „Da kam dann auch die
 * Frage… die war ein bisschen unverständlich.“
 *
 * Zwei Dinge auf einmal. Die Folie hieß „Woran arbeitest du gerade?“ und bot
 * „Suche“, „Partner-Match“ und „Selbsttest“ an - das sind keine Antworten auf
 * diese Frage. Und alle drei beschreiben, wen man zum Gründen sucht; für einen
 * Advisor passte keine.
 *
 * Wer eine Frage gestellt bekommt, auf die keine der Antworten passt, sucht
 * den Fehler bei sich.
 */

const form = readFileSync(join("src", "features", "profile", "ProfileBasicsForm.tsx"), "utf8");
const actions = readFileSync(join("src", "features", "profile", "actions.ts"), "utf8");

const texts = (locale: string) =>
  JSON.parse(readFileSync(join("messages", locale, "profile.json"), "utf8")) as {
    basicsForm: {
      intentions: Record<string, { label: string; description: string }>;
      onboarding: { steps: Record<string, { title: string; hint: string }> };
    };
  };

const listOf = (name: string) =>
  [...(form.match(new RegExp(`const ${name} = \\[([^\\]]+)\\]`))?.[1] ?? "")
    .matchAll(/"([^"]+)"/g)].map((match) => match[1]);

test("es gibt eine eigene Liste für Advisor", () => {
  const advisor = listOf("ADVISOR_INTENTIONS");
  const founder = listOf("FOUNDER_INTENTIONS");
  assert.ok(advisor.length >= 2, "keine Advisor-Liste gefunden");
  assert.ok(founder.length >= 2, "keine Founder-Liste gefunden");
  assert.notDeepEqual(advisor, founder, "beide Listen sind gleich - dann war die Trennung umsonst");
});

test("keine reine Founder-Antwort steht in der Advisor-Liste", () => {
  const advisor = listOf("ADVISOR_INTENTIONS");
  for (const nurFounder of ["Suche", "Partner-Match"]) {
    assert.ok(
      !advisor.includes(nurFounder),
      `„${nurFounder}“ beschreibt, wen man zum Gründen sucht - das tut ein Advisor hier nicht`,
    );
  }
});

test("jede angebotene Antwort hat in beiden Sprachen einen Text", () => {
  // Fehlt einer, zeigt next-intl den Schluessel an - „intentions.Begleiten.label“
  // mitten im Einstieg.
  const alle = [...new Set([...listOf("FOUNDER_INTENTIONS"), ...listOf("ADVISOR_INTENTIONS")])];
  assert.ok(alle.length >= 4);
  for (const locale of ["de", "en"]) {
    const intentions = texts(locale).basicsForm.intentions;
    for (const entry of alle) {
      assert.ok(intentions[entry]?.label?.trim(), `${locale}: ${entry} ohne Beschriftung`);
      assert.ok(intentions[entry]?.description?.trim(), `${locale}: ${entry} ohne Erklärung`);
    }
  }
});

test("die bisherigen Werte bleiben gültig", () => {
  // Profile, die es schon gibt, tragen sie. Sie zu entfernen hiesse, dass die
  // Serverpruefung ein bestehendes Profil beim naechsten Speichern ablehnt.
  for (const alt of ["Suche", "Partner-Match", "Selbsttest"]) {
    assert.ok(actions.includes(`"${alt}"`), `${alt} ist aus den erlaubten Werten gefallen`);
  }
});

test("jede neue Antwort ist auch serverseitig erlaubt", () => {
  // Sonst bietet die Oberflaeche etwas an, das die Serverfunktion abweist -
  // und die Person kommt aus dem Einstieg nicht heraus.
  for (const entry of listOf("ADVISOR_INTENTIONS")) {
    assert.ok(actions.includes(`"${entry}"`), `${entry} fehlt in ALLOWED_INTENTIONS`);
  }
});

test("die Frage passt zu ihren Antworten", () => {
  // „Woran arbeitest du gerade?“ mit den Antworten „Suche / Partner-Match /
  // Selbsttest“ war die Stelle, an der es hakte.
  for (const locale of ["de", "en"]) {
    const title = texts(locale).basicsForm.onboarding.steps.intention.title;
    assert.ok(
      !/Woran arbeitest du|What are you working on/i.test(title),
      `${locale}: die alte Frage steht noch da`,
    );
    assert.ok(title.trim().length > 10, locale);
  }
});

test("die Liste hängt wirklich am Plan", () => {
  // Gegenprobe: Ohne den Aufruf waere die Trennung Dekoration.
  assert.match(form, /intentionsForPlan\(plan\)\.map/);
  assert.match(form, /plan === "advisor"\) return ADVISOR_INTENTIONS/);
});

// ---------------------------------------------------------------------------
// Der ganze Einstieg, Folie fuer Folie, fuer alle vier Wahlmoeglichkeiten
// ---------------------------------------------------------------------------

test("jede Folie, die jemand bekommt, hat in beiden Sprachen Titel und Hinweis", () => {
  // Ein fehlender Text zeigt den Schluessel an - "onboarding.steps.focus.hint"
  // mitten im Einstieg.
  const alleSchritte = [...(form.match(/ONBOARDING_STEPS_FULL = \[([^\]]+)\]/)?.[1] ?? "")
    .matchAll(/"(\w+)"/g)].map((match) => match[1]);
  assert.ok(alleSchritte.length >= 6, `nur ${alleSchritte.length} Schritte gefunden`);

  for (const locale of ["de", "en"]) {
    const steps = texts(locale).basicsForm.onboarding.steps;
    for (const step of alleSchritte) {
      assert.ok(steps[step]?.title?.trim(), `${locale}: ${step} ohne Titel`);
      assert.ok(steps[step]?.hint?.trim(), `${locale}: ${step} ohne Hinweis`);
    }
  }
});

test("„Nur Netzwerk“ bekommt keine Folie, deren Antworten es für ihn nicht gibt", () => {
  // Schwerpunkt und Absicht sind auf Produktrollen zugeschnitten. Wer nur ins
  // Netzwerk will, bekommt sie deshalb gar nicht erst.
  const kurz = [...(form.match(/ONBOARDING_STEPS_CONNECT = \[([^\]]+)\]/)?.[1] ?? "")
    .matchAll(/"(\w+)"/g)].map((match) => match[1]);
  assert.ok(kurz.length >= 3);
  for (const nurProduktrolle of ["focus", "intention", "avatar"]) {
    assert.ok(!kurz.includes(nurProduktrolle), `„Nur Netzwerk“ bekommt ${nurProduktrolle}`);
  }
});

test("der Bereich Align wird dem Advisor anders erklärt als dem Founder", () => {
  // „Hier klaerst du, wie DU arbeitest“ beschreibt die Founder-Sicht. Ein
  // Advisor fuellt in Align nichts aus - er sieht, was ihm freigegeben wurde.
  assert.match(form, /areaTextKey\(area, plan\)/);
  assert.match(form, /plan === "advisor"\) return "onboarding\.areas\.align\.textAdvisor"/);

  for (const locale of ["de", "en"]) {
    const areas = (texts(locale).basicsForm.onboarding as unknown as {
      areas: Record<string, Record<string, string>>;
    }).areas;
    assert.ok(areas.align.textAdvisor?.trim(), `${locale}: kein Advisor-Text für Align`);
    assert.notEqual(
      areas.align.textAdvisor,
      areas.align.text,
      `${locale}: derselbe Text - dann war die Unterscheidung umsonst`,
    );
  }
});

test("der Schlusssatz spricht den Advisor nicht als Ausfüllenden an", () => {
  for (const locale of ["de", "en"]) {
    const onboarding = texts(locale).basicsForm.onboarding as unknown as Record<string, string>;
    assert.ok(onboarding.nonDiagnosticHintAdvisor?.trim(), `${locale}: kein Schlusssatz für Advisor`);
    assert.notEqual(onboarding.nonDiagnosticHintAdvisor, onboarding.nonDiagnosticHint, locale);
  }
});

test("wo dasselbe für alle gilt, gibt es auch nur einen Text", () => {
  // Gegenprobe zur Rollenunterscheidung: Sie soll die Ausnahme bleiben. Find
  // und Connect bedeuten fuer alle dasselbe - dort waeren zwei Texte zwei
  // Stellen, die auseinanderlaufen koennen.
  for (const locale of ["de", "en"]) {
    const areas = (texts(locale).basicsForm.onboarding as unknown as {
      areas: Record<string, Record<string, string>>;
    }).areas;
    for (const area of ["find", "connect"]) {
      assert.ok(!areas[area].textAdvisor, `${locale}: ${area} hat einen Sondertext ohne Not`);
    }
  }
});
