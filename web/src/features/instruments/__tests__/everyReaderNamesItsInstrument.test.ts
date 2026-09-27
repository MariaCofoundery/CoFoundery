import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

/**
 * Kein Leser holt "den neuesten Fragebogen", ohne die Fassung zu nennen.
 *
 * ---------------------------------------------------------------------------
 * WARUM DAS EIN WÄCHTER SEIN MUSS UND KEINE VERABREDUNG
 * ---------------------------------------------------------------------------
 *
 * Am 27.09.2026 wurden 26 Lesestellen in 11 Dateien umgestellt. Solange es nur
 * eine Fassung gibt, ist jede dieser Zeilen nachweislich ein Nichts-Tun -
 * genau deshalb war jetzt der richtige Zeitpunkt dafür.
 *
 * Sobald es eine zweite Fassung gibt, ist jede vergessene Stelle dagegen ein
 * stiller Fehler mit der unangenehmsten Eigenschaft: Sie liefert ein Ergebnis.
 * Jemand, der ausdrücklich bei seiner alten Fassung geblieben ist, bekäme
 * seinen Report aus der neuen - dieselbe Skala, dieselbe Beschriftung, ein
 * anderes Modell. Niemand würde es bemerken.
 *
 * Eine neue Abfrage zu schreiben ist ein Nachmittag. Diesen Fehler zu finden,
 * nachdem er Monate gelaufen ist, ist eine Woche.
 *
 * ---------------------------------------------------------------------------
 * WAS GEPRÜFT WIRD
 * ---------------------------------------------------------------------------
 *
 * Jede Abfragekette auf `assessments`, die nach ABGEGEBENEN Fragebögen fragt
 * (`.not("submitted_at", "is", null)`), muss in derselben Kette die Fassung
 * nennen.
 *
 * Nicht geprüft werden Abfragen nach `id` - dort bringt die Zeile ihre
 * Kennung selbst mit - und Abfragen nach Entwürfen, die keinen Vergleich
 * auslösen können.
 */

const ROOT = "src";

function* sourceFiles(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      yield* sourceFiles(path);
      continue;
    }
    if (/\.(ts|tsx)$/.test(name) && !name.endsWith(".test.ts")) yield path;
  }
}

/** Eine Abfragekette: von `.from("assessments")` bis zum nächsten Semikolon. */
function assessmentChains(source: string): string[] {
  const chains: string[] = [];
  let index = source.indexOf('.from("assessments")');
  while (index !== -1) {
    const end = source.indexOf(";", index);
    chains.push(source.slice(index, end === -1 ? source.length : end));
    index = source.indexOf('.from("assessments")', index + 1);
  }
  return chains;
}

test("der Wächter sieht die Abfragen überhaupt", () => {
  // EIN GRÜNER TEST, DER NICHTS FINDET, IST WERTLOS. Wenn der Zerleger
  // irgendwann keine Ketten mehr erkennt - andere Formatierung, anderer
  // Zugriffsweg -, würde die eigentliche Prüfung stumm durchgehen. Diese
  // Zahl ist die Gegenprobe.
  let chains = 0;
  let submitted = 0;
  for (const file of sourceFiles(ROOT)) {
    const source = readFileSync(file, "utf8");
    if (!source.includes('.from("assessments")')) continue;
    for (const chain of assessmentChains(source)) {
      chains += 1;
      if (chain.includes('.not("submitted_at", "is", null)')) submitted += 1;
    }
  }
  assert.ok(chains >= 20, `zu wenige Abfrageketten gefunden: ${chains}`);
  assert.ok(submitted >= 8, `zu wenige Abfragen nach abgegebenen Fragebögen: ${submitted}`);
});

test("und er schlägt an, wenn die Fassung fehlt", () => {
  // Dieselbe Regel auf einer erfundenen Kette - sonst weiß niemand, ob die
  // Prüfung oben zufällig grün ist.
  const bad = `.from("assessments").select("id").eq("module", "base").not("submitted_at", "is", null)`;
  const good = `${bad}.eq("instrument_id", CURRENT_INSTRUMENT_ID)`;
  const misses = (chain: string) =>
    chain.includes('.not("submitted_at", "is", null)') && !chain.includes("instrument_id");

  assert.equal(misses(bad), true);
  assert.equal(misses(good), false);
});

test("jede Abfrage nach abgegebenen Fragebögen nennt ihre Fassung", () => {
  const offenders: string[] = [];

  for (const file of sourceFiles(ROOT)) {
    const source = readFileSync(file, "utf8");
    if (!source.includes('.from("assessments")')) continue;

    for (const chain of assessmentChains(source)) {
      const asksForSubmitted = chain.includes('.not("submitted_at", "is", null)');
      if (!asksForSubmitted) continue;
      if (chain.includes('instrument_id')) continue;
      offenders.push(`${file}: ${chain.replace(/\s+/g, " ").slice(0, 120)}…`);
    }
  }

  assert.deepEqual(
    offenders,
    [],
    "Diese Abfragen holen abgegebene Fragebögen, ohne die Fassung zu nennen:\n" +
      offenders.join("\n")
  );
});

test("neue Fragebögen bekommen ihre Fassung ausdrücklich, nicht per Vorgabewert", () => {
  // DIE SPALTENVORGABE IST EIN NETZ FÜR DIE RÜCKFÜLLUNG, KEINE REGEL FÜR NEUE
  // ZEILEN. Sie steht auf v1. Wer sie beim Einfügen weglässt, bekommt später
  // still v1, obwohl gerade v2 vorgelegt wird.
  const offenders: string[] = [];

  for (const file of sourceFiles(ROOT)) {
    const source = readFileSync(file, "utf8");
    if (!source.includes('.from("assessments")')) continue;

    for (const chain of assessmentChains(source)) {
      if (!chain.includes(".insert(")) continue;
      if (chain.includes("instrument_id")) continue;
      offenders.push(`${file}: ${chain.replace(/\s+/g, " ").slice(0, 120)}…`);
    }
  }

  assert.deepEqual(offenders, [], "Diese Einfügungen nennen keine Fassung:\n" + offenders.join("\n"));
});
