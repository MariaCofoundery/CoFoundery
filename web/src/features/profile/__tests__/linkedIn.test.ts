import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  LINKEDIN_VISIBILITIES,
  canSeeLinkedIn,
  isLinkedInVisibility,
  parseLinkedInUrl,
} from "@/features/profile/linkedInVisibility";

const MIGRATION = "../supabase/migrations/20261006120000_person_core_linkedin.sql";
const source = (path: string) => readFileSync(path, "utf8");
/**
 * Ohne Kommentare. Sonst findet die Pruefung auf type="url" den Begriff in der
 * Erklaerung daneben, warum er dort gerade NICHT stehen darf - und ist damit
 * dauerhaft rot, ohne dass etwas kaputt ist.
 */
const codeOnly = (path: string) =>
  source(path)
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

// ---------------------------------------------------------------------------
// Was als LinkedIn-Adresse durchgeht
// ---------------------------------------------------------------------------
test("nur LinkedIn, nur https", () => {
  // Das ist der eigentliche Punkt der Pruefung: Ein freies Linkfeld im Profil
  // waere ein Weg, anderen Mitgliedern beliebige Adressen auszuspielen. Gefragt
  // war nach dem LinkedIn-Profil.
  for (const bad of [
    "https://example.com/in/jemand",
    "http://linkedin.com.angreifer.de/in/jemand",
    "javascript:alert(1)",
    "data:text/html,hi",
    "https://notlinkedin.com/in/jemand",
    "https://linkedin.com",
    "ftp://linkedin.com/in/jemand",
  ]) {
    assert.equal(parseLinkedInUrl(bad).ok, false, `${bad} wurde durchgelassen`);
  }

  for (const good of [
    "https://www.linkedin.com/in/jemand",
    "https://de.linkedin.com/in/jemand",
    "https://linkedin.com/in/jemand",
  ]) {
    const result = parseLinkedInUrl(good);
    assert.equal(result.ok, true, `${good} wurde abgewiesen`);
  }
});

test("ein leeres Feld ist kein Fehler", () => {
  // Leer und falsch sind zwei verschiedene Faelle. Wer das Feld nie ausfuellt,
  // darf kein Formular mit Fehlermeldung bekommen.
  for (const empty of ["", "   ", null, undefined]) {
    const result = parseLinkedInUrl(empty);
    assert.equal(result.ok, true);
    assert.equal(result.ok && result.url, null);
  }
});

test("aus der Adresszeile kopiert reicht", () => {
  // Der haeufigste Fall: "linkedin.com/in/…" ohne Schema. Das zurueckzuweisen
  // waere Pedanterie gegenueber jemandem, der alles richtig gemacht hat.
  const result = parseLinkedInUrl("linkedin.com/in/jemand");
  assert.equal(result.ok, true);
  assert.equal(result.ok && result.url, "https://linkedin.com/in/jemand");
});

test("Tracking-Anhängsel landen nicht im Profil", () => {
  // Geteilte LinkedIn-Links tragen oft ?utm_source=… mit sich. Das gehoert
  // nicht ins Profil und wuerde anderen Mitgliedern angezeigt.
  const result = parseLinkedInUrl("https://www.linkedin.com/in/jemand?utm_source=share&trk=abc#top");
  assert.equal(result.ok, true);
  assert.equal(result.ok && result.url, "https://www.linkedin.com/in/jemand");
});

// ---------------------------------------------------------------------------
// Wer es sehen darf
// ---------------------------------------------------------------------------
test("die vier Stufen bedeuten vier verschiedene Publika", () => {
  assert.deepEqual([...LINKEDIN_VISIBILITIES], ["private", "contacts", "members", "public"]);
  assert.equal(isLinkedInVisibility("members"), true);
  assert.equal(isLinkedInVisibility("alle"), false);

  const viewer = { isSelf: false, isSignedIn: true, isAcceptedContact: false };
  const contact = { isSelf: false, isSignedIn: true, isAcceptedContact: true };
  const stranger = { isSelf: false, isSignedIn: false, isAcceptedContact: false };

  assert.equal(canSeeLinkedIn({ visibility: "private", ...contact }), false, "private zeigt niemandem etwas");
  assert.equal(canSeeLinkedIn({ visibility: "contacts", ...viewer }), false);
  assert.equal(canSeeLinkedIn({ visibility: "contacts", ...contact }), true);
  assert.equal(canSeeLinkedIn({ visibility: "members", ...viewer }), true);
  assert.equal(canSeeLinkedIn({ visibility: "members", ...stranger }), false, "members ist nicht öffentlich");
  assert.equal(canSeeLinkedIn({ visibility: "public", ...stranger }), true);
});

test("die eigene Angabe sieht man immer", () => {
  // Sonst waere das Feld nach dem Speichern auf "privat" fuer die eigene
  // Person unsichtbar - man koennte nicht mehr nachsehen, was dort steht.
  for (const visibility of LINKEDIN_VISIBILITIES) {
    assert.equal(
      canSeeLinkedIn({ visibility, isSelf: true, isSignedIn: true, isAcceptedContact: false }),
      true,
      visibility
    );
  }
});

