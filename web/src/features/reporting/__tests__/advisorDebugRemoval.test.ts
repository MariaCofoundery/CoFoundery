import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(path, "utf8");
/** Ohne Kommentare - sonst findet die Pruefung "debug" in ihrer Begruendung. */
const codeOnly = (path: string) =>
  source(path)
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

const REPORT_PAGE = "src/app/(product)/advisor/report/page.tsx";
const DASHBOARD_PAGE = "src/app/(product)/advisor/dashboard/page.tsx";
const LOADER = "src/features/reporting/advisorReportPageData.ts";
const SHELL = "src/features/navigation/ProductShell.tsx";

test("die abgeschaltete Debug-Oberfläche ist weg, nicht nur abgeschaltet", () => {
  // Auf beiden Advisor-Seiten stand `const debug = false;` und dahinter rund
  // hundert Zeilen JSX, die niemand je sah - inklusive eigener
  // Uebersetzungsschluessel. Abgeschalteter Code ist die schlechteste Sorte:
  // Er kostet beim Lesen genauso viel wie lebender, aber niemand merkt, wenn
  // er verrottet.
  for (const page of [REPORT_PAGE, DASHBOARD_PAGE]) {
    const code = codeOnly(page);
    assert.doesNotMatch(code, /const debug = false/, `${page}: der Schalter steht noch da`);
    assert.doesNotMatch(code, /\{debug \?/, `${page}: es hängt noch Oberfläche daran`);
    assert.doesNotMatch(code, /debugMeta/, `${page}: die Diagnosedaten werden noch gelesen`);
  }
});

test("die Diagnosedaten werden nicht mehr bei jeder Anfrage gebaut", () => {
  // Der Loader setzte `debugMeta` an acht Rueckgabestellen zusammen - fuer eine
  // Anzeige, die es nicht mehr gab.
  const loader = codeOnly(LOADER);
  assert.doesNotMatch(loader, /debugMeta/);
  assert.doesNotMatch(loader, /AdvisorReportDebugMeta/);
});

test("das Protokoll für abgelehnte Zugriffe bleibt", () => {
  // WICHTIG: Das hier ist KEINE tote Diagnostik und war beim Aufräumen um ein
  // Haar mitgegangen. Wenn jemand meldet "ich komme nicht an den Report",
  // steht im Serverprotokoll, ob es an der Freigabe lag oder daran, dass die
  // Uebernahme aus der alten Tabelle nicht gegriffen hat.
  const loader = source(LOADER);
  assert.match(loader, /console\.info\("\[advisor-report\] access_denied"/);
  assert.match(loader, /legacySyncAttempted,/);
  assert.match(loader, /legacySyncResult,/);
});

test("die Produkthülle hat keinen Debug-Schalter mehr am Adressparameter", () => {
  // Ein useEffect auf jeder Produktseite, der bei ?debug=1 Navigationslinks in
  // die Browserkonsole schrieb - fuer Seiten, die ihre Debug-Ausgabe nicht
  // mehr haben. Er kostete zusaetzlich die Abhaengigkeit auf useSearchParams.
  const shell = codeOnly(SHELL);
  assert.doesNotMatch(shell, /searchParams\.get\("debug"\)/);
  assert.doesNotMatch(shell, /advisor-report-debug/);
  assert.doesNotMatch(shell, /useSearchParams/);
});

test("die verwaisten Übersetzungen sind mitgegangen", () => {
  // Ungenutzte Uebersetzungen bleiben sonst liegen und tauchen Jahre spaeter
  // woanders wieder auf.
  for (const locale of ["de", "en"]) {
    const report = (
      JSON.parse(readFileSync(`messages/${locale}/advisor.json`, "utf8")) as {
        report: Record<string, string>;
      }
    ).report;
    for (const key of ["debugEyebrow", "debugTitle", "debugText"]) {
      assert.equal(report[key], undefined, `${locale}: report.${key} liegt noch da`);
    }
  }
});

test("der abgewiesene Zugriff endet weiterhin auf dem Dashboard", () => {
  // Der Debug-Zweig sass MITTEN in der Ablehnung. Beim Herausnehmen darf die
  // Weiterleitung nicht mitgehen - sonst faellt jemand ohne Freigabe auf eine
  // halb gerenderte Seite.
  const page = source(REPORT_PAGE);
  const denial = page.slice(page.indexOf('data.status === "forbidden"'));
  assert.match(denial.slice(0, 200), /redirect\("\/advisor\/dashboard"\)/);
});
