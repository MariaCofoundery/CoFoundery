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

// ---------------------------------------------------------------------------
// Der zweite Teil der Meldung: zu präsent
// ---------------------------------------------------------------------------
/**
 * NACHGEMELDET AM 20.09.2026: "Dieser Menübereich im Handy ist irgendwie noch
 * ein bisschen zu präsent, zu groß. Vielleicht macht man das dann auch mit so
 * einem aufklappbaren Menü."
 *
 * Der Umbruch von oben hatte den Überlauf gegen HÖHE getauscht: Aus einer
 * Reihe wurden drei, dazu die zweite Reihe mit den Unterseiten. Unter 1024
 * Pixeln steht deshalb jetzt ein Knopf, und alles andere liegt dahinter.
 */
test("unter 1024 Pixeln steht statt der Reihen ein Knopf", () => {
  const shell = codeOnly(SHELL);
  // Die Pillenreihe: erst ab lg.
  assert.match(shell, /className="hidden flex-wrap items-center gap-1 rounded-full[^"]*lg:flex"/);
  // Die rechte Reihe: erst ab lg.
  assert.match(shell, /className="hidden min-w-0 flex-wrap items-center justify-end[^"]*lg:flex"/);
  // Die zweite Reihe mit den Unterseiten: erst ab lg.
  assert.match(shell, /mx-auto hidden w-full max-w-7xl[^"]*lg:block/);
  // Und der Knopf nur darunter.
  assert.match(shell, /lg:hidden"\s*>\s*<MenuGlyph/);
});

test("das geschlossene Menü verbirgt nicht, dass etwas wartet", () => {
  // Ein Menü, das zu ist, darf kein blinder Fleck sein: Der Zähler steht auf
  // dem Knopf. Sonst wäre das Einklappen ein Rückschritt gegenüber der Reihe,
  // in der die Zahlen offen dastanden.
  const shell = codeOnly(SHELL);
  assert.match(shell, /menuAttentionCount = connectAttentionCount \+ Math\.max\(0, incomingOpenRequestCount\)/);
  assert.match(shell, /count=\{menuAttentionCount\}/);

  for (const locale of ["de", "en"]) {
    const navigation = JSON.parse(
      readFileSync(`messages/${locale}/navigation.json`, "utf8")
    ) as Record<string, string>;
    for (const key of ["menuOpen", "menuClose", "menuAttentionBadge"]) {
      assert.ok(navigation[key], `${locale}: navigation.${key} fehlt`);
    }
    // Ein Zähler ohne Beschriftung ist für eine Vorlesesoftware eine nackte
    // Zahl. ICU-Plural, damit "1 offener Punkt" nicht "1 offene Punkte" wird.
    assert.match(navigation.menuAttentionBadge, /plural/);
  }
});

test("hinter dem Knopf liegt alles, was in der Reihe stand", () => {
  // Ein Menü, in dem etwas fehlt, ist schlimmer als eine lange Reihe: Am
  // Rechner ist der Weg da, auf dem Telefon nicht, und niemand sucht lange.
  const shell = codeOnly(SHELL);
  const menuAt = shell.indexOf("id={MOBILE_MENU_ID}");
  assert.ok(menuAt > 0, "das aufklappbare Menü ist nicht mehr auffindbar");
  const menu = shell.slice(menuAt);

  assert.match(menu, /navigationItems\.map/, "die Bereiche fehlen");
  assert.match(menu, /item\.subItems/, "die Unterseiten fehlen - sie sind sonst nirgends");
  for (const href of ["/messages", "/profile", "/account"]) {
    assert.match(menu, new RegExp(`href="${href}"`), `${href} fehlt im Menü`);
  }
  assert.match(menu, /signOutAction/, "das Abmelden fehlt");
  assert.match(menu, /<LanguageSwitcher \/>/, "die Sprachwahl fehlt");
  assert.match(menu, /<ProductFeedbackEntry/, "der Weg zur Rückmeldung fehlt");
  assert.match(menu, /<DashboardViewSwitch/, "der Wechsel Founder/Advisor fehlt");
});

test("das Menü schließt sich, wenn man irgendwo ankommt", () => {
  // Sonst verdeckt es die Seite, auf der man gerade angekommen ist.
  const shell = codeOnly(SHELL);
  assert.match(shell, /setIsMenuOpen\(false\);\s*\}, \[pathname\]\)/);
  // Und jede Zeile im Menü schließt es beim Antippen selbst, weil Next bei
  // gleichem Pfad keinen Wechsel meldet.
  assert.match(shell, /onNavigate=\{closeMenu\}/);
  // Mit der Tastatur ebenso.
  assert.match(shell, /event\.key === "Escape"/);
});

test("die Zeilen im Menü sind mit dem Daumen zu treffen", () => {
  const shell = codeOnly(SHELL);
  const row = shell.slice(shell.indexOf("MOBILE_MENU_ROW_CLASS ="), shell.indexOf("function MobileMenuLink"));
  assert.match(row, /min-h-11/, "44 Pixel sind die Untergrenze für ein Ziel");
  // Der Knopf selbst ebenso.
  assert.match(shell, /inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full/);
});

test("das Postfach hat die Reihe verlängert – und bleibt trotzdem sichtbar", () => {
  // Die Reihe war schon lang; mit dem Postfach ist sie übergelaufen. Die
  // Antwort ist Umbruch, nicht Weglassen: Das Profil aus der Leiste zu
  // nehmen war schon einmal die Beschwerde, die es dorthin gebracht hat.
  const shell = codeOnly(SHELL);
  assert.match(shell, /href="\/messages"/);
  assert.match(shell, /href="\/profile"/);
});