// ---------------------------------------------------------------------------
// Die Datenbank hält dieselbe Regel
// ---------------------------------------------------------------------------
test("die Voreinstellung ist die engste Stufe", () => {
  // Der Kern der Migration: Die Altwerte aus dem entfernten LinkedIn-Import
  // werden uebernommen, damit niemand seine Angabe verliert - aber sie werden
  // niemandem gezeigt. Eine Uebernahme in eine sichtbare Stufe waere eine
  // Ausweitung ohne Zustimmung.
  const migration = source(MIGRATION);
  assert.match(migration, /linkedin_visibility text not null default 'private'/);
  assert.match(migration, /person_core_linkedin_visibility_check/);
  for (const visibility of LINKEDIN_VISIBILITIES) {
    assert.ok(migration.includes(`'${visibility}'`), `Stufe ${visibility} fehlt in der Datenbank`);
  }
  // Uebernahme ja, aber ohne die Sichtbarkeit anzufassen.
  assert.match(migration, /update public\.person_core core/);
  assert.doesNotMatch(migration, /set linkedin_url = legacy\.linkedin_url,\s*linkedin_visibility/);
});

test("person_core bleibt owner-only – fremde Adressen nur über die Funktion", () => {
  const migration = source(MIGRATION);
  // Keine neue Policy, kein grant auf die Tabelle: Der Zugang laeuft
  // ausschliesslich ueber die schmalen Funktionen.
  assert.doesNotMatch(migration, /create policy/i);
  assert.doesNotMatch(migration, /grant select on (table )?public\.person_core/i);

  for (const fn of ["list_member_linkedin_urls", "get_public_network_profile_linkedin"]) {
    assert.ok(migration.includes(`create or replace function public.${fn}`), `${fn} fehlt`);
    assert.match(
      migration,
      new RegExp(`revoke all on function public\\.${fn}`),
      `${fn} wird nicht erst entzogen`
    );
  }
  // security definer ohne gesetzten search_path ist die klassische Luecke.
  assert.equal((migration.match(/security definer/g) ?? []).length, 2);
  assert.equal((migration.match(/set search_path = ''/g) ?? []).length, 2);
});

test("die öffentliche Funktion verlangt beide Zustimmungen", () => {
  // Ein oeffentliches Netzwerkprofil zu haben, ist keine Zustimmung dazu, auch
  // den Klarnamen-Lebenslauf danebenzustellen. Deshalb muss BEIDES stimmen:
  // die Seite ist oeffentlich UND die Stufe ist "public".
  const migration = source(MIGRATION);
  const publicFn = migration.slice(migration.indexOf("get_public_network_profile_linkedin"));
  assert.match(publicFn, /profile\.visibility = 'public'/);
  assert.match(publicFn, /profile\.status = 'active'/);
  assert.match(publicFn, /membership\.status = 'active'/);
  assert.match(publicFn, /core\.linkedin_visibility = 'public'/);

  // Und die nicht angemeldete Rolle kommt nur an diese eine Funktion.
  assert.match(migration, /grant execute on function public\.get_public_network_profile_linkedin\(text\) to anon/);
  assert.doesNotMatch(migration, /grant execute on function public\.list_member_linkedin_urls\(uuid\[\]\) to [^;]*anon/);
});

test("die Kontaktstufe verlangt eine angenommene Anfrage in beide Richtungen", () => {
  const migration = source(MIGRATION);
  assert.match(migration, /request\.status = 'accepted'/);
  // Wer die Anfrage gestellt hat, darf keine Rolle spielen - sonst sieht nur
  // eine der beiden Seiten den Link.
  assert.match(migration, /request\.sender_user_id = auth\.uid\(\) and request\.recipient_user_id = core\.user_id/);
  assert.match(migration, /request\.recipient_user_id = auth\.uid\(\) and request\.sender_user_id = core\.user_id/);
});

// ---------------------------------------------------------------------------
// Die Oberfläche
// ---------------------------------------------------------------------------
test("jede Stufe wird erklärt, in beiden Sprachen", () => {
  // Maria wollte die Wahl "mit Hinweis": Ein Etikett wie "Mitglieder" sagt
  // niemandem, wer das ist.
  for (const locale of ["de", "en"]) {
    const linkedin = (JSON.parse(readFileSync(`messages/${locale}/capability.json`, "utf8")) as {
      identity: { linkedin: Record<string, never> };
      errors: Record<string, string>;
    });
    const options = linkedin.identity.linkedin.options as unknown as Record<
      string,
      { label?: string; hint?: string }
    >;
    for (const visibility of LINKEDIN_VISIBILITIES) {
      assert.ok(options[visibility]?.label, `${locale}: ${visibility} hat kein Etikett`);
      assert.ok(
        (options[visibility]?.hint ?? "").length > 40,
        `${locale}: ${visibility} wird nicht erklärt`
      );
    }
    assert.ok(linkedin.errors.linkedin, `${locale}: die Fehlermeldung fehlt`);
  }
});

