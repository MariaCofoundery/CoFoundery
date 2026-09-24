import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { ADVISOR_SCOPES } from "@/features/advisor/personAccessData";

const source = (path: string) => readFileSync(path, "utf8");
const codeOnly = (path: string) =>
  source(path)
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
const sqlCodeOnly = (path: string) => source(path).replace(/^\s*--.*$/gm, "");

const MIGRATION = "../supabase/migrations/20261040120000_advisor_person_grants.sql";
const VIEW = "src/features/advisor/PersonAccessSection.tsx";
const ACTIONS = "src/features/advisor/personAccessActions.ts";
const ACCOUNT = "src/app/(product)/account/page.tsx";

// ---------------------------------------------------------------------------
// Ein Advisor begleitet auch einzelne Menschen
// ---------------------------------------------------------------------------
//
// GEMELDET AM 23.09.2026: "Ein Accelerator hätte das gerne so, dass man auch
// mit den einzelnen Foundern sprechen kann - nicht nur mit Teams."
//
// Die Grenzen selbst stehen in `supabase/tests/advisor_person_grants.sql`.
// Hier steht, was der Code zusagt.

test("die Umfänge im Code und in der Datenbank sind dieselben", () => {
  const migration = sqlCodeOnly(MIGRATION);
  const start = migration.indexOf("advisor_person_grants_scope_check");
  const block = migration.slice(start, migration.indexOf("))", start));
  const inDatabase = [...block.matchAll(/'([a-z_]+)'/g)].map((match) => match[1]).sort();
  assert.deepEqual(inDatabase, [...ADVISOR_SCOPES].sort());
});

test("Erzählungen sind kein Umfang - und werden es nicht", () => {
  // DIE GRENZE, die beim Teamzugang schon gilt: Ein Advisor sieht bestätigte
  // Ergebnisse, nie den Rohtext. Frage 3 des Fähigkeits-Interviews fragt nach
  // dem Leben außerhalb der Erwerbsarbeit; dort stehen Pflege, Ehrenamt,
  // Familie.
  assert.ok(!(ADVISOR_SCOPES as readonly string[]).includes("interview_answers"));
  assert.ok(!(ADVISOR_SCOPES as readonly string[]).includes("narratives"));
  // Und es steht auf der Seite, statt geglaubt werden zu müssen.
  assert.match(codeOnly(VIEW), /neverShared/);
  for (const locale of ["de", "en"]) {
    const copy = (
      JSON.parse(source(`messages/${locale}/account.json`)) as {
        personAccess: Record<string, string>;
      }
    ).personAccess;
    assert.match(copy.neverShared!, /Erz(ä|ae)hlungen|stories/i, `${locale}`);
  }
});

test("je Umfang eine Entscheidung, nicht alles oder nichts", () => {
  // Wer nur die Richtung wieder verbergen will, nimmt eine Zeile zurück. Bei
  // einem Feld mit allen Umfängen wäre derselbe Vorgang ein Schreibzugriff auf
  // die Freigabe, die bestehen bleibt.
  const migration = sqlCodeOnly(MIGRATION);
  assert.match(
    migration,
    /unique index advisor_person_grants_once[\s\S]{0,120}\(subject_user_id, advisor_user_id, scope\)/
  );
  assert.doesNotMatch(migration, /scopes text\[\]|scope_mask|jsonb/);
});

test("zwischen Anfrage und Sichtbarkeit steht ein Mensch", () => {
  // DIE ZUSAGE, auf der alles andere steht - und die Stelle, an der später
  // auch ein bezahlter Sitz nichts anderes tun wird: Der Kauf erzeugt eine
  // Anfrage, nie einen Zugang.
  const migration = sqlCodeOnly(MIGRATION);
  const request = migration.slice(
    migration.indexOf("function public.request_advisor_person_access"),
    migration.indexOf("function public.decide_advisor_person_access")
  );
  assert.doesNotMatch(request, /status = 'active'|approved_at = pg_catalog\.now\(\)/);
  // Aktiv heißt zugestimmt - ohne Zeitpunkt wäre "aktiv" eine Behauptung ohne
  // Beleg.
  assert.match(migration, /\(status = 'active'\) = \(approved_at is not null\)/);
});

