import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync("src/app/(product)/advisor/organisation/page.tsx", "utf8");

test("die Organisationsseite hat vier Reiter und waehlt zwischen mehreren Organisationen", () => {
  assert.match(page, /\["overview", "teams", "people", "access", "members", "program", "plan", "page", "profile"\]/);
  assert.match(page, /orgs\.find\(\(entry\) => entry\.id === query\.org\) \?\? orgs\[0\]/);
  assert.match(page, /orgs\.length > 1/);
});

test("die Seite zeigt Zaehler und Plaetze - keine Gesamtwertung, keine Rangfolge", () => {
  assert.match(page, /countOrgSeatsUsed\(/);
  assert.doesNotMatch(page, /score|rank|percent|compatib/i);
  // Teams kommen aus dem, was diese Person ohnehin sehen darf.
  assert.match(page, /getAdvisorDashboardTeams\(user\.id\)/);
});

test("Aktionen der Organisation kehren in den Reiter Mitglieder und Einstellungen zurueck", () => {
  const actions = readFileSync("src/features/advisor/orgActions.ts", "utf8");
  assert.match(actions, /const TAB = "tab=members"/);
  assert.match(page, /tab === "members" \? <AdvisorOrgSection/);
  assert.match(page, /tab === "profile" \? <AdvisorOrgSection/);
  assert.match(page, /<OrgTeamProgramsSection/);
});

test("Team-Programm: Zustimmung und Einloesen laufen nur ueber die Datenbankfunktionen, der Link steht nur einmal da", () => {
  const actions = readFileSync("src/features/advisor/teamProgramActions.ts", "utf8");
  for (const rpc of ["create_team_program_invite", "start_team_program", "consent_team_program", "end_team_program", "set_team_program_contacts"]) {
    assert.match(actions, new RegExp(`rpc\\("${rpc}"`));
  }
  assert.match(actions, /createHash\("sha256"\)/);
  const section = readFileSync("src/features/advisor/OrgTeamProgramsSection.tsx", "utf8");
  assert.match(section, /inviteShownOnce/);
  assert.match(section, /\[0-9a-f\]\{48\}/);
});

test("Meilensteine: Fortschritt ist eine Zahl gegen das eigene Ziel, die Rueckkehr ist begrenzt, es gibt keine Wertung", () => {
  const actions = readFileSync("src/features/advisor/teamProgramActions.ts", "utf8");
  assert.match(actions, /rpc\("save_team_program_milestone"/);
  assert.match(actions, /safeReturn/);
  const ui = readFileSync("src/features/advisor/ProgramMilestones.tsx", "utf8");
  assert.match(ui, /msProgress/);
  assert.doesNotMatch(ui, /score|rank|compatib|ampel|traffic/i);
  const sql = readFileSync("../supabase/migrations/20270118120000_team_program_milestones.sql", "utf8");
  assert.match(sql, /can_use_team_program/);
  assert.match(sql, /team_program_is_active\(p_program_id\)/);
});

test("Programm-Updates: Hinweis im Postfach plus Mitteilung und Mail nach Zustimmung, ein Lauf im taeglichen Cron, nur Team antwortet", () => {
  const route = readFileSync("src/app/api/cron/connect-suggestions/route.ts", "utf8");
  assert.match(route, /runProgramUpdateReminders\(\)/);
  const run = readFileSync("src/features/advisor/programUpdateReminders.ts", "utf8");
  assert.match(run, /prepare_program_update_reminders/);
  assert.match(run, /wants_email/);
  assert.match(run, /sendNetworkNotificationEmail/);
  const sql = readFileSync("../supabase/migrations/20270119120000_team_program_updates.sql", "utf8");
  assert.match(sql, /'program_update_due'/);
  assert.match(sql, /grant execute on function public\.prepare_program_update_reminders\(integer\) to service_role/);
  const notify = readFileSync("../supabase/migrations/20270120120000_program_update_notifications.sql", "utf8");
  assert.match(notify, /'program_update_email'/);
  assert.match(notify, /wants_email_channel/);
});

test("Programmprofil: nur das Team schreibt, Ende des Programms loescht alles Eingetragene", () => {
  const sql = readFileSync("../supabase/migrations/20270121120000_team_program_profile.sql", "utf8");
  assert.match(sql, /delete from public\.team_program_profiles where program_id = p_program_id/);
  assert.match(sql, /delete from public\.team_program_milestones where program_id = p_program_id/);
  assert.match(sql, /delete from public\.team_program_updates where program_id = p_program_id/);
  const actions = readFileSync("src/features/advisor/teamProgramActions.ts", "utf8");
  assert.match(actions, /rpc\("save_team_program_profile"/);
});

test("Programm-Dashboard: Zaehler und Filter, alphabetisch, keine Wertung", () => {
  const ui = readFileSync("src/features/advisor/OrgProgramOverview.tsx", "utf8");
  assert.match(ui, /dashAlumni/);
  assert.doesNotMatch(ui, /score|rank|percent|compatib|ampel|traffic|sort\([^)]*(done|approved)/i);
  const sql = readFileSync("../supabase/migrations/20270123120000_team_program_batch_category.sql", "utf8");
  assert.match(sql, /can_manage_team_program/);
});

test("Programm-Hinweis: die Organisation wird beim Anzeigen gelesen, nicht in der Zeile gespeichert", () => {
  const data = readFileSync("src/features/notifications/inAppNoticeData.ts", "utf8");
  assert.match(data, /get_my_team_programs/);
  const sql = readFileSync("../supabase/migrations/20270124120000_program_invited_notice.sql", "utf8");
  assert.match(sql, /'program_invited'/);
  assert.match(sql, /m\.user_id <> v_user/);
});

test("Freigaben-Uebersicht: nur Staende, keine Gesamtzahl, nicht freigegeben ist eine gueltige Antwort", () => {
  const ui = readFileSync("src/features/advisor/ProgramAccess.tsx", "utf8");
  assert.match(ui, /accessNoneRight/);
  assert.doesNotMatch(ui, /score|rank|percent|compatib|ampel|traffic/i);
  const sql = readFileSync("../supabase/migrations/20270125120000_program_access_overview.sql", "utf8");
  assert.match(sql, /team_access_ended_at is null/);
  assert.match(sql, /team_program_is_active\(p\.id\)/);
});

test("Anfrage pro Team ist keine Freigabe: dieselbe Review-Anfrage, das Team entscheidet selbst", () => {
  const sql = readFileSync("../supabase/migrations/20270126120000_program_team_review_request.sql", "utf8");
  assert.match(sql, /insert into public\.advisor_team_reviews/);
  assert.match(sql, /insert into public\.advisor_team_review_members/);
  assert.doesNotMatch(sql, /status\s*=\s*'active'[\s\S]{0,40}insert into public\.advisor_team_reviews/);
  assert.match(sql, /can_manage_team_program/);
  const actions = readFileSync("src/features/advisor/teamProgramActions.ts", "utf8");
  assert.match(actions, /rpc\("request_program_team_review"/);
});

test("Einladung per Mail: Adresse wird nicht gespeichert, Link bleibt ein Hash, offene Einladungen sind begrenzt", () => {
  const actions = readFileSync("src/features/advisor/teamProgramActions.ts", "utf8");
  assert.match(actions, /sendTeamProgramInviteEmail/);
  assert.doesNotMatch(actions, /p_email|invitee_email/);
  const sql = readFileSync("../supabase/migrations/20270127120000_team_program_invite_cap.sql", "utf8");
  assert.match(sql, />= 25/);
  const mail = readFileSync("src/lib/email/sendTeamProgramInviteEmail.ts", "utf8");
  assert.match(mail, /nirgends gespeichert/);
});

test("Programmcode: begrenzt, sperrbar, Fehlversuche gezaehlt, das Team stimmt weiter selbst zu", () => {
  const sql = readFileSync("../supabase/migrations/20270128120000_team_program_codes.sql", "utf8");
  assert.match(sql, /max_uses/);
  assert.match(sql, /team_program_code_may_try/);
  assert.match(sql, /team_program_try_activate\(v_program\)/);
  assert.match(sql, /status = 'revoked'/);
  const actions = readFileSync("src/features/advisor/teamProgramActions.ts", "utf8");
  assert.match(actions, /rpc\("start_team_program_by_code"/);
  assert.match(actions, /CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"/);
});

test("Advisor-Optik: ein gemeinsamer dunkler Kopf, die Startseite zeigt Programm-Fristen und Updates ohne Wertung", () => {
  const header = readFileSync("src/features/advisor/AdvisorPageHeader.tsx", "utf8");
  assert.match(header, /advisor-hero/);
  const css = readFileSync("src/app/globals.css", "utf8");
  assert.match(css, /\.advisor-hero \{/);
  assert.match(css, /@media print \{\s*\.advisor-hero/);
  const start = readFileSync("src/app/(product)/advisor/dashboard/page.tsx", "utf8");
  assert.match(start, /getOrgMilestoneDeadlines/);
  assert.match(start, /getProgramUpdateDue/);
  assert.doesNotMatch(start, /score|rank|percent|compatib/i);
});

test("Einladen: erst die Wahl zwischen drei Wegen, dann genau ein Formular; Rueckmeldungen fuehren in die Personen-Ansicht", () => {
  const page = readFileSync("src/app/(product)/advisor/einladen/page.tsx", "utf8");
  assert.match(page, /const WAYS = \["person", "round", "program"\]/);
  assert.match(page, /query\.error \|\| query\.notice \? "person"/);
  assert.match(page, /art === "person" \? <PersonInviteSection/);
  assert.match(page, /art === "team" \?/);
  // Teams ins Programm laedt nur der Inhaber ein.
  assert.match(page, /way === "program" && !isOwner/);
});

test("Kopfleiste: bei fuenf Bereichen weicht das Etikett unter 1536 Pixeln, der Profil-Kurzlink steht nicht mehr in der Leiste", () => {
  const shell = readFileSync("src/features/navigation/ProductShell.tsx", "utf8");
  assert.match(shell, /navigationItems\.length >= 5 \? "sm:inline-flex xl:hidden 2xl:inline-flex"/);
  // Maria am 30.10.2026: Das Profil steht im Menue hinter dem Bild, nicht zusaetzlich in der Leiste.
  assert.doesNotMatch(shell, /hidden 2xl:contents/);
});

test("Teamseite: dunkler Kopf mit Reitern, Kacheln im Ueberblick, Freigaben als Punkte mit Legende", () => {
  const page = readFileSync("src/app/(product)/advisor/programm/[programId]/page.tsx", "utf8");
  assert.match(page, /<AdvisorPageHeader/);
  assert.match(page, /tileOpenMilestones/);
  const access = readFileSync("src/features/advisor/ProgramAccess.tsx", "utf8");
  assert.match(access, /legendNone/);
  assert.doesNotMatch(page + access, /score|rank|percent|compatib|ampel|traffic/i);
});

test("Programmseite: nur veroeffentlicht oeffentlich, Anmeldung nur mit gueltigem Code oder gueltiger Einladung", () => {
  const sql = readFileSync("../supabase/migrations/20270130120000_program_page.sql", "utf8");
  assert.match(sql, /o\.program_page_published and o\.status = 'active'/);
  const login = readFileSync("src/app/(product)/login/page.tsx", "utf8");
  assert.match(login, /is_valid_team_program_code/);
  assert.match(login, /is_valid_team_program_invite/);
  const beta = readFileSync("src/features/auth/betaAccess.ts", "utf8");
  // Der Pfad allein darf nie genuegen: programEntryFromPath liefert nur, WAS zu pruefen ist.
  assert.match(beta, /export function programEntryFromPath/);
  const page = readFileSync("src/app/p/[slug]/page.tsx", "utf8");
  assert.match(page, /get_public_program_page/);
  assert.doesNotMatch(page, /team_programs|founder_team/);
});

test("Programmseite: Farbe bleibt lesbar, Formatierung ist ein enger Eigenbau ohne HTML und ohne Links", () => {
  const accent = readFileSync("src/features/advisor/programAccent.ts", "utf8");
  assert.match(accent, /export function parseAccent/);
  // Farben werden unveraendert benutzt - nichts wird gemischt oder abgedunkelt.
  assert.doesNotMatch(accent, /function mix|function readable/);
  const rich = readFileSync("src/features/advisor/programRichText.tsx", "utf8");
  assert.doesNotMatch(rich, /dangerouslySetInnerHTML|<a /);
  const sql = readFileSync("../supabase/migrations/20270131120000_program_page_accent.sql", "utf8");
  assert.match(sql, /program_accent ~ '\^#\[0-9a-f\]\{6\}\$'/);
});

test("Einladen: das Entfernen-Label mit {email} wird roh uebergeben, sonst bricht die Seite auf dem Server", () => {
  // Vercel 30.10.2026: FORMATTING_ERROR "{email} entfernen" - t() verlangt den Wert, das Feld setzt ihn erst im Browser.
  const section = readFileSync("src/features/advisor/PersonInviteSection.tsx", "utf8");
  assert.match(section, /removeLabel=\{t\.raw\("removeEmail"\) as string\}/);
  assert.doesNotMatch(section, /removeLabel=\{t\("removeEmail"\)\}/);
});

test("Stufe 2: Team anlegen und beitreten, Konten zaehlen, Alleinstart wartet auf Mitgruender:innen", () => {
  const sql = readFileSync("../supabase/migrations/20270202120000_program_new_teams.sql", "utf8");
  // Aktiv erst ab zwei Personen; die Zustimmung gilt weiter am aktuellen Roster.
  assert.match(sql, /count\(\*\) from public\.founder_team_members m where m\.team_id = program\.team_id\) >= 2/);
  // Hoechstens fuenf Konten je Team-Platz, gezaehlt erst beim Ankommen.
  assert.match(sql, /< c\.max_uses \* 5/);
  // Ein falscher Code legt kein Team an: erst pruefen, dann create_solo_venture.
  assert.ok(sql.indexOf("return null;") < sql.indexOf("create_solo_venture()"));
  assert.match(sql, /create trigger notify_new_member_about_team_program/);
  const page = readFileSync("src/app/(product)/programm/code/[code]/page.tsx", "utf8");
  assert.match(page, /record_team_program_code_arrival/);
  assert.match(page, /createTeamForProgramCodeAction/);
  const programm = readFileSync("src/app/(product)/programm/page.tsx", "utf8");
  assert.match(programm, /waitingForCofounders/);
  assert.doesNotMatch(page + programm, /score|rank|percent|compatib|ampel|traffic/i);
});

test("Ein-Personen-Team: Markierung durch Team oder Organisation, ersetzt keine Zustimmung, nur das Team nimmt sie zurueck", () => {
  const sql = readFileSync("../supabase/migrations/20270203120000_program_solo_teams.sql", "utf8");
  assert.match(sql, /solo_confirmed_at is not null/);
  // Die Zustimmung bleibt in der Aktiv-Regel stehen.
  assert.match(sql, /not exists \(\s*select 1 from public\.founder_team_members m\s*where m\.team_id = program\.team_id\s*and not exists \(\s*select 1 from public\.team_program_consents/);
  assert.match(sql, /team_program_not_solo/);
  const org = readFileSync("src/features/advisor/OrgTeamProgramsSection.tsx", "utf8");
  assert.match(org, /setTeamProgramSoloAction/);
  assert.doesNotMatch(org, /name="confirmed" value="no"/);
  const programm = readFileSync("src/app/(product)/programm/page.tsx", "utf8");
  assert.match(programm, /soloUndo/);
});

test("Code-Seite: Logo und Farben der Organisation, nur was die oeffentliche Seite zeigt, nur veroeffentlicht", () => {
  const sql = readFileSync("../supabase/migrations/20270204120000_program_branding_for_code.sql", "utf8");
  assert.match(sql, /o\.program_page_published/);
  assert.doesNotMatch(sql, /grant execute[^;]*anon/);
  const page = readFileSync("src/app/(product)/programm/code/[code]/page.tsx", "utf8");
  assert.match(page, /getProgramBrandingForCode/);
  assert.match(page, /ProgramBrandHeader/);
  const publicPage = readFileSync("src/app/p/[slug]/page.tsx", "utf8");
  assert.match(publicPage, /ProgramBrandHeader/);
});

test("Programm schliesst das Founder Setup ein: nur lesend, nur gemeinsam bestaetigt, nur fuer Inhaber und Bezugspersonen, im Text ausdruecklich", () => {
  const sql = readFileSync("../supabase/migrations/20270205120000_program_includes_setup.sql", "utf8");
  assert.match(sql, /p\.includes_setup\s+and public\.team_program_is_active/);
  assert.match(sql, /revision\.confirmed_at is not null/);
  assert.match(sql, /team_program_contacts/);
  assert.doesNotMatch(sql, /grant execute[^;]*anon/);
  const view = readFileSync("src/features/advisor/ProgramSetupView.tsx", "utf8");
  assert.doesNotMatch(view, /action=|<form|rpc\(/);
  const messages = JSON.parse(readFileSync("messages/de/advisor.json", "utf8"));
  assert.match(messages.teamProgram.meaning, /Founder Setup/);
  assert.match(messages.programPage.privacyNote, /Founder Setup/);
  const privacy = readFileSync("src/app/datenschutz/page.tsx", "utf8");
  assert.match(privacy, /bestätigten Vereinbarungen im Founder Setup, nur lesend/);
});

test("Mitgruender:innen: mehrere Adressen immer, ohne Zielteam wird das Team vorher angelegt, jede Einladung einzeln", () => {
  const form = readFileSync("src/features/dashboard/CoFounderInviteForm.tsx", "utf8");
  assert.match(form, /<EmailChipsField/);
  assert.match(form, /t\.raw\("many\.remove"\) as string/);
  // Ohne Zielteam zuerst das Team, damit alle Einladungen auf dasselbe zeigen.
  assert.ok(form.indexOf("createInviteTeamAction(context") < form.indexOf("for (const invitedEmail of emails)"));
  // Jede Adresse bekommt ihre eigene Einladung; ein Fehler stoppt die anderen nicht.
  assert.match(form, /for \(const invitedEmail of emails\)[\s\S]*targetTeamId/);
  const sql = readFileSync("../supabase/migrations/20270206120000_team_for_invitations.sql", "utf8");
  assert.match(sql, /has_founder_assessment_access/);
  assert.match(sql, /team\.team_context = p_team_context/);
  const page = readFileSync("src/app/(product)/invite/new/page.tsx", "utf8");
  assert.match(page, /4 - team\.members\.length/);
});

test("Team entfernen: nur der Inhaber, mit Rueckfrage, das Team erfaehrt es", () => {
  const sql = readFileSync("../supabase/migrations/20270207120000_remove_team_from_program.sql", "utf8");
  assert.match(sql, /is_advisor_org_owner_of\(v_org\)/);
  assert.match(sql, /'program_removed'/);
  const org = readFileSync("src/features/advisor/OrgTeamProgramsSection.tsx", "utf8");
  // Der Knopf steht nur beim Inhaber und hinter einer Rueckfrage (details).
  assert.match(org, /\{isOwner \? \(\s*<details[\s\S]*removeTeamFromProgramAction/);
  const notices = JSON.parse(readFileSync("messages/de/notices.json", "utf8"));
  assert.ok(notices.kinds.program_removed);
});

test("Organisation: eine Infobox sagt, dass beim Beenden nichts aufbewahrt wird", () => {
  const org = readFileSync("src/features/advisor/OrgTeamProgramsSection.tsx", "utf8");
  assert.match(org, /t\("retentionText"\)/);
  for (const locale of ["de", "en"]) {
    const messages = JSON.parse(readFileSync(`messages/${locale}/advisor.json`, "utf8"));
    assert.ok(messages.teamProgram.retentionText, locale);
  }
});

test("Programmplan: Inhaber legt an, Inhaber und Bezugspersonen tragen ein, das Team sieht nur den eigenen Eintrag, keine Wertung", () => {
  const sql = readFileSync("../supabase/migrations/20270208120000_program_plan.sql", "utf8");
  assert.match(sql, /save_program_event[\s\S]*is_advisor_org_owner_of\(p_org_id\)/);
  assert.match(sql, /team_program_contacts c where c\.program_id = p_program_id/);
  assert.match(sql, /delete_attendance_when_program_ends/);
  assert.match(sql, /get_my_program_events[\s\S]*team_program_is_active/);
  const plan = readFileSync("src/features/advisor/OrgProgramPlan.tsx", "utf8");
  const mine = readFileSync("src/app/(product)/programm/page.tsx", "utf8");
  assert.doesNotMatch(plan + mine, /score|rank|percent|compatib|ampel|traffic/i);
  // Das Team liest ueber die eigene Funktion, nie die Teilnahmeliste der Organisation.
  assert.match(mine, /getMyProgramEvents/);
  assert.doesNotMatch(mine, /getEventAttendance/);
});
