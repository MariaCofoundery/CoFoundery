import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { FOUNDER_PROFILE } from "@/features/instruments/align/registries";
import {
  BANDS,
  ITEMS_OF_THEME,
  NOMINAL_ITEMS,
  WORK_THEMES,
  bandOf,
  isNominalItem,
  synthesiseWorkProfile,
  themeOfItem,
  type SynthesisStatement,
} from "@/features/instruments/align/workProfileSynthesis";
import type { ReadoutEntry } from "@/features/instruments/v21/readoutV21";

const source = (path: string) => readFileSync(path, "utf8");
const codeOnly = (path: string) =>
  source(path)
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

const MODUL = join("src", "features", "instruments", "align", "workProfileSynthesis.ts");
const ANSICHT = join("src", "features", "instruments", "align", "WorkProfileSynthesisView.tsx");

const item = (id: string) => FOUNDER_PROFILE.items.find((eintrag) => eintrag.itemId === id)!;

/** Eine beantwortete geordnete Frage auf einer bestimmten Stufe (1..5). */
function ordinal(itemId: string, position: number): ReadoutEntry {
  const quelle = item(itemId);
  return {
    itemId,
    section: quelle.section,
    prompt: quelle.prompt,
    value: {
      kind: "ordinal",
      label: quelle.options![position - 1].label,
      position,
      of: quelle.options!.length,
    },
    missing: null,
  };
}

/** Eine gewaehlte Antwort ohne Rangfolge. */
function choice(itemId: string, index: number): ReadoutEntry {
  const quelle = item(itemId);
  return {
    itemId,
    section: quelle.section,
    prompt: quelle.prompt,
    value: { kind: "choice", label: quelle.options![index].label, text: null },
    missing: null,
  };
}

/** Eine Frage, die jemand nicht einschaetzen konnte. */
function missing(itemId: string): ReadoutEntry {
  const quelle = item(itemId);
  return {
    itemId,
    section: quelle.section,
    prompt: quelle.prompt,
    value: null,
    missing: { code: "cannot_assess", label: "kann ich noch nicht einschätzen" },
  };
}

const alsAbschnitte = (entries: ReadoutEntry[]) => [{ section: "egal", entries }];
const fuer = (entries: ReadoutEntry[], theme: (typeof WORK_THEMES)[number]) =>
  synthesiseWorkProfile(alsAbschnitte(entries)).find((eintrag) => eintrag.theme === theme);
const arten = (statements: SynthesisStatement[]) => statements.map((s) => s.kind);

// ---------------------------------------------------------------------------
// Das Instrument, wie es wirklich ist
// ---------------------------------------------------------------------------

test("dreizehn geordnete Fragen, drei ohne Rangfolge", () => {
  // GEPRUEFT GEGEN DIE REGISTRATUR, nicht gegen eine Spezifikation.
  const geordnet = FOUNDER_PROFILE.items.filter((i) => i.answerFormat === "ordinal_choice");
  const gewaehlt = FOUNDER_PROFILE.items.filter((i) => i.answerFormat === "single_choice");

  assert.equal(FOUNDER_PROFILE.items.length, 16);
  assert.equal(geordnet.length, 13);
  assert.deepEqual(
    gewaehlt.map((i) => i.itemId).sort(),
    [...NOMINAL_ITEMS].sort(),
  );

  // T01 SIEHT NACH EINER REIHENFOLGE AUS UND IST KEINE: Die fuenfte Antwort
  // heisst „situationsabhaengig" und liegt nirgends auf der Zeitachse.
  assert.ok(isNominalItem("T01"));
  assert.match(item("T01").options!.at(-1)!.label, /situationsabhängig/);

  // Jede Frage gehoert zu genau einem Thema, und keine fehlt.
  const zugeordnet = Object.values(ITEMS_OF_THEME).flat();
  assert.equal(new Set(zugeordnet).size, zugeordnet.length);
  assert.deepEqual(
    [...zugeordnet].sort(),
    FOUNDER_PROFILE.items.map((i) => i.itemId).sort(),
  );
  assert.equal(themeOfItem("I03"), "experience");
  assert.equal(themeOfItem("gibtsnicht"), null);
});

