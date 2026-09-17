import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  CONNECT_PROBLEM_PERSPECTIVES,
  PROBLEM_APPROACH_AUDIENCE_MAX,
  PROBLEM_APPROACH_AUDIENCE_MIN,
  PROBLEM_APPROACH_NEEDS_MAX,
  PROBLEM_APPROACH_NEEDS_MIN,
  PROBLEM_APPROACH_SUMMARY_MAX,
  PROBLEM_APPROACH_SUMMARY_MIN,
  isConnectProblemPerspective,
} from "@/features/connect/connectTypes";

const source = (path: string) => readFileSync(path, "utf8");

/** Siehe connectProblems.test.ts - Kommentare duerfen Pruefungen nicht treffen. */
const sqlWithoutComments = (path: string) =>
  source(path)
    .split("\n")
    .map((line) => line.replace(/--.*$/, ""))
    .join("\n");

const codeOnly = (path: string) =>
  source(path)
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
const readJson = (path: string) => JSON.parse(source(path)) as Record<string, unknown>;

const BOARD = "src/app/(product)/connect/problems/page.tsx";
const DETAIL = "src/app/(product)/connect/problems/[problemId]/page.tsx";
const CONFIRMATIONS = "src/features/connect/ProblemConfirmations.tsx";
const APPROACHES = "src/features/connect/ProblemApproaches.tsx";
const DATA = "src/features/connect/connectProblemData.ts";
const ACTIONS = "src/features/connect/connectProblemActions.ts";
const MIGRATION = "../supabase/migrations/20260918120000_problem_confirmations_and_approaches.sql";

// ---------------------------------------------------------------------------
// Die Bestaetigung ist kein Like
// ---------------------------------------------------------------------------
test("a confirmation always carries a perspective", () => {
  assert.deepEqual(CONNECT_PROBLEM_PERSPECTIVES, ["affected", "professional", "observed"]);
  assert.ok(isConnectProblemPerspective("professional"));
  assert.ok(!isConnectProblemPerspective("gehoert_davon"));

  // Kein Freitext: Ein Klick soll ein Klick bleiben - aber einer, der etwas
  // sagt. Freitext waere beides nicht.
  const migration = source(MIGRATION);
  assert.match(
    migration,
    /perspective in \('affected', 'professional', 'observed'\)/,
    "die Datenbank kennt genau diese drei"
  );
});

test("the same three perspectives exist in both locales", () => {
  for (const locale of ["de", "en"]) {
    const messages = readJson(`messages/${locale}/connect.json`);
    const problems = messages.problems as Record<string, unknown>;
    const perspectives = problems.perspectives as Record<string, string>;
    assert.deepEqual(
      Object.keys(perspectives).sort(),
      [...CONNECT_PROBLEM_PERSPECTIVES].sort(),
      `${locale} kennt genau die drei Perspektiven`
    );
  }
});

test("an invalid perspective never reaches the database", () => {
  const actions = codeOnly(ACTIONS);
  assert.match(
    actions,
    /if \(!isConnectProblemPerspective\(perspective\)\) back\(path, "perspective"\)/,
    "die Aktion weist alles ab, was nicht zu den drei gehoert"
  );
});

