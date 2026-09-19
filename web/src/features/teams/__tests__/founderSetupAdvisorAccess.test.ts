import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  buildAdvisorConfirmedFounderSetup,
  buildAdvisorFounderSetupAccessState,
  buildFounderSetupAdvisorAccess,
  describeAdvisorFounderSetupPause,
} from "@/features/teams/founderSetupAdvisorAccessModel";

const source = (path: string) => readFileSync(path, "utf8");
/** SQL-Kommentare heraus - sonst findet die Pruefung Begriffe in der Begruendung. */
const sqlCodeOnly = (path: string) => source(path).replace(/^\s*--.*$/gm, "");
const REQUEST_MIGRATION = "../supabase/migrations/20261009120000_advisor_requests_setup_access.sql";

test("advisor access presentation preserves all V2 status states", () => {
  assert.deepEqual(buildAdvisorFounderSetupAccessState({
    access_status: "paused",
    consent_count: 2,
    member_count: 3,
    confirmed_item_count: 0,
  }), {
    status: "paused",
    consentCount: 2,
    memberCount: 3,
    confirmedItemCount: 0,
  });
  assert.equal(buildAdvisorFounderSetupAccessState(null).status, "not_granted");
});

test("founder grant presentation distinguishes pending and active unanimous consent", () => {
  const access = buildFounderSetupAdvisorAccess([
    {
      source_relationship_advisor_id: "source-1",
      advisor_name: "  Dr. Lee  ",
      grant_id: "grant-1",
      grant_status: "pending",
      consented_founder_user_ids: ["founder-a", "founder-b", "founder-b"],
      access_active: false,
      requested_by_advisor: true,
    },
    {
      source_relationship_advisor_id: "source-2",
      advisor_name: null,
      grant_id: "grant-2",
      grant_status: "active",
      consented_founder_user_ids: ["founder-a", "founder-b", "founder-c"],
      access_active: true,
    },
  ]);

  assert.deepEqual(access[0], {
    sourceRelationshipAdvisorId: "source-1",
    advisorName: "Dr. Lee",
    grantId: "grant-1",
    status: "pending",
    consentedFounderUserIds: ["founder-a", "founder-b"],
    accessActive: false,
    requestedByAdvisor: true,
  });
  assert.equal(access[1]?.consentedFounderUserIds.length, 3);
  assert.equal(access[1]?.accessActive, true);
  // ERGAENZT am 20.09.2026: Ob die begleitende Person selbst gefragt hat, ist
  // ein eigener Zustand. Fehlt das Feld in der Zeile - alte Daten, andere
  // Abfrage -, gilt "nicht gefragt" und nicht "unbekannt".
  assert.equal(access[1]?.requestedByAdvisor, false);
});

test("advisor model contains confirmed-only fields and rejects unknown setup rows", () => {
  const items = buildAdvisorConfirmedFounderSetup([
    {
      item_key: "roles_responsibilities",
      resolution_status: "documented",
      note: "Confirmed usercontent",
      documentation_reference: "https://example.com/document",
      confirmed_at: "2026-08-24T12:00:00.000Z",
    },
    {
      item_key: "unknown_item",
      resolution_status: "clarified",
      note: "Must not render",
      documentation_reference: null,
      confirmed_at: "2026-08-24T12:00:00.000Z",
    },
  ]);

  assert.deepEqual(items, [{
    itemKey: "roles_responsibilities",
    resolutionStatus: "documented",
    note: "Confirmed usercontent",
    documentationReference: "https://example.com/document",
    confirmedAt: "2026-08-24T12:00:00.000Z",
  }]);
  assert.equal("workingNote" in items[0]!, false);
  assert.equal("pendingRevision" in items[0]!, false);
  assert.equal("confirmations" in items[0]!, false);
});

