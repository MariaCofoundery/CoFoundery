import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

/**
 * Phase 12C.0: Einladung ansehen und Einladung annehmen sind zwei getrennte
 * Vorgaenge.
 *
 * GEFUNDEN IM AUDIT 12A/B (im Browser nachgestellt): GET /invite/[id]/resume -
 * der Link "Fortsetzen" auf Dashboard und Verbindungen - nahm die Einladung mit
 * dem Service-Role-Key an. Ein Klick, ein Prefetch oder ein Crawler machte die
 * Person ohne Entscheidung zum Teammitglied.
 *
 * Die Datenbank-Seite (Lesen schreibt nichts, nur eine Wahl erzeugt
 * Mitgliedschaft, fremde/abgelaufene/widerrufene Einladungen, Idempotenz,
 * 4er-Team) pruefen die pgTAP-Tests in
 * supabase/tests/invitation_acceptance_by_decision.sql. Hier: dass kein
 * GET-Weg im Code mehr annimmt.
 */
const source = (path: string) => readFileSync(path, "utf8");
const codeOnly = (path: string) =>
  source(path)
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

const RESUME = "src/app/(product)/invite/[sessionId]/resume/route.ts";
const JOIN_START = "src/app/join/start/route.ts";
const WELCOME = "src/app/join/welcome/page.tsx";
const JOIN_CLIENT = "src/app/join/JoinClient.tsx";
const ACCEPT_RPCS = /accept_invitation(_with_team_share|_by_id_with_team_share)?["(]/;

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

test("A/B/C: \"Fortsetzen\" (resume) leitet nur weiter und schreibt nichts", () => {
  const route = codeOnly(RESUME);
  assert.ok(!/SERVICE_ROLE|createSupabaseClient|createPrivilegedClient/.test(route), "kein Service-Role-Client mehr");
  assert.ok(!/\.(update|upsert|insert|delete)\(|\.rpc\(|\.from\(/.test(route), "kein Datenbankzugriff im GET");
  assert.match(route, /NextResponse\.redirect\(new URL\(buildInvitationStartHref\(invitationId\)/);
  // Dashboard-Aufgabe, Dashboard-Einladungskarte und Verbindungen zeigen auf diesen Weg.
  assert.match(source("src/features/dashboard/founderDashboardTasks.ts"), /href: `\/invite\/\$\{encodeURIComponent\(invitation\.id\)\}\/resume`/);
  assert.match(source("src/features/connections/founderConnectionsModel.ts"), /`\/invite\/\$\{encodeURIComponent\(invitation\.id\)\}\/resume`/);
  assert.match(source("src/app/(product)/dashboard/page.tsx"), /const resumeHref = buildInvitationResumeHref\(invite\.id\)/);
});

test("A: kein Route Handler (GET/HEAD) und keine Seite nimmt eine Einladung an", () => {
  // Annahme nur aus dem Beitrittsdialog im Browser - also nie beim Rendern einer
  // Seite und nie in einem Route Handler.
  const offenders = walk("src/app")
    .filter((path) => /\.(ts|tsx)$/.test(path) && !path.includes("__tests__"))
    .filter((path) => !path.endsWith("JoinClient.tsx"))
    .filter((path) => ACCEPT_RPCS.test(codeOnly(path)));
  assert.deepEqual(offenders, [], `diese Dateien rufen eine Annahme auf: ${offenders.join(", ")}`);
});

test("/join/welcome nimmt nichts mehr an, ein Token fuehrt in den Dialog", () => {
  const welcome = codeOnly(WELCOME);
  assert.ok(!ACCEPT_RPCS.test(welcome));
  assert.match(welcome, /if \(token\) \{\s*redirect\(`\/join\?token=\$\{encodeURIComponent\(token\)\}`\);/);
});

test("/join/start fuehrt offene Einladungen in den Dialog - vor der Profilabfrage", () => {
  const start = codeOnly(JOIN_START);
  const decision = start.indexOf('rpc("get_invitation_decision_state"');
  assert.ok(decision > 0, "Zustand wird nicht gelesen");
  assert.ok(decision < start.indexOf("getProfileBasicsRow(supabase"), "Entscheidung muss vor dem Profil kommen");
  assert.match(start, /decisionState === "pending"[\s\S]*buildDecisionHref\(invitationId\)/);
  assert.match(start, /return `\/join\?invitationId=\$\{encodeURIComponent\(invitationId\)\}`/);
});

test("D/E/F: Annahme nur nach Klick auf eine der beiden Optionen, ohne Vorauswahl", () => {
  const client = codeOnly(JOIN_CLIENT);
  // Beide Annahme-RPCs stehen ausschliesslich in acceptWithChoice ...
  const handlerStart = client.indexOf("async function acceptWithChoice(");
  const handlerEnd = client.indexOf("useEffect(", handlerStart);
  const handler = client.slice(handlerStart, handlerEnd);
  assert.match(handler, /rpc\("accept_invitation_with_team_share"/);
  assert.match(handler, /rpc\("accept_invitation_by_id_with_team_share"/);
  const outside = client.slice(0, handlerStart) + client.slice(handlerEnd);
  assert.ok(!/rpc\("accept_invitation/.test(outside), "eine Annahme ausserhalb der Wahl");
  // ... und acceptWithChoice wird nur aus den beiden Knoepfen aufgerufen, mit fester Wahl.
  const calls = [...client.matchAll(/acceptWithChoice\(([^)]*)\)/g)].map((match) => match[1]);
  const fromButtons = calls.filter((args) => args.startsWith("uiState.token"));
  assert.equal(fromButtons.length, 2);
  assert.deepEqual(fromButtons.map((args) => args.trim().endsWith("true")).sort(), [false, true]);
  assert.match(client, /onClick=\{\(\) => void acceptWithChoice\(uiState\.token, uiState\.invitationId, true\)\}/);
  assert.match(client, /onClick=\{\(\) => void acceptWithChoice\(uiState\.token, uiState\.invitationId, false\)\}/);
  // Ohne Token (aus dem Konto) liest der Dialog nur den Zustand.
  const effect = client.slice(handlerEnd);
  assert.match(effect, /rpc\("get_invitation_decision_state"/);
  assert.match(effect, /token: null, invitationId: resolvedInvitationId, busy: false/);
});

test("G: abgelaufene, widerrufene und fremde Einladungen erklaeren sich im Dialog", () => {
  const client = codeOnly(JOIN_CLIENT);
  assert.match(client, /state === "expired" \|\| state === "revoked" \|\| state === "unavailable"/);
  assert.match(client, /resolveInviteError\(state === "unavailable" \? "invalid_token" : state, t\)/);
});

test("Migration: Kern intern, Wahl Pflicht, Lesefunktion ohne Schreibzugriff", () => {
  const sql = source("../supabase/migrations/20261120120000_invitation_acceptance_by_decision.sql");
  assert.match(sql, /revoke all on function public\.accept_invitation_core\(uuid\)\s*from public, anon, authenticated, service_role;/);
  assert.match(sql, /if p_share is null then raise exception 'share_choice_required'/);
  assert.match(sql, /returns text\s*language plpgsql stable security definer/);
  const state = sql.slice(sql.indexOf("function public.get_invitation_decision_state"));
  assert.ok(!/\b(insert|update|delete)\b/i.test(state.replace(/--.*$/gm, "")), "die Lesefunktion schreibt");
  // Dieselbe Sperre gegen parallele Annahme wie bisher.
  assert.match(sql, /where id = p_invitation_id\s*for update;/);
});

// ---------------------------------------------------------------------------
// Phase 12C.0b: Advisor-Einladungen
// ---------------------------------------------------------------------------
/**
 * /invite/person-access/[token] und /invite/advisor-org/[token] loesten den
 * Token beim Seitenaufruf ein: Anfragen entstanden, eine Org-Mitgliedschaft
 * wurde aktiv. Jetzt liest der Aufruf nur; eingeloest wird in einer Server
 * Action, also nur per POST aus dem Formular.
 */
const ADVISOR_PAGES = [
  { file: "src/app/(product)/invite/person-access/[token]/page.tsx", preview: "get_advisor_person_invite_preview", claim: "claim_advisor_person_invite", action: "claimAction" },
  { file: "src/app/(product)/invite/advisor-org/[token]/page.tsx", preview: "get_advisor_org_invite_preview", claim: "claim_advisor_org_invite", action: "joinAction" },
];

for (const advisorPage of ADVISOR_PAGES) {
  test(`${advisorPage.claim}: nur aus der Server Action, der Seitenaufruf liest nur`, () => {
    const page = codeOnly(advisorPage.file);
    const actionStart = page.indexOf(`async function ${advisorPage.action}()`);
    assert.ok(actionStart > 0, "die Server Action fehlt");
    const actionEnd = page.indexOf("\n  }\n", actionStart);
    const action = page.slice(actionStart, actionEnd);
    assert.match(action, /^async function \w+\(\) \{\s*"use server";/, "ohne \"use server\" liefe es beim Rendern");
    assert.match(action, new RegExp(`rpc\\("${advisorPage.claim}"`));
    const outside = page.slice(0, actionStart) + page.slice(actionEnd);
    assert.ok(!outside.includes(`rpc("${advisorPage.claim}"`), "Einloesung ausserhalb der Server Action");
    assert.match(outside, new RegExp(`rpc\\("${advisorPage.preview}"`), "der Seitenaufruf liest die Vorschau");
    // Die Action haengt an genau einem Formular-Knopf, ohne automatisches Abschicken.
    assert.equal([...page.matchAll(new RegExp(`action=\\{${advisorPage.action}\\}`, "g"))].length, 1);
    assert.ok(!/requestSubmit|\.submit\(\)|autoFocus/.test(page), "kein automatisches Abschicken");
    // Doppelt abgeschickt: Erfolg, wenn die erste Einloesung gegriffen hat.
    assert.match(action, /state === "claimed"\) redirect\(SUCCESS\)/);
  });
}

test("Advisor-Einladungen: Zustaende und Texte de/en", () => {
  for (const locale of ["de", "en"]) {
    const account = JSON.parse(source(`messages/${locale}/account.json`)) as { personAccess: { invitePage: Record<string, string> } };
    const advisor = JSON.parse(source(`messages/${locale}/advisor.json`)) as { org: { invitePage: Record<string, string> } };
    const invite = JSON.parse(source(`messages/${locale}/invite.json`)) as { join: Record<string, string> };
    for (const key of ["title", "intro", "accept", "notNow", "expired", "revoked", "unverified", "self", "whatHappens"]) {
      assert.ok(account.personAccess.invitePage[key], `${locale}: personAccess.invitePage.${key}`);
    }
    for (const key of ["title", "intro", "introNoInviter", "accept", "notNow", "expired", "revoked", "unverified", "meaningTitle"]) {
      assert.ok(advisor.org.invitePage[key], `${locale}: org.invitePage.${key}`);
    }
    assert.ok(invite.join.unverifiedTitle && invite.join.unverifiedDescription, `${locale}: join.unverified*`);
  }
  assert.match(codeOnly(JOIN_CLIENT), /state === "unverified"/);
});

test("Migration 12C.0b: bestaetigte Adresse fuer jede Annahme, keine stille Herabstufung", () => {
  const sql = source("../supabase/migrations/20261120130000_advisor_invite_consent.sql");
  assert.match(sql, /email_confirmed_at is not null/);
  for (const fn of ["accept_invitation_core", "claim_advisor_person_invite", "claim_advisor_org_invite"]) {
    const body = sql.slice(sql.indexOf(`function public.${fn}(`));
    assert.match(body.slice(0, body.indexOf("$$;")), /not public\.current_user_email_verified\(\)[\s\S]*email_not_verified/, `${fn} prueft die Adresse nicht`);
  }
  assert.match(sql, /when public\.advisor_org_members\.status = 'active' and public\.advisor_org_members\.role = 'owner' then 'owner'/);
  for (const fn of ["get_advisor_person_invite_preview", "get_advisor_org_invite_preview"]) {
    const body = sql.slice(sql.indexOf(`function public.${fn}(`));
    const fnBody = body.slice(0, body.indexOf("$$;", body.indexOf("$$") + 2));
    assert.match(fnBody, /stable security definer/);
    assert.ok(!/\b(insert|update|delete)\b/i.test(fnBody.replace(/--.*$/gm, "")), `${fn} schreibt`);
  }
});
