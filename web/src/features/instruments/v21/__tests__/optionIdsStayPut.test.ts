import test from "node:test";
import assert from "node:assert/strict";

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getItemsV21, REGISTRY_V21 } from "@/features/instruments/v21/registryV21";

/**
 * Welche Änderung am Fragebogen billig ist - und welche nicht.
 *
 * ---------------------------------------------------------------------------
 * DIE FRAGE DAHINTER
 * ---------------------------------------------------------------------------
 *
 * Maria am 28.09.2026: „Wenn ich eine Frage an der Formulierung ändere, würde
 * ich nicht gerne ein komplett neues Modell bauen müssen, sondern nur kleine
 * Stellschrauben.“
 *
 * Kann sie. Eine gespeicherte Antwort merkt sich `A01_o3`, nicht den Text -
 * deshalb darf sich der Text ändern, ohne dass irgendeine Antwort ihre
 * Bedeutung verliert. Eine Umformulierung kostet: Quelldokument ändern,
 * Generator laufen lassen, fertig.
 *
 * ---------------------------------------------------------------------------
 * UND WO ES TEUER WIRD
 * ---------------------------------------------------------------------------
 *
 * `A01_o3` heißt wörtlich „die dritte Option von A01“ - der Generator vergibt
 * die Kennungen nach Position. Wer eine Antwortmöglichkeit in der MITTE
 * einfügt, löscht oder umsortiert, lässt jede gespeicherte Antwort auf `_o3`
 * auf etwas anderes zeigen. Lautlos: Die Zeile bleibt stehen, sie bedeutet nur
 * etwas anderes.
 *
 * Genau das ist der Fehler, gegen den die Kennungen überhaupt eingeführt
 * wurden - und der Generator konnte ihn bis heute jederzeit machen.
 *
 * Dieser Test hält die Kennungen fest. Eine Umformulierung fällt hier NICHT
 * auf, und das ist der Punkt: Sie ist billig und soll billig bleiben. Ein
 * Einfügen, Löschen oder Umsortieren fällt auf und soll es.
 */

const lock = JSON.parse(
  readFileSync(join(process.cwd(), "docs", "founder-alignment-option-ids-v2-1.json"), "utf8"),
) as { instrumentId: string; items: Record<string, string[]> };

test("keine Antwortmöglichkeit hat ihre Kennung getauscht", () => {
  const broken: string[] = [];

  for (const item of getItemsV21()) {
    const known = lock.items[item.itemId];
    // Eine ganz neue Frage hat noch keine Kennungen - das ist in Ordnung.
    if (!known) continue;

    const now = item.options.map((option) => option.optionId);
    if (now.length !== known.length || now.some((id, index) => id !== known[index])) {
      broken.push(
        `${item.itemId}\n      bisher: ${known.join(", ")}\n      jetzt:  ${now.join(", ")}`,
      );
    }
  }

  assert.deepEqual(
    broken,
    [],
    "Bei diesen Fragen zeigen gespeicherte Antworten jetzt auf etwas anderes.\n\n" +
      "Eine UMFORMULIERUNG ist erlaubt und faellt hier nicht auf - der Text darf sich\n" +
      "aendern, die Kennung bleibt. Was hier auffaellt, ist ein Einfuegen, Loeschen\n" +
      "oder Umsortieren von Antwortmoeglichkeiten. Das aendert die Bedeutung bereits\n" +
      "gegebener Antworten, ohne dass es jemand sieht.\n\n" +
      "Wenn das Absicht ist, gibt es zwei Wege:\n" +
      "  - Anhaengen statt einfuegen: Eine neue Moeglichkeit ans ENDE, dann bleiben\n" +
      "    alle bisherigen Kennungen, wo sie sind.\n" +
      "  - Eine neue Instrumentfassung, wenn sich die Bedeutung wirklich aendert.\n\n" +
      "Erst danach docs/founder-alignment-option-ids-v2-1.json nachziehen.\n\n" +
      broken.join("\n"),
  );
});

test("der Schlüsselbund gehört zu dieser Fassung", () => {
  assert.equal(lock.instrumentId, REGISTRY_V21.instrumentId);
});

test("der Wächter sieht überhaupt etwas", () => {
  // Ein Waechter, der eine leere Liste prueft, ist immer gruen. Das ist hier
  // schon einmal passiert - beim Umlaut-Skript.
  const counted = Object.values(lock.items).reduce((sum, ids) => sum + ids.length, 0);
  assert.ok(counted >= 100, `zu wenige Kennungen im Schluesselbund: ${counted}`);
  assert.ok(Object.keys(lock.items).length >= 25);
});

test("eine Umformulierung schlägt NICHT an - sie soll billig bleiben", () => {
  // Gegenprobe: Der Waechter vergleicht Kennungen, nicht Texte. Wenn er hier
  // ansprechen wuerde, waere jede Textaenderung ein Vorgang statt einer
  // Kleinigkeit - genau das, was vermieden werden soll.
  const asText = JSON.stringify(lock);
  for (const item of getItemsV21()) {
    for (const option of item.options) {
      assert.ok(
        !asText.includes(option.label),
        `Der Schluesselbund merkt sich den TEXT von ${option.optionId} - dann waere ` +
          "jede Umformulierung eine Aenderung an dieser Datei.",
      );
    }
  }
});
