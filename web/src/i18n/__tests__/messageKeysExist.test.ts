import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";

/**
 * Jeder fest geschriebene Textschluessel muss es auch geben.
 *
 * next-intl wirft bei einem unbekannten Schluessel NICHT. Es loggt einen
 * IntlError und gibt den Pfad selbst zurueck - auf der Seite steht dann
 * "connect.profile.photo.visibilityTitle", oder, wenn niemand den Wert
 * rendert, gar nichts und nur das Log fuellt sich.
 *
 * Genau so lagen am 18.09.2026 vier tote Schluessel auf der
 * Connect-Profilseite: durchgereicht an ein Bauteil, das sie nie gelesen hat,
 * und in den Texten hat es sie nie gegeben. Kein Test hat das gesehen, weil
 * nichts abstuerzte und nichts falsch aussah.
 *
 * WAS GEPRUEFT WIRD:
 *   Nur eindeutige Faelle - eine Datei mit genau EINEM Namensraum und
 *   Schluesseln, die als Zeichenkette dasehen. Dynamische Schluessel
 *   (`t(\`errors.${key}\`)`) bleiben aussen vor: Sie sind an ihren Stellen
 *   bereits gegen Wertelisten abgesichert.
 */

const root = "src";
const messagesDir = "messages/de";

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) return entry === "__tests__" ? [] : walk(full);
    return full.endsWith(".ts") || full.endsWith(".tsx") ? [full] : [];
  });
}

const namespaces = new Map<string, unknown>();
for (const file of readdirSync(messagesDir)) {
  if (!file.endsWith(".json")) continue;
  namespaces.set(path.basename(file, ".json"), JSON.parse(readFileSync(path.join(messagesDir, file), "utf8")));
}

function lookup(namespace: string, key: string) {
  let current: unknown = namespaces.get(namespace);
  if (current === undefined) return null;
  for (const part of key.split(".")) {
    if (typeof current !== "object" || current === null || !(part in current)) return false;
    current = (current as Record<string, unknown>)[part];
  }
  return true;
}

test("jeder fest geschriebene Textschluessel hat einen deutschen Text", () => {
  const missing: string[] = [];
  let checked = 0;

  for (const file of walk(root)) {
    const source = readFileSync(file, "utf8");
    const declared = [
      ...new Set(
        [...source.matchAll(/(?:useTranslations|getTranslations)\(\s*"([a-zA-Z0-9_.]+)"/g)].map(
          (match) => match[1]
        )
      ),
    ];
    // Mehrere Namensraeume in einer Datei: Welches t() zu welchem gehoert,
    // laesst sich so nicht entscheiden - lieber nichts behaupten.
    if (declared.length !== 1) continue;

    const [full] = declared;
    const [namespace, ...rest] = full.split(".");
    const prefix = rest.join(".");

    for (const match of source.matchAll(/\bt\(\s*"([a-zA-Z0-9_.]+)"/g)) {
      const key = prefix ? `${prefix}.${match[1]}` : match[1];
      checked += 1;
      if (lookup(namespace, key) === false) {
        missing.push(`${file}: ${full}.${match[1]}`);
      }
    }
  }

  assert.ok(checked > 200, `zu wenige Schluessel geprueft (${checked}) - die Suche greift nicht`);
  assert.deepEqual(missing, [], `Textschluessel ohne Text:\n  ${missing.join("\n  ")}`);
});

test("die deutschen und englischen Bundles haben dieselben Dateien", () => {
  const de = readdirSync("messages/de").filter((file) => file.endsWith(".json")).sort();
  const en = readdirSync("messages/en").filter((file) => file.endsWith(".json")).sort();
  assert.deepEqual(de, en, "ein Namensraum fehlt auf einer Seite");
});
