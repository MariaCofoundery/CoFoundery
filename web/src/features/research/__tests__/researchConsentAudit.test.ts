import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  RESEARCH_CONSENT_COPY_REVISION,
  RESEARCH_CONSENT_LOCALES,
  RESEARCH_CONSENT_SURFACES,
  RESEARCH_CONSENT_VERSION,
  canonicalResearchConsentCopy,
  researchConsentCopySha256,
} from "@/features/research/consentVersion";

/**
 * Nachweis der Research-Einwilligung (Migration 20270129130000).
 *
 * Das Verhalten in der Datenbank prüft supabase/tests/research_consent_audit_log.sql.
 * Hier steht, was Code und Migration zusammenhalten muss.
 */

const MIGRATION = "../supabase/migrations/20270129130000_research_consent_audit_log.sql";
const messages = (locale: string) => JSON.parse(readFileSync(`messages/${locale}/researchConsent.json`, "utf8"));

test("fachliche Version und Textrevision sind zwei Konstanten", () => {
  assert.equal(RESEARCH_CONSENT_VERSION, "research_consent_v1");
  assert.match(RESEARCH_CONSENT_COPY_REVISION, /^research_consent_copy_\d{4}-\d{2}-\d{2}$/);
  assert.notEqual(RESEARCH_CONSENT_VERSION, RESEARCH_CONSENT_COPY_REVISION);
  const server = readFileSync("src/features/research/server.ts", "utf8");
  assert.match(server, /research_consent_version: RESEARCH_CONSENT_VERSION/, "die Ereignisse tragen weiterhin die fachliche Version");
});

test("die registrierten Hashes entsprechen genau dem ausgelieferten Wortlaut (DE/EN, Dialog/Einstellung)", () => {
  // Ändert jemand den Text ohne neue Revision, schlägt dieser Test fehl.
  const sql = readFileSync(MIGRATION, "utf8");
  for (const locale of RESEARCH_CONSENT_LOCALES) {
    for (const surface of RESEARCH_CONSENT_SURFACES) {
      const hash = researchConsentCopySha256(messages(locale), surface);
      const row = new RegExp(`\\('${RESEARCH_CONSENT_COPY_REVISION}', '${locale}', '${surface}',\\s*'${hash}'\\)`);
      assert.match(sql, row, `${locale}/${surface}: Wortlaut geändert, aber keine neue Revision registriert`);
    }
  }
});

test("der Hash ist deterministisch und unterscheidet Sprache und Stelle", () => {
  const de = messages("de");
  const en = messages("en");
  assert.equal(researchConsentCopySha256(de, "notice"), researchConsentCopySha256(structuredClone(de), "notice"));
  const all = new Set([
    researchConsentCopySha256(de, "notice"),
    researchConsentCopySha256(de, "settings"),
    researchConsentCopySha256(en, "notice"),
    researchConsentCopySha256(en, "settings"),
  ]);
  assert.equal(all.size, 4);
  // Gehasht wird der Wortlaut aus der Quelle der Oberfläche, nicht HTML.
  assert.match(canonicalResearchConsentCopy(de, "notice"), /"notice\.body","Wenn du möchtest/);
  assert.doesNotMatch(canonicalResearchConsentCopy(de, "notice"), /<[a-z]/i);
});

test("die Entscheidung übergibt Revision und die serverseitig gerenderte Sprache", () => {
  const action = readFileSync("src/features/research/actions.ts", "utf8");
  assert.match(action, /p_copy_revision: RESEARCH_CONSENT_COPY_REVISION/);
  assert.match(action, /const locale = await getRequestLocale\(\)/);
  assert.match(action, /p_locale: locale/);
  assert.match(action, /p_surface: surface/);
  assert.doesNotMatch(action, /p_copy_sha256|copy_sha256/, "den Hash setzt die Datenbank, nicht der Aufrufer");
  assert.match(readFileSync("src/features/research/ResearchConsentNotice.tsx", "utf8"), /setResearchConsentAction\(state, "notice"\)/);
  assert.match(readFileSync("src/features/research/ResearchConsentSettings.tsx", "utf8"), /setResearchConsentAction\(next, "settings"\)/);
  const i18n = readFileSync("src/i18n/request.ts", "utf8");
  assert.match(i18n, /const locale = await getRequestLocale\(\)/, "gerendert wird mit derselben Sprachermittlung");
});

test("keine rückwirkende Zuordnung alter Entscheidungen", () => {
  const sql = readFileSync(MIGRATION, "utf8").replace(/^\s*--.*$/gm, "");
  const inserts = sql.match(/insert into public\.research_consent_audit_log[^;]*;/g) ?? [];
  assert.equal(inserts.length, 1, "nur die Entscheidungsfunktion schreibt");
  assert.doesNotMatch(inserts[0], /\bselect\b/i, "die Migration befüllt den Nachweis nicht aus bestehenden Einwilligungen");
  assert.match(inserts[0], /values \(\s*v_uid, v_action/);
});

test("die fachliche Version bleibt v1 - kein halber Umstieg auf v2", () => {
  const sql = readFileSync(MIGRATION, "utf8");
  assert.doesNotMatch(sql, /research_consent_v2/);
  const body = sql.slice(sql.indexOf("create or replace function public.set_my_research_consent"));
  assert.match(body, /and re\.research_consent_version = 'research_consent_v1'/, "der Widerruf löscht weiterhin die v1-Ereignisse");
  assert.match(body, /'research_consent_v1', p_copy_revision/);
});

/**
 * SCHUTZREGEL FÜR ALTDATEN (docs/research-consent-copy-history.md): Forschungsdaten
 * aus Einwilligungen ohne belegte Textrevision gelten nicht als freigegeben für
 * Veröffentlichungen oder Nutzung außerhalb von Made2Found. Heute gibt es keinen
 * Export- oder Veröffentlichungsweg. Dieser Test meldet jeden neuen Lesezugriff -
 * wer einen hinzufügt, muss die Schutzregel technisch umsetzen und ihn hier
 * begründet eintragen.
 */
const KNOWN_RESEARCH_READERS = new Map<string, string>([
  ["scripts/item-analysis.ts", "interne Itemanalyse, lokal, nur Konsole, keine Weitergabe"],
]);

test("kein unbekannter Lesezugriff auf research_events oder die Analyse-Sicht", () => {
  const found: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) {
        if (entry === "__tests__" || entry === "node_modules" || entry === ".next") continue;
        walk(path);
      } else if (/\.(ts|tsx|mjs|js)$/.test(entry)) {
        const src = readFileSync(path, "utf8");
        if (/\.from\(\s*["'](research_events|research_events_analytics_v1)["']\s*\)\s*\.select/.test(src)) found.push(path);
      }
    }
  };
  walk("src");
  walk("scripts");
  walk("../supabase/functions");
  const unknown = found.filter((path) => !KNOWN_RESEARCH_READERS.has(path.replace(/^\.\.\//, "")));
  assert.deepEqual(unknown, [], "neuer Lesezugriff auf Forschungsdaten - Schutzregel für Altdaten umsetzen");
  assert.ok(found.includes("scripts/item-analysis.ts"), "Gegenprobe: der bekannte Leser wird gefunden");
});
