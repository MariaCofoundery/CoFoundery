import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  isActiveReviewState,
  parseTeamReviewState,
  personAccessView,
  teamAccessView,
} from "@/features/access/accessStateModel";
import { buildLoginRedirectPath } from "@/features/auth/loginRedirect";
import { orgErrorCode, readOrgErrorCode } from "@/features/advisor/orgErrors";
import {
  isAdvisorTeamInviteSlotOwner,
  needsAdvisorTeamInviteRecovery,
} from "@/features/dashboard/advisorTeamInviteRecovery";

/**
 * Phase 12C.1C: Fehlerzustaende, Navigation und Wiederholungswege.
 * Die Buchstaben folgen den Testfaellen A-S der Phasenbeschreibung.
 */

const read = (path: string) => readFileSync(path, "utf8");
const messages = (locale: string, file: string) =>
  JSON.parse(read(`messages/${locale}/${file}.json`)) as Record<string, unknown>;
const pick = (object: unknown, path: string) =>
  path.split(".").reduce<unknown>((value, key) => (value as Record<string, unknown> | undefined)?.[key], object);

const TEAM_DIR = "src/app/(product)/teams/[teamId]";
function pagesUnder(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) return pagesUnder(path);
    return entry === "page.tsx" ? [path] : [];
  });
}

// ---------------------------------------------------------------------------
// A) Echte unbekannte URL -> eigene, uebersetzte Seite
// ---------------------------------------------------------------------------
test("A: eigene not-found- und error-Seite, uebersetzt und mit Rueckweg", () => {
  const notFound = read("src/app/not-found.tsx");
  assert.match(notFound, /getTranslations\("common\.access\.notFound"\)/);
  assert.match(notFound, /href: "\/"/);
  assert.match(notFound, /href: "\/connections"/);
  const error = read("src/app/error.tsx");
  assert.match(error, /^"use client";/);
  assert.match(error, /useTranslations\("common\.access\.error"\)/);
  assert.match(error, /onClick=\{\(\) => reset\(\)\}/);
  // Keine technischen Details auf der Seite.
  assert.doesNotMatch(error, /\{error\.message\}|\{error\.digest\}/);
  for (const locale of ["de", "en"]) {
    const common = messages(locale, "common");
    for (const key of ["notFound.title", "notFound.home", "notFound.connections", "error.title", "error.retry"]) {
      assert.ok(pick(common, `access.${key}`), `${locale}: access.${key}`);
    }
  }
  assert.equal(pick(messages("de", "common"), "access.notFound.title"), "Diese Seite ist nicht mehr verfügbar.");
  assert.equal(pick(messages("de", "common"), "access.notFound.home"), "Zur Startseite");
  assert.equal(pick(messages("de", "common"), "access.notFound.connections"), "Zu Teams & Verbindungen");
});

// ---------------------------------------------------------------------------
// B-G) Zustandsmodell: nur verlorene Zugaenge werden erklaert
// ---------------------------------------------------------------------------
test("B/C: Austritt und Archiv fuehren zu Teams & Verbindungen; nie Zugang bleibt 404", () => {
  assert.deepEqual(teamAccessView("left"), { messageKey: "left", links: ["connections"] });
  assert.deepEqual(teamAccessView("archived"), { messageKey: "archived", links: ["connections"] });
  for (const state of ["member", "readable", "none", "anything", null, undefined, 3]) {
    assert.equal(teamAccessView(state), null, String(state));
  }
});

