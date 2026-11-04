import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

const dashboardSource = readFileSync("src/app/(product)/dashboard/page.tsx", "utf8");
const nextStepSource = readFileSync("src/features/dashboard/DashboardNextStep.tsx", "utf8");
const waitingSource = readFileSync("src/features/dashboard/DashboardWaiting.tsx", "utf8");
const asideSource = readFileSync("src/features/dashboard/DashboardAside.tsx", "utf8");
const shellSource = readFileSync("src/features/navigation/ProductShell.tsx", "utf8");
const connectionsSource = readFileSync("src/app/(product)/connections/page.tsx", "utf8");
const accountSource = readFileSync("src/app/(product)/account/page.tsx", "utf8");
const archiveSource = readFileSync("src/features/profile/ProfileArchive.tsx", "utf8");
const profileSource = readFileSync("src/app/me/profile/page.tsx", "utf8");

type Messages = {
  hero: { eyebrow: string };
  aboutYou: { title: string };
  foundation: { alignment: { title: string }; values: { optionalBadge: string }; discovery: { eyebrow: string } };
  start: Record<string, unknown>;
};
const deDashboard = JSON.parse(readFileSync("messages/de/dashboard.json", "utf8")) as Messages;
const enDashboard = JSON.parse(readFileSync("messages/en/dashboard.json", "utf8")) as Messages;
const deReport = JSON.parse(readFileSync("messages/de/report.json", "utf8")) as { legacy: { lockedPdfText: string } };
const enReport = JSON.parse(readFileSync("messages/en/report.json", "utf8")) as { legacy: { lockedPdfText: string } };

const keysOf = (value: unknown, prefix = ""): string[] =>
  value && typeof value === "object"
    ? Object.entries(value as Record<string, unknown>).flatMap(([key, inner]) => keysOf(inner, `${prefix}${key}.`))
    : [prefix.slice(0, -1)];

test("dashboard no longer renders a global roadmap, profile percentage, or workbook step", () => {
  assert.doesNotMatch(dashboardSource, /DashboardProgressRoadmap/);
  assert.doesNotMatch(dashboardSource, /currentStep/);
  // Der Prozentwert ist nicht nur aus dem Dashboard verschwunden, sondern
  // ganz: seine Gewichte waren frei gewaehlt, und einer davon belohnte eine
  // Plattformhandlung statt einer Eigenschaft der Person.
  assert.doesNotMatch(dashboardSource, /computeProfileCompletion/);
  const completionSource = readFileSync("src/features/profile/profileCompletion.ts", "utf8");
  assert.doesNotMatch(completionSource, /export function computeProfileCompletion/);
  assert.doesNotMatch(completionSource, /EXTENDED_WEIGHTS/);
  // Die Weiche fuers Routing bleibt - sie ist kein Score.
  assert.match(completionSource, /export function isCoreProfileComplete/);
  assert.doesNotMatch(dashboardSource, /founder_alignment_workbooks/);
  assert.doesNotMatch(dashboardSource, /startWorkbook|continueWorkbook|workbookFocus/);
  assert.doesNotMatch(dashboardSource, /case "alignment_report"/);
});

