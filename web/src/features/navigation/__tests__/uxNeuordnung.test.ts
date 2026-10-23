import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { isProductChromePath } from "@/features/navigation/productChromePath";

/**
 * UX-Neuordnung (Oktober 2026): Start | Align | Find | Connect, Fragebögen-Bibliothek, Startseite.
 *
 * Die Navigation hat jetzt zwei Ebenen: oben die Bereiche (durch feine Linien getrennt), darunter die Seiten des
 * aktiven Bereichs. Rechts: Feedback, Postfach als Symbol mit Zaehler, Konto. Neben dem Logo steht „Beta".
 */
const read = (path: string) => readFileSync(path, "utf8");
const code = (path: string) => read(path).replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");
const SHELL = "src/features/navigation/ProductShell.tsx";
const PAGE = "src/app/(product)/fragebogen/page.tsx";

test("Align fasst Fragebögen, Profil, Team und Library zusammen - als zweite Reihe unter den vier Bereichen", () => {
  const shell = code(SHELL);
  const founder = shell.slice(shell.indexOf("const founderItems"), shell.indexOf("const advisorItems"));
  // Genau ein Align-Bereich im Founder-Baum (statt Profil und Teams & Verbindungen einzeln).
  assert.equal([...founder.matchAll(/label: t\("area[A-Za-z]+"\)/g)].length, 2, "Start und Align");
  assert.match(founder, /label: t\("areaAlign"\)/);
  const order = ["alignQuestionnaires", "alignProfile", "alignTeam", "alignLibrary"].map((k) => founder.indexOf(`t("${k}")`));
  assert.ok(order.every((i) => i > 0) && [...order].sort((a, b) => a - b).join() === order.join(), "Weg: Fragebögen, Profil, Team, Library");
  // Die Bereiche der Leiste: Start, Align, Find, Connect.
  assert.match(shell, /\.\.\.founderItems,\s*\.\.\.advisorItems,\s*\.\.\.\(isFounderView && hasFounder \? \[findItem\] : \[\]\),\s*\.\.\.\(hasConnect \? \[connectItem\] : \[\]\)/);
});

test("die Bereiche sind durch feine Linien getrennt", () => {
  const shell = code(SHELL);
  const bar = shell.slice(shell.indexOf('aria-label={t("navLabel")}'), shell.indexOf("</nav>", shell.indexOf('aria-label={t("navLabel")}')));
  assert.match(bar, /index > 0 \?/);
  assert.match(bar, /h-5 w-px bg-slate-200/);
  assert.match(bar, /aria-hidden="true"/);
});

test("Postfach als Symbol mit Zaehler, Feedback umrandet und sichtbar, Beta-Etikett neben dem Logo", () => {
  const shell = code(SHELL);
  assert.match(shell, /<MessagesGlyph \/>/);
  assert.match(shell, /aria-label=\{t\("messages"\)\}/);
  assert.match(shell, /messagesAttentionCount/);
  // Feedback: derselbe Dialog wie bisher, nur sichtbarer gestaltet.
  assert.match(shell, /<ProductFeedbackEntry[\s\S]{0,400}border-violet-300/);
  // Beta-Etikett.
  assert.match(shell, /t\("betaBadge"\)/);
  for (const locale of ["de", "en"]) {
    const nav = JSON.parse(read(`messages/${locale}/navigation.json`)) as Record<string, string>;
    for (const key of ["areaAlign", "alignQuestionnaires", "alignProfile", "alignTeam", "betaBadge"]) assert.ok(nav[key], `${locale}: ${key}`);
  }
});

test("Fragebögen: eine Bibliothek aus der Modul-Registry, jede Karte gleich aufgebaut, keine Prozente", () => {
  assert.equal(isProductChromePath("/fragebogen"), true);
  const page = code(PAGE);
  assert.match(page, /MODULE_REGISTRY\.filter/);
  assert.match(page, /getModuleAdapter\(def\.moduleId\)/);
  // Ebenen: Über mich, Vorhaben, Vertiefen, Team.
  for (const group of ["person", "venture", "deepening", "team"]) assert.match(page, new RegExp(`data-group="${group}"|key: "${group}"`));
  // Die Beta nur fuer freigeschaltete Konten.
  assert.doesNotMatch(page, /betaOn|isVentureBetaEnabled/);
  assert.doesNotMatch(page, /%|percent|von\s+\d|\bscore\b/i);
  for (const locale of ["de", "en"]) {
    const q = JSON.parse(read(`messages/${locale}/questionnaires.json`));
    assert.ok(q.title && q.groups.person && q.groups.venture && q.groups.deepening && q.groups.team);
    assert.ok(q.state.not_started && q.state.in_progress && q.state.done_for_now);
  }
});

