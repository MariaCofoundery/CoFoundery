import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { ANALYZED_AREA_IDS, scoreAreasByTerms } from "@/features/capability/narrativeAnalysis";
import { CV_INDUSTRY_KEYS, INDUSTRY_TERMS } from "@/features/profile/cvIndustries";
import {
  CV_MAX_EXPERTISE,
  CV_MAX_INDUSTRIES,
  CV_MIN_LENGTH,
  analyzeCv,
  mergeIntoList,
} from "@/features/profile/cvMatching";

const source = (path: string) => readFileSync(path, "utf8");

/** Ein Lebenslauf, lang genug, um ausgewertet zu werden. */
const CV = `
Lebenslauf

2021 bis heute – Head of Product, medizintechnik-hersteller in München
Verantwortlich für Produktmanagement und Roadmap. Enge Zusammenarbeit mit
Zulassung und Regulatorik, laufende Kundeninterviews mit Kliniken.

2017 bis 2021 – Senior Developer, Softwarehaus in Berlin
Backend und Frontend, Aufbau einer Data Pipeline, Betreuung der Datenbank.

2014 bis 2017 – Unternehmensberatung, Schwerpunkt Prozessoptimierung
Strategische Planung und Jahresplanung für Mandanten aus der Chemieindustrie.
`.trim();

// ---------------------------------------------------------------------------
// Das Verfahren
// ---------------------------------------------------------------------------
test("aus einem Lebenslauf werden Kenntnisse und Branchen erkannt", () => {
  const result = analyzeCv(CV);
  const expertise = result.expertise.map((entry) => entry.key);
  const industries = result.industries.map((entry) => entry.key);

  assert.ok(expertise.includes("product_management"), "Produktmanagement nicht erkannt");
  assert.ok(expertise.includes("software_engineering"), "Softwareentwicklung nicht erkannt");
  assert.ok(industries.includes("medtech"), "Medizintechnik nicht erkannt");
  assert.ok(industries.includes("consulting"), "Beratung nicht erkannt");
});

test("jeder Vorschlag trägt die Wörter mit, die zu ihm geführt haben", () => {
  // Nie eine Blackbox: Wer "Vertrieb" vorgeschlagen bekommt, soll sehen,
  // woran das hängt - und widersprechen können.
  const result = analyzeCv(CV);
  for (const suggestion of [...result.expertise, ...result.industries]) {
    assert.ok(suggestion.matchedTerms.length > 0, `${suggestion.key} ohne Begründung`);
    for (const term of suggestion.matchedTerms) {
      assert.ok(
        CV.toLocaleLowerCase("de-DE").includes(term),
        `${suggestion.key}: "${term}" steht gar nicht im Text`
      );
    }
  }
});

test("es wird nie mehr vorgeschlagen, als ins Profil passt", () => {
  // `expertise` nimmt acht Einträge, `industries` fünf. Mehr vorzuschlagen
  // hieße, eine Auswahl anzubieten, die beim Speichern stillschweigend
  // abgeschnitten wird.
  const everything = [
    ...ANALYZED_AREA_IDS.flatMap((areaId) => scoreAreasByTerms(areaId, 1)).map((entry) => entry.areaId),
    ...CV_INDUSTRY_KEYS.flatMap((key) => INDUSTRY_TERMS[key]),
  ].join(" ");
  const result = analyzeCv(everything);
  assert.ok(result.expertise.length <= CV_MAX_EXPERTISE);
  assert.ok(result.industries.length <= CV_MAX_INDUSTRIES);
});

test("zu wenig Text ergibt kein Ergebnis statt eines schwachen", () => {
  const result = analyzeCv("Ich bin Entwickler.");
  assert.deepEqual(result, { expertise: [], industries: [] });
  assert.ok(CV_MIN_LENGTH > 100, "die Schwelle ist zu niedrig, um etwas zu bedeuten");
});

test("nichts zu finden ist ein gültiges Ergebnis", () => {
  // Der haeufige Fall bei ungewoehnlichen Werdegaengen. Er darf nicht durch
  // einen schwachen Treffer verdeckt werden.
  const unrelated = "Ich habe lange in einem Bereich gearbeitet, den diese Liste nicht kennt. ".repeat(5);
  const result = analyzeCv(unrelated);
  assert.equal(result.expertise.length, 0);
  assert.equal(result.industries.length, 0);
});

// ---------------------------------------------------------------------------
// Was mit dem passiert, was schon dasteht
// ---------------------------------------------------------------------------
test("eigene Einträge überleben und behalten den Vorrang", () => {
  // Es waere absurd, eine Begriffsliste ueber die eigene Formulierung eines
  // Menschen zu stellen. Bestehende Eintraege stehen vorn und behalten bei
  // Ueberlauf den Platz.
  assert.equal(
    mergeIntoList("Vertrieb, Fundraising", ["Product Management"], 8),
    "Vertrieb, Fundraising, Product Management"
  );
  assert.equal(mergeIntoList("A, B, C", ["D", "E"], 3), "A, B, C");
});

