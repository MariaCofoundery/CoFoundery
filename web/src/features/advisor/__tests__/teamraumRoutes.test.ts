import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { TEAMRAUM_SECTIONS, legacyTeamraumPath, teamraumChatHref, teamraumHref, teamraumPath, teamraumSectionOfPath } from "@/features/advisor/teamraumRoutes";

const ORG = "5498b60c-508a-4da4-b31b-9422d64b2786";
const CHAT = "7799810d-9e2a-4dad-a18f-5e5f82dfb481";

test("jeder Teil des Teamraums hat einen eigenen Pfad, und es gibt fuer jeden Pfad eine Seite", () => {
  const paths = TEAMRAUM_SECTIONS.map(teamraumPath);
  assert.equal(new Set(paths).size, TEAMRAUM_SECTIONS.length);
  for (const section of TEAMRAUM_SECTIONS) {
    const path = teamraumPath(section);
    assert.equal(teamraumSectionOfPath(path), section);
    const page = readFileSync(`src/app/(product)${path}/page.tsx`, "utf8");
    assert.match(page, new RegExp(`<TeamraumScreen section="${section}"`));
  }
  // Ein Gespraech gehoert zum Chat; fremde Pfade zu keinem Teil.
  assert.equal(teamraumSectionOfPath(`/advisor/teamraum/chat/${CHAT}`), "chat");
  assert.equal(teamraumSectionOfPath("/advisor/teamraumx"), null);
  assert.equal(teamraumSectionOfPath("/advisor/organisation"), null);
});

test("Adressen tragen die Organisation und weitere Angaben", () => {
  assert.equal(teamraumHref("week", ORG), `/advisor/teamraum?org=${ORG}`);
  assert.equal(teamraumHref("tasks", ORG, { view: "list" }), `/advisor/teamraum/aufgaben?org=${ORG}&view=list`);
  assert.equal(teamraumHref("chat", null), "/advisor/teamraum/chat");
  assert.equal(teamraumChatHref(ORG, CHAT), `/advisor/teamraum/chat/${CHAT}?org=${ORG}`);
});

test("alte Adressen aus Hinweisen und Mitteilungen fuehren in den Teamraum, alles andere bleibt bei der Organisation", () => {
  assert.equal(legacyTeamraumPath({ org: ORG, tab: "tasks", task: CHAT }), `/advisor/teamraum/aufgaben?org=${ORG}&task=${CHAT}`);
  assert.equal(legacyTeamraumPath({ org: ORG, tab: "social", view: "week", week: "2026-11-02" }), `/advisor/teamraum/social-media?org=${ORG}&view=week&week=2026-11-02`);
  assert.equal(legacyTeamraumPath({ tab: "week" }), "/advisor/teamraum");
  for (const tab of ["overview", "program", "funding", "members", undefined]) assert.equal(legacyTeamraumPath({ org: ORG, tab }), null);
  // Die alte Chat-Seite leitet weiter.
  const legacyChat = readFileSync("src/app/(product)/advisor/organisation/chat/page.tsx", "utf8");
  assert.match(legacyChat, /redirect\(teamraumChatHref\(/);
  // Gespeicherte Hinweise zeigen auf die alte Form - genau die wird erkannt.
  const sql = readFileSync("../supabase/migrations/20270316120000_org_task_notices.sql", "utf8");
  assert.match(sql, /'\/advisor\/organisation\?org=' \|\| v_org::text \|\| '&tab=tasks&task='/);
});

test("Menue: Einladen steht unter Begleitung, der Teamraum ist ein eigener Bereich mit sechs Teilen", () => {
  const shell = readFileSync("src/features/navigation/ProductShell.tsx", "utf8");
  const advisor = shell.slice(shell.indexOf("const advisorItems: NavigationItem[]"), shell.indexOf("const findItem: NavigationItem"));
  // Oben: Start, Begleitung, Programm, Teamraum - Einladen ist kein eigener Bereich mehr.
  assert.equal([...advisor.matchAll(/^ {6}href: /gm)].length, 3);
  assert.match(advisor, /href: TEAMRAUM_BASE/);
  assert.match(advisor, /\{ href: "\/advisor\/einladen", label: t\("advisorInvite"\), isActive: isAdvisorInviteArea \}/);
  assert.match(advisor, /isActive: \(currentPathname\) => isAdvisorFollowArea\(currentPathname\) \|\| isAdvisorInviteArea\(currentPathname\)/);
  assert.match(advisor, /subItems: TEAMRAUM_SECTIONS\.map/);
  for (const locale of ["de", "en"]) {
    const nav = JSON.parse(readFileSync(`messages/${locale}/navigation.json`, "utf8"));
    for (const key of ["advisorFollowList", "advisorTeamraum", "teamraumWeek", "teamraumTasks", "teamraumChat", "teamraumSocial", "teamraumPages", "teamraumWho", "teamraumChatCount"]) assert.ok(nav[key], `${locale} ${key}`);
  }
});

test("Hervorgehobene Kaesten im Teamraum: dunkle Schrift nie auf dem Verlauf", () => {
  // brand-panel ist ein Verlauf mit weisser Schrift. Darin stand dunkle Schrift (Feldnamen fast unsichtbar).
  for (const file of ["Teamraum.tsx", "SocialCalendar.tsx", "TeamraumPages.tsx", "OrgFunding.tsx", "PlanCampaign.tsx", "DictateTasks.tsx", "OrgChatList.tsx", "TeamraumScreen.tsx"]) {
    assert.doesNotMatch(readFileSync(`src/features/advisor/${file}`, "utf8"), /brand-panel/, file);
  }
});
