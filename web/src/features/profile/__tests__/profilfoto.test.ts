import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const source = (path: string) => readFileSync(path, "utf8");
const codeOnly = (path: string) =>
  source(path)
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

const AKTIONEN = join("src", "features", "profile", "photoActions.ts");
const FELD = join("src", "features", "profile", "ProfilePhotoField.tsx");
const AVATAR = join("src", "features", "profile", "ProfileAvatar.tsx");
const SPEICHER = join("src", "features", "profile", "avatarStorage.ts");
const UEBER_DICH = join("src", "app", "(product)", "profile", "page.tsx");
const DAS_BIST_DU = join("src", "app", "me", "profile", "page.tsx");
const DRUCK = join("src", "app", "me", "profile", "print", "page.tsx");
const MODELL = join("src", "features", "reporting", "profileReadModel.ts");
const CONNECT = join("src", "features", "connect", "connectActions.ts");

/**
 * Das persönliche Foto.
 *
 * Es lag immer schon auf `profiles` — geändert werden konnte es nur im
 * Einstiegsassistenten. Diese Zusagen halten fest, dass es jetzt dort
 * änderbar ist, wo die anderen Basisangaben stehen, und dass die
 * Einbahnstrasse aus Phase 0/1 dabei nicht aufgeweicht wird.
 */

test("eine Quelle, und sie liegt weiter auf profiles", () => {
  const aktionen = codeOnly(AKTIONEN);

  // Keine neue Spalte im Kern: Das Foto ist dort kein Abbild von etwas,
  // sondern das Original - siehe Bericht zu Phase 1.5 („profiles traegt
  // Rollen und Avatar").
  const tabellen = [...aktionen.matchAll(/\.from\("(\w+)"\)/g)].map((treffer) => treffer[1]);
  // `profiles` ist die Quelle; `network_profiles` wird nur NACHGEZOGEN, wenn
  // Connect das Basisfoto benutzt - siehe eigene Zusage weiter unten.
  assert.deepEqual([...new Set(tabellen)].sort(), ["network_profiles", "profiles"]);
  assert.ok(!aktionen.includes("person_core"), "die Aktion fasst den Kern an");

  // Und die beiden Felder schliessen sich aus - zwei gesetzte hiessen zwei
  // Bilder, und welches gilt, entschiede die Lesereihenfolge.
  assert.match(aktionen, /\{ avatar_id: avatarId, avatar_url: null \}/);
  assert.match(aktionen, /\{ avatar_url: path, avatar_id: null \}/);
  assert.match(aktionen, /\{ avatar_url: null, avatar_id: null \}/);
});