test("Startseite: der naechste Schritt als Marken-Flaeche, „Euer Weg\", Find und Connect - ohne Prozent", () => {
  const dashboard = code("src/app/(product)/dashboard/page.tsx");
  assert.match(dashboard, /className="brand-panel (relative )?flex /);
  // Das Zitat steht leise ueber der Ueberschrift, die Ueberschrift ist gross.
  assert.ok(dashboard.indexOf("<QuoteOfTheDay") < dashboard.indexOf("hero.headline"), "Zitat ueber der Ueberschrift");
  assert.match(dashboard, /sm:text-5xl/);
  assert.match(dashboard, /<DashboardPath/);
  // Kopf: Marken-Flaeche mit naechstem Schritt, Aufgaben (nur wenn etwas wartet) und Zitat, daneben die Team-Karte; dann Weg, Vertiefen, Find/Connect-Streifen.
  assert.match(dashboard, /<DashboardTeamCard/);
  assert.match(dashboard, /<DashboardDeepen/);
  assert.match(dashboard, /<DashboardAreas/);
  // Aufgaben stehen als Eintraege im Karussell; ohne Aufgabe und ohne Schritt bleibt ein ruhiger Leer-Eintrag.
  assert.match(dashboard, /heroItems\.length === 0/);
  // Die Profilangaben (4 Karten) sind von der Startseite ins Menue gewandert.
  assert.doesNotMatch(dashboard, /aboutYou\./);
  const order = ["data-dashboard-hero", 'id="dashboard-block-tasks"', "<DashboardTeamCard", "<DashboardPath", "<DashboardDeepen", "<DashboardAreas", 'id="dashboard-block-connections"', 'id="dashboard-block-account"'].map((m) => dashboard.indexOf(m));
  assert.ok(order.every((i) => i > 0) && [...order].sort((a, b) => a - b).join() === order.join(), order.join());
  const orientation = code("src/features/dashboard/DashboardOrientation.tsx");
  assert.doesNotMatch(orientation, /%|percent|von\s+\d|\bscore\b/i);
  const css = read("src/app/globals.css");
  assert.match(css, /\.brand-panel \{[^}]*linear-gradient\(120deg, #6d49e0, #0a80b8\)[^}]*color: #ffffff/);
});

test("Profil: Hero, „Auf einen Blick\", Seitenleiste und Abschnitte als Karten - ohne Wert, ohne Prozent", () => {
  const page = code("src/app/me/profile/page.tsx");
  const overview = code("src/features/reporting/ProfileOverview.tsx");
  // Der Kopf ist die Uebersicht (Konzeptboard 31) und traegt die Marken-Flaeche.
  assert.match(page, /<ProfileOverview/);
  assert.match(overview, /page-section brand-panel/);
  assert.match(page, /lg:grid-cols-\[13rem_minmax\(0,1fr\)\]/);
  // Die Seitenleiste ersetzt die Sprungleiste nur am Rechner; darunter bleibt die Leiste zum Schieben.
  assert.match(page, /className="no-print mt-6 lg:hidden"/);
  // Reihenfolge: Uebersicht mit Hero, dann Teil I.
  const order = ["<ProfileOverview", 'id="teil-wer"'].map((m) => page.indexOf(m));
  assert.ok(order.every((i) => i > 0) && [...order].sort((a, b) => a - b).join() === order.join(), order.join());
  // Keine Prozente, kein „x von y", keine Wertung - die Uebersicht zeigt Stationen, keinen Fortschritt.
  assert.doesNotMatch(overview, /%|percent|von\s+\d|\bscore\b/i);
  for (const locale of ["de", "en"]) {
    const profile = JSON.parse(read(`messages/${locale}/profile.json`)).founderProfile.atAGlance;
    assert.ok(profile.eyebrow && profile.next.label && profile.path.title && profile.can.title && profile.makes.title && profile.work.title && profile.share.title);
  }
  // Abschnitte sind Karten, im Druck ohne Rahmen.
  const pillar = read("src/features/reporting/ProfilePillar.tsx");
  assert.match(pillar, /rounded-3xl border border-slate-200\/80/);
  assert.match(pillar, /print:border-0/);
  // Im Druck gibt es keinen Verlauf.
  assert.match(read("src/app/globals.css"), /@media print \{[\s\S]*\.brand-panel \{[\s\S]*background-image: none/);
});
