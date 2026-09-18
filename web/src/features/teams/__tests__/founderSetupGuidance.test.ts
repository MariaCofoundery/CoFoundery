import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  FOUNDER_SETUP_CATALOG,
  FOUNDER_SETUP_ITEM_KEYS,
  FOUNDER_SETUP_PHASE_KEYS,
  getFounderSetupItemsByPhase,
} from "@/features/teams/founderSetupCatalog";

const source = (path: string) => readFileSync(path, "utf8");
const setupCopy = (locale: string) =>
  (JSON.parse(source(`messages/${locale}/teams.json`)) as { setup: Record<string, never> }).setup;

const OVERVIEW = "src/app/(product)/teams/[teamId]/setup/page.tsx";
const ITEM = "src/app/(product)/teams/[teamId]/setup/[itemKey]/page.tsx";
const DOCUMENT = "src/app/(product)/teams/[teamId]/setup/document/page.tsx";
const MIGRATION = "../supabase/migrations/20261005120000_founder_setup_succession_and_noncompete.sql";

// ---------------------------------------------------------------------------
// Kein Thema ist mehr eine leere Seite
// ---------------------------------------------------------------------------
test("jedes Thema hat einen Anhaltspunkt, in beiden Sprachen", () => {
  // Bis 18.09.2026 bestand ein Thema aus Titel, Frage und Textfeld. Bei
  // Vesting und Beteiligung - also genau dort, wo niemand weiss, was ueblich
  // ist - sagte das Produkt nichts.
  for (const locale of ["de", "en"]) {
    const items = setupCopy(locale).items as unknown as Record<
      string,
      { title?: string; question?: string; orientation?: string }
    >;
    for (const key of FOUNDER_SETUP_ITEM_KEYS) {
      assert.ok(items[key]?.title, `${locale}: ${key} hat keinen Titel`);
      assert.ok(items[key]?.question, `${locale}: ${key} hat keine Frage`);
      assert.ok(
        (items[key]?.orientation ?? "").length > 120,
        `${locale}: ${key} gibt keinen Anhaltspunkt - das Thema bleibt eine leere Seite`
      );
    }
  }

  assert.match(source(ITEM), /t\(`items\.\$\{itemKey\}\.orientation`\)/);
});

test("der Anhaltspunkt gibt sich als Ausgangspunkt aus, nicht als Empfehlung", () => {
  // Bei Beteiligung und Vesting eine Empfehlung auszusprechen waere eine
  // Beratung, die dieses Produkt nicht leisten darf.
  for (const locale of ["de", "en"]) {
    const help = String(setupCopy(locale).orientationHelp ?? "");
    assert.ok(help.length > 40, `${locale}: orientationHelp fehlt`);
    assert.match(
      help,
      locale === "de" ? /entscheidet ihr/ : /your call/,
      `${locale}: der Hinweis ueberlaesst die Entscheidung nicht dem Team`
    );
  }
});

// ---------------------------------------------------------------------------
// Die Reihenfolge
// ---------------------------------------------------------------------------
test("die Themen sind in Phasen geordnet, nicht alle auf einmal", () => {
  for (const phase of FOUNDER_SETUP_PHASE_KEYS) {
    assert.ok(getFounderSetupItemsByPhase(phase).length > 0, `Phase ${phase} ist leer`);
  }
  // "Ausscheiden" anzubieten, bevor die Rechtsform steht, ist Laerm.
  assert.equal(FOUNDER_SETUP_CATALOG.find((item) => item.key === "founder_exit")?.phase, "later");
  assert.equal(FOUNDER_SETUP_CATALOG.find((item) => item.key === "legal_entity")?.phase, "founded");
  assert.equal(FOUNDER_SETUP_CATALOG.find((item) => item.key === "equity")?.phase, "before");

  const overview = source(OVERVIEW);
  assert.match(overview, /FOUNDER_SETUP_PHASE_KEYS\.map/);
  for (const locale of ["de", "en"]) {
    const phases = setupCopy(locale).phases as unknown as Record<string, { title?: string; text?: string }>;
    for (const phase of FOUNDER_SETUP_PHASE_KEYS) {
      assert.ok(phases[phase]?.title, `${locale}: phases.${phase}.title fehlt`);
      assert.ok((phases[phase]?.text ?? "").length > 40, `${locale}: phases.${phase}.text erklaert nichts`);
    }
  }
});

