import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { FOUNDER_SETUP_ITEM_KEYS } from "@/features/teams/founderSetupCatalog";

const source = (path: string) => readFileSync(path, "utf8");
/** Ohne Kommentare - sonst findet die Pruefung Begriffe in ihrer Begruendung. */
const codeOnly = (path: string) =>
  source(path)
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

const MIGRATION = "../supabase/migrations/20261007120000_advisor_private_notes.sql";
const PAGE = "src/app/(product)/advisor/session/page.tsx";
const DATA = "src/features/reporting/advisorWorkspaceData.ts";
const ACTIONS = "src/features/reporting/advisorWorkspaceActions.ts";
const DOCUMENT = "src/app/(product)/advisor/session/document/page.tsx";

const advisorCopy = (locale: string) =>
  (
    JSON.parse(readFileSync(`messages/${locale}/advisor.json`, "utf8")) as {
      dashboard: Record<string, never>;
      session: Record<string, never>;
      document: Record<string, never>;
    }
  );

// ---------------------------------------------------------------------------
// Die Zusage: die Notizen gehören dem Advisor, sonst niemandem
// ---------------------------------------------------------------------------
test("die Datenbank selbst hält die Notizen privat", () => {
  // Das ist der Grund, warum diese Tabelle eine Policy hat und
  // advisor_section_impulses nicht: Die Regel ist so einfach, dass die
  // Datenbank sie halten kann. Damit kann ein Fehler in der Anwendung fremde
  // Notizen nicht herausgeben - die Anfrage bekommt sie nie zu sehen.
  const migration = source(MIGRATION);
  assert.match(migration, /alter table public\.advisor_private_notes enable row level security/);

  for (const operation of ["select", "insert", "update", "delete"]) {
    assert.match(
      migration,
      new RegExp(`advisor_private_notes_owner_${operation}`),
      `keine Policy für ${operation}`
    );
  }
  // In JEDER Richtung dieselbe Bedingung. Eine Policy, die beim Schreiben
  // lockerer ist als beim Lesen, waere eine offene Tuer.
  assert.equal(
    (migration.match(/advisor_user_id = auth\.uid\(\)/g) ?? []).length >= 6,
    true,
    "die Eigentumsbedingung fehlt an einer Stelle"
  );

  // Und nirgends ein Weg daran vorbei.
  assert.doesNotMatch(migration, /security definer/);
  assert.doesNotMatch(migration, /grant .* on table public\.advisor_private_notes/i);
});

test("dieses Feature braucht keinen privilegierten Zugang", () => {
  // Der restliche Advisor-Bereich liest ueber den Service-Role-Zugang und
  // prueft in TypeScript. Hier nicht - und das soll so bleiben, weil es die
  // Datenbank zur durchsetzenden Instanz macht.
  for (const path of [DATA, ACTIONS, PAGE]) {
    assert.doesNotMatch(
      codeOnly(path),
      /createPrivilegedAccessClient|SERVICE_ROLE/,
      `${path} greift am RLS vorbei`
    );
  }
});

test("Notizen überleben einen Widerruf, aber nicht das Löschen eines Kontos", () => {
  const migration = source(MIGRATION);
  // An die Beziehung gehaengt: Loescht ein beteiligtes Konto, geht die
  // Beziehung - und mit ihr die Aufzeichnungen ueber diese Menschen.
  assert.match(
    migration,
    /relationship_id uuid not null references public\.relationships \(id\) on delete cascade/
  );
  assert.match(
    migration,
    /advisor_user_id uuid not null references auth\.users \(id\) on delete cascade/
  );

  // Aber der Widerruf ist keine Bedingung fuer den Zugriff - sonst koennte
  // niemand seine eigene Handakte nach Ende des Mandats noch lesen.
  assert.doesNotMatch(migration, /revoked_at/);

  // Die Schreibregel verlangt, dass es die Beziehung als Advisor je gab -
  // sonst koennte man Notizen ueber Fremde anlegen.
  assert.match(codeOnly(ACTIONS), /wasEverAdvisor/);
  assert.match(source(ACTIONS), /from\("relationship_advisors"\)/);
});

test("die Oberfläche sagt, dass die Founder die Notizen nicht sehen", () => {
  // Ohne diese Zusage schreibt niemand ehrlich hinein - und sie muss AM Feld
  // stehen, nicht im Kleingedruckten.
  assert.match(codeOnly(PAGE), /session\.note\.privacy/);
  for (const locale of ["de", "en"]) {
    const note = advisorCopy(locale).session.note as unknown as Record<string, string>;
    assert.match(
      note.privacy,
      locale === "de" ? /Founder sehen sie nicht/ : /founders don't see them/,
      `${locale}: die Zusage fehlt`
    );
    // Und der Unterschied zu den Impulsen, die sichtbar SIND.
    const impulses = advisorCopy(locale).session.impulses as unknown as Record<string, string>;
    assert.match(
      impulses.help,
      locale === "de" ? /sichtbar/ : /visible/,
      `${locale}: der Unterschied zu den Impulsen wird nicht benannt`
    );
  }
});

