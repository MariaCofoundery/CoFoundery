import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

// Entwurf vom 05.11.2026 (https://claude.ai/artifact/VrSBuS2SRpHa76oSTEoN88), von Maria freigegeben: "genau so umsetzen".
const read = (path: string) => readFileSync(path, "utf8");

test("Arbeitsbereiche in Inter, Ueberschriften bleiben in Spectral - lokal eingebunden, kein Schriftendienst", () => {
  const layout = read("src/app/layout.tsx");
  assert.match(layout, /variable: "--font-inter"/);
  assert.match(layout, /\.\/fonts\/inter-latin-400\.woff2/);
  assert.doesNotMatch(layout, /next\/font\/google|fonts\.googleapis/);
  const css = read("src/app/globals.css");
  assert.match(css, /\.work-ui \{\s*font-family: var\(--font-inter\)/);
  assert.match(read("src/features/advisor/TeamraumScreen.tsx"), /<main className="work-ui /);
  assert.match(read("src/app/(product)/advisor/organisation/page.tsx"), /<main className="work-ui /);
  assert.match(read("src/app/(product)/advisor/teamraum/chat/[chatId]/page.tsx"), /<main className="work-ui /);
});

test("Feldnamen normal geschrieben und dunkel - keine kleinen Grossbuchstaben mehr in den Formularen des Teamraums", () => {
  for (const file of ["Teamraum.tsx", "DictateTasks.tsx", "SocialCalendar.tsx", "TeamraumPages.tsx", "PlanCampaign.tsx", "OrgChatList.tsx", "OrgTeamProgramsSection.tsx"]) {
    const source = read(`src/features/advisor/${file}`);
    assert.doesNotMatch(source, /const LABEL = "[^"]*uppercase/, file);
  }
});

test("Aufgaben: Inhalt zuerst - das Formular steht nur nach \"+ Neue Aufgabe\" da, am Telefon als Blatt von unten", () => {
  const board = read("src/features/advisor/Teamraum.tsx");
  assert.match(board, /ctx\.canWrite && options\.newOpen \?/);
  assert.match(board, /fixed inset-x-0 bottom-0 z-50[^"]*md:static/);
  // Ohne gewaehlte Ansicht: Board am Rechner, nach Stand gruppierte Liste am Telefon.
  assert.match(board, /<div className="hidden md:block">\{board\}<\/div>\s*<TaskList [^>]*mobileOnly \/>/);
  // Wer und bis wann zum Antippen; die Werte gehen als dieselben Felder an dieselbe Aktion.
  // Mehrere Zustaendige (20270322120000): jede gewaehlte Person ein eigenes Feld "assignee".
  assert.match(board, /<ChipMultiChoice name="assignee"[^>]*max=\{6\}/);
  assert.match(board, /<ChipChoice name="dueOn"/);
  const chips = read("src/features/ui/ChipChoice.tsx");
  assert.match(chips, /<input type="hidden" name=\{name\} value=\{value\} \/>/);
  assert.match(chips, /values\.map\(\(value\) => <input key=\{value\} type="hidden" name=\{name\} value=\{value\} \/>\)/);
});

test("Diese Woche: eine Zeile, gespeichert wird erst nach dem Vorschlag; keine Wertung", () => {
  const board = read("src/features/advisor/Teamraum.tsx");
  assert.match(board, /<DictateTasks\s+variant="line"/);
  const dictate = read("src/features/advisor/DictateTasks.tsx");
  // "Anlegen" erkennt nur; geschrieben wird ueber das Formular mit den geprueften Vorschlaegen.
  assert.match(dictate, /onClick=\{recognize\}[^>]*>\s*\{t\("lineAdd"\)\}/);
  assert.match(dictate, /<form action=\{createOrgTasksAction\}/);
  assert.doesNotMatch(board + dictate, /score|percent|ranking|compatib/i);
});

test("Programm: schmaler Kopf, Reiter der Gruppe (die Gruppen stehen in der Seitenleiste), Teams als Zeilen, Datenschutz-Text zum Aufklappen", () => {
  const page = read("src/app/(product)/advisor/organisation/page.tsx");
  // Seit dem 05.11.2026 wechselt die Seitenleiste zwischen den Gruppen; der Kopf traegt sie nicht mehr doppelt.
  assert.doesNotMatch(page, /<OrgAreaNav part="groups"/);
  assert.match(page, /<OrgAreaNav part="tabs"/);
  assert.doesNotMatch(page.slice(page.indexOf("return (\n    <main className=\"work-ui")), /<AdvisorPageHeader/);
  const section = read("src/features/advisor/OrgTeamProgramsSection.tsx");
  assert.match(section, /t\("colMilestone"\)/);
  assert.match(section, /<summary[^>]*>\{t\("retentionQuestion"\)\}<\/summary>/);
  // Einstellungen je Team bleiben erreichbar - nur fuer Inhaberin und Bezugsperson.
  assert.match(section, /isOwner \|\| program\.isContact \? \(\s*<details/);
});
