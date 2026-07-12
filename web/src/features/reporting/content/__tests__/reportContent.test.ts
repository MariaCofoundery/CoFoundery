import assert from "node:assert/strict";
import test from "node:test";
import { getReportContent } from "@/features/reporting/content/reportContent";
import {
  findEnglishReportCopyQualityIssues,
  findGermanResidueInEnglishReportCopy,
} from "@/features/reporting/content/reportCopyGuards";

function collectStringValues(value: unknown): string[] {
  if (typeof value === "string") {
    return [value];
  }

  if (Array.isArray(value)) {
    return value.flatMap(collectStringValues);
  }

  if (value && typeof value === "object") {
    return Object.values(value).flatMap(collectStringValues);
  }

  return [];
}

test("getReportContent returns German report labels by default", () => {
  const content = getReportContent();

  assert.equal(content.dimensions.Unternehmenslogik.canonicalName, "Unternehmenslogik");
  assert.equal(content.dimensions.Unternehmenslogik.reportLeftPole, "substanz & aufbauorientiert");
  assert.equal(content.dimensions.Konfliktstil.reportRightPole, "direkt");
  assert.equal(content.headings.dynamicsOverview, "Eure Dynamik im Überblick");
  assert.equal(content.headings.centralPatterns, "Zentrale Muster");
  assert.equal(content.headings.conversationPrompts, "Gesprächsimpulse");
  assert.equal(content.headings.conversationPromptsIntro, "Gesprächsimpulse für euer nächstes Gespräch");
  assert.equal(content.headings.nextStep, "Nächster Schritt");
  assert.equal(content.sectionLabels.strength, "Eure gemeinsame Stärke");
  assert.equal(content.sectionLabels.complement, "Wo ihr euch ergänzt");
  assert.equal(content.sectionLabels.clarificationField, "Früh besprechen");
  assert.equal(content.statusLabels.nah, "Nahe Basis");
  assert.equal(content.matchHeadlines.session, "Euer Dynamik-Report ist fertig.");
  assert.equal(
    content.matchHeadlines.tension_led,
    "Ein zentrales Spannungsfeld wird bei euch früh im Alltag sichtbar."
  );
  assert.equal(
    content.matchHeadlines.alignment_led,
    "Ihr habt eine tragfähige Basis, aber nicht automatisch dieselben Maßstäbe."
  );
  assert.equal(
    content.introSummaries.session,
    "Dieser Snapshot zeigt euch eure gemeinsamen Muster, Unterschiede und Abstimmungspunkte als visuelle Momentaufnahme."
  );
  assert.equal(
    content.introSummaries.complement_led,
    "Euer Unterschied ist weder automatisch Problem noch automatisch Stärke. Er wird wertvoll, wenn klar ist, wann er euch erweitert und wann er Führung braucht."
  );
  assert.equal(
    content.introSummaries.alignment_led,
    "Vieles ist bei euch anschlussfähig. Gerade deshalb lohnt sich ein genauer Blick darauf, wo gemeinsame Linie endet und klares Führen beginnt."
  );
  assert.equal(
    content.centralPatternBodies.corePattern.tensionWithDimension,
    "{dimension} ist der Punkt, an dem ihr nicht automatisch nach denselben Maßstäben schaut."
  );
  assert.equal(
    content.centralPatternBodies.everydayImpact.fallback,
    "Im Alltag zeigt sich das weniger in großen Szenen, sondern in Prioritäten, Timing und unausgesprochenen Erwartungen."
  );
  assert.equal(
    content.centralPatternBodies.consequence.agreementFocusWithDimension,
    "Der wichtigste Arbeitsauftrag liegt aktuell bei {dimension}. Dort braucht ihr eine explizite Vereinbarung."
  );
  assert.equal(
    content.dimensionReadings.insufficientData,
    "Für diese Dimension liegen noch nicht genug Daten für eine belastbare gemeinsame Einordnung vor."
  );
  assert.equal(
    content.dimensionReadings.kritisch,
    "Hier liegt ein deutliches Spannungsfeld. Ihr lest diese Dimension nicht automatisch aus derselben Logik heraus."
  );
  assert.equal(
    content.dimensionBusinessMeanings.Unternehmenslogik.critical,
    "Wenn ihr das nicht klärt, könnt ihr am selben Unternehmen mit verschiedenen Grundlogiken arbeiten."
  );
  assert.equal(
    content.dimensionBusinessMeanings.Konfliktstil.default,
    "Wenn ihr das offen lasst, fühlt sich eine Person leicht überfahren und die andere ausgebremst."
  );
});