test("das Eingabefeld lässt die Adresse durch, die man wirklich kopiert", () => {
  // GEFUNDEN AM 19.09.2026 in der Benutzung: Das Feld war ein type="url".
  // Damit weigert sich der BROWSER, das Formular abzuschicken, solange kein
  // Schema davorsteht - "linkedin.com/in/name" ist fuer ihn keine URL. Die
  // Meldung heisst "Bitte eine URL eingeben", und parseLinkedInUrl, das das
  // "https://" laengst ergaenzt haette, kam nie zum Zug. Genau die Adresse,
  // die jede Person aus der Adresszeile kopiert, war die einzige, die nicht
  // ging - und speichern liess sich gar nichts mehr.
  const field = codeOnly("src/features/profile/LinkedInField.tsx");
  assert.doesNotMatch(
    field,
    /type="url"/,
    'type="url" blockiert die Eingabe ohne Schema schon im Browser'
  );
  assert.match(field, /name="linkedin_url"[\s\S]{0,400}type="text"|type="text"[\s\S]{0,400}name="linkedin_url"/);

  // Und die Ergaenzung passiert sichtbar, bevor gespeichert wird.
  assert.match(field, /onBlur=/);
  assert.match(field, /parseLinkedInUrl/);
  assert.match(field, /aria-invalid/);

  // Die Pruefung selbst kann es - das war nie das Problem.
  const parsed = parseLinkedInUrl("linkedin.com/in/mein-name");
  assert.equal(parsed.ok, true);
  assert.equal(parsed.ok && parsed.url, "https://linkedin.com/in/mein-name");

  for (const locale of ["de", "en"]) {
    const linkedin = (
      JSON.parse(readFileSync(`messages/${locale}/capability.json`, "utf8")) as {
        identity: { linkedin: Record<string, string> };
      }
    ).identity.linkedin;
    assert.ok(linkedin.urlInvalid, `${locale}: die Rückmeldung am Feld fehlt`);
    // Sie muss sagen, was richtig waere, nicht nur dass etwas falsch ist.
    assert.match(linkedin.urlInvalid, /linkedin\.com\/in\//, `${locale}: kein Beispiel genannt`);
  }
});

test("die öffentliche Stufe nennt die Folge und fragt einmal nach", () => {
  for (const locale of ["de", "en"]) {
    const linkedin = (
      JSON.parse(readFileSync(`messages/${locale}/capability.json`, "utf8")) as {
        identity: { linkedin: Record<string, string> };
      }
    ).identity.linkedin;
    assert.match(
      linkedin.publicWarning,
      locale === "de" ? /Suchmaschinen/ : /search engines/,
      `${locale}: die Warnung verschweigt, dass Suchmaschinen mitlesen`
    );
    assert.ok(linkedin.publicConfirm, `${locale}: die Bestätigung fehlt`);
  }

  // Nur beim WECHSEL nach oeffentlich wird gefragt. Wer bereits oeffentlich
  // ist, soll nicht bei jedem Speichern erneut haken muessen.
  const field = source("src/features/profile/LinkedInField.tsx");
  assert.match(field, /firstPublicTransition/);
  assert.match(field, /initialVisibility !== "public" && visibility === "public"/);

  // Und ohne Haekchen wird nicht veroeffentlicht.
  const action = source("src/features/profile/personCoreActions.ts");
  assert.match(action, /confirm_public_linkedin/);
  assert.match(action, /linkedinVisibility === "public" && !confirmedPublic/);
});

test("Links auf LinkedIn öffnen ein neues Fenster", () => {
  const link = source("src/features/profile/LinkedInLink.tsx");
  assert.match(link, /target="_blank"/);
  // Ohne noopener kann die geoeffnete Seite auf das oeffnende Fenster zugreifen.
  assert.match(link, /rel="noreferrer noopener"/);

  for (const locale of ["de", "en"]) {
    const connect = JSON.parse(readFileSync(`messages/${locale}/connect.json`, "utf8")) as {
      linkedin: { openHint: string; linkLabel: string };
    };
    assert.match(
      connect.linkedin.openHint,
      locale === "de" ? /neue[nms] Fenster/ : /new window/,
      `${locale}: der Hinweis sagt nicht, dass ein Fenster aufgeht`
    );
    assert.ok(connect.linkedin.linkLabel);
  }
});

test("eine unbrauchbare Adresse wird gemeldet, nicht verschluckt", () => {
  // Stillschweigend zu leeren waere die schlechteste Variante: Man merkt erst
  // Wochen spaeter, dass im Profil nichts steht.
  const action = source("src/features/profile/personCoreActions.ts");
  assert.match(action, /if \(!linkedin\.ok\) \{\s*redirect\(back\("error=linkedin"\)\)/);
  assert.match(
    source("src/app/(product)/profile/page.tsx"),
    /ERROR_KEYS = \[[^\]]*"linkedin"/,
    "die Fehlermeldung würde nie angezeigt"
  );
});
