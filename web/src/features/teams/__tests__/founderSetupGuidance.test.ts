import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  FOUNDER_SETUP_CATALOG, FOUNDER_SETUP_CONFLICT_PRONE,
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

test("kritisch zaehlt weiter, der Hinweis am Thema ist 'oft strittig' und kein Rang", () => {
  const critical = FOUNDER_SETUP_CATALOG.filter((item) => item.weight === "critical");
  assert.ok(critical.length >= 8, "zu wenige Themen als kritisch gekennzeichnet");
  assert.ok(critical.length < FOUNDER_SETUP_CATALOG.length, "wenn alles wichtig ist, ist nichts wichtig");

  // GEAENDERT am 28.10.2026: Die Zeile "wird teuer, wenn es offen bleibt" an jedem
  // Thema ist weg. Der Hinweis am Thema ist jetzt "Oft ein Knackpunkt" (Forschung nennt es haeufig, nichts ueber das Team) - eine getrennte,
  // redaktionelle Liste (FOUNDER_SETUP_CONFLICT_PRONE), kein Urteil ueber das Team.
  const overview = source(OVERVIEW);
  assert.match(overview, /FOUNDER_SETUP_CONFLICT_PRONE\.has\(item\.key\)/);
  assert.doesNotMatch(overview, /weights\.critical/);
  assert.ok(FOUNDER_SETUP_CONFLICT_PRONE.size >= 5 && FOUNDER_SETUP_CONFLICT_PRONE.size < FOUNDER_SETUP_CATALOG.length, "der Hinweis verliert seinen Sinn, wenn er alles oder fast nichts trifft");
  for (const key of FOUNDER_SETUP_CONFLICT_PRONE) {
    assert.ok(FOUNDER_SETUP_CATALOG.some((item) => item.key === key), `unbekanntes Thema: ${key}`);
  }

  for (const locale of ["de", "en"]) {
    const list = setupCopy(locale).list as unknown as Record<string, string>;
    assert.ok(list?.conflict && list?.conflictHelp, `${locale}: Hinweistext fehlt`);
    // Der Hinweis sagt nichts ueber EUER Team und ist keine Wertung.
    assert.match(list.conflictHelp, locale === "de" ? /Forschung[\s\S]*häufig[\s\S]*nicht, dass es bei euch so ist/ : /[Rr]esearch[\s\S]*does not mean it will be for you/, `${locale}: der Hinweis grenzt sich nicht ab`);
    assert.doesNotMatch(list.conflict, /Score|Punkte|riskant|gefährlich|risky|danger/i);
    // Eine einzelne Studie mit kleinen Stichproben traegt "wird genannt", nicht "statistisch".
    assert.doesNotMatch(list.conflictHelp, /statistisch|statistically/i, `${locale}: der Hinweis behauptet mehr, als die Quelle traegt`);
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

// ---------------------------------------------------------------------------
// "Mit einer Beratung klaeren" im Vereinbarungs-Dokument
// ---------------------------------------------------------------------------
import { buildFounderSetupLegalReview } from "@/features/teams/founderSetupLegalReview";
import { buildFounderSetupReadModel } from "@/features/teams/founderSetupModel";

test("die Beratungsliste enthaelt genau die Themen mit rechtlicher Notiz", () => {
  const model = buildFounderSetupReadModel({
    teamId: "t", currentUserId: "a",
    members: [{ userId: "a", displayName: "A" }, { userId: "b", displayName: "B" }],
    itemRows: [], revisionRows: [], confirmationRows: [],
  });
  const list = buildFounderSetupLegalReview(model.items);
  assert.deepEqual(
    list.map((entry) => entry.key).sort(),
    FOUNDER_SETUP_CATALOG.filter((item) => item.legalNote).map((item) => item.key).sort()
  );
  assert.ok(list.every((entry) => entry.status === "open"));
  assert.equal(list.find((entry) => entry.key === "vesting")?.libraryTermSlug, "vesting");
});

test("bestaetigt heisst: die aktuelle Runde hat bestaetigt, nicht irgendwann jemand", () => {
  const itemRows = [{ id: "i1", team_id: "t", item_key: "vesting", work_status: "discussing", working_note: "", current_confirmed_revision_id: "r1", pending_revision_id: null }];
  const revisionRows = [{ id: "r1", setup_item_id: "i1", resolution_status: "clarified", note: "x", documentation_reference: null, proposed_by_user_id: "a", created_at: "2026-01-01", confirmed_at: "2026-01-02" }];
  const status = (members: string[], confirmedBy: string[]) =>
    buildFounderSetupLegalReview(buildFounderSetupReadModel({
      teamId: "t", currentUserId: "a",
      members: members.map((userId) => ({ userId, displayName: userId })),
      itemRows, revisionRows,
      confirmationRows: confirmedBy.map((user_id) => ({ revision_id: "r1", user_id, confirmed_at: "2026-01-02" })),
    }).items).find((entry) => entry.key === "vesting")?.status;
  assert.equal(status(["a", "b"], ["a", "b"]), "confirmed");
  assert.equal(status(["a", "b", "c"], ["a", "b"]), "reconfirm");
});

test("das Dokument zeigt die Beratungsliste, beide Sprachen haben die Texte", () => {
  assert.match(source(DOCUMENT), /buildFounderSetupLegalReview/);
  for (const locale of ["de", "en"]) {
    const doc = setupCopy(locale).document as unknown as { legalReview: { title: string; note: string; status: Record<string, string> } };
    assert.ok(doc.legalReview.title && doc.legalReview.note);
    for (const k of ["open", "discussed", "reconfirm", "confirmed"]) assert.ok(doc.legalReview.status[k], `${locale}: ${k}`);
  }
});

// ---------------------------------------------------------------------------
// Kapitalgeber und Verkauf (27.10.2026)
// ---------------------------------------------------------------------------
test("Kapitalgeber und Verkauf stehen im Katalog, in beiden Wertelisten und in der Diskussionsfunktion", () => {
  for (const key of ["investor_dilution", "company_sale"] as const) {
    const entry = FOUNDER_SETUP_CATALOG.find((item) => item.key === key);
    assert.ok(entry, `${key} fehlt im Katalog`);
    assert.equal(entry.legalNote, true, `${key} braucht den rechtlichen Hinweis`);
    assert.equal(entry.phase, "later");
  }
  const migration = source("../supabase/migrations/20270101120000_founder_setup_investors_and_sale.sql");
  // Zwei CHECK-Listen und die Funktion: je dreimal.
  for (const key of ["investor_dilution", "company_sale", "succession", "post_exit_competition"]) {
    assert.equal((migration.match(new RegExp(`'${key}'`, "g")) ?? []).length, 3, `${key}: nicht in allen drei Listen`);
  }
});

test("die Zahl im Fragebogen-Text stimmt mit dem Katalog ueberein", () => {
  for (const locale of ["de", "en"]) {
    const text = JSON.stringify(JSON.parse(source(`messages/${locale}/questionnaires.json`)));
    assert.ok(text.includes(`${FOUNDER_SETUP_ITEM_KEYS.length} `), `${locale}: Themenzahl veraltet`);
  }
});