test("getReportContent returns English report labels for locale en", () => {
  const content = getReportContent("en");

  assert.equal(content.dimensions.Unternehmenslogik.canonicalName, "Company logic");
  assert.equal(content.dimensions.Unternehmenslogik.reportLeftPole, "substance and build-oriented");
  assert.equal(content.dimensions.Konfliktstil.reportRightPole, "direct");
  assert.equal(content.headings.dynamicsOverview, "Your dynamics at a glance");
  assert.equal(content.headings.centralPatterns, "Key patterns");
  assert.equal(content.headings.conversationPrompts, "Conversation prompts");
  assert.equal(content.headings.conversationPromptsIntro, "Conversation prompts for your next discussion");
  assert.equal(content.headings.nextStep, "Next step");
  assert.equal(content.sectionLabels.strength, "Your shared strength");
  assert.equal(content.sectionLabels.complement, "Where you complement each other");
  assert.equal(content.sectionLabels.clarificationField, "Discuss early");
  assert.equal(content.sectionLabels.possibleTensionFields, "Areas to align on");
  assert.equal(content.statusLabels.abstimmung_nötig, "Needs alignment");
  assert.equal(content.matchHeadlines.session, "Your founder dynamics report is ready.");
  assert.equal(
    content.matchHeadlines.complement_led,
    "Complementary dynamics worth exploring."
  );
  assert.equal(
    content.matchHeadlines.alignment_led,
    "A strong starting point for your working dynamics."
  );
  assert.equal(
    content.introSummaries.session,
    "This snapshot shows your shared patterns, differences, and alignment points as a visual moment in time."
  );
  assert.equal(
    content.introSummaries.complement_led,
    "Your difference is neither automatically a problem nor automatically a strength. It becomes useful when you know where it broadens the team and where it needs clear leadership."
  );
  assert.equal(
    content.introSummaries.alignment_led,
    "Many things look workable between you. It is still worth clarifying where shared direction ends and explicit agreements should begin."
  );
  assert.equal(
    content.centralPatternBodies.corePattern.tensionWithDimension,
    "{dimension} is the area where you may not naturally use the same criteria."
  );
  assert.equal(
    content.centralPatternBodies.everydayImpact.fallback,
    "Day to day, this is less about big moments and more about priorities, timing, and unspoken expectations."
  );
  assert.equal(
    content.centralPatternBodies.consequence.agreementFocusWithDimension,
    "The most important working topic right now is {dimension}. This is where an explicit agreement will help."
  );
  assert.equal(
    content.dimensionReadings.insufficientData,
    "There is not enough data for this dimension yet to give a reliable shared reading."
  );
  assert.equal(
    content.dimensionReadings.ergänzend,
    "This could create useful complementarity when roles, timing, and decision rights are handled clearly."
  );
  assert.equal(
    content.dimensionBusinessMeanings.Unternehmenslogik.critical,
    "If you do not clarify this, you may work on the same company with different underlying logics."
  );
  assert.equal(
    content.dimensionBusinessMeanings.Konfliktstil.default,
    "If this stays implicit, one person may feel overrun while the other feels slowed down."
  );
});

test("getReportContent falls back to German for unsupported locales", () => {
  assert.equal(getReportContent("fr").dimensions.Entscheidungslogik.shortLabel, "Entscheidung");
  assert.equal(getReportContent("fr").headings.centralPatterns, "Zentrale Muster");
  assert.equal(getReportContent(null).dimensions.Risikoorientierung.shortLabel, "Risiko");
  assert.equal(
    getReportContent("fr").dimensionBusinessMeanings.Commitment.default,
    "Wenn ihr das nicht klärt, entsteht leicht Frust über Tempo, Verfügbarkeit und Verantwortung."
  );
  assert.equal(
    getReportContent("fr").matchHeadlines.complement_led,
    "Euer Unterschied kann euch breiter machen, wenn ihr ihn bewusst führt."
  );
  assert.equal(
    getReportContent("fr").introSummaries.tension_led,
    "Die zentrale Reibung liegt weniger im Umgangston als in der Frage, woran ihr Richtung, Entscheidungen oder Zusammenarbeit bemesst."
  );
  assert.equal(
    getReportContent("fr").centralPatternBodies.corePattern.fallback,
    "Ihr habt genug gemeinsame Linie für Zusammenarbeit, aber nicht genug Gleichlauf für stilles Verständnis."
  );
});

test("report content lookup does not transform stored payload text", () => {
  const storedPayloadText =
    "Gespeicherter Payload-Text bleibt in der Sprache, in der der Report erzeugt wurde.";
  const payload = {
    founderReport: {
      executiveSummary: {
        summaryIntro: storedPayloadText,
      },
    },
  };

  getReportContent("en");

  assert.equal(payload.founderReport.executiveSummary.summaryIntro, storedPayloadText);
});

test("English report labels pass the report copy quality guards", () => {
  const visibleEnglishValues = collectStringValues(getReportContent("en")).join("\n");

  assert.deepEqual(findEnglishReportCopyQualityIssues(visibleEnglishValues), []);
  assert.deepEqual(findGermanResidueInEnglishReportCopy(visibleEnglishValues), []);
});

test("German and English report content keep the same label map shape", () => {
  const german = getReportContent("de");
  const english = getReportContent("en");

  assert.deepEqual(Object.keys(english.dimensions), Object.keys(german.dimensions));
  assert.deepEqual(Object.keys(english.headings), Object.keys(german.headings));
  assert.deepEqual(Object.keys(english.centralPatternLabels), Object.keys(german.centralPatternLabels));
  assert.deepEqual(Object.keys(english.matchHeadlines), Object.keys(german.matchHeadlines));
  assert.deepEqual(Object.keys(english.introSummaries), Object.keys(german.introSummaries));
  assert.deepEqual(Object.keys(english.centralPatternBodies), Object.keys(german.centralPatternBodies));
  assert.deepEqual(
    Object.keys(english.centralPatternBodies.corePattern),
    Object.keys(german.centralPatternBodies.corePattern)
  );
  assert.deepEqual(
    Object.keys(english.centralPatternBodies.everydayImpact),
    Object.keys(german.centralPatternBodies.everydayImpact)
  );
  assert.deepEqual(
    Object.keys(english.centralPatternBodies.consequence),
    Object.keys(german.centralPatternBodies.consequence)
  );
  assert.deepEqual(Object.keys(english.statusLabels), Object.keys(german.statusLabels));
  assert.deepEqual(Object.keys(english.dimensionReadings), Object.keys(german.dimensionReadings));
  assert.deepEqual(
    Object.keys(english.dimensionBusinessMeanings),
    Object.keys(german.dimensionBusinessMeanings)
  );
  assert.deepEqual(Object.keys(english.sectionLabels), Object.keys(german.sectionLabels));
  assert.deepEqual(Object.keys(english.valuesLabels), Object.keys(german.valuesLabels));
});