test("widerrufen steht neben dem Zugang, nicht zwei Ebenen tiefer", () => {
  // Ein Widerruf, den man suchen muss, ist einer, den man nicht ausübt.
  const view = codeOnly(VIEW);
  assert.match(view, /revokePersonAccessAction/);
  assert.match(view, /activeTitle/);
  // Und die Seite zeigt beides: offene Anfragen und geltende Zugänge.
  assert.match(view, /requestedTitle/);
  assert.match(codeOnly(ACCOUNT), /<PersonAccessSection grants=\{personAccessGrants\}/);
});

test("wer was entscheiden darf, steht in der Datenbank und nicht im Formular", () => {
  // Eine zweite Kopie dieser Regel im Code wäre die erste, die ausläuft - und
  // auslaufen hieße hier, dass jemand zustimmt, der nicht gefragt war.
  const actions = codeOnly(ACTIONS);
  assert.match(actions, /decide_advisor_person_access/);
  assert.doesNotMatch(actions, /\.update\(|\.insert\(|status:/);
});

test("eingeladen wird von innen - es gibt keine Personensuche", () => {
  // ENTSCHIEDEN AM 23.09.2026: "Sie können eine Einladungs-E-Mail
  // rausschicken, aber die kommt von innen [...] so wie wir das auch mit dem
  // Co-Founder haben."
  //
  // Eine Suche nach E-Mail-Adressen hätte verraten, ob es zu einer Adresse ein
  // Konto gibt. Eine Einladung verrät nichts: Sie geht an eine Adresse, die
  // der Advisor ohnehin kennt.
  const actions = codeOnly("src/features/advisor/personInviteActions.ts");
  assert.match(actions, /create_advisor_person_invite/);
  // Kein Nachschlagen von Konten zu Adressen.
  assert.doesNotMatch(actions, /auth\.users|from\("person_core"\)|\.eq\("email"/);

  // Der Token entsteht in der Anwendung, die Datenbank bekommt nur den Hash -
  // wer die Datenbank liest, kann keine Einladung annehmen.
  assert.match(actions, /randomBytes\(24\)/);
  assert.match(actions, /createHash\("sha256"\)/);
  assert.match(actions, /p_token_hash: tokenHash/);
  assert.doesNotMatch(actions, /p_token: token\b/);
});

test("eine Einladung ist kein Zugang", () => {
  // Das Annehmen erzeugt ANFRAGEN, keine Zugänge - die Zustimmung fällt danach
  // im Konto, Bereich für Bereich.
  const migration = sqlCodeOnly("../supabase/migrations/20261042120000_advisor_person_invites.sql");
  const claim = migration.slice(migration.indexOf("function public.claim_advisor_person_invite"));
  assert.match(claim, /insert into public\.advisor_person_grants/);
  // Kein 'active', kein approved_at: Der Token belegt, dass jemand die
  // Adresse erreicht hat - nicht, dass er einverstanden ist.
  assert.doesNotMatch(claim.slice(0, claim.indexOf("$$;")), /status = 'active'|approved_at = pg_catalog\.now\(\)/);
  // Und die Adresse muss passen, sonst wirkt ein weitergeleiteter Link.
  assert.match(claim, /invite_email_mismatch/);

  // Auch die Mail sagt es.
  const email = codeOnly("src/lib/email/sendAdvisorPersonInviteEmail.ts");
  assert.match(email, /Du entscheidest danach selbst/);
});

test("eine Organisation nimmt Mitglieder auf, sie legt keine Konten an", () => {
  // GEWÜNSCHT AM 23.09.2026: "Es gibt einen Organisationszugang, und darunter
  // kann man dann auch Advisor-Konten anlegen."
  //
  // ANGELEGT WERDEN MITGLIEDSCHAFTEN. Wer Konten für andere Menschen anlegt,
  // hält deren Zugangsdaten - dann kann die Person nicht mehr sicher sein,
  // dass ihr Konto ihr gehört. Die Organisation lädt ein, jeder meldet sich
  // selbst an.
  const actions = codeOnly("src/features/advisor/orgActions.ts");
  assert.match(actions, /create_advisor_org_invite/);
  assert.doesNotMatch(actions, /admin\.createUser|signUp|auth\.admin/);

  const migration = sqlCodeOnly("../supabase/migrations/20261044120000_advisor_org_invites.sql");
  // Auch hier: nur der Hash, und ein weitergeleiteter Link bewirkt nichts.
  assert.match(migration, /token_hash ~ '\^\[0-9a-f\]\{64\}\$'/);
  assert.match(migration, /invite_email_mismatch/);
});

test("in wessen Namen gefragt wird, entscheidet wer den Zugang behält", () => {
  // Ohne diesen Weg wäre die Organisation eine Liste von Namen ohne Wirkung:
  // Der Zugang gehörte weiter der einzelnen Advisorin, und mit ihr ginge er.
  const view = codeOnly("src/features/advisor/PersonInviteSection.tsx");
  assert.match(view, /holderLabel/);
  assert.match(view, /value=\{`org:\$\{org\.id\}`\}/);

  const actions = codeOnly("src/features/advisor/personInviteActions.ts");
  assert.match(actions, /p_org_id: orgId/);

  for (const locale of ["de", "en"]) {
    const copy = (
      JSON.parse(source(`messages/${locale}/advisor.json`)) as {
        personInvites: Record<string, string>;
      }
    ).personInvites;
    // Der Hinweis muss die Folge benennen, nicht nur die Option.
    assert.match(copy.holderHint!, /bleibt|stays/i, `${locale}`);
  }
});

test("der gesammelte Bereich trennt Zusage und Anfrage", () => {
  // Eine Liste, die Angefragte und Begleitete vermischt, lädt dazu ein, eine
  // Anfrage für eine Zusage zu halten.
  const data = codeOnly("src/features/advisor/orgData.ts");
  assert.match(data, /pendingScopes/);
  assert.match(data, /row\.status === "active"/);
  const view = codeOnly("src/features/advisor/AdvisorOrgSection.tsx");
  assert.match(view, /personPending/);
  // Und die Liste zeigt keine Namen: Sie würde sie für Menschen laden, die
  // vielleicht nur "Wer du bist" freigegeben haben.
  assert.doesNotMatch(view, /displayName|person_core/);
});

// ---------------------------------------------------------------------------
// Und was davon wirklich zu sehen ist
// ---------------------------------------------------------------------------
//
// NACHGETRAGEN AM 24.09.2026. Bis hierher gab es Zugänge, aber keine Ansicht -
// freigegeben, aber nirgends darstellbar. Das ist der Teil, den ein
// Accelerator tatsächlich benutzt, und damit der heikelste: Hier gehen zum
// ersten Mal Daten eines Menschen an jemand anderen.
//
// Die Grenzen selbst prüft `supabase/tests/advisor_person_views.sql` gegen die
// laufende Datenbank. Hier steht nur, was der Code zusagt - und das ist nicht
// dasselbe: Ein Test gegen die Datenbank kann nicht sehen, ob die SEITE die
// Prüfung nachträglich umgeht.

const VIEW_MIGRATION = "../supabase/migrations/20261045120000_advisor_person_views.sql";
const PERSON_PAGE = "src/app/(product)/advisor/person/[userId]/page.tsx";
const VIEW_DATA = "src/features/advisor/personViewData.ts";

test("jede Lesefunktion fragt selbst nach der Zustimmung", () => {
  const migration = sqlCodeOnly(VIEW_MIGRATION);
  const readers = migration.match(/create or replace function public\.get_advisor_person_\w+/g) ?? [];
  const checks = migration.match(/if not public\.has_advisor_person_access\(/g) ?? [];

  assert.ok(readers.length >= 4, "es gibt vier Lesefunktionen");
  // GLEICH VIELE, nicht "mindestens eine": Eine Funktion ohne eigene Prüfung
  // wäre eine offene Tür, die niemandem auffällt, weil die drei anderen
  // geschlossen sind.
  assert.equal(
    checks.length,
    readers.length,
    "jede Lesefunktion prüft, keine verlässt sich auf eine andere"
  );
});

test("keine Lesefunktion fasst die Erzählungen an", () => {
  // Auch die Blockkommentare weg: Die Migration ERKLÄRT, warum sie die
  // Vorschlagstabelle nicht anfasst, und nennt sie dabei. Geprüft wird der
  // Code, nicht die Begründung.
  const migration = sqlCodeOnly(VIEW_MIGRATION).replace(/\/\*[\s\S]*?\*\//g, " ");
  // Die Belege an den Fähigkeiten, die Interviewantworten und die Vorschläge,
  // über die noch niemand entschieden hat. Ein Advisor sieht bestätigte
  // Ergebnisse - Frage 3 des Fähigkeits-Interviews fragt nach dem Leben
  // ausserhalb der Erwerbsarbeit, dort stehen Pflege, Ehrenamt, Familie.
  for (const table of [
    "person_capability_evidence",
    "capability_interview_turns",
    "direction_statement_proposals",
  ]) {
    assert.ok(!migration.includes(table), `${table} kommt in den Ansichten nicht vor`);
  }
});

test("die Tiefe hängt an ihrer eigenen Freigabe", () => {
  const migration = sqlCodeOnly(VIEW_MIGRATION);
  // Die vorhandene Sichtbarkeitsleiter trennt "welche Bereiche" von "wie tief"
  // (`get_disclosed_capability`). Ein Advisor-Zugang darf sie nicht
  // überspringen, also wird `capability_depth` getrennt abgefragt.
  assert.match(migration, /has_advisor_person_access\([^)]*'capability_depth'\)/);
  assert.match(migration, /case when v_depth then entry\.application_level end/);
  assert.match(migration, /case when v_depth then entry\.ownership_wish end/);
});

test("die Seite zeigt nur, was die Datenbank herausgegeben hat", () => {
  const page = codeOnly(PERSON_PAGE);

  // Kein Abschnitt ohne Bedingung: Was nicht freigegeben ist, erscheint gar
  // nicht - kein leerer Block und kein Schloss. Ein leerer Block würde aus
  // einer fehlenden Freigabe eine Aussage über den Menschen machen.
  for (const section of ["view.base", "view.capability", "view.strengths", "view.direction"]) {
    assert.ok(
      page.includes(`{${section} ?`) || page.includes(`{${section} &&`),
      `${section} steht hinter einer Bedingung`
    );
  }

  // Gar nichts freigegeben heisst: Diese Seite gibt es für diese Person nicht.
  assert.match(page, /grantedScopes\.length === 0\)\s*notFound\(\)/);

  // Sich selbst begleitet niemand - die Freigabe-Abfrage sieht auch die
  // EIGENEN Zeilen, die Lesefunktionen geben ihnen aber nichts heraus.
  assert.match(page, /userId === user\.id\)\s*redirect\("\/me\/profile"\)/);

  // Und es steht dabei, was das hier ist: Selbstauskunft, kein Testergebnis.
  assert.match(page, /report\.instrumentNote/);
});

test("eine verweigerte Freigabe ist kein Fehler, sondern eine Abwesenheit", () => {
  const data = codeOnly(VIEW_DATA);
  // `42501` aus der Datenbank heisst "nicht freigegeben". Würde das als
  // Fehler durchschlagen, risse ein fehlender Umfang die ganze Seite ab -
  // und die freigegebenen Bereiche wären auch weg.
  assert.match(data, /if \(error\) return null/);
});