test("Founder and Advisor UI wire only the dedicated access RPCs and expose no edit controls to advisors", () => {
  const data = readFileSync("src/features/teams/founderSetupAdvisorAccessData.ts", "utf8");
  const founderPanel = readFileSync("src/features/teams/FounderSetupAdvisorAccessPanel.tsx", "utf8");
  const advisorSection = readFileSync("src/features/teams/AdvisorFounderSetupSection.tsx", "utf8");
  const reportPage = readFileSync("src/app/(product)/advisor/report/page.tsx", "utf8");

  assert.match(data, /get_founder_team_advisor_setup_access/);
  assert.match(data, /get_advisor_confirmed_founder_setup/);
  assert.match(data, /get_advisor_founder_setup_access_status/);
  assert.doesNotMatch(data, /createPrivilegedClient|service_role|working_note|pending_revision/);
  assert.match(founderPanel, /proposeFounderSetupAdvisorAccessAction/);
  assert.match(founderPanel, /confirmFounderSetupAdvisorAccessAction/);
  assert.match(founderPanel, /revokeFounderSetupAdvisorAccessAction/);
  assert.match(reportPage, /AdvisorFounderSetupSection/);
  assert.doesNotMatch(advisorSection, /<form|<button|textarea|workingNote|pendingRevision/);
});

test("Advisor Founder Setup consent and confirmed-only copy is parallel in DE and EN", () => {
  const de = JSON.parse(readFileSync("messages/de/teams.json", "utf8"));
  const en = JSON.parse(readFileSync("messages/en/teams.json", "utf8"));
  assert.deepEqual(Object.keys(de.setup.advisorAccess), Object.keys(en.setup.advisorAccess));
  assert.deepEqual(Object.keys(de.setup.advisorView), Object.keys(en.setup.advisorView));
  assert.match(de.setup.advisorAccess.description, /gemeinsam bestätigten/);
  assert.match(en.setup.advisorAccess.description, /jointly confirmed/);
  assert.match(de.setup.advisorAccess.description, /Arbeitsnotizen.*privat/);
  assert.match(en.setup.advisorAccess.description, /Working notes.*private/);
});

test("eine Anfrage des Advisors ist keine Berechtigung", () => {
  // NEU am 20.09.2026. Vorher konnte nur ein FOUNDER eine Freigabe
  // vorschlagen; der Advisor musste es ausserhalb des Produkts sagen.
  //
  // Der Punkt der neuen Funktion ist, was sie NICHT tut: Sie traegt keine
  // Zustimmung ein. Ein Founder, der vorschlaegt, traegt seine eigene mit - er
  // hat ja zugestimmt, indem er vorschlug. Beim Advisor gibt es nichts
  // mitzutragen, und jedes Teammitglied stimmt weiterhin selbst zu.
  const migration = sqlCodeOnly(REQUEST_MIGRATION);
  const fn = migration.slice(
    migration.indexOf("function public.request_founder_team_advisor_setup_grant"),
    migration.indexOf("revoke all on function public.request_founder_team_advisor_setup_grant")
  );
  assert.doesNotMatch(
    fn,
    /insert into public\.founder_team_advisor_setup_consents/,
    "die Anfrage trägt eine Zustimmung ein"
  );
  assert.match(fn, /'pending'/);
});

test("die Quelle wird gesucht und nicht übergeben", () => {
  const migration = sqlCodeOnly(REQUEST_MIGRATION);
  assert.match(migration, /request_founder_team_advisor_setup_grant\(p_relationship_id uuid\)/);
  assert.match(migration, /into v_source_id, v_team_id/);
  assert.match(migration, /advisor_access\.advisor_user_id = v_user_id/);
  assert.match(migration, /advisor_access\.status = 'linked'/);
  assert.match(migration, /advisor_access\.revoked_at is null/);
});

