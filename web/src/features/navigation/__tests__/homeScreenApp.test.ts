import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

import manifest from "@/app/manifest";

/**
 * Was passiert, wenn die Seite auf dem Startbildschirm eines Telefons liegt.
 *
 * GEMELDET AM 20.09.2026 von einem iPhone: als Symbol ein graues C, und beim
 * Antippen die Marketing-Startseite statt des eigenen Bereichs. Beides sind
 * Angaben in Dateien, keine Laufzeitlogik - und genau deshalb fallen sie
 * sonst niemandem auf, bis wieder jemand sein Telefon in die Hand nimmt.
 */

/**
 * Ohne das hier findet die Pruefung unten `userScalable: false` in der
 * BEGRUENDUNG, warum es nicht dasteht.
 */
const codeOnly = (path: string) =>
  readFileSync(path, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

/** Liest Breite, Hoehe und Farbtyp aus dem IHDR-Block eines PNG. */
function readPngHeader(path: string) {
  const bytes = readFileSync(path);
  assert.deepEqual(
    [...bytes.subarray(0, 8)],
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
    `${path} ist keine PNG-Datei`
  );
  assert.equal(bytes.subarray(12, 16).toString("latin1"), "IHDR", `${path}: IHDR fehlt`);
  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
    // 0 grau, 2 RGB, 4 grau+Alpha, 6 RGB+Alpha.
    colorType: bytes[25],
    bytes: bytes.length,
  };
}

test("das Manifest fuehrt in den eigenen Bereich, nicht auf die Startseite", () => {
  const app = manifest();
  // `/start` und nicht `/dashboard`: Die Seite leitet Angemeldete ueber
  // resolvePostAuthRedirectPath weiter - je nach Zugaengen ins Dashboard, nach
  // Connect oder ins Profil. Ein festes Dashboard waere fuer Menschen ohne
  // Founder-Zugang die falsche Tuer.
  assert.equal(app.start_url, "/start");
  assert.notEqual(app.start_url, "/", "die Startseite war genau die Beschwerde");

  // Eigenstaendig starten ist auf dem iPhone auch die Voraussetzung dafuer,
  // dass Mitteilungen ueberhaupt erlaubt sind.
  assert.equal(app.display, "standalone");

  // Unter dem Symbol ist nach etwa zwoelf Zeichen Schluss.
  assert.ok(app.short_name && app.short_name.length <= 12, "der kurze Name wird abgeschnitten");
});

test("das Manifest nimmt niemandem die Zwei-Finger-Vergroesserung", () => {
  // Wenn eine Seite sich wie eine App anfuehlen soll, ist die Versuchung
  // gross, das Vergroessern abzuschalten. Das schliesst Menschen aus, die
  // vergroessern muessen.
  const layout = codeOnly("src/app/layout.tsx");
  assert.doesNotMatch(layout, /userScalable:\s*false/);
  assert.doesNotMatch(layout, /maximumScale/);
  // Wer `viewport` exportiert, ersetzt die Voreinstellung von Next ganz -
  // ohne diese beiden Angaben rendert das Telefon in Desktop-Breite.
  assert.match(layout, /width:\s*"device-width"/);
  assert.match(layout, /initialScale:\s*1/);
});

test("jedes Symbol aus dem Manifest liegt auch da und hat die angegebene Groesse", () => {
  const icons = manifest().icons ?? [];
  assert.ok(icons.length >= 2, "das Manifest nennt keine Symbole");

  for (const icon of icons) {
    const path = `public${icon.src}`;
    assert.ok(existsSync(path), `${icon.src} steht im Manifest, fehlt aber unter public/`);
    const header = readPngHeader(path);
    assert.equal(
      `${header.width}x${header.height}`,
      icon.sizes,
      `${icon.src}: die angegebene Groesse stimmt nicht mit der Datei ueberein`
    );
    // Das Logo der Seite ist 2,7 MB gross. Ein Symbol, das ein Telefon beim
    // Einrichten laedt, darf das nicht werden.
    assert.ok(header.bytes < 400_000, `${icon.src} ist mit ${header.bytes} Bytes zu gross`);
  }

  // Android beschneidet Symbole auf eine eigene Form. Ohne eine maskierbare
  // Fassung schneidet es in die runde Bildmarke hinein.
  assert.ok(
    icons.some((icon) => icon.purpose === "maskable"),
    "keine maskierbare Fassung - auf Android wird die Marke angeschnitten"
  );
});

test("das Symbol fuer den Startbildschirm ist deckend", () => {
  // iOS legt Transparenz in App-Symbolen auf SCHWARZ. Ein durchsichtiges
  // Symbol sieht auf dem Rechner richtig aus und auf dem Telefon falsch -
  // deshalb steht die Bildmarke auf einem deckenden Grund.
  const apple = readPngHeader("src/app/apple-icon.png");
  assert.equal(apple.colorType, 2, "apple-icon.png hat einen Alphakanal");
  // 180 Pixel ist die Groesse, die iOS fuer die hoechste Auflösung anfragt.
  assert.deepEqual([apple.width, apple.height], [180, 180]);

  const tab = readPngHeader("src/app/icon.png");
  assert.equal(tab.width, tab.height, "das Symbol im Tab ist nicht quadratisch");
});

test("das Standardsymbol von Next ist weg", () => {
  // Im Tab stand bis zum 20.09.2026 das schwarze Dreieck aus dem Grundgeruest.
  // Es lag als favicon.ico neben der Seite und wurde nie ausgetauscht.
  assert.ok(
    !existsSync("src/app/favicon.ico"),
    "favicon.ico ist zurueck - dann stehen zwei Symbole im Kopf der Seite und das fremde gewinnt"
  );
});
