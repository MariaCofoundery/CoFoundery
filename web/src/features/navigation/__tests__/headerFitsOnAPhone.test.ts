import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const SHELL = "src/features/navigation/ProductShell.tsx";
const source = (path: string) => readFileSync(path, "utf8");
const codeOnly = (path: string) =>
  source(path)
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

/**
 * Die Leiste auf einem Telefon.
 *
 * GEMELDET AM 20.09.2026: "Menueansicht auf Handy schlecht, geht ueber Rand
 * hinaus." Ein Layout laesst sich hier nicht messen - es gibt keinen Browser.
 * Was sich pruefen laesst, ist die Eigenschaft, deren FEHLEN den Fehler
 * erzeugt hat: Die rechte Gruppe durfte nicht umbrechen.
 *
 * Deshalb pruefen diese Tests Klassen und nicht Pixel. Sie sind kein Beweis,
 * dass es passt - aber sie halten die eine Zeile fest, deren Aenderung es
 * kaputt gemacht hat, und die naechste Person sieht im Fehlertext, warum.
 */
test("jede Reihe in der Leiste darf umbrechen", () => {
  const shell = codeOnly(SHELL);
  const rows = [...shell.matchAll(/className="([^"]*\bflex\b[^"]*items-center[^"]*)"/g)]
    .map((match) => match[1])
    // Nur die Reihen der Kopfleiste, nicht jedes Flex-Element im Menue.
    .filter((cls) => cls.includes("justify-between") || cls.includes("justify-end"));

  assert.ok(rows.length >= 2, "die Reihen der Kopfleiste sind nicht mehr auffindbar");
  for (const cls of rows) {
    assert.ok(
      cls.includes("flex-wrap"),
      `eine Reihe ohne flex-wrap läuft auf dem Telefon über den Rand: ${cls}`
    );
  }

  // min-w-0 gilt fuer die KINDER, nicht fuer den aeusseren Rahmen: Der traegt
  // `w-full max-w-7xl` und kann die Breite ohnehin nicht ueberschreiten. Ein
  // Flex-Kind dagegen weigert sich ohne min-w-0, unter seine Inhaltsbreite zu
  // schrumpfen - genau daran hing der Fehler.
  const groups = rows.filter((cls) => !cls.includes("mx-auto"));
  assert.ok(groups.length >= 1, "die rechte Gruppe ist nicht mehr auffindbar");
  for (const cls of groups) {
    assert.ok(cls.includes("min-w-0"), `ohne min-w-0 schrumpft diese Gruppe nicht: ${cls}`);
  }

  // Und die linke Gruppe mit dem Logo hatte es von Anfang an - falls jemand es
  // herausnimmt, faellt es hier auf.
  assert.match(codeOnly(SHELL), /flex min-w-0 flex-wrap items-center gap-4 md:gap-6/);
});

test("der Innenabstand ist auf dem Telefon kleiner", () => {
  // px-6 links und rechts nimmt von 360 Pixeln schon 48 weg. Das war genau
  // die Luft, die am Rand fehlte.
  const shell = codeOnly(SHELL);
  assert.match(shell, /px-4 py-3 sm:px-6 md:px-10/);
  // Und die zweite Reihe folgt demselben Abstand - sonst stehen sie versetzt.
  assert.match(shell, /px-4 pb-2 sm:px-6 md:px-10/);
});

test("ein Eintrag rutscht ganz in die nächste Zeile, statt zu zerfallen", () => {
  // Ohne whitespace-nowrap quetscht Flex den Link, bis "Nachrichten" mitten
  // im Wort bricht. Ohne shrink-0 passiert dasselbe mit den Pillengruppen.
  const shell = codeOnly(SHELL);
  for (const helper of ["areaLinkClassName", "navLinkClassName"]) {
    const at = shell.indexOf(`function ${helper}(`);
    assert.ok(at > 0, `${helper} fehlt`);
    const body = shell.slice(at, shell.indexOf("}", shell.indexOf("return", at)));
    assert.match(body, /shrink-0/, `${helper}: der Eintrag kann gequetscht werden`);
    assert.match(body, /whitespace-nowrap/, `${helper}: der Text kann mitten im Wort brechen`);
  }

  // Die beiden geschlossenen Umschalter ebenso.
  assert.match(shell, /flex shrink-0 items-center rounded-full border border-slate-200\/80 bg-white p-0\.5/);
  assert.match(
    codeOnly("src/features/dashboard/DashboardViewSwitch.tsx"),
    /inline-flex shrink-0 items-center/
  );
});

test("das Postfach hat die Reihe verlängert – und bleibt trotzdem sichtbar", () => {
  // Die Reihe war schon lang; mit dem Postfach ist sie übergelaufen. Die
  // Antwort ist Umbruch, nicht Weglassen: Das Profil aus der Leiste zu
  // nehmen war schon einmal die Beschwerde, die es dorthin gebracht hat.
  const shell = codeOnly(SHELL);
  assert.match(shell, /href="\/messages"/);
  assert.match(shell, /href="\/profile"/);
});