test("die Oberfläche fragt nur, wo noch nichts freigegeben ist", () => {
  const page = source("src/app/(product)/advisor/session/page.tsx");
  assert.match(page, /data\.founderSetupAccess\.status === "not_granted" \?/);
  assert.match(page, /session\.settled\.requestAccess/);
  for (const locale of ["de", "en"]) {
    const settled = (
      JSON.parse(readFileSync(`messages/${locale}/advisor.json`, "utf8")) as {
        session: { settled: Record<string, string> };
      }
    ).session.settled;
    assert.match(
      settled.requestAccessHint,
      locale === "de" ? /keinen Zugriff/ : /no access/,
      `${locale}: der Hinweis verschweigt, dass die Anfrage nichts öffnet`
    );
  }
});

test("die Founder sehen, dass gefragt wurde – nicht nur dass etwas wartet", () => {
  const panel = source("src/features/teams/FounderSetupAdvisorAccessPanel.tsx");
  assert.match(panel, /entry\.requestedByAdvisor && !entry\.accessActive/);
  assert.match(panel, /advisorAccess\.requestedByAdvisor/);
  assert.match(
    sqlCodeOnly(REQUEST_MIGRATION),
    /requested_by_advisor_at is not null as requested_by_advisor/
  );
  for (const locale of ["de", "en"]) {
    const access = (
      JSON.parse(readFileSync(`messages/${locale}/teams.json`, "utf8")) as {
        setup: { advisorAccess: Record<string, string> };
      }
    ).setup.advisorAccess;
    assert.match(access.requestedByAdvisor, /\{name\}/, `${locale}: der Name fehlt`);
  }
});

test("der Grund einer pausierten Freigabe steht dabei", () => {
  // GEMELDET AM 20.09.2026: Ein Founder hatte sein Konto gelöscht, das Team
  // bestand danach aus einer Person - und auf der Karte stand nur "Freigabe
  // pausiert". Der Grund liegt in den Zahlen, die ohnehin mitkommen.
  assert.equal(
    describeAdvisorFounderSetupPause({ status: "paused", consentCount: 1, memberCount: 1 }),
    "team_too_small"
  );
  assert.equal(
    describeAdvisorFounderSetupPause({ status: "paused", consentCount: 2, memberCount: 3 }),
    "consent_missing"
  );
  assert.equal(
    describeAdvisorFounderSetupPause({ status: "paused", consentCount: 2, memberCount: 2 }),
    "unspecified"
  );
  for (const status of ["active", "pending", "not_granted", "revoked"] as const) {
    assert.equal(
      describeAdvisorFounderSetupPause({ status, consentCount: 0, memberCount: 1 }),
      null,
      status
    );
  }

  for (const locale of ["de", "en"]) {
    const reasons = (
      JSON.parse(readFileSync(`messages/${locale}/advisor.json`, "utf8")) as {
        dashboard: { setupPauseReasons: Record<string, string> };
      }
    ).dashboard.setupPauseReasons;
    for (const key of ["team_too_small", "consent_missing", "unspecified"]) {
      assert.ok(reasons[key], `${locale}: ${key} fehlt`);
    }
    // Der Text benennt den ZUSTAND, nicht das Ereignis: Ein Team mit einer
    // Person kann eine Löschung, einen Austritt oder eine Entfernung hinter
    // sich haben. "Jemand hat sein Konto gelöscht" wäre geraten.
    assert.doesNotMatch(
      reasons.team_too_small,
      locale === "de" ? /gelöscht/ : /deleted/,
      `${locale}: der Text behauptet eine Ursache, die er nicht kennt`
    );
  }
});

// ---------------------------------------------------------------------------
// Der Fehler, den Maria direkt nach dem Einspielen gemeldet hat
// ---------------------------------------------------------------------------
const REASONS_MIGRATION = "../supabase/migrations/20261010120000_advisor_setup_request_reasons.sql";