test("die Startseite 04.11.2026: Begruessung, naechster Schritt, Wartet auf dich, leise Spalte, Datenschutz", () => {
  assert.match(dashboardSource, /t\("hero\.greeting"/);
  assert.doesNotMatch(dashboardSource, /hero\.headline|<QuoteOfTheDay|<HeroCarousel/);
  const order = ["t(\"hero.greeting\"", "<DashboardNextStep", "<DashboardWaiting", "<DashboardAside", "t(\"start.privacy\")"].map((marker) =>
    dashboardSource.indexOf(marker)
  );
  for (const at of order) assert.ok(at > -1, "ein Bereich fehlt");
  assert.deepEqual([...order].sort((a, b) => a - b), order, "die Reihenfolge stimmt nicht");
  // Ein Schritt, ein Knopf, die Marken-Flaeche mit den Kreisen von vorher.
  assert.match(nextStepSource, /brand-panel/);
  assert.equal(nextStepSource.match(/className="orb /g)?.length, 3);
  assert.equal(nextStepSource.match(/href=\{startStepHref\(next\)\}/g)?.length, 1);
  assert.match(nextStepSource, /aria-current=\{step\.state === "current" \? "step" : undefined\}/);
  assert.match(nextStepSource, /sr-only/);
});

test("was frueher unten auf der Startseite stand, steht jetzt dort, wo es hingehoert", () => {
  for (const removed of [
    /id="dashboard-block-connections"/,
    /id="dashboard-legacy-title"/,
    /id="dashboard-block-account"/,
    /<DashboardDeepen|<DashboardAreas|<DashboardTeamCard|<DashboardPath/,
    /signOutAllSessionsAction/,
    /<AlignVentureActions/,
    /<VersionArchiveCard/,
  ]) {
    assert.doesNotMatch(dashboardSource, removed);
  }
  for (const gone of ["HeroCarousel", "DashboardOrientation", "DashboardConnectionCards", "founderDashboardV2"]) {
    assert.ok(!existsSync(`src/features/dashboard/${gone}.tsx`) && !existsSync(`src/features/dashboard/${gone}.ts`), gone);
  }
  // Verschickte Einladungen: der Link zum Kopieren jetzt unter Teams & Verbindungen.
  assert.match(connectionsSource, /<SentInvitationLinkToggle invitationId=\{connection\.id\}/);
  // Support und "ueberall abmelden" im Konto.
  assert.match(accountSource, /id="hilfe"/);
  assert.match(accountSource, /t\("actions\.contactSupport"\)/);
  assert.match(readFileSync("src/features/account/AccountAccessSection.tsx", "utf8"), /signOutEverywhereAction/);
  // Fruehere Auswertungen eingeklappt im Archiv des Profils - mit dem einzigen
  // Weg, eine fruehere Freigabe (v2.1) zurueckzunehmen.
  assert.match(profileSource, /<ProfileArchive/);
  assert.match(archiveSource, /<ProfileDetails summary=\{t\("legacy\.title"\)\}/);
  assert.match(archiveSource, /<VersionArchiveCard/);
  assert.match(archiveSource, /hasSubmittedBase && <Link href="\/me\/report"/);
  assert.match(archiveSource, /href="\/founder-alignment\/versionen"/);
  assert.match(archiveSource, /return null;/);
});

test("Zitat, Ausblick, Karussell, Netzwerk-Box und Abschnittsleiste sind weg", () => {
  for (const removed of [
    /hero\.quoteEyebrow|getQuoteOfTheDay/,
    /DashboardJourneyLine|sectionNavigation\./,
    /DashboardSpotlight|explore\./,
    /dashboard-block-outlook|outlook\./,
    /DashboardHeroConstellation/,
    /connectCounts|dashboard-network-title/,
    /dashboard-block-roadmap/,
  ]) {
    assert.doesNotMatch(dashboardSource, removed);
  }
  assert.doesNotMatch(dashboardSource, /hero\.heroConnections|hero\.heroFind|hero\.heroOwnProfile/);
  assert.doesNotMatch(dashboardSource, /Team Context/);
  // Die Library bleibt erreichbar - ueber die Leiste.
  assert.match(shellSource, /href: "\/founder-library"/);
});

test("Team-Intake bleibt fuer Founder erreichbar, aber leise unter Teams & Verbindungen", () => {
  assert.match(connectionsSource, /href="\/team-intake"/);
  assert.match(connectionsSource, /tDashboard\("team\.teamIntakeLink"\)/);
  assert.match(shellSource, /href: "\/advisor\/einladen",\s*label: t\("advisorInvite"\)/);
  assert.match(shellSource, /currentPathname\.startsWith\("\/team-intake\/"\)/);
  const advisorDashboard = readFileSync("src/app/(product)/advisor/dashboard/page.tsx", "utf8");
  assert.doesNotMatch(advisorDashboard, /Team Context/);
  assert.doesNotMatch(advisorDashboard, /href="\/team-intake"/);
});

test("Wartet auf dich: ruhige Karten, nichts versteckt, Uebungen zu zweit nur als Einladung", () => {
  assert.match(dashboardSource, /\.filter\(isShownOnStart\)/);
  assert.match(dashboardSource, /\.filter\(\(task\) => !duplicatesNextStep\(task, start\.next\)\)/);
  assert.match(dashboardSource, /task\.kind === "NEEDS_YOU"/);
  // Die Zahl steht sichtbar neben der Ueberschrift; die Liste wischt, sie klappt nicht zu.
  assert.match(waitingSource, /\{cards\.length\}/);
  assert.match(waitingSource, /snap-x/);
  assert.doesNotMatch(waitingSource, /showAll|aria-expanded|slice\(0, 3\)/);
  // Keine Dringlichkeitsfarben je Karte.
  assert.doesNotMatch(waitingSource, /amber|red-|rose-/);
});

test("die leise Spalte zaehlt Tatsachen - kein 'von', kein Balken, kein Prozent", () => {
  for (const messages of [deDashboard, enDashboard]) {
    const stand = JSON.stringify(messages.start);
    assert.doesNotMatch(stand, /%|\bvon \{|\bof \{|Score|score/);
  }
  assert.doesNotMatch(asideSource, /progress|width: `|%/);
});

test("DE and EN start copy stay parallel", () => {
  assert.deepEqual(keysOf(enDashboard.start).sort(), keysOf(deDashboard.start).sort());
  assert.equal(deDashboard.hero.eyebrow, "Founder Dashboard");
  assert.equal(enDashboard.hero.eyebrow, "Founder dashboard");
  assert.equal(deDashboard.aboutYou.title, "Über dich");
  assert.equal(enDashboard.aboutYou.title, "About you");
  assert.equal(deDashboard.foundation.values.optionalBadge, "Optional");
  assert.equal(enDashboard.foundation.values.optionalBadge, "Optional");
  assert.equal(deDashboard.foundation.alignment.title, "Founder Alignment");
  assert.equal(enDashboard.foundation.discovery.eyebrow, "Your discovery profile");
  assert.equal(deReport.legacy.lockedPdfText, "PDF-Export ist derzeit nicht verfügbar.");
  assert.equal(enReport.legacy.lockedPdfText, "PDF export is currently unavailable.");
});

test("historical workbook route remains available while dashboard load finalization stays unchanged", () => {
  const legacyRoute = readFileSync("src/app/(product)/founder-alignment/workbook/page.tsx", "utf8");
  assert.ok(legacyRoute.length > 0);
  assert.match(dashboardSource, /finalizeInvitationIfReady/);
});
