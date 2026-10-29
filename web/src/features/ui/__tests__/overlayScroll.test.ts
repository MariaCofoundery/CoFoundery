import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = join(import.meta.dirname, "..", "..", "..");

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === "__tests__" || name === "node_modules" ? [] : files(path);
    return path.endsWith(".tsx") ? [path] : [];
  });
}

/**
 * Ein Vollbild-Rahmen, der selbst die Inhalte mittig oder unten ausrichtet
 * (`fixed inset-0 ... flex items-end|center`), ohne zu scrollen, schneidet zu hohe
 * Inhalte oben ab: Auf kleinen Bildschirmen oder bei grosser Schrift ragt das Fenster
 * ueber den Rand, der obere Teil ist nicht erreichbar, und die Seite dahinter laesst
 * sich nicht bewegen. Gefunden am 29.10.2026 an der Einwilligung zur Forschung, die auf
 * jeder Seite stand, bis man antwortete.
 *
 * Erlaubt ist ein Rahmen, der scrollt (`overflow-y-auto`) und die Ausrichtung in einem
 * inneren Element hat - oder ein Fenster mit eigener Hoehengrenze und eigenem Scrollen.
 */
test("Kein Vollbild-Rahmen richtet Inhalte aus, ohne zu scrollen", () => {
  const offenders: string[] = [];
  for (const file of [...files(join(root, "app")), ...files(join(root, "features"))]) {
    for (const [index, line] of readFileSync(file, "utf8").split("\n").entries()) {
      if (!/fixed inset-0/.test(line) || !/\bflex\b/.test(line) || !/items-(end|center)/.test(line)) continue;
      if (/overflow-y-auto|overflow-auto/.test(line)) continue;
      offenders.push(`${file.slice(root.length)}:${index + 1}`);
    }
  }
  // Zwei kleine Bestaetigungsfenster haben eine eigene Hoehengrenze mit Scrollen im Fenster selbst.
  const known = ["features/collaborationLab/ReadMyMindEndControl.tsx", "features/checkIn/CheckInClient.tsx"];
  const unexpected = offenders.filter((entry) => !known.some((path) => entry.includes(path)));
  assert.deepEqual(unexpected, [], `Rahmen ohne Scrollen: ${unexpected.join(", ")}`);
});

test("Die beiden Hinweise, die auf jeder Seite stehen koennen, scrollen und sind ohne Weichzeichner", () => {
  for (const path of ["features/research/ResearchConsentNotice.tsx", "features/connect/HighlightConsentPrompt.tsx"]) {
    const source = readFileSync(join(root, path), "utf8");
    assert.match(source, /fixed inset-0 z-\[\d+\] overflow-y-auto overscroll-contain/, path);
    assert.match(source, /flex min-h-full items-end justify-center p-4 md:items-center/, path);
    assert.doesNotMatch(source, /backdrop-blur/, path);
  }
});
