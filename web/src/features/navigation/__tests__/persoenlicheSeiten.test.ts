import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const source = (path: string) => readFileSync(path, "utf8");
const SHELL = join("src", "features", "navigation", "ProductShell.tsx");

const messages = (locale: string, datei: string) =>
  JSON.parse(source(join("messages", locale, datei)));

/**
 * Die beiden persönlichen Seiten.
 *
 * ---------------------------------------------------------------------------
 * ZWEI NAMEN, ZWEI AUFGABEN
 * ---------------------------------------------------------------------------
 *
 * „Über dich" (`/profile`) ist die Werkbank: eintragen, ergänzen, pflegen.
 * „Das bist du" (`/me/profile`) ist das Ergebnis: ansehen, verstehen,
 * weitergeben.
 *
 * Vorher hießen sie „Profil" und „Gesamtbild" — zwei Wörter, die beide nach
 * derselben Sache klingen, und keines sagte, wozu die Seite da ist.
 *
 * ---------------------------------------------------------------------------
 * UND BEIDE ERREICHBAR, NICHT NUR UNTER ALIGN
 * ---------------------------------------------------------------------------
 *
 * „Das bist du" hing allein an der Align-Unterleiste und damit an
 * `hasFounder`. Es liest aber längst mehr als Align: Fähigkeiten, Stärken,
 * Richtung. Wer nur Connect oder nur Find nutzt, kam dort nie hin, obwohl die
 * Seite für ihn genauso funktioniert.
 */

test("beide Seiten heissen nach ihrer Aufgabe, in beiden Sprachen", () => {
  for (const locale of ["de", "en"]) {
    const navigation = messages(locale, "navigation.json") as Record<string, string>;
    const capability = messages(locale, "capability.json") as Record<string, string>;
    const profil = messages(locale, "profile.json") as {
      founderProfile: Record<string, string>;
    };

    // Die Werkbank.
    assert.equal(navigation.profile, capability.title, `${locale}: Menü und Seite sagen Verschiedenes`);
    assert.equal(navigation.profile, navigation.editProfile, `${locale}: zwei Namen für einen Weg`);

    // Das Ergebnis.
    assert.equal(
      navigation.alignOwnProfile,
      profil.founderProfile.eyebrow,
      `${locale}: Menü und Seite sagen Verschiedenes`,
    );

    // Und sie heißen nicht gleich. Zwei Namen für eine Sache sind zwei Seiten
    // im Kopf; ein Name für zwei Sachen ist schlimmer.
    assert.notEqual(navigation.profile, navigation.alignOwnProfile, locale);
  }
});

test("„Das bist du“ ist nicht mehr der Name der Connect-Karte", () => {
  // Das Abzeichen sitzt auch auf Unternehmens- und Eintragskarten. „Dein
  // Connect-Profil“ wäre dort falsch, „Das bist du“ ist jetzt der Name einer
  // anderen Seite — also ein drittes Wort, das für alle drei Kartenarten
  // stimmt.
  for (const locale of ["de", "en"]) {
    const connect = messages(locale, "connect.json") as {
      highlight: { yours: string };
      profile: { title: string };
    };
    const navigation = messages(locale, "navigation.json") as Record<string, string>;
    assert.notEqual(connect.highlight.yours, navigation.alignOwnProfile, locale);
    // Die Connect-Eigenansicht heißt weiterhin nach sich selbst.
    assert.match(connect.profile.title, /Connect/i, locale);
  }
});

test("beide Seiten sind ohne Founder-Rolle erreichbar", () => {
  const shell = source(SHELL);

  // Das Kontomenü (Desktop) und das Mobilmenü führen zu beiden. Beide Blöcke
  // hängen an `accountOnly` beziehungsweise `isSuspendedConnectOnly` - also
  // an demselben Zugang, den `/profile` heute schon hat, und NICHT an
  // `hasFounder`.
  const kontomenue = shell.slice(shell.indexOf("{!accountOnly ? ("));
  assert.match(kontomenue, /href="\/profile"/);
  assert.match(kontomenue, /href="\/me\/profile"/);

  const mobil = shell.slice(
    shell.indexOf("{!isSuspendedConnectOnly ? ("),
    shell.indexOf('<MobileMenuLink href="/account"'),
  );
  assert.match(mobil, /href="\/profile"/);
  assert.match(mobil, /href="\/me\/profile"/);
});

test("der Align-Eintrag bleibt, wo er war", () => {
  // Wer sie dort gewohnt ist, findet sie weiter. Der zusätzliche Weg nimmt
  // nichts weg.
  const shell = source(SHELL);
  const subItems = shell.slice(shell.indexOf("subItems:"), shell.indexOf("const findItem"));
  assert.match(subItems, /href: "\/me\/profile"/);
});