test("kein Founder-Team und nicht berechtigt sind zwei verschiedene Antworten", () => {
  // GEMELDET AM 20.09.2026: "Freigabe erbitten" endete mit "Möglicherweise ist
  // deine Freigabe für dieses Team nicht mehr aktiv." Die Meldung war falsch.
  //
  // Mein Fehler: Die erste Fassung suchte die Quelle MIT der Bedingung
  // `founder_team_id is not null`. Fand sie nichts, hiess es "nicht
  // berechtigt" - egal ob die Berechtigung fehlte oder das Team einfach noch
  // nicht existiert. Und `founder_team_id` bleibt NULL, bis die Founder ihr
  // Homebase anlegen; der zweite Fall ist also der häufige.
  const migration = sqlCodeOnly(REASONS_MIGRATION);
  const fn = migration.slice(
    migration.indexOf("function public.request_founder_team_advisor_setup_grant"),
    migration.indexOf("comment on function public.request_founder_team_advisor_setup_grant")
  );
  // Schritt 1 prüft die Berechtigung OHNE die Team-Bedingung ...
  const eligibility = fn.slice(0, fn.indexOf("advisor_ineligible"));
  assert.doesNotMatch(eligibility, /founder_team_id is not null/);
  // ... Schritt 2 das Team, mit eigenem Code.
  assert.match(fn, /founder_team_advisor_setup_team_missing/);
  assert.match(fn, /errcode = 'P0002'/);
  assert.match(fn, /errcode = '42501'/);
});

test("die Meldung behauptet keine Ursache, die sie nicht kennt", () => {
  const action = source("src/features/teams/advisorSetupRequestActions.ts");
  assert.match(action, /error\.code === "P0002"/);
  assert.match(action, /error=setup_request_no_team/);

  for (const locale of ["de", "en"]) {
    const errors = (
      JSON.parse(readFileSync(`messages/${locale}/advisor.json`, "utf8")) as {
        session: { errors: Record<string, string>; settled: Record<string, string> };
      }
    ).session;
    assert.ok(errors.errors.setup_request_no_team, `${locale}: die eigene Meldung fehlt`);
    // Die allgemeine Meldung darf die Freigabe nur noch als MOEGLICHKEIT nach
    // einem zweiten Versuch nennen, nicht als Befund.
    assert.match(
      errors.errors.setup_request,
      locale === "de" ? /noch einmal/ : /try again/,
      `${locale}: die Meldung schickt sofort in die falsche Richtung`
    );
    // Und die Meldung ohne Team nennt die Freigabe gar nicht.
    assert.doesNotMatch(
      errors.errors.setup_request_no_team,
      locale === "de" ? /nicht mehr aktiv/ : /no longer active/,
      `${locale}: die Meldung verwechselt die Ursachen wieder`
    );
    assert.ok(errors.settled.noFounderTeam, `${locale}: der Hinweis am Knopf fehlt`);
  }
});

test("ohne Founder-Team erscheint der Knopf nicht", () => {
  // Ein Knopf, der in eine Fehlermeldung laeuft, ist schlechter als kein Knopf.
  const page = source("src/app/(product)/advisor/session/page.tsx");
  assert.match(page, /advisorRelationshipHasFounderTeam\(data\.relationshipId, client\)/);
  assert.match(page, /status === "not_granted" && !hasFounderTeam \?/);
  assert.match(page, /session\.settled\.noFounderTeam/);

  // Die Abfrage gibt nur ja/nein heraus - die Team-Kennung braucht der Advisor
  // nicht, und was man nicht herausgibt, kann nicht weiterverwendet werden.
  const migration = sqlCodeOnly(REASONS_MIGRATION);
  assert.match(migration, /function public\.advisor_relationship_has_founder_team\(p_relationship_id uuid\)\s*\nreturns boolean/);
  assert.match(migration, /request_access\.advisor_user_id = auth\.uid\(\)/);
  // Und sie bleibt an derselben Berechtigung wie alles andere.
  const fn = migration.slice(migration.indexOf("function public.advisor_relationship_has_founder_team"));
  assert.match(fn, /request_access\.status = 'linked'/);
  assert.match(fn, /request_access\.revoked_at is null/);
});