test("D-G: Advisor-Zustaende fuehren in den Advisor-Bereich", () => {
  assert.deepEqual(teamAccessView("roster_changed"), { messageKey: "rosterChanged", links: ["people", "advisor"] });
  assert.equal(teamAccessView("team_inactive")?.messageKey, "archived");
  assert.deepEqual(teamAccessView("team_inactive")?.links, ["advisor"]);
  assert.equal(teamAccessView("org_membership_ended")?.messageKey, "orgMembershipEnded");
  assert.equal(teamAccessView("org_suspended")?.messageKey, "orgSuspended");
  assert.equal(teamAccessView("access_ended")?.messageKey, "accessEnded");
  assert.equal(teamAccessView("review_ended")?.messageKey, "reviewEnded");
  assert.equal(personAccessView("ended")?.messageKey, "ended");
  assert.equal(personAccessView("pending")?.messageKey, "pending");
  assert.equal(personAccessView("org_membership_ended")?.messageKey, "orgMembershipEnded");
  assert.equal(personAccessView("org_suspended")?.messageKey, "orgSuspended");
  assert.equal(personAccessView("active"), null);
  assert.equal(personAccessView("none"), null);
});

test("B-E: jede Teamseite erklaert verlorene Zugaenge an der Stelle, an der sie das Team nicht lesen kann", () => {
  const pages = pagesUnder(TEAM_DIR);
  assert.ok(pages.length >= 16);
  for (const page of pages) {
    const source = read(page);
    assert.match(source, /<TeamUnavailable teamId=\{teamId\} \/>/, page);
    // Kein notFound mehr im Mitgliedschaftszweig.
    assert.doesNotMatch(source, /if \(!(team|setup|lab|current)\) notFound\(\)/, page);
  }
  const gate = read("src/features/access/TeamUnavailable.tsx");
  // Statusauskunft aus der Datenbank, sonst echte 404.
  assert.match(gate, /rpc\("get_team_access_state", \{ p_team_id: teamId \}\)/);
  assert.match(gate, /if \(!view\) notFound\(\);/);
  // Statusinformation ist kein Datenzugriff: der Baustein laedt keine Teamdaten.
  assert.doesNotMatch(gate, /founder_team_members|get_workstyle|getFounderTeamHomebase|getFounderSetup/);
});

test("Texte nennen keine Personen und keine Technik", () => {
  for (const locale of ["de", "en"]) {
    // Nur die Texte, nicht die Schluessel (ein Schluessel darf "rosterChanged" heissen).
    const values = (value: unknown): string[] =>
      typeof value === "string" ? [value] : Object.values((value ?? {}) as Record<string, unknown>).flatMap(values);
    const texts = values([
      pick(messages(locale, "common"), "access"),
      pick(messages(locale, "advisor"), "access"),
      pick(messages(locale, "advisor"), "review.teamContext"),
      pick(messages(locale, "advisor"), "org.errors"),
    ]).join("\n");
    // Wer widerrufen hat, steht nirgends - es gibt keinen Namensplatzhalter.
    assert.doesNotMatch(texts, /\{name\}|\{names\}|\{person\}/, locale);
    assert.doesNotMatch(texts, /roster|authori[sz]ation|supabase|rls|404|error code|uuid/i, locale);
  }
  const de = messages("de", "common");
  assert.equal(pick(de, "access.team.left.title"), "Du gehörst diesem Team nicht mehr an.");
  assert.equal(pick(de, "access.team.archived.title"), "Dieses Team ist nicht mehr aktiv.");
  assert.equal(pick(de, "access.team.rosterChanged.title"), "Die Teamzusammensetzung hat sich verändert.");
  assert.equal(pick(de, "access.team.reviewEnded.title"), "Der gemeinsame Bericht ist aktuell nicht verfügbar.");
});

// ---------------------------------------------------------------------------
// D/E/H/J) Advisor-Seiten
// ---------------------------------------------------------------------------
test("E/F: Personenseite erklaert beendete Zugaenge ohne Inhalte, sonst 404", () => {
  const page = read("src/app/(product)/advisor/person/[userId]/page.tsx");
  const branch = page.slice(page.indexOf("grantedScopes.length === 0 || accessState !== \"active\")"), page.indexOf("const [t, tCapability"));
  // Der wirksame Zugang entscheidet (ausgesetzte Organisation, beendete Mitgliedschaft).
  assert.ok(page.indexOf("get_advisor_person_access_state") < page.indexOf("grantedScopes.length === 0 || accessState"));
  assert.match(branch, /if \(!stateView\) notFound\(\);/);
  assert.match(branch, /<AccessStatePanel/);
  // Rueckweg zu Personen & Gruppen statt zum Org-Anker.
  assert.match(page, /href="\/advisor\/group"/);
  assert.doesNotMatch(page, /href="\/advisor\/dashboard#advisor-org"/);
});