// ---------------------------------------------------------------------------
// Die Grenze des Freigegebenen
// ---------------------------------------------------------------------------
test("das Sitzungsblatt zeigt keine offenen Setup-Themen", () => {
  // Die Freigabe lautet `confirmed_only`. Die offenen Themen liessen sich aus
  // Katalog minus bestaetigt errechnen - und genau das waere eine Umgehung der
  // Zustimmung mit den Mitteln der Arithmetik. Deshalb kommt der Katalog auf
  // dieser Seite nicht vor.
  const page = codeOnly(PAGE);
  assert.doesNotMatch(page, /FOUNDER_SETUP_CATALOG|FOUNDER_SETUP_ITEM_KEYS/);
  assert.doesNotMatch(page, /getFounderSetupItemsByPhase/);
  // Gezeigt wird ausschliesslich, was der Zugriff liefert.
  assert.match(page, /data\.founderSetupItems\.map/);
  assert.ok(FOUNDER_SETUP_ITEM_KEYS.length > 0);

  for (const locale of ["de", "en"]) {
    const settled = advisorCopy(locale).session.settled as unknown as Record<string, string>;
    assert.match(
      settled.help,
      locale === "de" ? /noch offen/ : /still open/,
      `${locale}: die Grenze wird nicht benannt`
    );
  }
});

test("ohne aktive Freigabe steht dort nichts, sondern der Grund", () => {
  const page = codeOnly(PAGE);
  assert.match(page, /data\.founderSetupAccess\.status !== "active"/);
  assert.match(page, /dashboard\.setupStatuses\./);
});

// ---------------------------------------------------------------------------
// Die Wiedervorlage
// ---------------------------------------------------------------------------
test("eine Wiedervorlage in der Vergangenheit wird abgewiesen", () => {
  // Sie würde an nichts erinnern - und stillschweigend zu speichern wäre die
  // schlechtere Variante.
  const actions = codeOnly(ACTIONS);
  assert.match(actions, /rawDate < today/);
  assert.match(actions, /error=follow_up_past/);
  assert.match(actions, /\^\\d\{4\}-\\d\{2\}-\\d\{2\}\$/);

  // Leeres Datum entfernt sie - das ist kein Fehler, sondern der Weg zurück.
  assert.match(actions, /if \(!rawDate\)/);
  assert.match(actions, /saved=follow_up_cleared/);

  for (const locale of ["de", "en"]) {
    const errors = advisorCopy(locale).session.errors as unknown as Record<string, string>;
    assert.ok(errors.follow_up_past, `${locale}: die Meldung fehlt`);
  }
});

test("die Wiedervorlage ist seine eigene – die Founder erfahren nichts davon", () => {
  const migration = source(MIGRATION);
  const followUps = migration.slice(migration.indexOf("create table public.advisor_follow_ups"));
  assert.match(followUps, /advisor_follow_ups_owner_select/);
  // Keine Benachrichtigung an irgendwen sonst.
  assert.doesNotMatch(codeOnly(ACTIONS), /notification|sendEmail|resend/i);

  for (const locale of ["de", "en"]) {
    const followUp = advisorCopy(locale).session.followUp as unknown as Record<string, string>;
    assert.match(
      followUp.help,
      locale === "de" ? /Founder sehen sie nicht/ : /founders don't see it/,
      `${locale}: der Hinweis fehlt`
    );
  }
});

