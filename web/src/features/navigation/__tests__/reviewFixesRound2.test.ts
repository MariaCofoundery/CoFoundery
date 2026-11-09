import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(path, "utf8");
const code = (path: string) => read(path).replace(/^\s*\/\/.*$/gm, " ").replace(/\/\*[\s\S]*?\*\//g, " ");

test("/programm mit mehreren Programmen: Rückmeldung und Sprungmarke gehören zu EINEM Programm", () => {
  const actions = code("src/features/advisor/programTaskActions.ts");
  assert.match(actions, /const which = programId \? `program=\$\{programId\}` : ""/);
  assert.match(actions, /#\$\{goals \? "ziele" : "aufgaben"\}\$\{programId \? `-\$\{programId\}` : ""\}/);
  const page = code("src/app/(product)/programm/page.tsx");
  for (const flag of ["goalSaved", "goalError", "taskSaved", "taskError"]) assert.match(page, new RegExp(`query\\.program === program\\.programId && query\\.${flag} === "1"`), flag);
  // Ältere Links (Hinweise, Start) führen weiter zum ersten Programm.
  assert.match(page, /<span id="aufgaben"/);
  assert.match(page, /<span id="ziele"/);
  assert.match(read("src/features/advisor/ProgramTasks.tsx"), /id=\{`aufgaben-\$\{programId\}`\}/);
  assert.match(read("src/features/advisor/ProgramGoals.tsx"), /id=\{`ziele-\$\{programId\}`\}/);
});

test("Termine anlegen bietet nur an, wer es darf; die Adresse allein öffnet kein Formular", () => {
  const chrome = code("src/features/navigation/workspace/WorkspaceChrome.tsx");
  assert.match(chrome, /const canPlan = active\?\.isOwner !== false;/);
  assert.match(chrome, /entry\.key !== "event" && entry\.key !== "events"/);
  assert.equal((chrome.match(/creates\.map\(/g) ?? []).length, 2, "Suche und Menü");
  const screen = code("src/features/advisor/calendar/CalendarScreen.tsx");
  assert.match(screen, /const sheet = planningSheet \? \(isOwner \? planningSheet : null\)/);
  assert.match(code("src/features/dashboard/dashboardRoleData.ts"), /isOwner: \(memberships \?\? \[\]\)\.some/);
});

test("Listen verdrängen das Neue nicht: offene Aufgaben und jüngste erledigte; Organisation schon in der Abfrage", () => {
  const data = code("src/features/advisor/teamraumData.ts");
  assert.match(data, /\.neq\("status", "done"\)\.order\("created_at", \{ ascending: true \}\)\.limit\(500\)/);
  assert.match(data, /\.eq\("status", "done"\)\.order\("done_at", \{ ascending: false, nullsFirst: false \}\)\.limit\(200\)/);
  assert.match(data, /listMyOpenOrgTasks\(client: SupabaseClient, userId: string, orgId\?: string\)/);
  assert.match(data, /if \(orgId\) query = query\.eq\("org_id", orgId\)/);
  const dash = code("src/app/(product)/advisor/dashboard/page.tsx");
  assert.match(dash, /listMyOpenOrgTasks\(client, user\.id, orgs\[0\]\.id\)/);
  assert.match(dash, /listUpcomingOrgTasks\(client, 7, orgs\[0\]\.id\)/);
  // Die Zähler im Wochenband kommen aus der ganzen Liste, nicht aus den vier darunter.
  assert.match(dash, /key: "events", count: planSoon\.filter/);
  assert.match(dash, /key: "posts", count: needPosts\.length/);
  assert.doesNotMatch(dash, /count: startEvents\.filter/);
});

test("eine Aufgabe aus dem Panel eines länger zurückliegenden Termins behält ihre Verknüpfung", () => {
  const teamraum = code("src/features/advisor/Teamraum.tsx");
  assert.match(teamraum, /event\.eventId === task\?\.eventId \|\| event\.eventId === defaultEventId/);
  assert.doesNotMatch(teamraum, /event\.startsAt\.slice\(0, 10\)/);
});

test("Fehler werden gesagt, nicht verschluckt", () => {
  assert.match(code("src/features/advisor/teamraumActions.ts"), /const \{ error \} = await client\.rpc\("delete_org_task_comment"[\s\S]*taskError: "failed"/);
  assert.match(code("src/features/advisor/teamProgramActions.ts"), /const failed = UUID_RE\.test\(eventId\)[\s\S]*planError=1/);
  const setup = code("src/features/advisor/setup/setupActions.ts");
  assert.equal((setup.match(/fehler=1/g) ?? []).length, 2);
  assert.match(code("src/app/(product)/advisor/los-gehts/page.tsx"), /query\.fehler === "1"/);
  assert.match(code("src/features/navigation/workspace/navPrefsActions.ts"), /const \{ error \} = await client\.rpc\("save_advisor_nav_prefs"/);
  assert.match(code("src/features/navigation/founder/founderNavPrefsActions.ts"), /const \{ error \} = await client\.rpc\("save_founder_nav_prefs"/);
  assert.match(code("src/features/navigation/workspace/NavSettings.tsx"), /ts\("error"\)/);
  assert.match(code("src/features/navigation/founder/FounderNavSettings.tsx"), /ts\("error"\)/);
  // Ein gescheitertes Verschieben im Kalender springt nicht wortlos zurück.
  const drag = code("src/features/ui/CalendarDrag.tsx");
  assert.match(drag, /else setFailed\(true\)/);
  assert.match(drag, /role="alert"/);
  assert.match(code("src/features/advisor/calendar/CalendarScreen.tsx"), /failedLabel=\{t\("dragFailed"\)\}/);
  assert.match(code("src/features/advisor/Teamraum.tsx"), /failedLabel=\{t\("dragFailed"\)\}/);
});

test("eine abgeholte Mitteilung geht nicht verloren, wenn die Hülle wechselt", () => {
  const popup = code("src/features/announcements/AnnouncementPopup.tsx");
  assert.match(popup, /let handedOver: PendingAnnouncement \| null = null;/);
  assert.match(popup, /if \(cancelled\) handedOver = next;/);
  assert.match(popup, /setItem\(rescued\)/);
  // Kein "schon gestartet"-Merker mehr: Er verschluckte im Entwicklungsmodus die zweite Instanz.
  assert.doesNotMatch(popup, /started\.current/);
});

test("Dialoge: Fokus hinein, Tab kreist, Fokus kehrt zurück; das Programm-Menü folgt der Tastatur", () => {
  const hook = code("src/features/ui/useFocusTrap.ts");
  assert.match(hook, /event\.key !== "Tab"/);
  assert.match(hook, /previous\.focus\(/);
  for (const file of ["src/features/navigation/workspace/WorkspaceChrome.tsx", "src/features/navigation/founder/FounderChrome.tsx"]) {
    assert.match(code(file), /useFocusTrap\(moreOpen, moreRef\)/, file);
  }
  const chrome = code("src/features/navigation/workspace/WorkspaceChrome.tsx");
  assert.match(chrome, /useFocusTrap\(true, panelRef\)/);
  assert.match(chrome, /event\.key === "ArrowDown" \|\| event\.key === "ArrowUp"/);
  assert.match(chrome, /triggerRef\.current\?\.focus\(\)/);
  assert.match(code("src/features/announcements/AnnouncementView.tsx"), /useFocusTrap\(live, dialogRef\)/);
  assert.match(code("src/features/ui/SidePanel.tsx"), /<FocusPanel titleId=\{titleId\} trap=\{modal\} \/>/);
});