test("teuer ist sichtbar, und nur solange es offen ist", () => {
  const critical = FOUNDER_SETUP_CATALOG.filter((item) => item.weight === "critical");
  assert.ok(critical.length >= 8, "zu wenige Themen als teuer gekennzeichnet");
  assert.ok(critical.length < FOUNDER_SETUP_CATALOG.length, "wenn alles wichtig ist, ist nichts wichtig");

  // Ein geklaertes Thema soll nicht weiter mahnen.
  assert.match(source(OVERVIEW), /isCritical && item\.displayStatus === "open"/);

  for (const locale of ["de", "en"]) {
    const weights = setupCopy(locale).weights as unknown as Record<string, string>;
    assert.ok(weights?.critical, `${locale}: weights.critical fehlt`);
    // "wichtig" allein waere eine Rangfolge. Es geht um die Folge.
    assert.match(
      weights.critical,
      locale === "de" ? /teuer|offen/ : /expensive|open/,
      `${locale}: die Kennzeichnung sagt nicht, worum es geht`
    );
  }
});

// ---------------------------------------------------------------------------
// Die zwei fehlenden Themen
// ---------------------------------------------------------------------------
test("Nachfolge und Wettbewerb nach dem Ausscheiden gibt es jetzt", () => {
  // Beide stehen in jedem Gesellschaftervertrag. "Laengere Abwesenheit" meint
  // jemanden, der wiederkommt; "Nebentaetigkeiten" regelt die Zeit
  // waehrenddessen.
  for (const key of ["succession", "post_exit_competition"] as const) {
    assert.ok(FOUNDER_SETUP_ITEM_KEYS.includes(key), `${key} fehlt im Katalog`);
  }

  // Beide Wertelisten in der Datenbank - eine allein liesse das Thema oeffnen,
  // aber nicht darueber schreiben.
  const migration = source(MIGRATION);
  assert.match(migration, /founder_team_setup_items_key_check/);
  assert.match(migration, /founder_team_setup_discussion_item_key_check/);
  assert.equal((migration.match(/'succession'/g) ?? []).length, 2);
  assert.equal((migration.match(/'post_exit_competition'/g) ?? []).length, 2);
});

// ---------------------------------------------------------------------------
// Etwas, das herauskommt
// ---------------------------------------------------------------------------
test("das Dokument zeigt nur, was beide bestaetigt haben", () => {
  const document = source(DOCUMENT);
  // Notizen und offene Vorschlaege gehoeren nicht hinein: Sie sind kein
  // gemeinsamer Stand, und das Papier landet moeglicherweise bei einer
  // Beraterin.
  assert.match(document, /setup\.items\.filter\(\(item\) => item\.currentConfirmedRevision\)/);
  assert.doesNotMatch(document, /workingNote|pendingRevision/);
});

test("das Dokument sagt auch, was noch offen ist", () => {
  // Ein Dokument, das nur das Geklaerte zeigt, liest sich vollstaendiger als
  // die Lage ist.
  const document = source(DOCUMENT);
  assert.match(document, /open\.length > 0 \?/);
  for (const locale of ["de", "en"]) {
    const doc = setupCopy(locale).document as unknown as Record<string, string>;
    for (const key of ["title", "intro", "openTitle", "disclaimer", "nothingYet", "print"]) {
      assert.ok(doc?.[key], `${locale}: document.${key} fehlt`);
    }
    assert.match(
      doc.disclaimer,
      locale === "de" ? /ersetzt keine/ : /no substitute/,
      `${locale}: der Vorbehalt fehlt`
    );
  }
});

test("das Dokument ist von der Uebersicht aus erreichbar", () => {
  assert.match(source(OVERVIEW), /setup\/document/);
  // Und der Druckknopf tut wirklich etwas - eine Serverkomponente kann nicht
  // drucken.
  assert.match(source("src/features/teams/PrintButton.tsx"), /window\.print\(\)/);
  assert.match(source("src/features/teams/PrintButton.tsx"), /^"use client";/);
});