test("ersetzen heisst: die alte Datei geht", () => {
  // Sonst sammeln sich im Eimer die Bilder, die niemand mehr sieht und
  // niemand mehr loeschen kann.
  const aktionen = codeOnly(AKTIONEN);
  assert.equal([...aktionen.matchAll(/deleteStoredAvatarIfOwned\(/g)].length, 4);

  // Auch beim Entfernen - ein Bild, das nur aus der Anzeige genommen wird,
  // ist nicht geloescht.
  const entfernen = aktionen.slice(aktionen.indexOf("export async function removeProfilePhotoAction"));
  assert.match(entfernen, /deleteStoredAvatarIfOwned\(client, user\.id, vorher\)/);

  // Und die Loeschung prueft den Praefix selbst, nicht nur die
  // Zeilensicherheit.
  assert.match(codeOnly(SPEICHER), /objectPath\.startsWith\(`\$\{userId\}\/`\)/);
});

test("die Mechanik ist dieselbe wie im Einstieg, nicht eine zweite", () => {
  const feld = codeOnly(FELD);
  // Dieselbe Verkleinerung, dieselbe Bibliothek, dieselbe Vorschau.
  assert.match(feld, /from "@\/features\/profile\/avatarImage"/);
  assert.match(feld, /from "@\/features\/profile\/avatarLibrary"/);
  assert.match(feld, /<ProfileAvatar/);

  // Und der Einstieg benutzt jetzt dieselbe herausgeloeste Verkleinerung.
  const einstieg = codeOnly(join("src", "features", "profile", "ProfileBasicsForm.tsx"));
  assert.match(einstieg, /from "@\/features\/profile\/avatarImage"/);
  assert.ok(
    !einstieg.includes("canvas.toDataURL"),
    "der Einstieg verkleinert noch einmal selbst",
  );

  // Kein neues Bildsystem: kein Zuschneiden, keine Filter, keine
  // Gesichtserkennung.
  for (const zuviel of ["crop", "rotate", "filter(", "face", "detect"]) {
    assert.ok(!feld.toLowerCase().includes(zuviel), `das Feld baut ${zuviel}`);
  }
});

test("geaendert wird an einer Stelle - und dort steht auch das Bild", () => {
  const ueberDich = codeOnly(UEBER_DICH);
  assert.match(ueberDich, /<ProfilePhotoField/);
  // Beim Schritt, bei dem die anderen Basisangaben stehen.
  assert.match(ueberDich, /\{step === "identity" \? \(\s*<section[\s\S]{0,200}<ProfilePhotoField/);

  // „Das bist du" und die Druckfassung LESEN nur.
  for (const datei of [DAS_BIST_DU, DRUCK]) {
    const quelle = codeOnly(datei);
    assert.match(quelle, /<ProfileAvatar/, datei);
    assert.ok(!quelle.includes("ProfilePhotoField"), `${datei} hat einen eigenen Upload`);
    assert.ok(!/avatar_url|avatar_id/.test(quelle), `${datei} schreibt am Bild`);
  }

  // Gelesen wird es im gemeinsamen Lesemodell, einmal.
  assert.match(codeOnly(MODELL), /select\("avatar_id, avatar_url"\)/);
});

test("kein Alternativtext klebt am Namen", () => {
  // GEMELDET: Im PDF erschien der Alternativtext direkt mit dem Namen
  // verbunden. Das passiert, wenn ein Bild mit `alt` neben einer Ueberschrift
  // steht und im Druck nicht laedt.
  for (const datei of [DAS_BIST_DU, DRUCK, FELD]) {
    const quelle = codeOnly(datei);
    const bilder = [...quelle.matchAll(/<ProfileAvatar([\s\S]*?)\/>/g)];
    assert.ok(bilder.length > 0, `${datei} zeigt kein Bild`);
    for (const [, attribute] of bilder) {
      assert.match(attribute, /alt=""/, `${datei}: ein Bild mit Alternativtext neben dem Namen`);
    }
  }

  // Und ein leerer Alternativtext heisst wirklich „Schmuck": Der Platzhalter
  // wird dann verborgen statt mit leerem Label beschriftet.
  const avatar = codeOnly(AVATAR);
  assert.match(avatar, /const dekorativ = alt === ""/);
  assert.match(avatar, /aria-hidden=\{dekorativ \|\| undefined\}/);
  assert.match(avatar, /aria-label=\{dekorativ \? undefined : resolvedAlt\}/);
});

test("Connect schreibt nicht in die kanonische Quelle zurueck", () => {
  // Die Einbahnstrasse aus Phase 0/1 gilt auch fuer das Bild: Connect darf
  // das Basisfoto BENUTZEN (`photo_source = 'profile_avatar'`), aber es nicht
  // aendern.
  const connect = codeOnly(CONNECT);
  const schreibend = [...connect.matchAll(/\.from\("(\w+)"\)[\s\S]{0,120}?\.(update|upsert|insert)\(/g)]
    .map((treffer) => treffer[1]);
  assert.ok(!schreibend.includes("profiles"), "Connect schreibt auf profiles");

  // Und es kennt die drei Quellen, die es schon vorher kannte - keine
  // vierte, keine neue Regel daneben.
  assert.match(connect, /photo_source: "profile_avatar"/);
  assert.match(connect, /photo_source: "network_upload"/);
});

test("Connect zieht nach, wenn es das Basisfoto benutzt", () => {
  // Wer dort „mein vorhandenes Bild verwenden" waehlt, bekommt eine KOPIE der
  // Kennung in die Zeile - anders koennen die oeffentlichen Seiten sie nicht
  // ausliefern. Ohne Nachzug hiesse das: das Bild, das ich an dem Tag hatte.
  const aktionen = codeOnly(AKTIONEN);

  // Nur dort, wo Connect das Basisfoto benutzt - ein eigenes Connect-Bild
  // bleibt unberuehrt.
  assert.match(aktionen, /\.eq\("photo_source", "profile_avatar"\)/);
  // Geaendert: die neue Kennung. Entfernt: die Zeile wird geleert.
  assert.match(aktionen, /\{ photo_avatar_id: avatarId \}/);
  assert.match(aktionen, /\{ photo_source: null, photo_avatar_id: null \}/);

  // Und zwar bei allen drei Wegen: Illustration, eigenes Bild, Entfernen.
  assert.equal([...aktionen.matchAll(/connectNachziehen\(/g)].length, 4);

  // Das ist kein Rueckweg: Die kanonische Quelle traegt nach aussen, Connect
  // schreibt weiterhin nichts zurueck.
  assert.ok(!aktionen.includes("person_core"), "die Fotoaktion fasst den Kern an");
});

test("Sichtbarkeit und Speicherung bleiben zwei verschiedene Dinge", () => {
  // Wo liegt mein Foto - eine Frage. Wo zeige ich es - eine andere.
  const aktionen = codeOnly(AKTIONEN);
  assert.ok(
    !aktionen.includes("photo_visible_to_members"),
    "die Fotoaktion entscheidet ueber Sichtbarkeit",
  );

  // Der Haken fuer die Mitgliedersicht liegt weiterhin beim Kern, direkt
  // unter dem Bild auf derselben Seite.
  const ueberDich = codeOnly(UEBER_DICH);
  assert.match(ueberDich, /name="photo_visible_to_members"/);
  assert.ok(
    ueberDich.indexOf("<ProfilePhotoField") < ueberDich.indexOf('name="photo_visible_to_members"'),
    "der Haken steht vor dem Bild, auf das er sich bezieht",
  );
});

test("beide Sprachen sagen dasselbe ueber das Foto", () => {
  const bundle = (locale: string) =>
    JSON.parse(source(join("messages", locale, "capability.json"))) as {
      identity: { photo: Record<string, string> };
      success: Record<string, string>;
      errors: Record<string, string>;
    };

  const de = bundle("de");
  const en = bundle("en");
  assert.deepEqual(Object.keys(de.identity.photo).sort(), Object.keys(en.identity.photo).sort());

  for (const locale of ["de", "en"]) {
    const b = bundle(locale);
    for (const key of ["title", "help", "add", "change", "remove", "save"]) {
      assert.ok(b.identity.photo[key]?.trim(), `${locale}: identity.photo.${key} fehlt`);
    }
    for (const key of ["photo", "photo_removed"]) {
      assert.ok(b.success[key]?.trim(), `${locale}: success.${key} fehlt`);
    }
    for (const key of ["photo_empty", "photo_too_large", "photo_save"]) {
      assert.ok(b.errors[key]?.trim(), `${locale}: errors.${key} fehlt`);
    }
  }

  // Und die Schluessel gehen durch die Allowlist der Seite - ein unbekannter
  // landete sonst als roher Pfad auf der Seite.
  const seite = codeOnly(UEBER_DICH);
  for (const key of ["photo", "photo_removed", "photo_empty", "photo_too_large", "photo_save"]) {
    assert.match(seite, new RegExp(`"${key}"`), `${key} steht in keiner Allowlist`);
  }
});
