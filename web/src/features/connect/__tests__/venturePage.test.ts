import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(path, "utf8");
const codeOnly = (path: string) =>
  source(path)
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

const PAGE = "src/app/(product)/connect/ventures/[ventureId]/page.tsx";

/**
 * Die Seite eines Unternehmens.
 *
 * GEMELDET AM 21.09.2026: Im Highlight-Feld stand ein Unternehmen, und der
 * Klick fuehrte auf das Profil des Menschen. Die Seite gab es nicht - jeder
 * Weg zu einem Unternehmen endete bei seiner Inhaberin.
 */

test("es gibt eine Seite je Unternehmen", () => {
  assert.ok(existsSync(PAGE), "die Seite fehlt");
  const page = codeOnly(PAGE);
  assert.match(page, /getConnectVenture\(client, ventureId\)/);
  assert.match(page, /if \(!venture\) notFound\(\);/);
  // Ein verborgenes Unternehmen sieht nur die eigene Person.
  assert.match(page, /venture\.status !== "active" && !isOwn/);
});

test("jeder Weg zu einem Unternehmen fuehrt auf das Unternehmen", () => {
  // Vorher zeigten alle drei auf den Menschen.
  for (const [path, pattern] of [
    ["src/features/connect/connectHighlightData.ts", /href: `\/connect\/ventures\/\$\{venture\.id\}`/],
    ["src/features/connect/connectSuggestionData.ts", /href: `\/connect\/ventures\/\$\{row\.network_ventures\.id\}`/],
    ["src/app/(product)/connect/ventures/page.tsx", /href=\{`\/connect\/ventures\/\$\{venture\.id\}`\}/],
    ["src/app/(product)/connect/people/[userId]/page.tsx", /href=\{`\/connect\/ventures\/\$\{venture\.id\}`\}/],
  ] as const) {
    assert.match(codeOnly(path), pattern, `${path} zeigt noch auf den Menschen`);
  }
});

test("das Unternehmen steht zuerst, der Mensch darunter", () => {
  // Wer auf ein Unternehmen klickt, will wissen, worum es geht und fuer wen -
  // nicht zuerst, wer dahintersteht. Ohne den Menschen waere es dagegen ein
  // Handelsregistereintrag.
  const page = codeOnly(PAGE);
  const whatAt = page.indexOf("ventures.whatItDoes");
  const audienceAt = page.indexOf("ventures.audience");
  const personAt = page.indexOf("ventures.personBehind");
  assert.ok(whatAt > 0 && audienceAt > whatAt, "die Zielgruppe steht vor der Sache");
  assert.ok(personAt > audienceAt, "der Mensch steht ueber dem Unternehmen");
  assert.match(page, /href=\{`\/connect\/people\/\$\{owner\.user_id\}`\}/);
});

test("die Zielgruppe steht abgesetzt, weil sie das wichtigste Feld ist", () => {
  // So steht es auch im Formular: Daran erkennt jemand beim Lesen, ob er
  // jemanden kennt, fuer den das passt.
  assert.match(codeOnly(PAGE), /border-l-violet-400/);
});

test("und in der anderen Richtung: eine Personenkarte zeigt, was jemand mitbringt", () => {
  // "Wenn dann ein Mensch gehighlightet wird, dann koennen da irgendwie auch
  // die Unternehmen drinstehen oder ich suche, ich biete." Eine Karte mit Name
  // und einer Zeile sagt nicht, warum man klicken sollte.
  const data = codeOnly("src/features/connect/connectHighlightData.ts");
  assert.match(data, /has: \{ ventures: number; offering: number; seeking: number \} \| null/);
  // Gezaehlt wird NACH der Auswahl - fuer dreissig Profile zu rechnen, um drei
  // zu zeigen, waere Arbeit fuer den Papierkorb. (Am 21.09.2026 hiess die
  // Stelle noch `shuffle(candidates)`; seit die Auswahl reihum durch die Sorten
  // geht, ist es `pickAcrossKinds` - die Reihenfolge bleibt dieselbe Zusage.)
  const pickAt = data.indexOf("pickAcrossKinds(candidates, limit)");
  const attachAt = data.indexOf("attachWhatPeopleHave(client, chosen)");
  assert.ok(pickAt > 0 && attachAt > pickAt);

  const component = codeOnly("src/features/connect/ConnectHighlight.tsx");
  for (const key of ["has.ventures", "has.offering", "has.seeking"]) {
    assert.match(component, new RegExp(key.replace(".", "\\.")));
  }
});

test("die Zahlen sind gebeugt und die Texte da, in beiden Sprachen", () => {
  for (const locale of ["de", "en"]) {
    const connect = JSON.parse(readFileSync(`messages/${locale}/connect.json`, "utf8")) as {
      ventures: Record<string, string>;
      highlight: { has: Record<string, string> };
    };
    for (const key of ["personBehind", "alsoByPerson"]) {
      assert.ok(connect.ventures[key], `${locale}: ventures.${key} fehlt`);
    }
    for (const key of ["ventures", "offering", "seeking"]) {
      const value = connect.highlight.has[key];
      assert.ok(value, `${locale}: highlight.has.${key} fehlt`);
      // Ohne Plural stuende dort "1 Unternehmen" neben "1 Angebote".
      assert.match(value, /plural/, `${locale}: highlight.has.${key} ohne Plural`);
    }
  }
});
