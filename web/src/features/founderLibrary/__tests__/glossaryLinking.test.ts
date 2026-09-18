import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  FOUNDER_LIBRARY_CATEGORY_KEYS,
  FOUNDER_LIBRARY_TERMS,
} from "@/features/founderLibrary/founderLibraryRegistry";
import {
  buildGlossarySegments,
  founderLibraryTermHref,
  type GlossaryEntry,
} from "@/features/founderLibrary/glossaryLinking";
import { FOUNDER_SETUP_CATALOG } from "@/features/teams/founderSetupCatalog";

const ENTRIES: GlossaryEntry[] = [
  { id: "vesting", slug: "vesting", name: "Vesting" },
  { id: "cliff", slug: "cliff", name: "Cliff" },
  { id: "trademark", slug: "marke", name: "Marke" },
  { id: "open_source_license", slug: "open-source-lizenz", name: "Open-Source-Lizenz" },
  { id: "gbr", slug: "gbr", name: "GbR" },
];

const linked = (segments: ReturnType<typeof buildGlossarySegments>) =>
  segments.filter((segment) => segment.type === "link");
const plain = (segments: ReturnType<typeof buildGlossarySegments>) =>
  segments.map((segment) => segment.value).join("");

// ---------------------------------------------------------------------------
// Der Text bleibt der Text
// ---------------------------------------------------------------------------
test("Verlinken veraendert den Text nicht", () => {
  // Die wichtigste Eigenschaft: Was gerendert wird, ist buchstabengleich das,
  // was in der Uebersetzung steht. Ein Verlinker, der Zeichen frisst oder
  // verdoppelt, faellt sonst erst jemandem beim Lesen auf.
  for (const text of [
    "Vesting mit einem Cliff von zwölf Monaten ist üblich.",
    "Ohne Fachwörter bleibt hier alles unverändert.",
    "",
    "GbR, GmbH – und dann? Marke, Open-Source-Lizenz.",
  ]) {
    assert.equal(plain(buildGlossarySegments(text, ENTRIES)), text);
  }
});

test("nur ganze Wörter springen an", () => {
  // "Marke" darf nicht aus "Markenrecht" herausgeschnitten werden, sonst steht
  // mitten im Wort ein Link.
  assert.equal(linked(buildGlossarySegments("Markenrecht und Vestingplan", ENTRIES)).length, 0);
  assert.equal(linked(buildGlossarySegments("Die Marke ist eingetragen.", ENTRIES)).length, 1);

  // Umlaute rundherum: \\b in JavaScript ist ASCII und wuerde hier irren.
  assert.equal(linked(buildGlossarySegments("Rückvesting", ENTRIES)).length, 0);
});

test("derselbe Begriff wird höchstens einmal verlinkt", () => {
  const segments = buildGlossarySegments(
    "Vesting heißt Vesting, auch wenn man Vesting dreimal sagt.",
    ENTRIES
  );
  assert.equal(linked(segments).length, 1);
});

test("der längere Begriff gewinnt", () => {
  // Sonst verlinkt "Marke" in "Open-Source-Lizenz"-Naehe den falschen, weil der
  // kuerzere Begriff zufaellig frueher gefunden wird.
  const segments = buildGlossarySegments("Eine Open-Source-Lizenz prüfen.", ENTRIES);
  const links = linked(segments);
  assert.equal(links.length, 1);
  assert.equal(links[0]?.value, "Open-Source-Lizenz");
});

test("ein Absatz wird nicht zur Linkwüste", () => {
  const text = "Vesting, Cliff, Marke, Open-Source-Lizenz, GbR – alles auf einmal.";
  assert.ok(linked(buildGlossarySegments(text, ENTRIES, { maxLinks: 2 })).length <= 2);
  assert.ok(linked(buildGlossarySegments(text, ENTRIES)).length <= 4, "Standardgrenze greift nicht");
});

test("die Schreibweise im Satz bleibt erhalten", () => {
  // Der Registereintrag heisst "Vesting"; steht im Satz "vesting", soll auch
  // "vesting" dastehen.
  const links = linked(buildGlossarySegments("Beim vesting gilt das.", ENTRIES));
  assert.equal(links[0]?.value, "vesting");
  assert.equal(links[0]?.slug, "vesting");
});

// ---------------------------------------------------------------------------
// Die Links führen irgendwohin, und zwar in ein neues Fenster
// ---------------------------------------------------------------------------
test("jeder Begriff hat eine eigene erreichbare Adresse", () => {
  assert.equal(founderLibraryTermHref("cliff"), "/founder-library/cliff");

  const slugs = FOUNDER_LIBRARY_TERMS.map((term) => term.slug);
  assert.equal(new Set(slugs).size, slugs.length, "doppelte Slugs – ein Begriff wäre nicht erreichbar");
  for (const slug of slugs) {
    assert.match(slug, /^[a-z0-9-]+$/, `Slug ${slug} taugt nicht als Adresse`);
  }

  // Die Seite, die diese Adresse bedient, muss es auch geben.
  const page = readFileSync("src/app/(product)/founder-library/[slug]/page.tsx", "utf8");
  assert.match(page, /FOUNDER_LIBRARY_TERMS\.find/);
  assert.match(page, /notFound\(\)/);
});