test("nichts wird doppelt eingetragen", () => {
  assert.equal(mergeIntoList("Vertrieb", ["vertrieb", "Fundraising"], 8), "Vertrieb, Fundraising");
  assert.equal(mergeIntoList("", ["Vertrieb", "Vertrieb"], 8), "Vertrieb");
  assert.equal(mergeIntoList("  ", [], 8), "");
});

// ---------------------------------------------------------------------------
// Das Vokabular
// ---------------------------------------------------------------------------
test("es gibt nur EIN Kompetenz-Vokabular", () => {
  // Die 43 Bereiche des Capability-Modells sind kuratiert und gegen die
  // Migration getestet. Eine zweite Liste fuer den Lebenslauf waere sofort eine
  // zweite Wahrheit gewesen - beide waeren auseinandergelaufen.
  const matching = source("src/features/profile/cvMatching.ts");
  assert.match(matching, /scoreAreasByTerms/);
  assert.doesNotMatch(matching, /customer_discovery|software_engineering/);
});

test("jede Branche hat Erkennungswörter und eine Beschriftung in beiden Sprachen", () => {
  for (const key of CV_INDUSTRY_KEYS) {
    assert.ok(INDUSTRY_TERMS[key]?.length > 0, `${key} hat keine Erkennungswörter`);
  }
  assert.equal(
    new Set(Object.values(INDUSTRY_TERMS).flat()).size,
    Object.values(INDUSTRY_TERMS).flat().length,
    "dasselbe Wort steht bei zwei Branchen – der Vorschlag wäre beliebig"
  );

  for (const locale of ["de", "en"]) {
    const labels = (
      JSON.parse(readFileSync(`messages/${locale}/capability.json`, "utf8")) as {
        industryLabels: Record<string, string>;
      }
    ).industryLabels;
    for (const key of CV_INDUSTRY_KEYS) {
      assert.ok(labels?.[key], `${locale}: industryLabels.${key} fehlt`);
    }
  }
});

// ---------------------------------------------------------------------------
// Das Versprechen an die Person
// ---------------------------------------------------------------------------
test("der Lebenslauf verlässt den Browser nicht – und das steht auch da", () => {
  const field = source("src/features/profile/CvImportField.tsx");
  assert.match(field, /^"use client";/);
  // Kein Netzwerkweg: keine Serveraktion, kein fetch, kein Upload.
  assert.doesNotMatch(field, /fetch\(|"use server"|FormData|action=/);
  // Und die reine Funktion, die hier laeuft, greift auf nichts zu.
  const matching = source("src/features/profile/cvMatching.ts");
  assert.doesNotMatch(matching, /fetch\(|supabase|server-only/);

  for (const locale of ["de", "en"]) {
    const cv = (
      JSON.parse(readFileSync(`messages/${locale}/capability.json`, "utf8")) as {
        identity: { cv: Record<string, string> };
      }
    ).identity.cv;
    assert.match(
      cv.privacyNote,
      locale === "de" ? /Browser/ : /browser/,
      `${locale}: das Versprechen steht nicht da`
    );
    assert.match(
      cv.privacyNote,
      locale === "de" ? /nicht[\s\S]*gespeichert/ : /not stored/,
      `${locale}: dass nichts gespeichert wird, fehlt`
    );
  }
});

test("nichts wird ohne Häkchen übernommen", () => {
  const field = source("src/features/profile/CvImportField.tsx");
  // Vorausgewaehlt waere eine Uebernahme durch die Hintertuer.
  assert.match(field, /setChosen\(new Set\(\)\)/);
  assert.match(field, /disabled=\{chosen\.size === 0\}/);
});

test("wenn nichts gefunden wird, sagt es das – ohne den Menschen zu bewerten", () => {
  for (const locale of ["de", "en"]) {
    const cv = (
      JSON.parse(readFileSync(`messages/${locale}/capability.json`, "utf8")) as {
        identity: { cv: Record<string, string> };
      }
    ).identity.cv;
    assert.ok(cv.nothingFound, `${locale}: nothingFound fehlt`);
    // Der Hinweis muss die Grenze beim VERFAHREN verorten, nicht beim Werdegang.
    assert.match(
      cv.nothingFoundHint,
      locale === "de" ? /Verfahren|Liste/ : /method|list/,
      `${locale}: der Hinweis lässt es wie ein Urteil über die Person aussehen`
    );
  }
});
