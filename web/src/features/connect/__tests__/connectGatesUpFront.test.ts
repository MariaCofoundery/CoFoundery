import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(path, "utf8");
const readJson = (path: string) => JSON.parse(source(path)) as Record<string, unknown>;

const CONTACT = "src/app/(product)/connect/listings/[listingId]/contact/page.tsx";
const LISTING = "src/app/(product)/connect/listings/[listingId]/page.tsx";
const NEW_LISTING = "src/app/(product)/connect/listings/new/page.tsx";
const EDIT_LISTING = "src/app/(product)/connect/listings/[listingId]/edit/page.tsx";
const FORM = "src/features/connect/ConnectListingForm.tsx";

// ---------------------------------------------------------------------------
// Die Voraussetzung steht vor der Arbeit, nicht dahinter
// ---------------------------------------------------------------------------
test("the contact form is not shown at all without an active Connect profile", () => {
  const page = source(CONTACT);

  // Vorher konnte man eine Nachricht fertig schreiben und erfuhr erst beim
  // Absenden, dass ein Profil fehlt. Die Arbeit war dann weg.
  assert.match(page, /hasActiveConnectProfile\(client, user\.id\)/);
  assert.match(page, /\{!hasProfile \? \(/);
  assert.match(page, /<ConnectProfileRequired/);

  // Die Pruefung muss vor dem Formular im Dokument stehen.
  assert.ok(
    page.indexOf("ConnectProfileRequired") < page.indexOf("requestConnectContactAction}"),
    "der Hinweis steht hinter dem Formular"
  );
});

test("the listing page does not offer a button that leads to a wall", () => {
  const page = source(LISTING);
  assert.match(page, /hasActiveConnectProfile\(client, user\.id\)/);
  // Statt "Kontakt aufnehmen" fuehrt der Weg dann direkt zum Profil.
  assert.match(page, /hasProfile \? <Link href=\{`\/connect\/listings\/\$\{listing\.id\}\/contact`\}/);
  assert.match(page, /contact\.profileRequiredCta/);
});

test("the way to the profile carries the way back", () => {
  // Sonst muss die Person nach dem Profil selbst zurueckfinden.
  assert.match(source("src/features/connect/ConnectProfileRequired.tsx"), /\/connect\/profile\?next=\$\{encodeURIComponent\(returnTo\)\}/);
  assert.match(source(CONTACT), /returnTo=\{`\/connect\/listings\/\$\{listingId\}\/contact`\}/);
  assert.match(source(LISTING), /next=\$\{encodeURIComponent\(`\/connect\/listings\/\$\{listing\.id\}\/contact`\)\}/);
});

// ---------------------------------------------------------------------------
// Anzeigen: Entwurf ja, Veroeffentlichen nur mit Profil
// ---------------------------------------------------------------------------
test("the publish button is not offered when the database would refuse it", () => {
  const form = source(FORM);
  // enforce_network_publication greift nur bei status='active' - der Entwurf
  // geht also ohne Profil, das Veroeffentlichen nicht.
  assert.match(form, /canPublish \? \(/);
  assert.match(form, /intent="draft"/, "der Entwurf bleibt immer moeglich");

  for (const page of [NEW_LISTING, EDIT_LISTING]) {
    assert.match(source(page), /canPublish=\{canPublish\}/, `${page} gibt es nicht weiter`);
    assert.match(source(page), /hasActiveConnectProfile\(client, user\.id\)/);
  }
});

test("the new listing page says why publishing is unavailable", () => {
  const page = source(NEW_LISTING);
  assert.match(page, /create\.profileRequiredTitle/);
  assert.match(page, /create\.profileRequiredText/);
});

// ---------------------------------------------------------------------------
// Die Datenbank bleibt die Instanz
// ---------------------------------------------------------------------------
test("the up-front check does not replace the database check", () => {
  // Die Oberflaeche ist zuvorkommend, nicht autoritativ: Wer das Formular
  // umgeht, wird weiterhin abgewiesen.
  const migration = source("../supabase/migrations/20260903180000_create_network_v01_slice1.sql");
  assert.match(migration, /active_network_profile_required/);
  const contactMigration = source("../supabase/migrations/20260903210000_create_network_contact_requests.sql");
  assert.match(contactMigration, /network_contact_sender_profile_required/);
  // Und die Fehlermeldung dafuer bleibt erhalten, als letzte Instanz.
  assert.match(source("src/features/connect/connectActions.ts"), /sender_profile_required[\s\S]*contact_profile/);
});

test("both locales carry the new copy", () => {
  for (const locale of ["de", "en"]) {
    const connect = readJson(`messages/${locale}/connect.json`) as Record<string, Record<string, string>>;
    for (const key of ["profileRequiredTitle", "profileRequiredText", "profileRequiredCta"]) {
      assert.ok(connect.contact[key], `${locale}: contact.${key} fehlt`);
    }
    for (const key of ["profileRequiredTitle", "profileRequiredText"]) {
      assert.ok(connect.create[key], `${locale}: create.${key} fehlt`);
    }
  }
  // Der Hinweis beim Erstellen muss sagen, dass der Entwurf geht - sonst
  // liest er sich als vollstaendige Sperre.
  const de = readJson("messages/de/connect.json") as Record<string, Record<string, string>>;
  assert.match(de.create.profileRequiredText, /Entwurf/);
});
