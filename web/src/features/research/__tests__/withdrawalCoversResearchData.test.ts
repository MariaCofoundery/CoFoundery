import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

/**
 * Der Widerruf muss halten, was der Text verspricht.
 *
 * ---------------------------------------------------------------------------
 * DER SATZ, DER WAHR BLEIBEN MUSS
 * ---------------------------------------------------------------------------
 *
 * „Nach dem Beenden speichern wir keine neuen Forschungsdaten mehr, und die
 * noch dir zuordenbaren löschen wir."
 *
 * Heute stimmt das: `set_my_research_consent` löscht beim Ablehnen die
 * `research_events` der betroffenen Person. Der Satz wird in dem Moment
 * unwahr, in dem eine WEITERE Tabelle Forschungsdaten aufnimmt und die
 * Löschung sie nicht kennt.
 *
 * Und dieser Moment kommt nicht mit einem Knall. Er kommt als eine Zeile, die
 * jemand einem Export hinzufügt.
 *
 * ---------------------------------------------------------------------------
 * WARUM `alignment_answers` HIER AUSDRÜCKLICH STEHT
 * ---------------------------------------------------------------------------
 *
 * Die Antworten auf das Instrument v2 sind KEINE Forschungsdaten - heute. Sie
 * entstehen, damit zwei Gründer miteinander sprechen können, und sie sind an
 * keine Einwilligung gebunden. Wer sie zu Forschungsdaten macht, muss zweierlei
 * tun: sie an die Einwilligung binden und sie in die Löschung aufnehmen.
 *
 * Dieser Test hält den Zustand fest, damit nur eines von beidem nicht passiert.
 */

const MIGRATIONS = "../supabase/migrations";

const schema = readdirSync(MIGRATIONS)
  .filter((name) => name.endsWith(".sql"))
  .sort()
  .map((name) => readFileSync(join(MIGRATIONS, name), "utf8"))
  .join("\n");

/** Die letzte Fassung der Funktion - spätere Migrationen ersetzen frühere. */
function currentWithdrawalFunction(): string {
  // NICHT NUR NACH DEM NAMEN SUCHEN: Die letzte Erwaehnung ist ein
  // `grant execute on function ...`, nicht die Funktion selbst. Die erste
  // Fassung dieses Tests hat genau das erwischt und eine Zeile Rechtevergabe
  // nach einem `delete` durchsucht.
  const marker = "create or replace function public.set_my_research_consent";
  const start = schema.lastIndexOf(marker);
  assert.ok(start > 0, "die Widerrufsfunktion steht in keiner Migration");
  const end = schema.indexOf("$function$", start) > 0
    ? schema.indexOf("$$;", start)
    : schema.indexOf("$$;", start);
  return schema.slice(start, end > start ? end : schema.length);
}

/** Tabellen, die dieser Person zuordenbare Forschungsdaten halten. */
const RESEARCH_TABLES = ["research_events"];

/**
 * Tabellen, die ausdrücklich KEINE Forschungsdaten sind - mit dem Grund.
 * Wer eine davon in die Forschung holt, löscht sie hier und trägt sie oben ein.
 */
const NOT_RESEARCH_DATA = {
  alignment_answers:
    "Antworten auf das Instrument v2. Sie entstehen, damit zwei Gruender " +
    "miteinander sprechen koennen, und haengen an keiner Einwilligung. Ob die " +
    "Fragen verstaendlich sind, wird an Haeufigkeiten ohne Personenbezug " +
    "geprueft - das ist Produktbetrieb und keine Forschung.",
};

test("der Widerruf löscht, was er löschen muss", () => {
  const fn = currentWithdrawalFunction();
  for (const table of RESEARCH_TABLES) {
    assert.match(
      fn,
      new RegExp(`delete from public\\.${table}`),
      `${table} haelt Forschungsdaten, wird beim Widerruf aber nicht geloescht`
    );
  }

  // GEGENPROBE: Die Funktion wurde wirklich gelesen.
  assert.ok(fn.length > 500, `zu wenig gelesen: ${fn.length} Zeichen`);
  assert.match(fn, /p_state = 'declined'/);
});

test("was keine Forschungsdaten sind, steht mit Begründung da", () => {
  // KEIN TEST, DER ETWAS PRÜFT - EINER, DER ETWAS FESTHÄLT.
  for (const [table, reason] of Object.entries(NOT_RESEARCH_DATA)) {
    assert.ok(reason.length > 120, `${table}: Begruendung zu duenn`);
    // Und die Tabelle taucht in der Löschung wirklich nicht auf.
    assert.ok(
      !new RegExp(`delete from public\\.${table}`).test(currentWithdrawalFunction()),
      `${table} wird geloescht - dann ist es Forschungsdatum und gehoert nach oben`
    );
  }
});

test("der Widerrufstext verspricht nicht mehr, als er halten kann", () => {
  // „Was sich nicht rückgängig machen lässt" gehört in den Text, nicht in die
  // Fußnote eines Dokuments, das niemand liest.
  for (const locale of ["de", "en"] as const) {
    const texts = JSON.parse(readFileSync(`messages/${locale}/researchConsent.json`, "utf8"));
    const withdrawal: string = texts.settings.withdrawal;
    assert.ok(withdrawal.length > 200, `${locale}: zu knapp fuer eine ehrliche Auskunft`);
    // Beide Haelften: was geloescht wird UND was bleibt.
    assert.match(withdrawal, locale === "de" ? /löschen wir/ : /we .*delete/);
    assert.match(withdrawal, locale === "de" ? /nicht rückgängig/ : /cannot be undone/);
  }
});

test("Qualitätsprüfung und Forschung stehen getrennt im Text", () => {
  // Maria am 28.09.2026: „Wir müssen ja unterscheiden zwischen den Daten, die
  // ich für mich checke, ob das funktioniert, und Daten, die vielleicht
  // wirklich in eine Forschung gehen. Das sind ja zwei Paar Schuhe."
  //
  // Vorher stand beides in einem Satz („für wissenschaftliche Forschung … und
  // zur Weiterentwicklung unserer Messinstrumente"). Wer ablehnte, hätte damit
  // auch die Prüfung der eigenen Fragen untersagt - und wer sie trotzdem
  // vornimmt, handelt gegen den eigenen Text.
  for (const locale of ["de", "en"] as const) {
    const texts = JSON.parse(readFileSync(`messages/${locale}/researchConsent.json`, "utf8"));
    const body: string = texts.notice.body;
    assert.match(body, locale === "de" ? /Davon getrennt/ : /Separately from that/);
    assert.match(body, locale === "de" ? /keine Einwilligung/ : /do not need your consent/);
  }
});

test("die Einwilligung wird an einer Stelle verwaltet", () => {
  // „Ich habe die mehrmals gestellt bekommen, das war ein bisschen viel."
  // Der Schalter stand im Dashboard UND im Account - zwei Zeilen über dem Link
  // dorthin.
  const dashboard = readFileSync("src/app/(product)/dashboard/page.tsx", "utf8");
  const account = readFileSync("src/app/(product)/account/page.tsx", "utf8");
  assert.ok(!/<ResearchConsentSettings/.test(dashboard), "nicht mehr im Dashboard");
  assert.match(account, /<ResearchConsentSettings/);

  // Gefragt wird weiterhin genau so lange, wie nichts entschieden ist.
  const shell = readFileSync("src/features/navigation/ProductShell.tsx", "utf8");
  assert.match(shell, /researchConsentState === "undecided" \? \(/);
});