// ---------------------------------------------------------------------------
// Erreichbarkeit
// ---------------------------------------------------------------------------
test("das Sitzungsblatt ist vom Dashboard aus erreichbar", () => {
  const dashboard = codeOnly("src/app/(product)/advisor/dashboard/page.tsx");
  assert.match(dashboard, /team\.sessionHref/);
  assert.match(dashboard, /dashboard\.openSession/);
  assert.match(
    codeOnly("src/features/dashboard/dashboardRoleData.ts"),
    /sessionHref: `\/advisor\/session\?invitationId=/
  );
  for (const locale of ["de", "en"]) {
    assert.ok(
      (advisorCopy(locale).dashboard as unknown as Record<string, string>).openSession,
      `${locale}: der Einstieg hat kein Label`
    );
  }
});

test("ohne Freigabe endet der Aufruf auf dem Dashboard", () => {
  // Die Seite laedt ueber getAdvisorReportPageData - dieselbe Pruefung wie der
  // Report. Ein Aufruf mit fremder invitationId darf nicht halb rendern.
  const page = source(PAGE);
  assert.match(page, /if \(data\.status !== "ready"\) redirect\("\/advisor\/dashboard"\)/);
  assert.match(page, /if \(!invitationId\) redirect\("\/advisor\/dashboard"\)/);
});

// ---------------------------------------------------------------------------
// Das Übergabedokument
// ---------------------------------------------------------------------------
test("das Übergabedokument enthält die privaten Notizen nicht", () => {
  // Die wichtigste Entscheidung an dieser Seite. Ein Dokument mit einem
  // Häkchen "meine Notizen mitdrucken" wäre genau die Art Funktion, die einmal
  // jemand vergisst auszuschalten - und dann liegt die Handakte bei den
  // Foundern auf dem Tisch. Eine Zusage mit Ausnahme ist keine Zusage.
  const doc = codeOnly(DOCUMENT);
  assert.doesNotMatch(doc, /getAdvisorPrivateNote|advisor_private_notes|note\.body/);
  // Und das Blatt sagt selbst, dass sie fehlen - sonst haelt es jemand fuer
  // vollstaendig.
  assert.match(doc, /document\.notesExcluded/);

  for (const locale of ["de", "en"]) {
    const document = advisorCopy(locale).document as unknown as Record<string, string>;
    assert.match(
      document.notesExcluded,
      locale === "de" ? /Nicht enthalten/ : /Not included/,
      `${locale}: der Hinweis fehlt`
    );
    assert.ok(document.disclaimer, `${locale}: der Vorbehalt fehlt`);
  }
});

test("das Dokument zeigt nur, was beide Seiten kennen", () => {
  // Bestaetigte Staende (freigegeben) und die eigenen Impulse (den Foundern
  // ohnehin im Report gezeigt). Nichts, was nur eine Seite kennt.
  const doc = codeOnly(DOCUMENT);
  assert.match(doc, /data\.founderSetupAccess\.status === "active" \? data\.founderSetupItems : \[\]/);
  assert.match(doc, /data\.impulses\[key\]/);
  assert.doesNotMatch(doc, /FOUNDER_SETUP_CATALOG|FOUNDER_SETUP_ITEM_KEYS/);
  assert.match(doc, /if \(data\.status !== "ready"\) redirect\("\/advisor\/dashboard"\)/);
});

// ---------------------------------------------------------------------------
// Die Erinnerung
// ---------------------------------------------------------------------------
test("eine fällige Wiedervorlage steht oben im Dashboard", () => {
  // Eine Verabredung, die man erst findet, wenn man in das richtige Team
  // hineinschaut, erinnert an nichts.
  const dashboard = codeOnly("src/app/(product)/advisor/dashboard/page.tsx");
  assert.match(dashboard, /listDueAdvisorFollowUps\(client\)/);
  assert.match(dashboard, /overdueTeams/);
  assert.match(dashboard, /dashboard\.followUpsDue\.title/);
  // Ueber den angemeldeten Zugang - die Policy gibt nur eigene Zeilen heraus.
  assert.doesNotMatch(dashboard, /createPrivilegedAccessClient/);

  for (const locale of ["de", "en"]) {
    const due = advisorCopy(locale).dashboard as unknown as Record<string, { title?: string }>;
    assert.match(
      due.followUpsDue?.title ?? "",
      /plural/,
      `${locale}: der Banner beugt die Anzahl nicht`
    );
  }
});

test("die Snapshot-Seite trägt kein abgeschaltetes Debug mehr", () => {
  // Beim ersten Durchgang uebersehen: dieselbe `const debug = false`-Attrappe
  // wie auf Report und Dashboard.
  const snapshot = codeOnly("src/app/(product)/advisor/snapshot/page.tsx");
  assert.doesNotMatch(snapshot, /const debug = false/);
  assert.doesNotMatch(snapshot, /\{debug \?/);
  assert.doesNotMatch(snapshot, /debug=1/);
});

test("Titel und Beschriftungen werden nicht ein zweites Mal gepflegt", () => {
  // Die Setup-Titel liegen in teams.setup, die Abschnittsnamen der Impulse im
  // bestehenden Helfer. Beides hier zu wiederholen waere sofort eine zweite
  // Wahrheit - genau das Muster, das im Advisor-Dashboard schon einmal einen
  // Fehler erzeugt hat.
  const page = source(PAGE);
  assert.match(page, /getTranslations\("teams\.setup"\)/);
  assert.match(page, /setupT\(`items\.\$\{item\.itemKey\}\.title`\)/);
  assert.match(page, /getAdvisorImpulseSectionMeta\(locale\)/);
});