test("Glossarlinks öffnen ein neues Fenster – mit Hinweis", () => {
  // Maria hat das ausdruecklich so gewollt: Der Text, an dem jemand gerade
  // arbeitet, soll stehen bleiben. rel="noreferrer noopener" gehoert bei
  // target="_blank" dazu.
  const component = readFileSync("src/features/founderLibrary/GlossaryText.tsx", "utf8");
  assert.match(component, /target="_blank"/);
  assert.match(component, /rel="noreferrer noopener"/);
  assert.match(component, /glossaryLink\.more/);

  for (const locale of ["de", "en"]) {
    const messages = JSON.parse(readFileSync(`messages/${locale}/founderLibrary.json`, "utf8")) as {
      glossaryLink: { more: string };
    };
    assert.match(
      messages.glossaryLink.more,
      locale === "de" ? /neue[nms] Fenster/ : /new window/,
      `${locale}: der Hinweis sagt nicht, dass ein Fenster aufgeht`
    );
  }
});

test("die Vorschau beantwortet die Frage, statt auf die Library zu verweisen", () => {
  // GEAENDERT am 19.09.2026: Im `title` stand nur die Bedienungsanleitung fuer
  // den Link ("in der Founder Library nachschlagen"). Wer mit der Maus auf
  // "Vinkulierung" geht, hat aber eine andere Frage - und der Satz, der sie
  // beantwortet, liegt ohnehin schon im Sprachpaket.
  const component = readFileSync("src/features/founderLibrary/GlossaryText.tsx", "utf8");
  assert.match(component, /shortDefinition/);
  assert.match(component, /title=\{preview\(segment\.id\)\}/);

  // Und der alte Text ist weg, nicht nur unbenutzt: Ungenutzte Uebersetzungen
  // bleiben sonst liegen und tauchen Jahre spaeter woanders wieder auf.
  for (const locale of ["de", "en"]) {
    const messages = JSON.parse(readFileSync(`messages/${locale}/founderLibrary.json`, "utf8")) as {
      glossaryLink: Record<string, string>;
    };
    assert.equal(messages.glossaryLink.hint, undefined, `${locale}: der alte Hinweis liegt noch da`);
  }
});

// ---------------------------------------------------------------------------
// Der Bestand
// ---------------------------------------------------------------------------
test("jeder Begriff ist in beiden Sprachen erklärt", () => {
  for (const locale of ["de", "en"]) {
    const messages = JSON.parse(readFileSync(`messages/${locale}/founderLibrary.json`, "utf8")) as {
      categories: Record<string, string>;
      terms: Record<string, { term?: string; shortDefinition?: string }>;
    };
    for (const term of FOUNDER_LIBRARY_TERMS) {
      assert.ok(messages.terms[term.id]?.term, `${locale}: ${term.id} hat keinen Namen`);
      assert.ok(
        (messages.terms[term.id]?.shortDefinition ?? "").length > 40,
        `${locale}: ${term.id} erklärt nichts`
      );
    }
    for (const category of FOUNDER_LIBRARY_CATEGORY_KEYS) {
      assert.ok(messages.categories[category], `${locale}: Kategorie ${category} fehlt`);
    }
  }
});

test("die teuren Setup-Themen sind erklärt", () => {
  // NEU am 19.09.2026, und das war das Auswahlkriterium der Erweiterung: Ein
  // Thema als "teuer, solange es offen ist" zu kennzeichnen und die darin
  // vorkommenden Wörter nirgends zu erklären, ist die schlechtere Hälfte von
  // beidem.
  const explained = new Set<string>(FOUNDER_LIBRARY_TERMS.flatMap((term) => term.setupTopicKeys ?? []));
  const missing = FOUNDER_SETUP_CATALOG.filter(
    (item) => item.weight === "critical" && !explained.has(item.key)
  ).map((item) => item.key);
  assert.deepEqual(missing, [], `ohne Begriff in der Library: ${missing.join(", ")}`);
});

test("Setup-Verweise zeigen auf existierende Themen", () => {
  const known = new Set(FOUNDER_SETUP_CATALOG.map((item) => item.key));
  for (const term of FOUNDER_LIBRARY_TERMS) {
    for (const key of term.setupTopicKeys ?? []) {
      assert.ok(known.has(key), `${term.id} verweist auf unbekanntes Thema ${key}`);
    }
  }
});