test("die Lage ist eine Lage und kein Messwert", () => {
  // Fuenf Stufen, drei Lagen - und die Mitte bleibt die Mitte.
  assert.equal(bandOf(1, 5), "low");
  assert.equal(bandOf(2, 5), "low");
  assert.equal(bandOf(3, 5), "middle");
  assert.equal(bandOf(4, 5), "high");
  assert.equal(bandOf(5, 5), "high");

  // Es wird nirgends gerechnet: kein Mittelwert, keine Summe, keine Punktzahl.
  const modul = codeOnly(MODUL);
  assert.ok(
    !/\breduce\(|\/ \w+\.length|Math\.(round|avg)|average|mittelwert|score/i.test(modul),
    "im Modul wird gerechnet",
  );
});

// ---------------------------------------------------------------------------
// Einheitliche Antworten
// ---------------------------------------------------------------------------

test("ueberall niedrig ergibt je Thema einen Satz", () => {
  const alles = [
    ordinal("A01", 1), ordinal("A02", 1),
    ordinal("I01", 1), ordinal("I02", 2), ordinal("I03", 1),
    ordinal("E01", 2), ordinal("E02", 1), ordinal("E03", 1),
    ordinal("X01", 1), ordinal("X02", 1), ordinal("X03", 2), ordinal("X04", 1),
  ];
  for (const theme of ["weighing", "experience", "trying", "openQuestions"] as const) {
    const thema = fuer(alles, theme)!;
    assert.deepEqual(arten(thema.statements), ["theme"], theme);
    assert.equal((thema.statements[0] as { band: string }).band, "low", theme);
  }
});

test("ueberall hoch ergibt ebenso je Thema einen Satz", () => {
  const alles = [ordinal("A01", 5), ordinal("A02", 4), ordinal("X01", 5), ordinal("X02", 4), ordinal("X03", 5), ordinal("X04", 4)];
  assert.deepEqual(arten(fuer(alles, "weighing")!.statements), ["theme"]);
  assert.deepEqual(arten(fuer(alles, "openQuestions")!.statements), ["theme"]);
});

// ---------------------------------------------------------------------------
// Auseinanderliegende Antworten - der eigentliche Punkt
// ---------------------------------------------------------------------------

test("das widerspruechliche I-Muster wird nicht glattgebuegelt", () => {
  // I01 und I02 niedrig, I03 hoch. NICHT „du entscheidest wenig intuitiv":
  // Das sind zwei verschiedene Lagen mit zwei verschiedenen Antworten.
  const thema = fuer([ordinal("I01", 1), ordinal("I02", 2), ordinal("I03", 5)], "experience")!;

  assert.deepEqual(arten(thema.statements), ["theme", "item"]);
  const zusammen = thema.statements[0] as Extract<SynthesisStatement, { kind: "theme" }>;
  const einzeln = thema.statements[1] as Extract<SynthesisStatement, { kind: "item" }>;
  // Zusammengefasst wird nur, was auch zusammen ausgefallen ist.
  assert.equal(zusammen.band, "low");
  assert.deepEqual(zusammen.itemIds, ["I01", "I02"]);
  // Und die abweichende Antwort bekommt IHREN eigenen Satz.
  assert.equal(einzeln.itemId, "I03");
  assert.equal(einzeln.band, "high");
});

test("das widerspruechliche E-Muster ergibt nicht 'du experimentierst gerne'", () => {
  const thema = fuer([ordinal("E01", 5), ordinal("E02", 1), ordinal("E03", 4)], "trying")!;
  assert.deepEqual(arten(thema.statements), ["theme", "item"]);
  assert.deepEqual((thema.statements[0] as { itemIds: string[] }).itemIds, ["E01", "E03"]);
  assert.equal((thema.statements[1] as { itemId: string }).itemId, "E02");
});

test("verschiedene Formen von Unsicherheit werden verschieden beschrieben", () => {
  const thema = fuer(
    [ordinal("X01", 1), ordinal("X02", 2), ordinal("X03", 3), ordinal("X04", 5)],
    "openQuestions",
  )!;
  assert.deepEqual(arten(thema.statements), ["theme", "item", "item"]);
  assert.deepEqual((thema.statements[0] as { itemIds: string[] }).itemIds, ["X01", "X02"]);
});

test("aus einer einzelnen Antwort wird nichts ueber ein Thema abgeleitet", () => {
  // Nur eine beantwortete geordnete Frage: Dann steht der Satz dieser Frage
  // da und kein Satz ueber das Thema.
  const thema = fuer([ordinal("A01", 5)], "weighing")!;
  assert.deepEqual(arten(thema.statements), ["item"]);
  assert.equal((thema.statements[0] as { itemId: string }).itemId, "A01");
});

// ---------------------------------------------------------------------------
// Die Wahlen ohne Rangfolge
// ---------------------------------------------------------------------------

test("T01, T02 und D01 landen auf keiner Achse", () => {
  const thema = fuer(
    [choice("T01", 4), choice("T02", 0), choice("D01", 2), ordinal("D02", 5)],
    "differences",
  )!;

  // Die geordnete Frage einzeln, die drei Wahlen im Wortlaut der Antwort.
  assert.deepEqual(arten(thema.statements), ["item", "choice", "choice", "choice"]);
  const wahlen = thema.statements.filter(
    (s): s is Extract<SynthesisStatement, { kind: "choice" }> => s.kind === "choice",
  );
  assert.deepEqual(
    wahlen.map((w) => [w.itemId, w.optionIndex]),
    [["T01", 4], ["T02", 0], ["D01", 2]],
  );

  // Keine Lage, kein „Konfliktstil", keine Zusammenziehung.
  const modul = codeOnly(MODUL);
  assert.ok(!/konfliktstil|directness|Direktheit|konfliktf/i.test(modul));
});

// ---------------------------------------------------------------------------
// Was nicht beantwortet ist
// ---------------------------------------------------------------------------

test("ueber eine unbeantwortete Frage steht nichts", () => {
  // „Kann ich noch nicht einschaetzen" ist eine Auskunft, aber keine ueber
  // die Arbeitsweise - und ganz sicher keine Mitte.
  const thema = fuer([ordinal("A01", 5), missing("A02")], "weighing")!;
  assert.deepEqual(arten(thema.statements), ["item"]);
  assert.equal((thema.statements[0] as { itemId: string }).itemId, "A01");
  assert.equal(thema.answered, 1);
  assert.equal(thema.of, 2);
});

test("ist ein Thema gar nicht beantwortet, sagt es das", () => {
  const thema = fuer([missing("I01"), missing("I02"), missing("I03")], "experience")!;
  assert.deepEqual(arten(thema.statements), ["tooFew"]);
  assert.equal(thema.answered, 0);
});

test("ein Thema ohne sichtbare Fragen erscheint gar nicht", () => {
  // Das ist der Fall beim Advisor: Was nicht freigegeben ist, kommt nicht mit
  // - und ueber ein Thema, von dem er keine Frage sieht, steht bei ihm nichts.
  const themen = synthesiseWorkProfile(alsAbschnitte([ordinal("A01", 3)]));
  assert.deepEqual(themen.map((t) => t.theme), ["weighing"]);
});

test("ein leerer Bogen ergibt gar keine Beschreibung", () => {
  assert.deepEqual(synthesiseWorkProfile([]), []);
  assert.deepEqual(synthesiseWorkProfile(alsAbschnitte([])), []);
});

// ---------------------------------------------------------------------------
// Keine Wiederbelebung der alten Auswertung
// ---------------------------------------------------------------------------

test("die alten v1-Dimensionen kommen nicht zurueck", () => {
  for (const datei of [MODUL, ANSICHT]) {
    const quelle = codeOnly(datei);
    for (const alt of [
      "Unternehmenslogik",
      "Commitment",
      "companyLogic",
      "riskTolerance",
      "Kippstelle",
      "Hebel",
      "misreading",
    ]) {
      assert.ok(!quelle.includes(alt), `${datei} benutzt ${alt} wieder`);
    }
  }

  // Und auch keine Typologie oder Prognose in den SAETZEN.
  //
  // Geprueft werden die Saetze, nicht der Hinweis darunter: Der sagt
  // ausdruecklich „keine Punktzahl", und ein Wortfilter ueber den ganzen
  // Block haette genau diese Verneinung fuer einen Verstoss gehalten.
  for (const locale of ["de", "en"]) {
    const syn = JSON.parse(source(join("messages", locale, "alignment.json"))).synthesis as {
      themes: Record<string, Record<string, string>>;
      items: Record<string, Record<string, string>>;
      choices: Record<string, Record<string, string>>;
    };
    const saetze = [syn.themes, syn.items, syn.choices]
      .flatMap((block) => Object.values(block).flatMap((eintrag) => Object.values(eintrag)))
      .join(" ");

    for (const verboten of [
      "Typ",
      "typology",
      "Prognose",
      "prognosis",
      "Punktzahl",
      "score",
      "percentile",
      "Durchschnitt",
      "average",
    ]) {
      assert.ok(!saetze.includes(verboten), `${locale}: „${verboten}" in einem Satz`);
    }

    // Keine Seinsaussagen: „Du bist ..." ist genau das, was die Daten nicht
    // tragen. „Du vergleichst", „wenn ...", „in dieser Situation" schon.
    assert.ok(!/\bDu bist\b|\bYou are\b/.test(saetze), `${locale}: eine Aussage ueber das Sein`);
  }
});

// ---------------------------------------------------------------------------
// Jeder moegliche Satz existiert - in beiden Sprachen
// ---------------------------------------------------------------------------

test("zu jeder moeglichen Antwort gibt es einen Satz in beiden Sprachen", () => {
  const bundle = (locale: string) =>
    JSON.parse(source(join("messages", locale, "alignment.json"))).synthesis as Record<
      string,
      Record<string, Record<string, string>>
    >;

  for (const locale of ["de", "en"]) {
    const syn = bundle(locale);

    // Je Thema ein Name, und je Thema mit mehreren geordneten Fragen die drei
    // Lagen.
    for (const theme of WORK_THEMES) {
      assert.ok(syn.themes[theme]?.title?.trim(), `${locale}: ${theme} ohne Namen`);
      const geordnete = ITEMS_OF_THEME[theme].filter((id) => !isNominalItem(id));
      if (geordnete.length >= 2) {
        for (const band of BANDS) {
          assert.ok(syn.themes[theme][band]?.trim(), `${locale}: ${theme}.${band} fehlt`);
        }
      }
    }

    // Je geordneter Frage drei Saetze.
    for (const eintrag of FOUNDER_PROFILE.items) {
      if (eintrag.answerFormat === "ordinal_choice") {
        for (const band of BANDS) {
          assert.ok(
            syn.items[eintrag.itemId]?.[band]?.trim(),
            `${locale}: items.${eintrag.itemId}.${band} fehlt`,
          );
        }
      } else {
        // Je Wahl ein Satz - fuer JEDE angebotene Antwort.
        eintrag.options?.forEach((_option, index) => {
          assert.ok(
            syn.choices[eintrag.itemId]?.[String(index)]?.trim(),
            `${locale}: choices.${eintrag.itemId}.${index} fehlt`,
          );
        });
      }
      // Und eine kurze Beschriftung fuer die Punktekarte.
      assert.ok(
        (syn.shortLabels as unknown as Record<string, string>)[eintrag.itemId]?.trim(),
        `${locale}: shortLabels.${eintrag.itemId} fehlt`,
      );
    }
  }

  // Beide Sprachen haben dieselben Schluessel.
  const pfade = (wert: unknown, praefix = ""): string[] =>
    typeof wert === "object" && wert !== null
      ? Object.entries(wert as Record<string, unknown>).flatMap(([k, v]) =>
          pfade(v, praefix ? `${praefix}.${k}` : k),
        )
      : [praefix];
  assert.deepEqual(pfade(bundle("de")).sort(), pfade(bundle("en")).sort());
});

// ---------------------------------------------------------------------------
// Wo sie erscheint
// ---------------------------------------------------------------------------

test("dieselbe Ableitung auf allen drei Oberflaechen", () => {
  // Nicht dreimal gebaut: Eine zweite Fassung liefe nach dem ersten
  // Unterschied auseinander - und zwar lautlos, weil beide richtig aussehen.
  for (const seite of [
    join("src", "app", "me", "profile", "page.tsx"),
    join("src", "app", "me", "profile", "print", "page.tsx"),
    join("src", "app", "(product)", "advisor", "person", "[userId]", "page.tsx"),
  ]) {
    assert.match(codeOnly(seite), /<WorkProfileSynthesisView sections=\{/, seite);
  }

  // Beim Advisor aus genau der Liste, die er sehen darf - nicht aus einer
  // zweiten Quelle.
  const advisor = codeOnly(join("src", "app", "(product)", "advisor", "person", "[userId]", "page.tsx"));
  assert.match(advisor, /<WorkProfileSynthesisView sections=\{view\.sections\}/);

  // Und sie steht offen, nicht im Aufklapper: Auf dem eigenen Profil kommt
  // sie vor dem `ProfileDetails` mit den Rohantworten.
  const eigen = codeOnly(join("src", "app", "me", "profile", "page.tsx"));
  assert.ok(
    eigen.indexOf("<WorkProfileSynthesisView") < eigen.indexOf("<ProfileDetails\n                    summary={t(\"workProfile.detailsSummary\")"),
    "die Beschreibung steckt im Aufklapper",
  );
});

test("der alte Satz „noch keine Auswertung\" ist weg", () => {
  // Er stimmte, solange es nichts gab. Jetzt gibt es etwas.
  for (const locale of ["de", "en"]) {
    const profil = JSON.parse(source(join("messages", locale, "profile.json"))) as {
      founderProfile: { workProfile: Record<string, string> };
    };
    assert.ok(
      !/noch keine Auswertung|no evaluation for this version/i.test(
        profil.founderProfile.workProfile.note,
      ),
      `${locale}: der Satz steht noch da`,
    );
  }
});
