import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(path, "utf8");
const codeOnly = (path: string) =>
  source(path)
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
const sqlCodeOnly = (path: string) =>
  source(path)
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/^\s*--.*$/gm, "");

const MIGRATION = "../supabase/migrations/20261016120000_person_contact_requests.sql";
const CONTACT_PAGE = "src/app/(product)/connect/people/[userId]/contact/page.tsx";
const PERSON_PAGE = "src/app/(product)/connect/people/[userId]/page.tsx";
const ACTIONS = "src/features/connect/connectActions.ts";

/**
 * Jemanden anschreiben, ohne dass er etwas ausgeschrieben hat.
 *
 * Bis zum 21.09.2026 war `listing_id` in network_contact_requests `not null` -
 * wer gerade keine Anzeige offen hatte, war nicht erreichbar.
 *
 * Das Verhalten der Datenbank prueft `supabase/tests/person_contact_requests.sql`
 * mit 12 pgTAP-Faellen. Hier stehen die Zusagen der Oberflaeche und die eine
 * Regel, die dieses Produkt praegt.
 */

test("anschreiben darf, wer selbst ein veroeffentlichtes Profil hat", () => {
  // MARIAS ENTSCHEIDUNG vom 21.09.2026, und sie steht in der DATENBANK: Eine
  // Bedingung, die nur ein Formular kennt, ist keine Bedingung. Sie ist auch
  // nicht neu - fuer Anzeigen gilt sie seit dem 03.09.2026.
  const migration = sqlCodeOnly(MIGRATION);
  const fn = migration.slice(migration.indexOf("function public.request_network_person_contact"));
  assert.match(fn, /profile\.user_id = v_sender_user_id and profile\.status = 'active'/);
  assert.match(fn, /raise exception 'network_contact_sender_profile_required'/);

  // Und die Seite sagt es, bevor jemand eine Nachricht fertig schreibt.
  const page = codeOnly(CONTACT_PAGE);
  assert.match(page, /hasActiveConnectProfile\(client, user\.id\)/);
  assert.match(page, /!hasProfile \?[\s\S]{0,200}ConnectProfileRequired/);
});

test("nur an Menschen mit Profil - ein Entwurf ist niemandes Adresse", () => {
  // Damit bleibt "ich bin hier, aber still" moeglich: Wer sein Profil im
  // Entwurf laesst, ist unsichtbar UND wird nicht angeschrieben.
  const fn = sqlCodeOnly(MIGRATION).slice(
    sqlCodeOnly(MIGRATION).indexOf("function public.request_network_person_contact")
  );
  assert.match(fn, /profile\.user_id = p_recipient_user_id and profile\.status = 'active'/);
  assert.match(fn, /raise exception 'network_contact_recipient_unavailable'/);
});

test("eine Blockierung haelt auch hier", () => {
  // Und zwar VOR der Profilpruefung: Wer blockiert hat, soll nicht einmal
  // erfahren, dass jemand es versucht hat.
  const migration = sqlCodeOnly(MIGRATION);
  const fn = migration.slice(migration.indexOf("function public.request_network_person_contact"));
  const blockAt = fn.indexOf("is_network_interaction_blocked");
  const profileAt = fn.indexOf("network_contact_sender_profile_required");
  assert.ok(blockAt > 0 && blockAt < profileAt, "die Blockierung wird zu spaet geprueft");
});

test("hoechstens eine offene Anfrage je Paar - aber kein Nein fuer immer", () => {
  // Ohne Anzeige greift unique(sender_user_id, listing_id) nicht, weil null in
  // Postgres nicht gleich null ist. Ohne Ersatz koennte jemand denselben
  // Menschen beliebig oft anschreiben.
  const migration = sqlCodeOnly(MIGRATION);
  assert.match(migration, /create unique index network_contact_requests_open_person_unique/);
  // Ein Teilindex NUR auf offene: Menschen und Umstaende aendern sich, und eine
  // Ablehnung von damals soll kein zweites Ansprechen fuer immer verhindern.
  assert.match(migration, /where listing_id is null and status = 'pending'/);
});

test("ohne Anzeige gibt es keinen Anzeigentitel, und das ist eine Bedingung", () => {
  // Ein Platzhaltertext waere eine Behauptung ueber einen Vorgang, den es nicht
  // gab. Der Constraint verlangt, dass beides zusammen passt.
  assert.match(
    sqlCodeOnly(MIGRATION),
    /\(listing_id is null\) = \(listing_title_snapshot is null\)/
  );
});

test("der Weg ueber die Anzeige bleibt unangetastet", () => {
  // Eine eigene Funktion und eine eigene Aktion statt eines Umbaus: Der
  // bestehende Weg wird benutzt, und ihn fuer einen zweiten Fall umzubauen
  // waere ein Risiko ohne Gegenwert.
  const migration = sqlCodeOnly(MIGRATION);
  assert.doesNotMatch(
    migration,
    /create or replace function public\.request_network_contact\b/,
    "die bestehende Funktion wurde angefasst"
  );

  const actions = codeOnly(ACTIONS);
  assert.match(actions, /export async function requestConnectContactAction/);
  assert.match(actions, /export async function requestConnectPersonContactAction/);
  assert.match(actions, /rpc\("request_network_person_contact"/);
});

test("der Knopf steht oben auf der Profilseite, nicht am Ende", () => {
  // Er ist der Grund, warum man dort ist.
  assert.ok(existsSync(CONTACT_PAGE));
  const page = codeOnly(PERSON_PAGE);
  const contactAt = page.indexOf(`/contact\``);
  const bioAt = page.indexOf("person.bio");
  assert.ok(contactAt > 0 && contactAt < bioAt, "der Kontaktknopf steht unter dem Profil");

  // Und der Satz "noch nicht erreichbar" ist weg - er stimmt nicht mehr.
  assert.doesNotMatch(page, /people\.noContactYet/);
});

test("jeder Text steht in beiden Sprachen da und sagt den Grund", () => {
  for (const locale of ["de", "en"]) {
    const contact = (
      JSON.parse(readFileSync(`messages/${locale}/connect.json`, "utf8")) as {
        contact: Record<string, string>;
      }
    ).contact;
    for (const key of ["personTitle", "personMessageHint", "personProfileRequiredText"]) {
      assert.ok(contact[key], `${locale}: contact.${key} fehlt`);
    }
    // Der Satz zur Profilpflicht muss den GRUND nennen, nicht nur die Regel -
    // sonst liest er sich wie eine Schranke.
    assert.ok(
      contact.personProfileRequiredText.length > 100,
      `${locale}: der Grund fehlt`
    );
  }
});