test("H/J: Review-Seite zeigt ihren Zustand und nur das eigene Team", () => {
  const page = read("src/app/(product)/advisor/review/[reviewId]/page.tsx");
  assert.match(page, /rpc\("get_advisor_team_review_state", \{ p_review_id: reviewId \}\)/);
  assert.match(page, /<AdvisorReviewUnavailable state=\{reviewState\} \/>/);
  // J: Keine Liste aller lesbaren Teams mehr - nur der eine gebundene.
  assert.doesNotMatch(page, /Freigegebene Founder-Teams|Euer Zusammenspiel/);
  assert.match(page, /team\.team_id === reviewState\.teamId/);
  assert.match(page, /reviewState\.state === "active_with_team"/);
  assert.doesNotMatch(page, /notFound\(\)/);

  const state = read("src/features/advisor/AdvisorReviewState.tsx");
  // H: aktiv ohne Teambezug -> erklaeren und den bestehenden Anfrageweg anbieten.
  assert.match(state, /t\("withoutTeam"\)/);
  assert.match(state, /\/advisor\/group\?\$\{subjectUserIds/);
  assert.match(state, /state\.state === "active_without_team" \|\| state\.state === "active_team_changed"/);
  // Aktiv, aber ohne Inhalt, oder nie Advisor: echte 404.
  assert.match(state, /if \(!key\) notFound\(\);/);

  assert.deepEqual(parseTeamReviewState({ state: "active_with_team", team_id: "t" }), { state: "active_with_team", teamId: "t" });
  assert.deepEqual(parseTeamReviewState({ state: "active_with_team" }), { state: "none" });
  assert.deepEqual(parseTeamReviewState({ state: "active_without_team" }), { state: "active_without_team" });
  assert.deepEqual(parseTeamReviewState({ state: "made_up" }), { state: "none" });
  assert.deepEqual(parseTeamReviewState(null), { state: "none" });
  assert.equal(isActiveReviewState({ state: "active_team_changed" }), true);
  assert.equal(isActiveReviewState({ state: "ended" }), false);
});

test("I: Advisors sehen im Teambericht keinen Fragebogen-CTA", () => {
  const report = read("src/features/reporting/workstyle/TeamWorkstyleReport.tsx");
  const cta = report.indexOf("Zum Fragebogen");
  assert.ok(cta > 0);
  const guard = report.lastIndexOf("{canDiscuss ? (", cta);
  assert.ok(guard > 0 && cta - guard < 400, "CTA steht hinter canDiscuss");
  // Die Seite gibt canDiscuss nur Mitgliedern.
  assert.match(read(`${TEAM_DIR}/workstyle/page.tsx`), /canDiscuss=\{Boolean\(membership\)\}/);
});

// ---------------------------------------------------------------------------
// K/L/M) Login-Kontext
// ---------------------------------------------------------------------------
test("K/L: Login behaelt venture, snapshot und ansicht", () => {
  assert.equal(
    buildLoginRedirectPath("/founder-alignment/vorhaben", { venture: "abc" }),
    `/login?next=${encodeURIComponent("/founder-alignment/vorhaben?venture=abc")}`
  );
  assert.equal(
    buildLoginRedirectPath("/teams/t1/workstyle", { snapshot: "s1", ansicht: "ausfuehrlich" }),
    `/login?next=${encodeURIComponent("/teams/t1/workstyle?snapshot=s1&ansicht=ausfuehrlich")}`
  );
  assert.equal(buildLoginRedirectPath("/dashboard", { venture: undefined, empty: " " }), "/login?next=%2Fdashboard");
  assert.equal(
    buildLoginRedirectPath("/advisor/group", { p: ["a", "b"] }),
    `/login?next=${encodeURIComponent("/advisor/group?p=a&p=b")}`
  );

  assert.match(read(`${TEAM_DIR}/workstyle/page.tsx`), /buildLoginRedirectPath\(`\/teams\/\$\{teamId\}\/workstyle`, \{ snapshot: query\.snapshot, ansicht: query\.ansicht \}\)/);
  for (const page of ["vorhaben", "vorhaben/antworten", "vorhaben/bestaetigen"]) {
    assert.match(read(`src/app/(product)/founder-alignment/${page}/page.tsx`), /buildLoginRedirectPath\("\/founder-alignment\/vorhaben[a-z/]*", \{ venture: \(await searchParams\)\.venture \}\)/, page);
  }
  assert.match(read("src/app/me/profile/print/page.tsx"), /buildLoginRedirectPath\("\/me\/profile\/print", await searchParams\)/);
  assert.match(read("src/app/(product)/dashboard/page.tsx"), /buildLoginRedirectPath\("\/dashboard", params/);
  assert.match(read("src/app/(product)/advisor/dashboard/page.tsx"), /buildLoginRedirectPath\("\/advisor\/dashboard"\)/);
  assert.match(read("src/features/reporting/workstyle/actions.ts"), /redirect\(buildLoginRedirectPath\(path\)\)/);
  for (const page of ["src/app/(product)/dashboard/page.tsx", "src/app/(product)/advisor/dashboard/page.tsx"]) {
    assert.doesNotMatch(read(page), /redirect\("\/login"\)/, page);
  }
});

test("M: next erzeugt nie eine externe Weiterleitung", () => {
  for (const evil of ["https://evil.example", "//evil.example", "/\\evil.example", "/%2F%2Fevil.example", "javascript:alert(1)"]) {
    assert.equal(buildLoginRedirectPath(evil), "/login?next=%2Fdashboard", evil);
  }
  // Ein Query-Wert bleibt ein Wert im internen Pfad - er wird nie zur Adresse.
  const next = decodeURIComponent(buildLoginRedirectPath("/dashboard", { invitationId: "//evil.example" }).slice("/login?next=".length));
  assert.ok(next.startsWith("/dashboard?"), next);
  assert.equal(new URL(next, "https://app.invalid").origin, "https://app.invalid");
});

// ---------------------------------------------------------------------------
// N/O) Organisation
// ---------------------------------------------------------------------------
test("N: Org-Mitgliederliste zeigt Namen und Rollen aus einer eigenen Funktion", () => {
  const data = read("src/features/advisor/orgData.ts");
  assert.match(data, /rpc\("get_advisor_org_member_list", \{ p_org_id: orgId \}\)/);
  assert.match(data, /displayName: row\.display_name/);
  const section = read("src/features/advisor/AdvisorOrgSection.tsx");
  assert.match(section, /member\.displayName \?\? t\("unnamed"\)/);
  assert.match(section, /member\.isSelf \? ` \(\$\{t\("you"\)\}\)` : ""/);
  assert.match(section, /t\(`roles\.\$\{member\.role\}`\)/);
  // Sich selbst entfernt man ueber "Organisation verlassen", nicht per Knopf in der Liste.
  assert.match(section, /member\.status === "active" && !member\.isSelf/);
});

test("O: Org-Fehler sind sichtbar, verstaendlich und nie Datenbanktext", () => {
  assert.equal(orgErrorCode("advisor_org_needs_an_owner"), "org_last_owner");
  assert.equal(orgErrorCode("advisor_org_not_a_member"), "org_not_member");
  assert.equal(orgErrorCode("advisor_org_not_yours"), "org_forbidden");
  assert.equal(orgErrorCode("advisor_org_owner_required"), "org_forbidden");
  assert.equal(orgErrorCode("connection reset"), "org_failed");
  assert.equal(orgErrorCode(null), "org_failed");
  assert.equal(readOrgErrorCode("org_last_owner"), "org_last_owner");
  assert.equal(readOrgErrorCode("<script>"), "org_failed");
  assert.equal(readOrgErrorCode(undefined), null);

  const actions = read("src/features/advisor/orgActions.ts");
  assert.match(actions, /\?orgError=/);
  assert.match(actions, /back\(orgErrorCode\(error\.message\)\)/);
  assert.match(actions, /back\("org_suspended"\)/);
  assert.doesNotMatch(actions, /back\(error\.message\)/);
  const section = read("src/features/advisor/AdvisorOrgSection.tsx");
  assert.match(section, /t\(`errors\.\$\{error\}`\)/);
  assert.match(section, /org\.status === "suspended"/);
  assert.match(read("src/app/(product)/advisor/dashboard/page.tsx"), /readOrgErrorCode\(/);
  for (const locale of ["de", "en"]) {
    for (const code of ["org_last_owner", "org_not_member", "org_forbidden", "org_suspended", "org_failed"]) {
      assert.ok(pick(messages(locale, "advisor"), `org.errors.${code}`), `${locale}: ${code}`);
    }
  }
});

// ---------------------------------------------------------------------------
// P/Q) Advisor-Team-Einladung: Wiederholungsweg, Seitenaufruf schreibt nichts
// ---------------------------------------------------------------------------
test("P: Wiederholungsweg nur fuer die Person, die den Slot beansprucht hat", () => {
  const base = {
    status: "pending",
    founder_a_email: "a@example.test",
    founder_b_email: "b@example.test",
    founder_a_user_id: "ua",
    founder_b_user_id: "ub",
    invitation_id: "inv",
  };
  const a = { userId: "ua", email: "A@example.test" };
  // Beide beansprucht, nicht aktiviert -> Wiederholung.
  assert.equal(needsAdvisorTeamInviteRecovery(base, "founderA", a), true);
  // Erster Abschluss gescheitert (keine Founder-Einladung) -> Wiederholung.
  assert.equal(needsAdvisorTeamInviteRecovery({ ...base, founder_b_user_id: null, invitation_id: null }, "founderA", a), true);
  // Nur die andere Person fehlt noch -> nichts zu reparieren.
  assert.equal(needsAdvisorTeamInviteRecovery({ ...base, founder_b_user_id: null }, "founderA", a), false);
  // Abgeschlossen, widerrufen, abgelaufen -> nie.
  for (const status of ["activated", "revoked", "expired"]) {
    assert.equal(needsAdvisorTeamInviteRecovery({ ...base, status }, "founderA", a), false, status);
  }
  // Token allein genuegt nicht: andere Kennung oder andere Adresse.
  assert.equal(needsAdvisorTeamInviteRecovery(base, "founderA", { userId: "ub", email: "a@example.test" }), false);
  assert.equal(needsAdvisorTeamInviteRecovery(base, "founderA", { userId: "ua", email: "x@example.test" }), false);
  assert.equal(needsAdvisorTeamInviteRecovery(base, "founderA", { userId: null, email: null }), false);
  assert.equal(isAdvisorTeamInviteSlotOwner(base, "founderB", { userId: "ub", email: "b@example.test" }), true);

  const data = read("src/features/dashboard/advisorTeamInviteData.ts");
  const recover = data.slice(data.indexOf("export async function recoverAdvisorTeamInviteFounder"));
  assert.match(recover, /needsAdvisorTeamInviteRecovery\(lookup\.row, lookup\.founderSlot/);
  assert.match(recover, /finalizeAdvisorTeamInviteCompletely\(lookup\.row, privileged\)/);
  // Keine neue Zustimmung, keine erzwungene Annahme, keine Mitgliedschaft.
  assert.doesNotMatch(recover, /ensure_invitation_accepted|accept_invitation|founder_team_members/);
});

test("Q: Seitenaufruf der Team-Einladung bleibt schreibfrei", () => {
  const page = read("src/app/team-invite/[token]/page.tsx");
  assert.doesNotMatch(page, /import[^;]*finalizeAdvisorTeamInvite|finalizeAdvisorTeamInvite\w*\(/);
  // Geschrieben wird nur in den ausdruecklichen Server-Aktionen (POST).
  const renderPath = page.replace(/async function (claimAction|recoverAction)\(\) \{[\s\S]*?\n  \}\n/g, "");
  assert.doesNotMatch(renderPath, /ActionAction\(|recoverAdvisorTeamInviteFounderAction\(|claimAdvisorTeamInviteFounderAction\(/);
  assert.match(page, /<form action=\{recoverAction\}/);
  // Die Wiederholung wird vor der Weiterleitung geprueft - sonst waere sie unerreichbar.
  assert.ok(page.indexOf("needsAdvisorTeamInviteRecovery(row") < page.indexOf("redirect(questionnaireHref)"));
  assert.match(page, /if \(!needsRecovery && invitationReadyForCurrentSlot && questionnaireHref\)/);
  // "Zur Anmeldung" nur fuer Abgemeldete.
  assert.match(page, /viewer \? \(\s*<Link href="\/dashboard"/);
});

// ---------------------------------------------------------------------------
// R) Leere Zustaende mit naechster Aktion
// ---------------------------------------------------------------------------
test("R: leere Zustaende bieten einen passenden naechsten Schritt", () => {
  const inbox = read("src/app/(product)/messages/page.tsx");
  assert.match(inbox, /href="\/discovery"[\s\S]*inboxEmptyFind/);
  assert.match(inbox, /href="\/connect"[\s\S]*inboxEmptyConnect/);
  // Nur Bereiche, die die Person betreten kann.
  assert.match(inbox, /find: hasProfileRole\(profile\?\.roles, "founder"\)/);
  assert.match(inbox, /connect: connect\.data === true/);

  const connections = read("src/app/(product)/connections/page.tsx");
  assert.match(connections, /href="\/invite\/new"[\s\S]*established\.emptyCta/);
  assert.match(connections, /href="\/discovery"[\s\S]*potential\.emptyCta/);
  assert.match(read("src/app/(product)/discovery/page.tsx"), /href="\/discovery\/profile"[\s\S]*v2\.results\.inactiveCta/);
  const intros = read("src/app/(product)/discovery/intros/page.tsx");
  assert.match(intros, /intros\.receivedEmptyCta/);
  assert.match(intros, /intros\.sentEmptyCta/);
  assert.match(read("src/app/(product)/advisor/group/page.tsx"), /href="\/advisor\/dashboard#person-invites"[\s\S]*nobodyCta/);
  assert.match(read("src/features/advisor/PersonInviteSection.tsx"), /id="person-invites"/);
});

// ---------------------------------------------------------------------------
// Weitere Navigation und S) Legacy bleibt
// ---------------------------------------------------------------------------
test("Navigation: konkrete Ziele statt allgemeiner Listen", () => {
  assert.match(read("src/app/(product)/connections/page.tsx"), /href=\{`\/teams\/\$\{encodeURIComponent\(team\.id\)\}`\}/);
  assert.match(read("src/app/me/profile/page.tsx"), /\/founder-alignment\/vorhaben\?venture=\$\{encodeURIComponent\(venture\.id\)\}/);
  assert.match(read("src/app/(product)/founder-alignment/vorhaben/page.tsx"), /state=\{navState\} teamId=\{venture\.id\}/);
  const vorhaben = read("src/app/(product)/founder-alignment/vorhaben/page.tsx");
  assert.match(vorhaben, /if \(gewaehlt && \(await loadTeamAccessView\(gewaehlt\)\)\)/);
  assert.match(read("src/app/(product)/invite/new/page.tsx"), /targetTeam \? `\/teams\/\$\{encodeURIComponent\(targetTeam\.id\)\}` : "\/dashboard"/);
  assert.match(read(`${TEAM_DIR}/collaboration-lab/founder-in-the-wild/page.tsx`), /#founder-in-the-wild/);
  assert.match(read("src/features/founderInTheWild/FounderInTheWildHomebaseCard.tsx"), /id="founder-in-the-wild"/);
  for (const page of ["profile", "searches"]) {
    assert.match(read(`src/app/(product)/connect/${page}/page.tsx`), /href="\/connect\/my"/, page);
  }
  // Founder bekommen auf /team-intake keinen Advisor-Knopf.
  assert.match(read("src/app/(product)/team-intake/page.tsx"), /hasAdvisor \? \(\s*<Link[\s\S]*?href="\/advisor\/intake\/new"/);
  // Einladungsgruende statt "bitte erneut versuchen".
  assert.match(read("src/app/(product)/dashboard/page.tsx"), /hero\.invitationErrors\.\$\{params\.error\}/);
});

test("S: legitime Legacy-Links und der Rueckweg aus 12C.1A bleiben", () => {
  // Der tote Link "/advisor" ist seit 12C.1A weg und bleibt weg.
  const workstyle = read(`${TEAM_DIR}/workstyle/page.tsx`);
  assert.match(workstyle, /href="\/advisor\/dashboard"/);
  assert.doesNotMatch(workstyle, /href="\/advisor"/);
  // Eingeklappte Historienlinks auf der Teamseite bleiben erreichbar.
  assert.match(read(`${TEAM_DIR}/page.tsx`), /<Link href=\{entry\.matchingReport\.href\}/);
  // Die Advisor-Bruecken bleiben verlinkt (Cleanup erst in 12I).
  const targets = read("src/features/reporting/advisorTeamTargets.ts");
  assert.match(targets, /`\/advisor\/report\?/);
  assert.match(targets, /`\/advisor\/snapshot\?/);
  assert.ok(existsSync("src/app/(product)/advisor/snapshot/page.tsx"));
});

test("Texte: neue Schluessel in DE und EN", () => {
  const keys: Array<[string, string]> = [
    ["common", "access.team.toConnections"],
    ["advisor", "access.person.ended.title"],
    ["advisor", "access.review.ended.title"],
    ["advisor", "review.teamContext.withoutTeam"],
    ["advisor", "review.teamContext.requestNew"],
    ["advisor", "org.suspended"],
    ["advisor", "group.nobodyCta"],
    ["advisor", "invite.toStart"],
    ["invite", "teamInvite.recoveryCta"],
    ["invite", "teamInvite.statusErrors.recoveryFailed"],
    ["connect", "messages.inboxEmptyFind"],
    ["connect", "mine.back"],
    ["teams", "connections.established.emptyCta"],
    ["discovery", "v2.results.inactiveCta"],
    ["dashboard", "hero.invitationErrors.revoked"],
    ["dashboard", "coFounderInvitePage.backToTeam"],
  ];
  for (const locale of ["de", "en"]) {
    for (const [file, key] of keys) {
      assert.equal(typeof pick(messages(locale, file), key), "string", `${locale}/${file}: ${key}`);
    }
  }
});

test("Migration: Statusauskunft ist additiv und lokal dokumentiert", () => {
  const sql = read("../supabase/migrations/20261123120000_access_state_recovery.sql");
  for (const fn of ["get_team_access_state", "get_advisor_team_review_state", "get_advisor_person_access_state", "get_advisor_org_member_list"]) {
    assert.match(sql, new RegExp(`revoke all on function public\\.${fn}\\(uuid\\) from public, anon;`), fn);
    assert.match(sql, new RegExp(`grant execute on function public\\.${fn}\\(uuid\\) to authenticated;`), fn);
  }
  assert.match(sql, /revoke all on public\.founder_team_member_exits from public, anon, authenticated;/);
  // Keine bestehende Zugriffsregel wird umgeschrieben.
  assert.doesNotMatch(sql, /create or replace function public\.(can_read_workstyle_team|has_advisor_person_access|has_advisor_team_review_access|leave_founder_team)\(/);
  assert.doesNotMatch(sql, /\bdrop table\b|\bdelete from\b/i);
});
