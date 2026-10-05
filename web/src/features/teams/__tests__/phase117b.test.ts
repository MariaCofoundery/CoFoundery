import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Phase 11.7B - Teamfreigabe, Berichts-Redesign, Navigation. Die DB-Regeln
 * (Teamfreigabe 2/3/4, Neuzugang, Widerruf, Austritt, Vorhaben, Advisor-Fehler,
 * FIND, Bestand, Snapshots) pruefen die pgTAP-Tests in
 * supabase/tests/team_shares_and_leave.sql.
 */

const src = (p: string) => readFileSync(p, "utf8");
const code = (p: string) => src(p).replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\{\/\*[\s\S]*?\*\/\}/g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");
const json = (p: string) => JSON.parse(src(p));

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? (name === "__tests__" ? [] : files(path)) : /\.(tsx?|json)$/.test(name) ? [path] : [];
  });
}

test("Migration: echte Teamfreigabe, Austritt, keine abgeleiteten gerichteten Freigaben", () => {
  const m = src("../supabase/migrations/20261119120000_team_shares_and_leave.sql");
  assert.match(m, /create table public\.team_shares\(/);
  assert.match(m, /scope text not null default 'workstyle_capability' check\(scope in\('workstyle_capability'\)\)/);
  assert.match(m, /create function public\.set_team_share\(p_team_id uuid,p_enabled boolean\)/);
  assert.match(m, /create function public\.leave_founder_team\(p_team_id uuid\)/);
  assert.match(m, /create function public\.accept_invitation_with_team_share\(p_token text,p_share boolean\)/);
  // Hybrid: keine automatisch erzeugten alignment_shares.
  assert.doesNotMatch(m, /insert into public\.alignment_shares/);
  // Advisor-Fehler: Founder-Peers umgehen die Advisor-Regel.
  assert.match(m, /public\.are_founder_peers\(assessment\.user_id, p_recipient_user_id\)/);
  // Forschung bleibt aussen vor.
  assert.doesNotMatch(m, /workstyle_research_responses/);
  // Clients schreiben nicht direkt.
  assert.match(m, /revoke all on public\.team_shares from public,anon,authenticated;\s*grant select on public\.team_shares to authenticated;/);
  assert.match(src("../supabase/tests/team_shares_and_leave.sql"), /I: founder share survives revoked grant/);
});

test("kein „Workstyle Signature“ mehr in Produktcode und Texten", () => {
  for (const file of [...files("src"), ...files("messages")])
    assert.doesNotMatch(code(file), /Workstyle Signature/, file);
});

test("Berichte: neue Überschriften, gestapelte Spuren, keine Kürzel als Kennzeichnung", () => {
  const team = code("src/features/reporting/workstyle/TeamWorkstyleReport.tsx");
  const order = [
    '"Euer Zusammenspiel auf einen Blick"',
    "Was bei euch ähnlich ist",
    "Wo ihr unterschiedlich an Dinge herangeht",
    "Hier lohnt sich ein Gespräch",
    '<h2 id="ws-work-title"',
    "<ComponentMatrix",
    "Was ihr aufbauen wollt",
    "Was ihr bereits vereinbart habt",
    "So lest ihr das",
  ].map((m) => team.indexOf(m));
  order.forEach((at, n) => assert.ok(at > (n ? order[n - 1] : 0), `Teambericht Reihenfolge ${n}`));
  assert.doesNotMatch(team, /Worüber ihr früh sprechen solltet|<ol|list-decimal/);
  assert.match(team, /\.slice\(0, 6\)/);
  for (const file of ["WorkstyleGlance.tsx", "WorkstyleSignature.tsx", "TeamWorkstyleReport.tsx", "ComponentMatrix.tsx"])
    assert.doesNotMatch(code(`src/features/reporting/workstyle/${file}`), /memberInitials|ws-token/, file);
});

test("Teamtexte: lebensnah, keine Auswertungssprache aus Phase 10", () => {
  const n = code("src/features/reporting/workstyle/narrative.ts");
  assert.doesNotMatch(n, /Teils antwortet ihr ähnlich, teils unterschiedlich|In mindestens einer Situation liegen eure Antworten auf entgegengesetzten Seiten/);
  assert.doesNotMatch(n, /In den beschriebenen Situationen|beantwortest du|Antwortmuster|eher wahrscheinlich|eher unwahrscheinlich/);
  assert.match(n, /Besonders sichtbar wird das bei der Frage, wann eine Entscheidung noch einmal geöffnet werden sollte\./);
  for (const label of ["Entscheidungen", "Ausprobieren", "Einwände", "Offene Fragen", "Erfahrung", "Arbeit steuern"])
    assert.match(n, new RegExp(`label: "${label}"`));
});

test("Teamfreigabe-UX: eine Entscheidung, Text nennt spätere Mitglieder, Widerruf mit Folgen", () => {
  const card = code("src/features/teams/TeamShareCard.tsx");
  assert.match(card, /setTeamShareAction\.bind\(null, teamId, true, returnTo\)/);
  assert.match(card, /<details/);
  assert.doesNotMatch(card, /recipient|hiddenBlocks|type="checkbox"/i);
  for (const locale of ["de", "en"]) {
    const t = json(`messages/${locale}/teams.json`).teamShare;
    assert.match(t.body, locale === "de" ? /später zu diesem Team dazukommen/ : /join this team later/);
    assert.match(t.body, locale === "de" ? /Forschungsantworten, FIND und Advisor-Zugänge/ : /Research answers, FIND and advisor access/);
    assert.match(t.revokeExplain, locale === "de" ? /nicht zurückholen/ : /cannot be taken back/);
  }
  const actions = code("src/features/teams/teamShareActions.ts");
  assert.match(actions, /rpc\("set_team_share"/);
  assert.match(actions, /rpc\("leave_founder_team"/);
  assert.doesNotMatch(actions, /from\("team_shares"\)|from\("founder_team_members"\)/);
});

test("Beitritt: zwei gleichwertige Optionen, keine Vorauswahl, Beitritt allein teilt nichts", () => {
  const join = code("src/app/join/JoinClient.tsx");
  assert.match(join, /accept_invitation_with_team_share/);
  assert.match(join, /acceptWithChoice\(uiState\.token, uiState\.invitationId, true\)/);
  assert.match(join, /acceptWithChoice\(uiState\.token, uiState\.invitationId, false\)/);
  assert.doesNotMatch(join, /defaultChecked|checked=|autoFocus|rpc\("accept_invitation",/);
  for (const locale of ["de", "en"]) {
    const c = json(`messages/${locale}/invite.json`).join.choice;
    assert.equal(c.share.title, locale === "de" ? "Team beitreten und teilen" : "Join team and share");
    assert.equal(c.later.title, locale === "de" ? "Erst beitreten, später entscheiden" : "Join now, decide later");
  }
});

test("Team verlassen: nur die eigene Person, Folgen vorher, zweiter Klick", () => {
  const leave = code("src/features/teams/LeaveTeamSection.tsx");
  assert.match(leave, /leaveTeamAction\.bind\(null, teamId\)/);
  assert.match(leave, /<details/);
  assert.doesNotMatch(leave, /removeMember|p_user_id/);
  for (const key of ["access", "share", "report", "setup", "personal"])
    assert.ok(json("messages/de/teams.json").leave.consequences[key], key);
});

test("Vorhaben: keine eigene ShareForm, Hinweis vor dem Absenden", () => {
  const page = code("src/app/(product)/founder-alignment/vorhaben/antworten/page.tsx");
  assert.doesNotMatch(page, /ShareForm|getShareState/);
  assert.match(json("docs/align-screens-venture-v0-1.json").closing.subline, /Deine Antworten werden nach dem Absenden für die Mitglieder dieses Teams sichtbar\./);
});

test("Navigation: Teamseiten ohne Brotkrume und ohne „Zum Team“, ruhige Reiter, nichts davon im Druck", () => {
  const shell = code("src/features/navigation/ProductShell.tsx");
  assert.match(shell, /!pathname\.startsWith\("\/teams\/"\)/);
  assert.match(shell, /print:hidden/);
  const nav = code("src/features/teams/FounderTeamNavigation.tsx");
  assert.doesNotMatch(nav, /bg-slate-900|#team-alignment/);
  assert.match(nav, /border-b-2/);
  assert.match(nav, /overflow-x-auto/);
  assert.match(nav, /ws-no-print/);
  const header = code("src/features/teams/TeamPageHeader.tsx");
  assert.match(header, /href="\/connections"/);
  assert.match(header, /ws-no-print/);
  for (const page of ["workstyle", "roles", "setup"]) {
    const p = code(`src/app/(product)/teams/[teamId]/${page}/page.tsx`);
    assert.match(p, /<TeamPageHeader/, page);
    assert.doesNotMatch(p, /backToTeam|backToCollaboration|Zum Team/, page);
  }
  assert.match(code("src/app/(product)/teams/[teamId]/page.tsx"), /<TeamPageHeader/);
});

// ---------------------------------------------------------------------------
// Phase 11.7B.1 - Abschlusskorrekturen
// ---------------------------------------------------------------------------

test("11.7B.1: Fähigkeiten teamgenau, Widerruf schlägt Bestand", () => {
  const m = src("../supabase/migrations/20261119130000_team_share_scope_corrections.sql");
  assert.match(m, /create function public\.get_team_capability\(p_team_id uuid,p_user_id uuid\)/);
  assert.match(m, /public\.team_share_active\(p_team_id,p_user_id\)/);
  // Die kontextfreie Freigabeleiter kennt keine Teamfreigabe mehr.
  const disclosed = m.slice(m.indexOf("create or replace function public.get_disclosed_capability"), m.indexOf("create function public.get_team_capability"));
  assert.doesNotMatch(disclosed, /team_share/);
  assert.match(m, /public\.get_team_capability\(p_team_id,member\.user_id\)/);
  // Eine getroffene Teamentscheidung ist autoritativ.
  assert.match(m, /if decision\.id is not null then return decision\.revoked_at is null; end if;/);
  assert.doesNotMatch(m, /delete from public\.alignment_shares|update public\.alignment_shares/);
  const pg = src("../supabase/tests/team_shares_and_leave.sql");
  assert.match(pg, /K: team B without share shows nothing/);
  assert.match(pg, /L: revoked team share beats complete legacy directed shares/);
});

test("11.7B.1: alle Teamseiten nutzen den gemeinsamen Teamkopf ohne alte Rückwege", () => {
  for (const page of [
    "src/app/(product)/teams/[teamId]/page.tsx",
    "src/app/(product)/teams/[teamId]/workstyle/page.tsx",
    "src/app/(product)/teams/[teamId]/roles/page.tsx",
    "src/app/(product)/teams/[teamId]/setup/page.tsx",
    "src/app/(product)/teams/[teamId]/setup/[itemKey]/page.tsx",
    "src/app/(product)/teams/[teamId]/founder-library/page.tsx",
    "src/app/(product)/teams/[teamId]/commitment-lab/[relationshipId]/page.tsx",
  ]) {
    const p = code(page);
    assert.match(p, /<TeamPageHeader/, page);
    assert.doesNotMatch(p, /<FounderTeamNavigation|backToTeam|backToSetup|backToCollaboration|#team-alignment`\}|t\("back"\)/, page);
  }
});

test("11.7B.1: Roles-Seite nutzt die Fähigkeiten-Komponente des Teamberichts", () => {
  const page = code("src/app/(product)/teams/[teamId]/roles/page.tsx");
  assert.match(page, /<ComponentMatrix/);
  assert.doesNotMatch(page, /CapabilityTeamReadoutView|capability_disclosure/);
  for (const locale of ["de", "en"]) {
    const t = json(`messages/${locale}/capability.json`).team;
    assert.match(t.teamBasis, locale === "de" ? /für dieses Team geteilt/ : /shares with this team/);
    assert.match(t.emptyDisclosure, locale === "de" ? /Mit diesem Team teilen/ : /Share with this team/);
  }
});

test("11.7B.1: mobile Aktionen kompakt - PDF sichtbar, Rest hinter „Mehr“", () => {
  const page = code("src/app/(product)/teams/[teamId]/workstyle/page.tsx");
  assert.match(page, /className="hidden flex-wrap items-center gap-3 sm:flex"/);
  const mobile = page.slice(page.indexOf("team-actions-mobile"));
  assert.ok(mobile.indexOf("<PrintReportButton") < mobile.indexOf("<details"));
  assert.match(mobile, /t\("moreActions"\)/);
  assert.equal(json("messages/de/report.json").workstyle.moreActions, "Mehr");
});