// ---------------------------------------------------------------------------
// Die Namen sieht niemand
// ---------------------------------------------------------------------------
test("confirmations are counted, never named", () => {
  const data = codeOnly(DATA);
  // Die Aufteilung kommt aus der Funktion, nicht aus einer Abfrage auf die
  // Tabelle - die gibt niemandem fremde Zeilen.
  assert.match(data, /rpc\("get_network_problem_confirmations"/);

  const confirmations = codeOnly(CONFIRMATIONS);
  assert.doesNotMatch(
    confirmations,
    /display_name|getConnectProfilesByUserIds/,
    "in der Anzeige der Bestaetigungen taucht kein Name auf"
  );

  const detail = codeOnly(DETAIL);
  assert.doesNotMatch(
    detail,
    /getConnectProblemConfirmations\(client, problemId\)[\s\S]{0,200}ProfilesByUserIds\(\s*client,\s*confirmations/,
    "zu den Bestaetigungen werden keine Profile nachgeladen"
  );
});

test("even the person who posted sees no names", () => {
  const migration = source(MIGRATION);
  // Das ist der Unterschied zum Interesse: Dort darf die einstellende Person
  // die Zeilen sehen. Hier niemand.
  const selectPolicy = migration.slice(
    migration.indexOf("network_problem_confirmations_select"),
    migration.indexOf("network_problem_confirmations_insert")
  );
  assert.match(selectPolicy, /using \(user_id = auth\.uid\(\)\)/);
  assert.doesNotMatch(selectPolicy, /author_user_id/);
});

test("confirming is deliberately without consequence", () => {
  const actions = codeOnly(ACTIONS);
  const confirm = actions.slice(
    actions.indexOf("export async function confirmConnectProblemAction"),
    actions.indexOf("export async function withdrawConnectProblemConfirmationAction")
  );
  // Keine Benachrichtigung - sonst waere es kein billiges Signal mehr.
  assert.doesNotMatch(confirm, /notify/i);
});

// ---------------------------------------------------------------------------
// Immer noch keine Rangliste
// ---------------------------------------------------------------------------
test("the confirmation count is shown but never sorted by", () => {
  assert.match(source(BOARD), /problems\.confirmationsCount/);
  const data = codeOnly(DATA);
  assert.doesNotMatch(data, /order\("confirmation_count"/);
  assert.doesNotMatch(data, /order\("interest_count"/);
});

// ---------------------------------------------------------------------------
// Der Ansatz
// ---------------------------------------------------------------------------
test("the approach limits match the check constraints", () => {
  const migration = source(MIGRATION);
  assert.match(
    migration,
    new RegExp(`btrim\\(summary\\)\\) between ${PROBLEM_APPROACH_SUMMARY_MIN} and ${PROBLEM_APPROACH_SUMMARY_MAX}`)
  );
  assert.match(
    migration,
    new RegExp(`btrim\\(audience\\)\\) between ${PROBLEM_APPROACH_AUDIENCE_MIN} and ${PROBLEM_APPROACH_AUDIENCE_MAX}`)
  );
  assert.match(
    migration,
    new RegExp(`btrim\\(needs\\)\\) between ${PROBLEM_APPROACH_NEEDS_MIN} and ${PROBLEM_APPROACH_NEEDS_MAX}`)
  );
});

test("approaches stand side by side, in no order of merit", () => {
  const data = codeOnly(DATA);
  // Nach Alter, aufsteigend. Keine Bewertung, keine Zustimmung, kein Zaehler.
  assert.match(data, /from\("network_problem_approaches"\)[\s\S]{0,200}order\("created_at", \{ ascending: true \}\)/);

  const approaches = codeOnly(APPROACHES);
  assert.doesNotMatch(approaches, /\bvote|\block\b|upvote|rating|\bscore\b/i);
});

test("one approach per person and problem - changing it is the way", () => {
  const migration = source(MIGRATION);
  assert.match(migration, /network_problem_approaches_unique unique \(problem_id, author_user_id\)/);

  const actions = codeOnly(ACTIONS);
  assert.match(
    actions,
    /onConflict: "problem_id,author_user_id"/,
    "ein zweiter Ansatz aendert den ersten, statt danebenzustehen"
  );
});

test("withdrawing an approach keeps the text", () => {
  const actions = codeOnly(ACTIONS);
  const withdraw = actions.slice(
    actions.indexOf("export async function withdrawConnectProblemApproachAction")
  );
  assert.match(withdraw, /\.update\(\{ status: "withdrawn" \}\)/);
  assert.doesNotMatch(withdraw, /\.delete\(\)/, "zurueckziehen ist kein loeschen");
});

test("an approach needs a Connect profile - the gate comes before the writing", () => {
  const approaches = codeOnly(APPROACHES);
  // Erst das Profil, dann das Formular. Andersherum stuende die Meldung erst
  // nach der Arbeit da.
  const gate = approaches.indexOf("ConnectProfileRequired");
  const form = approaches.indexOf("saveConnectProblemApproachAction}");
  assert.ok(gate > -1 && form > -1);
  assert.ok(gate < form, "die Profilhuerde steht vor dem Formular");
});

// ---------------------------------------------------------------------------
// Beide Sprachen
// ---------------------------------------------------------------------------
test("every new key exists in German and English", () => {
  const keys = [
    "confirmTitle",
    "confirmText",
    "confirmPrivacy",
    "confirmSubmit",
    "confirmedTitle",
    "confirmedAs",
    "changePerspective",
    "withdrawConfirmation",
    "confirmationsTitle",
    "confirmationsEmpty",
    "confirmationsCount",
    "confirmationsLine",
    "approachesTitle",
    "approachesText",
    "approachesEmpty",
    "approachBy",
    "approachAudienceLabel",
    "approachNeedsLabel",
    "approachFormTitle",
    "approachSummary",
    "approachAudience",
    "approachNeeds",
    "approachSave",
    "approachUpdate",
    "approachSaved",
    "yourApproachTitle",
    "yourApproachWithdrawn",
    "withdrawApproach",
  ];

  for (const locale of ["de", "en"]) {
    const messages = readJson(`messages/${locale}/connect.json`);
    const problems = messages.problems as Record<string, unknown>;
    for (const key of keys) {
      assert.equal(typeof problems[key], "string", `${locale}: problems.${key} fehlt`);
    }
    const errors = messages.errors as Record<string, unknown>;
    for (const key of ["perspective", "approach_summary", "approach_audience", "approach_needs"]) {
      assert.equal(typeof errors[key], "string", `${locale}: errors.${key} fehlt`);
    }
  }
});

// ---------------------------------------------------------------------------
// Der Weg zur Person, die einen Ansatz geschrieben hat
// ---------------------------------------------------------------------------
const APPROACH_MIGRATION =
  "../supabase/migrations/20260919120000_problem_approach_interests.sql";

test("a reply to an approach reuses the interest, not a third conversation origin", () => {
  const migration = source(APPROACH_MIGRATION);
  assert.match(migration, /alter table public\.network_problem_interests\s*\n\s*add column approach_id uuid/);
  // Waere hier ein dritter Ursprung entstanden, muesste die Ursprungsbedingung
  // angefasst werden. Genau das ist nicht passiert.
  assert.doesNotMatch(migration, /network_conversations_single_origin_check/);
  assert.doesNotMatch(migration, /problem_approach_id/);
});

test("a reply to an approach never inflates the problem's number", () => {
  const migration = source(APPROACH_MIGRATION);
  assert.match(
    migration,
    /set interest_count = \(\s*select count\(\*\) from public\.network_problem_interests\s*\n\s*where problem_id = target and approach_id is null/,
    "gezaehlt wird nur, was dem Problem selbst gilt"
  );

  const data = codeOnly(DATA);
  assert.match(
    data,
    /\.is\("approach_id", null\)/,
    "und die Liste der einstellenden Person zeigt nur diese"
  );
});

test("the reply reaches the approach author, not the person who posted", () => {
  const actions = codeOnly(ACTIONS);
  assert.match(
    actions,
    /from\("network_problem_approaches"\)\s*\n\s*\.select\("author_user_id"\)/,
    "die Aktion holt sich den Empfaenger aus dem Ansatz"
  );
  assert.match(
    actions,
    /approachId \? "approach_interest" : "problem_interest"/,
    "und die Mail heisst entsprechend anders"
  );
});

test("withdrawing one kind of reply leaves the other alone", () => {
  const actions = codeOnly(ACTIONS);
  assert.match(
    actions,
    /removal = approachId \? removal\.eq\("approach_id", approachId\) : removal\.is\("approach_id", null\)/,
    "sonst loeschte das Zuruecknehmen am Problem jede Rueckmeldung zu einem Ansatz mit"
  );
});

test("the new notification kind is allowed by the database too", () => {
  const migration = source(APPROACH_MIGRATION);
  // Ohne diese Zeile faellt jede solche Mail still weg - die
  // Anspruchsvergabe haette die Art nicht gekannt.
  assert.match(
    migration,
    /check \(kind in \('contact_request', 'problem_interest', 'approach_interest', 'message'\)\)/
  );
});

test("both locales name the new notification", () => {
  const copy = source("src/features/email/emailMessages.ts");
  assert.match(copy, /approach_interest: \{[\s\S]{0,300}hat sich zu deinem Ansatz gemeldet/);
  assert.match(copy, /approach_interest: \{[\s\S]{0,300}got in touch about your approach/);

  for (const locale of ["de", "en"]) {
    const messages = readJson(`messages/${locale}/connect.json`);
    const problems = messages.problems as Record<string, unknown>;
    for (const key of [
      "approachReplyTitle",
      "approachReplyText",
      "approachReply",
      "yourApproachReplyTitle",
      "withdrawApproachReply",
      "approachInterestSaved",
      "approachRepliesTitle",
      "approachRepliesEmpty",
    ]) {
      assert.equal(typeof problems[key], "string", `${locale}: problems.${key} fehlt`);
    }
  }
});

// ---------------------------------------------------------------------------
// Oeffentlich nur mit Freigabe
// ---------------------------------------------------------------------------
const VISIBILITY_MIGRATION =
  "../supabase/migrations/20260920120000_public_problem_visibility.sql";
const PUBLIC_PAGE = "src/app/(public-connect)/connect/pr/[publicSlug]/page.tsx";

test("a problem is not public by default", () => {
  const migration = source(VISIBILITY_MIGRATION);
  assert.match(migration, /add column visibility text not null default 'members_only'/);
  // Die Adresse wird gewuerfelt. Aus dem Titel gebildet waere sie ratbar, und
  // damit waere jedes nicht freigegebene Problem zu finden.
  assert.match(migration, /public_slug ~ '\^problem-\[a-f0-9\]\{24\}\$'/);
});

test("publishing a problem does not publish other people's texts", () => {
  const migration = source(VISIBILITY_MIGRATION);
  const fn = migration.slice(
    migration.indexOf("create or replace function public.get_public_network_problem"),
    migration.indexOf("comment on function public.get_public_network_problem")
  );
  // Der wichtigste Punkt: Die Einwilligung der einstellenden Person deckt
  // ihren eigenen Text ab - nicht den von anderen.
  assert.doesNotMatch(fn, /network_problem_approaches/);
  assert.doesNotMatch(fn, /network_problem_confirmations/);
  assert.doesNotMatch(fn, /network_problem_interests/);
  assert.doesNotMatch(fn, /interest_count|confirmation_count/);

  const page = codeOnly(PUBLIC_PAGE);
  assert.doesNotMatch(page, /getConnectProblemApproaches|getConnectProblemConfirmations/);
});

test("the consent is required on the first switch, not on every save", () => {
  const actions = codeOnly(ACTIONS);
  assert.match(
    actions,
    /if \(wanted === "public" && currentVisibility !== "public"\) \{/,
    "danach nicht mehr - sonst haekelt man bei jeder Textaenderung denselben Haken"
  );
  assert.match(actions, /confirm_public_visibility"\) !== "yes"/);
});

test("a problem that is no longer active disappears from the outside", () => {
  const migration = source(VISIBILITY_MIGRATION);
  const fn = migration.slice(
    migration.indexOf("create or replace function public.get_public_network_problem"),
    migration.indexOf("comment on function public.get_public_network_problem")
  );
  assert.match(fn, /problem\.visibility = 'public'/);
  assert.match(fn, /problem\.status = 'active'/);
});

test("a page that has nothing to show is not indexed", () => {
  const page = source(PUBLIC_PAGE);
  assert.match(
    page,
    /if \(!problem\) return \{[\s\S]{0,140}robots: \{ index: false, follow: false \}/,
    "zurueckgezogen oder nie freigegeben - beides darf nicht in den Index"
  );
});

test("the sitemap points at addresses that actually exist", () => {
  const migration = source(VISIBILITY_MIGRATION);
  const fn = migration.slice(migration.indexOf("create or replace function public.list_public_network_sitemap"));
  // Der Bereich heisst seit der Umbenennung /connect. Die Funktion gab weiter
  // /network aus - das funktionierte nur ueber eine Weiterleitung.
  assert.doesNotMatch(fn, /'\/network\//);
  assert.match(fn, /'\/connect\/p\/'/);
  assert.match(fn, /'\/connect\/l\/'/);
  assert.match(fn, /'\/connect\/pr\/'/);

  const robots = source("src/app/robots.ts");
  assert.match(robots, /"\/connect\/pr\/"/, "und der Pfad ist fuer Suchmaschinen freigegeben");
});

test("the visibility copy names what stays inside", () => {
  for (const locale of ["de", "en"]) {
    const messages = readJson(`messages/${locale}/connect.json`);
    const problems = messages.problems as Record<string, string>;
    for (const key of [
      "visibilityTitle",
      "visibilityPublicHint",
      "visibilityPreviewItems",
      "visibilityConfirm",
      "visibilityCaution",
      "openPublicPage",
      "publicOpenInside",
      "publicJoinText",
    ]) {
      assert.equal(typeof problems[key], "string", `${locale}: problems.${key} fehlt`);
    }
  }
  // Die Einwilligung muss sagen, worauf man sich einlaesst - eine Zustimmung
  // zu "oeffentlich sichtbar" ohne den Grund waere keine.
  const de = readJson("messages/de/connect.json").problems as Record<string, string>;
  assert.match(de.visibilityCaution, /Arbeitgeber/);
  assert.match(de.visibilityPreviewItems, /Ansätze anderer/);
});

// ---------------------------------------------------------------------------
// Was bleiben darf, wenn jemand geht
// ---------------------------------------------------------------------------
const OUTLIVES_MIGRATION =
  "../supabase/migrations/20260923120000_problem_outlives_account.sql";

test("the link is severed, not replaced by a placeholder", () => {
  const migration = source(OUTLIVES_MIGRATION);
  // Anonym heisst anonym: null, kein "geloeschtes Mitglied"-Datensatz, zu dem
  // sich zurueckrechnen liesse.
  assert.match(migration, /alter column author_user_id drop not null/);
  assert.match(migration, /references auth\.users\(id\) on delete set null/);
  // Auf dem Quelltext ohne Kommentare: Der Kommentar erklaert ja gerade,
  // dass KEIN Platzhalter gesetzt wird - und haette die Pruefung erfuellt.
  assert.doesNotMatch(
    sqlWithoutComments(OUTLIVES_MIGRATION),
    /deleted_user|platzhalter|placeholder/i
  );
});

test("nothing survives that was not consented to", () => {
  const migration = source(OUTLIVES_MIGRATION);
  const fn = migration.slice(
    migration.indexOf("create or replace function public.prepare_network_content_for_account_deletion")
  );
  assert.match(fn, /if not coalesce\(p_keep_problems, false\) then/);
  assert.match(fn, /if not coalesce\(p_keep_approaches, false\) then/);
  // Nur mit der Dienstrolle - sonst raeumte jemand fremde Inhalte ab.
  assert.match(fn, /auth\.role\(\) <> 'service_role'/);

  const deletion = codeOnly("src/features/account/deleteFounderAccount.ts");
  // Die Reihenfolge ist der Punkt: Erst wegraeumen, dann loeschen. Andersherum
  // waere alles verwaist - auch das, wogegen sich jemand entschieden hat.
  const prepare = deletion.indexOf("prepare_network_content_for_account_deletion");
  const remove = deletion.indexOf("delete_founder_account_data");
  assert.ok(prepare > -1 && remove > prepare, "die Vorbereitung laeuft zuerst");
});

test("an orphaned problem is read-only and receives no new interest", () => {
  const migration = source(OUTLIVES_MIGRATION);
  assert.match(
    migration,
    /or \(problem\.author_user_id is not null and problem\.author_user_id <> auth\.uid\(\)\)/,
    "eine Meldung am Problem selbst ginge ins Leere"
  );
  // Bestaetigen bleibt erlaubt - das erreicht niemanden und veraltet nicht.
  assert.match(migration, /problem\.author_user_id is null or problem\.author_user_id <> auth\.uid\(\)/);

  // Und der Veroeffentlichungs-Trigger darf das Trennen nicht abbrechen.
  assert.match(migration, /if new\.author_user_id is null then\s*\n\s*return new;/);
});

test("the decision is asked twice, and the deletion dialog wins", () => {
  const form = codeOnly("src/features/connect/ConnectProblemForm.tsx");
  assert.match(form, /name="outlives_account"/);

  const section = codeOnly("src/features/account/DeleteAccountSection.tsx");
  // Vorbelegt mit dem, was beim Einstellen gewaehlt wurde - aber hier noch
  // einmal zu bestaetigen.
  assert.match(section, /useState\(outlivable\.problemsPreferKeeping\)/);
  assert.match(section, /useState\(outlivable\.approachesPreferKeeping\)/);
  // Getrennt gefragt: eigene Probleme und Ansaetze auf fremden Seiten.
  assert.match(section, /problems: outlivable\.problems > 0 && keepProblems/);
  assert.match(section, /approaches: outlivable\.approaches > 0 && keepApproaches/);
});

test("the dialog says what cannot be undone, before the decision", () => {
  const section = source("src/features/account/DeleteAccountSection.tsx");
  const warning = section.indexOf("outlivesIrreversible");
  const button = section.indexOf("account.delete.button");
  assert.ok(warning > -1 && button > warning, "die Warnung steht vor dem Knopf");

  for (const locale of ["de", "en"]) {
    const messages = readJson(`messages/${locale}/dashboard.json`);
    const del = (messages.account as Record<string, Record<string, string>>).delete;
    for (const key of [
      "outlivesTitle",
      "outlivesProblems",
      "outlivesApproaches",
      "outlivesIrreversible",
      "outlivesCheckText",
    ]) {
      assert.equal(typeof del[key], "string", `${locale}: ${key} fehlt`);
    }
  }
  // Der Text muss beides sagen: unwiderruflich, und dass er den Text nicht
  // saeubert. Ein Problem beschreibt oft einen Arbeitgeber.
  const de = (readJson("messages/de/dashboard.json").account as Record<string, Record<string, string>>).delete;
  assert.match(de.outlivesIrreversible, /unwiderruflich/);
  assert.match(de.outlivesCheckText, /Arbeitgeber/);
});

test("a nobody where the author was, not an empty gap", () => {
  for (const file of [
    "src/app/(product)/connect/problems/page.tsx",
    "src/app/(product)/connect/problems/[problemId]/page.tsx",
    "src/features/connect/ProblemApproaches.tsx",
  ]) {
    assert.match(source(file), /problems\.formerMember/, `${file}`);
  }
  const detail = source("src/app/(product)/connect/problems/[problemId]/page.tsx");
  assert.match(detail, /problems\.orphanNotice/, "und der Hinweis, dass hier niemand mehr antwortet");
});
