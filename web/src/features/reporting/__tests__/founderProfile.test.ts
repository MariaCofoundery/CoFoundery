import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(path, "utf8");
/** Ohne Kommentare - sonst findet die Pruefung Begriffe in ihrer Begruendung. */
const codeOnly = (path: string) =>
  source(path)
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

const PAGE = "src/app/me/profile/page.tsx";
const CAPABILITY = "src/features/reporting/FounderProfileCapability.tsx";
const BASE = "src/features/reporting/FounderProfileBase.tsx";

// ---------------------------------------------------------------------------
// Das Founderprofil
// ---------------------------------------------------------------------------
//
// GEWUENSCHT AM 21.09.2026: "Ein Accelerator hat mich jetzt gefragt nach dem
// Einzeltest, und da haette ich gerne, dass man da eben auch so eine
// Einzelauswertung hat fuer eine einzelne Person und nicht nur in
// Kompatibilitaet mit einem anderen Founder."
//
// Architektur in `web/docs/founder-profile-and-advisor-access-brief.md`.

test("das Profil liest die vorhandenen Quellen und legt keine neue an", () => {
  // DIE ENTSCHEIDUNG: keine eigene Profiltabelle. Eine Kopie laeuft genau dann
  // auseinander, wenn jemand eine Angabe zurueckzieht - wer seine
  // Sichtbarkeit aendert, aber in einer zweiten Tabelle steht die Angabe noch,
  // hat nicht widerrufen, sondern nur den einen Ort geaendert, den er kannte.
  const page = codeOnly(PAGE);
  assert.match(page, /getPersonCore/);
  assert.match(page, /getLatestSelfAlignmentReport/);
  assert.match(page, /getOwnCapabilityEntries/);
  // Kein Schreibzugriff, keine eigene Tabelle, keine Server Action.
  assert.doesNotMatch(page, /\.insert\(|\.update\(|\.upsert\(|"use server"/);
  assert.doesNotMatch(page, /founder_profiles|person_profile_snapshots/);
});

test("das Selbstbild wird nicht nachgebaut, sondern dasselbe Bauteil benutzt", () => {
  // Zwei Ansichten derselben Auswertung waeren zwei Orte, an denen ein
  // Dimensionsname stehen kann - und einer davon waere irgendwann der alte.
  assert.match(codeOnly(PAGE), /<SelfReportView report=\{report\}/);
});

test("die Erzaehlungen aus dem Interview stehen nicht im Profil", () => {
  // DIE WICHTIGSTE ZUSAGE DIESER SEITE. Sie ist zum Ausdrucken und
  // Weitergeben gedacht, und Frage 3 des Interviews fragt ausdruecklich nach
  // dem Leben ausserhalb der Erwerbsarbeit - dort stehen dann Pflege,
  // Ehrenamt, Familie. Wer sein Profil weitergibt, gibt Faehigkeiten weiter,
  // nicht diese Geschichten.
  const capability = codeOnly(CAPABILITY);
  assert.doesNotMatch(capability, /\.narrative/);
  assert.doesNotMatch(codeOnly(PAGE), /\.narrative/);
  // Die ANZAHL der Belege ist erlaubt und gewollt: Sie sagt, dass hinter dem
  // Haken ein Ereignis steht, ohne es zu erzaehlen.
  assert.match(capability, /entry\.evidence\.length/);
});

test("es gibt keine Gesamtzahl und keinen Score", () => {
  // Ein unvalidiertes Instrument, das eine Zahl je Person ausgibt, wird als
  // Auswahlkriterium benutzt, sobald es existiert - und dann entscheidet diese
  // Zahl darueber, wer in ein Programm kommt. Den Schaden traegt die Person.
  const all = [codeOnly(PAGE), codeOnly(CAPABILITY), codeOnly(BASE)].join("\n");
  assert.doesNotMatch(all, /score|Score|percent|Prozent|ranking|Rangliste|gesamt|overall/);
});

test("das Profil behauptet nichts Ungebautes", () => {
  // Das Produkt verspricht hier nur, was es hat. Derselbe Grundsatz wie beim
  // Interview, das nicht behauptet, ein Coach zu fragen, solange es keinen
  // gibt.
  //
  // GEÄNDERT AM 22.09.2026: Hier stand zusätzlich, dass das Wort "Direction"
  // auf der Seite gar nicht vorkommen darf - damals, weil es die Perspektive
  // noch nicht gab. Jetzt gibt es sie, und sie steht hier: bestätigte
  // Aussagen, nach Rubriken. Die Zusage ist dieselbe geblieben, nur ist der
  // Ausschluss nicht mehr ihr Inhalt.
  const all = [source(PAGE), source("messages/de/profile.json"), source("messages/en/profile.json")].join("\n");
  assert.doesNotMatch(all, /demnaechst|coming soon|in Vorbereitung/i);
});

test("die vierte Säule zeigt nur Bestätigtes - und keine Geschichten", () => {
  // GEWÜNSCHT AM 22.09.2026: "Das Interview gehört auch auf die
  // Gesamtbild-Seite."
  //
  // Es wird dieselbe Grenze gezogen wie bei den Fähigkeiten: Die Antworten
  // aus dem Gespräch bleiben, wo sie hingehören. Auf ein Profil, das man
  // ausdruckt und weitergibt, gehören die Aussagen - nicht die Geschichten,
  // aus denen sie entstanden sind.
  const page = codeOnly(PAGE);
  assert.match(page, /getDirectionStatements/);
  assert.doesNotMatch(page, /getDirectionAnswers|direction_statement_proposals/);
  const view = codeOnly("src/features/reporting/FounderProfileDirection.tsx");
  assert.doesNotMatch(view, /quote|evidence|answer/);
  // Und ein fehlender Teil wird benannt, mit dem Weg dorthin.
  assert.match(page, /href="\/profile\/direction"/);
});

test("eine fehlende Saeule wird benannt, aber nicht mitgedruckt", () => {
  // Ein Profil, dem ohne Hinweis ein Drittel fehlt, sieht aus wie ein
  // vollstaendiges Profil einer Person, ueber die es wenig zu sagen gibt.
  // Im weitergegebenen Ausdruck waere der Hinweis dagegen eine Aufforderung
  // an die falsche Person.
  const page = codeOnly(PAGE);
  assert.match(page, /MissingPillar/);
  // NACHGEZOGEN AM 24.09.2026: Hier stand der vollstaendige Klassenname
  // samt `mt-6`. Den Abstand setzt seit dem Umbau die Saeule, nicht mehr
  // der Hinweis - der Test fiel damit ueber eine Aenderung, die mit
  // seinem Anliegen nichts zu tun hat. Geprueft wird jetzt genau das
  // Anliegen: Der Hinweis erscheint auf dem Bildschirm und nicht im
  // Ausdruck, und er sieht wie ein Platzhalter aus, nicht wie Inhalt.
  assert.match(page, /className="no-print[^"]*border-dashed/);
  // NACHGEZOGEN AM 30.09.2026: Hier stand `/me/base` - der alte Fragebogen.
  // Neue Konten bekommen ihn nicht mehr angeboten; der Hinweis schickte sie
  // also an eine Stelle, die es fuer sie nicht gibt. Der Weg fuehrt jetzt zum
  // aktuellen Arbeitsprofil, und `/me/base` darf hier nicht mehr stehen.
  assert.match(page, /href="\/founder-alignment\/profil"/);
  assert.doesNotMatch(page, /href="\/me\/base"/);
  assert.match(page, /href="\/profile\/interview"/);
});

test("die Seite ist die eigene und gibt nichts frei", () => {
  // `/me/*` ist die eigene Ansicht. Wer sie weitergibt, tut es selbst und
  // bewusst, per Ausdruck oder PDF. Ein Freigabeweg fuer Advisors und
  // Acceleratoren ist ein eigenes Vorhaben mit eigener Einwilligung.
  const page = codeOnly(PAGE);
  assert.match(page, /redirect\("\/login\?next=\/me\/profile"\)/);
  assert.match(page, /getOwnCapabilityEntries\(supabase, user\.id\)/);
  // Kein Fremdzugriff: keine userId aus Parametern, keine Freigabe-RPC.
  assert.doesNotMatch(page, /params|searchParams|get_disclosed_capability|advisor/);
  assert.match(page, /PrintReportButton/);
});

test("die Bereiche stehen in der Reihenfolge des Vokabulars", () => {
  // Sonst in der Folge, in der jemand sie eingetragen hat - und das liest sich
  // wie eine Rangfolge, die niemand gemeint hat.
  assert.match(codeOnly(PAGE), /areaOrder\.get\(a\.area_id\)/);
});

test("die Profilseite fuehrt zum zusammengestellten Profil", () => {
  // Ohne Weg dorthin gibt es die Seite nur fuer den, der die Adresse kennt.
  const profilePage = codeOnly("src/app/(product)/profile/page.tsx");
  assert.match(profilePage, /href="\/me\/profile"/);
  assert.match(profilePage, /viewFounderProfile/);
});

test("beide Sprachen haben alle Saetze", () => {
  const keys = ["eyebrow", "unnamed", "intro", "backToDashboard"];
  for (const locale of ["de", "en"]) {
    const bundle = JSON.parse(source(`messages/${locale}/profile.json`)) as {
      founderProfile: Record<string, Record<string, string> | string>;
    };
    const block = bundle.founderProfile;
    for (const key of keys) {
      assert.ok(block[key], `${locale}: ${key} fehlt`);
    }
    for (const section of ["base", "capability", "missingReport", "missingCapability"]) {
      assert.ok(block[section], `${locale}: ${section} fehlt`);
    }
    const capability = block.capability as Record<string, string>;
    assert.match(capability.evidenceCount, /plural/, `${locale}: die Anzahl beugt nicht`);
    const capabilityBundle = JSON.parse(source(`messages/${locale}/capability.json`)) as Record<string, unknown>;
    assert.ok(capabilityBundle.viewFounderProfile, `${locale}: der Weg dorthin hat kein Label`);
  }
});

test("das Ergebnis sagt, was es ist - und wird mitgedruckt", () => {
  // GEWÜNSCHT AM 23.09.2026: "Mir ist wichtig, dass das valide, reliabel,
  // objektiv ist - bestmöglich wissenschaftlichen Standards entspricht."
  //
  // DIE LÜCKE, DIE DAS SCHLIESST: Die Dokumentation war ehrlich
  // (`self-report-model-validation.md`: "empirisch noch nicht validiert";
  // `capability-model-technical-brief.md`: "Validierung: keine"). Das PRODUKT
  // sagte davon nichts. Wer den Report ausdruckt und weitergibt, übergibt
  // etwas, das aussieht wie ein Testergebnis.
  const note = codeOnly("src/features/reporting/InstrumentNote.tsx");
  // Mitgedruckt - anders als die Hinweise auf fehlende Teile. In der
  // weitergegebenen Fassung ist dieser Satz am wichtigsten.
  assert.doesNotMatch(note, /no-print/);

  for (const page of [PAGE, "src/app/me/report/page.tsx"]) {
    assert.match(codeOnly(page), /<InstrumentNote/, `${page}: die Einordnung fehlt`);
  }

  for (const locale of ["de", "en"]) {
    const copy = (
      JSON.parse(source(`messages/${locale}/report.json`)) as {
        instrumentNote: Record<string, string>;
      }
    ).instrumentNote;
    for (const key of ["title", "selfReport", "notATest", "snapshot", "purpose"]) {
      assert.ok(copy[key], `${locale}: ${key} fehlt`);
    }
    // Die vier Aussagen müssen die vier Dinge auch wirklich sagen.
    assert.match(copy.selfReport!, /von dir|from you/i, `${locale}: Selbstbericht`);
    assert.match(copy.notATest!, /kein validiertes|not a validated/i, `${locale}: kein Test`);
    assert.match(copy.notATest!, /Norm|norm/, `${locale}: kein Normvergleich`);
    assert.match(copy.snapshot!, /Momentaufnahme|snapshot/i, `${locale}: Momentaufnahme`);
    assert.match(copy.purpose!, /Auswahl|selection/i, `${locale}: nicht für Auswahl`);
  }
});

test("die Arbeitsweise steht auch im Gesamtbild - aber ohne den Deutungshinweis", () => {
  // NACHGETRAGEN AM 24.09.2026. Auf die Frage "wo sehe ich das mit den Soft
  // Skills" war die Antwort: auf der Profilseite, aber nicht im Gesamtbild.
  // Das war inkonsequent - das Gesamtbild ist die Seite, die man weitergibt.
  const page = codeOnly(PAGE);
  assert.match(page, /<FounderProfileStrengths/);
  assert.match(page, /getPersonStrengths/);

  const view = codeOnly("src/features/reporting/FounderProfileStrengths.tsx");
  // Beide Blicke stehen da - das ist der Ertrag des Perspektivwechsels.
  assert.match(view, /selfFrequency/);
  assert.match(view, /reflectedFrequency/);
  // Der Hinweis auf den Unterschied NICHT: Auf der eigenen Profilseite ist er
  // eine Einladung zum Nachdenken; in einer weitergegebenen Fassung läse sich
  // derselbe Satz wie ein Befund über einen Menschen.
  assert.doesNotMatch(view, /strengthGap|others_see_more|others_see_less/);
});

// ---------------------------------------------------------------------------
// Der Umbau vom 24.09.2026
// ---------------------------------------------------------------------------
//
// GEMELDET: "Ich finde, da muessten viel mehr Sachen zusammengeklappt sein.
// Sachen, die man selbst beantwortet hat, brauchen nicht mehr so ausfuehrlich
// dastehen [...] ansonsten ist es viel zu erschlagend, und es muesste bitte
// noch mal ein bisschen sortiert werden. Auch gerne ein bisschen farbig."
//
// Vorher: dreizehn gleich aussehende weisse Kaesten untereinander.

const SELF_REPORT = "src/features/reporting/SelfReportView.tsx";
const PILLAR = "src/features/reporting/ProfilePillar.tsx";
const COVERAGE_VIEW = "src/features/reporting/CoverageMap.tsx";
const COVERAGE_DATA = "src/features/reporting/founderProfileCoverage.ts";
const REPORT_PAGE = "src/features/reporting/IndividualReportPageContent.tsx";

test("die Seite steht in vier Saeulen, jede mit eigener Farbe", () => {
  const page = codeOnly(PAGE);

  // Die Saeulen waren in der Sprache laengst da, nur nie als Struktur.
  const tones = [...page.matchAll(/tone: "(\w+)"/g)].map((match) => match[1]);
  assert.deepEqual(tones, ["slate", "indigo", "emerald", "violet"]);

  // Und sie sind einmal als Daten beschrieben, damit der Ueberblick oben und
  // die Abschnitte darunter nicht auseinanderlaufen koennen.
  assert.equal([...page.matchAll(/<ProfilePillar/g)].length, 4);
  assert.match(page, /pillars\.map\(/);
  for (const index of [0, 1, 2, 3]) {
    assert.match(page, new RegExp(`id=\\{pillars\\[${index}\\]\\.id\\}`));
  }
});

test("die Farbe sagt, welche Saeule - nicht, wie gut", () => {
  const pillar = codeOnly(PILLAR);

  // Deshalb sitzt sie nur am Rahmen: Augenbraue, Randlinie, Zaehler. Waere
  // eine Saeule bernsteinfarben hinterlegt, liesse sich die Bedeutungsfarbe
  // innen (Bruchstelle, Luecke) nicht mehr davon unterscheiden.
  assert.match(pillar, /rule:|eyebrow:|badge:/);
  for (const semantic of ["amber", "rose", "red", "green-"]) {
    assert.ok(!pillar.includes(semantic), `keine Bedeutungsfarbe als Saeulenfarbe: ${semantic}`);
  }
});

test("die Ausfuehrungen sind eingeklappt, die Zusammenfassung nicht", () => {
  const report = codeOnly(SELF_REPORT);

  // Fuenf Abschnitte gehen zu: Alltag, Bruchstellen, Missverstaendnisse,
  // Hebel, Werte. Das Kernmuster mit der Dimensionskarte bleibt offen - es
  // IST die Zusammenfassung.
  assert.equal([...report.matchAll(/<ReportSection/g)].length, 5);
  assert.match(report, /density === "summary"/);
  assert.match(report, /<DimensionOverview/);
  // Die Dimensionskarte darf nicht mit in einen Aufklapper gerutscht sein.
  const summaryStart = report.indexOf("<DimensionOverview");
  const firstSection = report.indexOf("<ReportSection");
  assert.ok(summaryStart < firstSection, "die Dimensionskarte steht vor dem ersten Aufklapper");

  // DERSELBE INHALT, ZWEI DICHTEN: Es gibt keine zweite, kuerzere Fassung der
  // Texte - zwei Wahrheiten ueber denselben Menschen wuerden auseinanderlaufen.
  assert.ok(!report.includes("summaryText"), "keine eigene Kurzfassung der Texte");
});

test("die eigene Bereichsliste ist eingeklappt, die Auswertung steht offen", () => {
  const page = codeOnly(PAGE);

  // Genau die Reihenfolge, nach der gefragt wurde: erst das Bild, dann die
  // Auswertung, und die eigenen Antworten auf Wunsch.
  const map = page.indexOf("<CoverageMap");
  const readout = page.indexOf("<CapabilityReadoutSection");
  // NACHGEZOGEN AM 30.09.2026: Hier stand `indexOf("<ProfileDetails")`. Seit
  // die Saeule "Wie du arbeitest" ihre Antworten ebenfalls einklappt, findet
  // das den falschen Aufklapper - einen, der weiter oben auf der Seite steht.
  // Gemeint war immer der um die eigene Bereichsliste.
  const liste = page.indexOf("<FounderProfileCapability");
  const details = page.lastIndexOf("<ProfileDetails", liste);
  assert.ok(map > 0 && readout > map, "die Auswertung folgt auf die Karte");
  assert.ok(details > readout, "die eigene Liste steht zuletzt und eingeklappt");
  assert.match(page, /<ProfileDetails[\s\S]{0,400}<FounderProfileCapability/);
});

test("die Voreinstellung bleibt ausfuehrlich - die Berichtsseite aendert sich nicht", () => {
  // `/me/report` IST der ausfuehrliche Bericht; wer ihn oeffnet, will lesen.
  // Nur im Gesamtbild ist er einer von vier Teilen.
  assert.match(codeOnly(SELF_REPORT), /density = "full"/);
  const reportPage = codeOnly(REPORT_PAGE);
  assert.match(reportPage, /<SelfReportView report=\{report\}\s*\/>/);
  assert.ok(!reportPage.includes("density"), "die Berichtsseite gibt keine Dichte an");
});

test("beim Drucken geht alles wieder auf", () => {
  const page = codeOnly(PAGE);
  // Das Gesamtbild ist die Fassung, die weitergegeben wird. Ein zugeklapptes
  // `details` im PDF waere kein Schoenheitsfehler, sondern ein leeres Profil.
  assert.match(page, /<OpenDetailsForPrint \/>/);

  const opener = codeOnly("src/features/reporting/OpenDetailsForPrint.tsx");
  assert.match(opener, /beforeprint/);
  // Und danach steht die Seite wieder so da wie vorher.
  assert.match(opener, /afterprint/);
  assert.match(opener, /data-profile-details/);
});

test("die Grafik ist eine Deckungskarte und kein Netzdiagramm", () => {
  const view = codeOnly(COVERAGE_VIEW);
  const data = codeOnly(COVERAGE_DATA);

  // DIE WICHTIGSTE ZUSAGE DES UMBAUS. Ein Spinnennetz ueber die Familien
  // braucht je Familie EINE Zahl, also einen Score. Den gibt dieses Modell
  // nicht her - und ein unvalidiertes Instrument, das eine Zahl je Person
  // ausgibt, wird als Auswahlkriterium benutzt, sobald es existiert.
  for (const forbidden of ["radar", "spider", "polar", "score", "percent", "Prozent"]) {
    assert.ok(!view.includes(forbidden), `keine Note im Bild: ${forbidden}`);
    assert.ok(!data.includes(forbidden), `keine Note in der Rechnung: ${forbidden}`);
  }

  // Der Balken ist Schmuck - dieselbe Auskunft steht als Text daneben.
  assert.match(view, /aria-hidden/);
  assert.match(view, /copy\.familyCount|copy\.familyUnspoken/);
  // Und die Karte sagt selbst, worauf sie beruht.
  assert.match(view, /copy\.basis/);
});

// ---------------------------------------------------------------------------
// Die Saeule "Wie du arbeitest" liest den aktuellen Bogen
// ---------------------------------------------------------------------------
//
// UMGESTELLT AM 30.09.2026. Vorher stand hier `getLatestSelfAlignmentReport`
// mit `founder-compatibility-v1`. Dieser Bogen wird neuen Konten seit
// demselben Tag nicht mehr angeboten - fuer sie blieb die Saeule dauerhaft
// leer, und ihr Hinweis verlinkte auf einen Fragebogen, den sie nie sahen.

test("die Arbeitsweise kommt aus dem aktuellen Bogen", () => {
  const page = codeOnly(PAGE);

  // Dieselbe Funktion wie in der Advisor-Ansicht. Eine zweite Auswertung
  // daneben waere ein zweiter Ort, an dem etwas anderes stehen kann.
  assert.match(page, /getScopeReport\(user\.id, "founder_profile"\)/);
  assert.match(page, /<WorkMap sections=\{workProfile\.sections\}/);
  assert.match(page, /<ReportViewV21/);
});

test("das Arbeitsprofil bekommt keine Punktzahl und keine Deutung", () => {
  // Die Registratur sagt `overallScore: false` und `dimensionScores: false`.
  // Was hier stehen darf, sind die Antworten - und die Karte, die je Antwort
  // einen Punkt setzt, ohne zu rechnen.
  const page = codeOnly(PAGE);
  // KEIN `typ` IM MUSTER: Mit `i` traefe `[A-Z]` jeden Buchstaben, und
  // `type PillarTone` waere ein Treffer. Die Liste nennt deshalb nur Woerter,
  // die wirklich nach Verrechnung klingen.
  assert.ok(
    !/(score|mittelwert|average|punktzahl|percentile|typologie|typology)/i.test(page),
    "auf der Seite steht ein Wort, das nach Verrechnung klingt",
  );

  // Und der Bogen sagt selbst, was er ist. Drei Saetze, solange er `draft`
  // traegt: Selbstauskunft, keine Auswertung, keine Einordnung.
  for (const locale of ["de", "en"]) {
    const block = (
      JSON.parse(source(`messages/${locale}/profile.json`)) as {
        founderProfile: { workProfile: Record<string, string> };
      }
    ).founderProfile.workProfile;
    assert.ok(block.note?.trim(), `${locale}: der Hinweis fehlt`);
    assert.ok(
      /Selbstauskunft|Self-report/.test(block.note),
      `${locale}: der Hinweis sagt nicht, dass es eine Selbstauskunft ist`,
    );
  }
});

test("der alte Bericht steht darunter, datiert und zugeklappt - und wird nicht verrechnet", () => {
  const page = codeOnly(PAGE);

  // Nur bei Menschen, die ihn tatsaechlich haben.
  assert.match(page, /\{report \?\s*\(\s*<ProfileDetails/);
  // Datiert: Ohne Stand liest sich eine alte Auswertung wie eine aktuelle.
  assert.match(page, /legacyReport\.dated/);
  // Und er steht NACH dem neuen Bogen. Wer zuerst die alte Auswertung sieht,
  // haelt sie fuer die Hauptsache.
  const neu = page.indexOf("workProfile.title");
  const alt = page.indexOf("legacyReport.title");
  assert.ok(neu > 0 && alt > neu, "der Altbestand steht vor dem aktuellen Bogen");

  // KEINE GEMEINSAME DARSTELLUNG. Die WorkMap bekommt ausschliesslich die
  // Abschnitte des neuen Bogens; nichts wird aus `report` hineingereicht.
  assert.doesNotMatch(page, /<WorkMap[^>]*report/);
  assert.doesNotMatch(page, /workProfile[\s\S]{0,80}\breport\.(scores|dimensions)/);
});

test("die kleinen Ableitungen zeigen nur Bestaetigtes und behaupten keine Luecke", () => {
  const page = codeOnly(PAGE);

  // "Wohin du wachsen willst" steht eigenstaendig - und deshalb nicht noch
  // einmal in der Auswertung daneben.
  assert.match(page, /growingInto\.title/);
  assert.match(page, /finding\.key !== "growingInto"/);
  // Kein Leerzustand: Nichts ist eine gueltige Antwort.
  assert.match(page, /growingInto\.length > 0 \? \(/);

  // Ressourcen: nur `confirmed`. Ein offener Vorschlag ist eine
  // Modellbehauptung und darf nicht wie eine Aussage der Person aussehen.
  assert.match(page, /resource\.status === "confirmed"/);
  assert.ok(!/"pending"/.test(page), "die Seite kennt offene Vorschlaege");
});
