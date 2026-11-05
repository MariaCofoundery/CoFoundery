import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync("src/app/(product)/advisor/organisation/page.tsx", "utf8");

test("die Organisationsseite hat dreizehn Reiter und waehlt zwischen mehreren Organisationen", () => {
  assert.match(page, /\["overview", "program", "plan", "report", "materials", "learning", "experts", "enroll", "page", "features", "members", "access", "profile"\]/);
  // "Teams" und "Personen" (die eigene Begleitung) leben unter "Begleitung"; alte Adressen fuehren dorthin.
  assert.match(page, /teams: "\/advisor\/begleitung\?art=teams", people: "\/advisor\/begleitung\?art=personen"/);
  assert.match(page, /value === "success" \? "features"/);
  assert.match(page, /orgs\.find\(\(entry\) => entry\.id === query\.org\) \?\? orgs\[0\]/);
  assert.match(page, /orgs\.length > 1/);
});

test("die Seite zeigt Zaehler und Plaetze - keine Gesamtwertung, keine Rangfolge", () => {
  assert.match(page, /countOrgSeatsUsed\(/);
  assert.doesNotMatch(page, /score|rank|percent|compatib/i);
  // Die Zahlen der Uebersicht kommen aus den Programmen der Organisation, nicht aus der eigenen Begleitung.
  assert.match(page, /programs\.filter\(\(program\) => program\.isActive\)\.length/);
  assert.doesNotMatch(page, /getAdvisorDashboardTeams/);
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
  // Balken je Batch und Kategorie, Teams ohne Angabe stehen in einer eigenen Zeile; Reihenfolge bleibt alphabetisch.
  assert.match(ui, /breakdown\(t\("dashByBatch"\), batches, withoutBatch, t\("dashNoBatch"\)\)/);
  assert.match(ui, /dashBarsNote/);
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
  // Die Adresse einer eingeladenen Person wird nie gespeichert. Ausgenommen ist der Block der Experten-Liste: dort ist die
  // E-Mail der Kontakt einer Expertin oder eines Experten, den die Organisation bewusst fuehrt (Einladungen gehoeren nicht dazu).
  const withoutExperts = actions.replace(/\/\*\* Ohne Schema wird https:\/\/[\s\S]*?(?=\/\*\* Teilnahme eintragen)/, "");
  assert.notEqual(withoutExperts.length, actions.length);
  assert.doesNotMatch(withoutExperts, /p_email|invitee_email/);
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
  assert.match(page, /<ProgramOverviewTiles/);
  const tiles = readFileSync("src/features/advisor/ProgramOverviewTiles.tsx", "utf8");
  assert.match(tiles, /tileOpenMilestones/);
  const access = readFileSync("src/features/advisor/ProgramAccess.tsx", "utf8");
  assert.match(access, /legendNone/);
  assert.doesNotMatch(page + tiles + access, /score|rank|percent|compatib|ampel|traffic/i);
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

test("Notizen am Programm-Team: nur Inhaber und Bezugspersonen, privat, enden mit dem Programm", () => {
  const sql = readFileSync("../supabase/migrations/20270209120000_program_notes.sql", "utf8");
  assert.match(sql, /can_keep_program_notes/);
  assert.match(sql, /delete from public\.advisor_private_notes where program_id = new\.id/);
  const actions = readFileSync("src/features/advisor/notebookActions.ts", "utf8");
  assert.match(actions, /can_keep_program_notes/);
  const page = readFileSync("src/app/(product)/advisor/programm/[programId]/page.tsx", "utf8");
  assert.match(page, /kind: "program"/);
});

test("Heute zeigt faellige Wiedervorlagen an Programm-Teams, nur die eigenen", () => {
  const page = readFileSync("src/app/(product)/advisor/dashboard/page.tsx", "utf8");
  assert.match(page, /listDueProgramFollowUps\(client\)/);
  assert.match(page, /tab=notizen/);
  const data = readFileSync("src/features/advisor/teamProgramData.ts", "utf8");
  assert.match(data, /from\("advisor_follow_ups"\)[\s\S]*not\("program_id", "is", null\)/);
});

test("Erfolge: Katalog der Organisation, Sterne je Team, beide Seiten tragen ein, keine Rangliste", () => {
  const sql = readFileSync("../supabase/migrations/20270210120000_program_success.sql", "utf8");
  assert.match(sql, /save_outcome_catalog_item[\s\S]*is_advisor_org_owner_of\(p_org_id\)/);
  assert.match(sql, /delete_outcomes_when_program_ends/);
  // Sterne zaehlen nur bestaetigte Ergebnisse, und nie ueber Teams hinweg.
  const data = readFileSync("src/features/advisor/teamProgramData.ts", "utf8");
  assert.match(data, /entry\.outcomeId && entry\.confirmed/);
  const ui = readFileSync("src/features/advisor/ProgramOutcomes.tsx", "utf8") + readFileSync("src/features/advisor/OrgOutcomeCatalog.tsx", "utf8");
  assert.doesNotMatch(ui, /score|rank|percent|compatib|leaderboard|ampel|traffic/i);
  assert.doesNotMatch(sql, /sum\([^)]*stars[^)]*\)[\s\S]{0,200}group by/i);
  const org = readFileSync("src/app/(product)/advisor/organisation/page.tsx", "utf8");
  assert.match(org, /OrgOutcomeCatalog/);
});

test("Belohnungen und Gespraech zum Stand: Organisation legt fest, jede Seite schreibt nur ihren Satz, kein Vergleich", () => {
  const sql = readFileSync("../supabase/migrations/20270211120000_program_rewards_checkin.sql", "utf8");
  assert.match(sql, /save_reward[\s\S]*is_advisor_org_owner_of\(p_org_id\)/);
  assert.match(sql, /program_side\(p_program_id\) is distinct from 'org'/);
  assert.match(sql, /delete from public\.program_check_ins where program_id = new\.id/);
  assert.match(sql, /'program_reward_unlocked'/);
  const ui = ["ProgramRewards", "ProgramCheckIn", "OrgRewards"].map((name) => readFileSync(`src/features/advisor/${name}.tsx`, "utf8")).join("");
  assert.doesNotMatch(ui, /score|rank|percent|compatib|leaderboard|ampel|traffic/i);
  const outcomes = readFileSync("src/features/advisor/ProgramOutcomes.tsx", "utf8");
  // Die eigene Seite bekommt ein Formular, die andere nur Text.
  assert.match(outcomes, /if \(side !== mode\)/);
});

test("Erfolge sind optional: standardmaessig aus, Teams sehen bei aus nichts, der Inhaber schaltet", () => {
  const sql = readFileSync("../supabase/migrations/20270212120000_program_success_optional.sql", "utf8");
  assert.match(sql, /program_success_enabled boolean not null default false/);
  assert.match(sql, /set_success_enabled[\s\S]*is_advisor_org_owner_of\(p_org_id\)/);
  assert.match(sql, /org_success_enabled\(p\.org_id\)/);
  const mine = readFileSync("src/app/(product)/programm/page.tsx", "utf8");
  assert.match(mine, /outcomes\.length \?\? 0\) > 0/);
  const org = readFileSync("src/app/(product)/advisor/organisation/page.tsx", "utf8");
  // Ein Schalter: Katalog und Belohnungen stehen unter "Funktionen & Erfolge", nur wenn eingeschaltet.
  assert.match(org, /hasOrgFeature\(org, "success"\) \? \(/);
  assert.doesNotMatch(org, /OrgSuccessSwitch/);
  const privacy = readFileSync("src/app/datenschutz/page.tsx", "utf8");
  assert.match(privacy, /Funktion „Erfolge“ einschaltet \(sie ist freiwillig und standardmäßig aus\)/);
});

test("Organisation: die dreizehn Reiter stehen in drei Gruppen, jeder Reiter genau einmal", () => {
  const page = readFileSync("src/app/(product)/advisor/organisation/page.tsx", "utf8");
  const block = page.slice(page.indexOf("const AREA_GROUPS"), page.indexOf("\n];", page.indexOf("const AREA_GROUPS")));
  const used = [...block.matchAll(/"([a-z]+)"/g)].map((match) => match[1]).filter((key) => !["care", "content", "setup"].includes(key));
  const tabs = ["overview", "program", "plan", "report", "materials", "learning", "experts", "enroll", "page", "features", "members", "access", "profile"];
  assert.deepEqual([...used].sort(), [...tabs].sort());
  assert.match(page, /<OrgAreaNav/);
  for (const locale of ["de", "en"]) {
    const messages = JSON.parse(readFileSync(`messages/${locale}/advisor.json`, "utf8"));
    assert.equal(messages.area.orgPage.groupLabels.split(" | ").length, 3, locale);
    assert.equal(messages.area.orgPage.groupHints.split(" | ").length, 3, locale);
    assert.equal(messages.area.orgPage.tabs.split(" | ").length, tabs.length, locale);
  }
  // Einladungen und Codes liegen im Reiter "Teams aufnehmen", die Teamkarten im Reiter "Programm".
  const section = readFileSync("src/features/advisor/OrgTeamProgramsSection.tsx", "utf8");
  assert.match(section, /part === "enroll" && isOwner/);
  const actions = readFileSync("src/features/advisor/teamProgramActions.ts", "utf8");
  assert.match(actions, /tab=enroll/);
});

test("Leere Bereiche zeigen den logischen naechsten Schritt statt nur einen Satz", () => {
  const people = readFileSync("src/features/advisor/AccompaniedPeopleList.tsx", "utf8");
  assert.match(people, /EmptyState[\s\S]*\/advisor\/einladen\?art=person/);
  const programs = readFileSync("src/features/advisor/OrgTeamProgramsSection.tsx", "utf8");
  assert.match(programs, /<EmptyState/);
  assert.match(programs, /#org-invite-title/);
  assert.match(programs, /id="org-codes-title"/);
  // Plan und Meilensteine oeffnen das Formular, solange noch nichts da ist.
  assert.match(readFileSync("src/features/advisor/OrgProgramPlan.tsx", "utf8"), /open=\{events\.length === 0\}/);
  assert.match(readFileSync("src/features/advisor/ProgramMilestones.tsx", "utf8"), /open=\{milestones\.length === 0\}/);
});

test("Optik Schritt 3: Heute mit Icon-Kacheln und Karten, Organisation mit Team-Karten, ohne Wertung", () => {
  const css = readFileSync("src/app/globals.css", "utf8");
  assert.match(css, /\.advisor-card \{/);
  const today = readFileSync("src/app/(product)/advisor/dashboard/page.tsx", "utf8");
  assert.match(today, /<TeamAvatar/);
  const view = readFileSync("src/features/advisor/TodayView.tsx", "utf8");
  assert.match(view, /className="advisor-card flex items-start gap-3/);
  const programs = readFileSync("src/features/advisor/OrgTeamProgramsSection.tsx", "utf8");
  assert.match(programs, /<TeamAvatar/);
  // Die Farbe des Avatars folgt dem Namen und sagt nichts ueber das Team.
  const avatar = readFileSync("src/features/advisor/TeamAvatar.tsx", "utf8");
  assert.doesNotMatch(avatar + today + view, /score|rank|percent|compatib|leaderboard|ampel|traffic/i);
});

test("Optik Schritt 4: Team-Karten zeigen Sterne und Weg zur naechsten Belohnung, je Team, keine Summe oder Reihenfolge nach Sternen", () => {
  const sql = readFileSync("../supabase/migrations/20270213120000_org_program_stars.sql", "utf8");
  assert.match(sql, /org_success_enabled\(p_org_id\)/);
  assert.match(sql, /order by t\.name nulls last/);
  assert.doesNotMatch(sql, /order by[^;]*program_star_total/);
  const section = readFileSync("src/features/advisor/OrgTeamProgramsSection.tsx", "utf8");
  assert.match(section, /candidate\.programId === program\.programId/);
  const team = readFileSync("src/features/advisor/ProgramOverviewTiles.tsx", "utf8");
  assert.match(team, /className="advisor-card flex items-start gap-3/);
});

test("Heute weist auf Erfolge hin, die auf Bestaetigung warten: nur bei eingeschalteter Funktion, je Team, ohne Summe", () => {
  const today = readFileSync("src/app/(product)/advisor/dashboard/page.tsx", "utf8");
  assert.match(today, /successOn\s*\?/);
  assert.match(today, /outcome\.outcomeId && !outcome\.confirmed/);
  assert.match(today, /tab=erfolge/);
  assert.doesNotMatch(today, /stars/i);
});

test("Begleitung auf dem Handy: kompakte Karten, lange Namen brechen um, abgelaufene Einladung widerspricht nicht dem Start beider Founder", () => {
  const list = readFileSync("src/features/advisor/AdvisorTeamsList.tsx", "utf8");
  assert.equal((list.match(/advisor-card p-4 sm:p-5/g) ?? []).length, 2);
  assert.match(list, /break-all[^"]*">\{founder\.label\}/);
  assert.match(list, /bothStarted\s*\?\s*expired\s*\?\s*t\("dashboard\.statuses\.setupIncomplete"\)\s*:\s*t\("dashboard\.statuses\.accepted"\)/);
  assert.match(list, /setupIncomplete/);
  assert.match(list, /invite\.status === "pending" \|\| expired/);
  // Kein Hinweis mehr auf das alte Workbook in den Texten der Karten.
  for (const locale of ["de", "en"]) {
    const messages = JSON.parse(readFileSync(`messages/${locale}/advisor.json`, "utf8"));
    assert.doesNotMatch(messages.dashboard.accessDescription.ready + messages.dashboard.readySectionDescription, /workbook/i, locale);
  }
});

test("Advisor-Menue: Programm-Team-Seiten gehoeren zur Organisation, Einladen und Teams aufnehmen verweisen aufeinander", () => {
  const shell = readFileSync("src/features/navigation/ProductShell.tsx", "utf8");
  assert.match(shell, /currentPathname\.startsWith\("\/advisor\/programm\/"\)/);
  const invite = readFileSync("src/app/(product)/advisor/einladen/page.tsx", "utf8");
  assert.match(invite, /program: ownedOrg \? `\/advisor\/organisation\?org=\$\{ownedOrg\.id\}&tab=enroll` : "\/advisor\/organisation\?tab=enroll"/);
  const section = readFileSync("src/features/advisor/OrgTeamProgramsSection.tsx", "utf8");
  assert.match(section, /href="\/advisor\/einladen"/);
});

test("Beispiel-Vorschau: nur lesend, gesperrt, ohne Datenbank, erreichbar von Heute und der leeren Programmliste", () => {
  const page = readFileSync("src/app/(product)/advisor/beispiel/page.tsx", "utf8");
  assert.match(page, /<fieldset disabled/);
  assert.match(page, /\[&_a\]:pointer-events-none/);
  assert.doesNotMatch(page, /createClient|\.rpc\(|\.from\(/);
  assert.match(page, /hasAdvisor/);
  const fixtures = readFileSync("src/features/advisor/exampleProgram.ts", "utf8");
  assert.doesNotMatch(fixtures, /createClient|\.rpc\(|score|rank|percent/i);
  assert.match(readFileSync("src/app/(product)/advisor/dashboard/page.tsx", "utf8"), /href="\/advisor\/beispiel"/);
  assert.match(readFileSync("src/features/advisor/OrgTeamProgramsSection.tsx", "utf8"), /href: "\/advisor\/beispiel"/);
  for (const locale of ["de", "en"]) {
    const messages = JSON.parse(readFileSync(`messages/${locale}/advisor.json`, "utf8"));
    assert.ok(messages.example.banner && messages.example.fixtureQuestions, locale);
    assert.equal(messages.example.fixtureQuestions.split(" | ").length, messages.example.fixtureAnswers.split(" | ").length, locale);
  }
});

test("Mein Programm: ohne Organisation ein Einstieg mit einem Klick, bei allein gefuehrter Organisation nur der noetige Teil", () => {
  const page = readFileSync("src/app/(product)/advisor/organisation/page.tsx", "utf8");
  assert.match(page, /<MyProgramStart/);
  assert.match(page, /const SOLO_HIDDEN: Tab\[\] = \["overview", "access"\]/);
  // Ausgeblendet heisst auch ueber die Adresse nicht erreichbar.
  assert.match(page, /soloOrg && SOLO_HIDDEN\.includes\(requestedTab\) \? "program" : requestedTab/);
  assert.match(page, /org\.role === "owner" && members\.filter\(\(member\) => member\.status === "active"\)\.length === 1/);
  assert.match(page, /query\.tab \? TAB_OF\(query\.tab\) : soloOrg \? "program" : "overview"/);
  // Mitglieder, Programmseite und Profil bleiben erreichbar.
  assert.doesNotMatch(page.slice(page.indexOf("SOLO_HIDDEN")), /SOLO_HIDDEN: Tab\[\] = \[[^\]]*(members|page|profile)/);
  const actions = readFileSync("src/features/advisor/orgActions.ts", "utf8");
  assert.match(actions, /startMyProgramAction[\s\S]*create_advisor_org/);
  const shell = readFileSync("src/features/navigation/ProductShell.tsx", "utf8");
  assert.match(shell, /advisorOrgNames\.length === 0 \|\| \(advisorSoloOrg && advisorOrgNames\.length === 1\)\s*\?\s*t\("advisorMyProgram"\)/);
  const start = readFileSync("src/features/advisor/MyProgramStart.tsx", "utf8");
  assert.match(start, /\/advisor\/beispiel/);
  assert.doesNotMatch(start, /score|rank|percent/i);
  for (const locale of ["de", "en"]) {
    const messages = JSON.parse(readFileSync(`messages/${locale}/advisor.json`, "utf8"));
    assert.equal(messages.myProgram.points.split(" | ").length, 4, locale);
    const nav = JSON.parse(readFileSync(`messages/${locale}/navigation.json`, "utf8"));
    assert.ok(nav.advisorMyProgram, locale);
  }
});

test("Beispiel-Vorschau: Heute, Teamkarten und Programmplan nutzen dieselben Bausteine, lesen nichts und sortieren nicht nach Sternen", () => {
  const page = readFileSync("src/app/(product)/advisor/beispiel/page.tsx", "utf8");
  assert.match(page, /const TABS = \["today", "cards", "plan", "overview"/);
  assert.match(page, /<TodayTiles/);
  assert.match(page, /<WaitingItems/);
  assert.match(page, /<OrgTeamProgramsSection part="teams"/);
  assert.match(page, /exampleAttendance=\{exampleOrg\.attendance\}/);
  assert.doesNotMatch(page, /createClient|\.rpc\(|\.from\(/);
  const dashboard = readFileSync("src/app/(product)/advisor/dashboard/page.tsx", "utf8");
  assert.match(dashboard, /<TodayTiles/);
  assert.match(dashboard, /<WaitingItems/);
  const plan = readFileSync("src/features/advisor/OrgProgramPlan.tsx", "utf8");
  assert.match(plan, /exampleAttendance \?\? /);
  const fixtures = readFileSync("src/features/advisor/exampleProgram.ts", "utf8");
  // Die Teams stehen alphabetisch (Lumen, Nova, Orbit), nicht nach Sternen.
  assert.match(fixtures, /team\(1, t\("fixtureTeamLumen"\)[\s\S]*team\(2, t\("teamName"\)[\s\S]*team\(3, t\("fixtureTeamOrbit"\)/);
  assert.doesNotMatch(fixtures, /sort\(|score|rank|percent/i);
});

test("Abgelaufene Team-Einladungen bleiben zwei Wochen sichtbar, danach nicht mehr, und werden nicht geloescht", () => {
  const data = readFileSync("src/features/dashboard/advisorTeamInviteData.ts", "utf8");
  assert.match(data, /EXPIRED_INVITE_VISIBLE_DAYS = 14/);
  assert.match(data, /Date\.parse\(row\.expires_at\) > staleBefore/);
  const slice = data.slice(data.indexOf("export async function getAdvisorPendingTeamInvites"), data.indexOf("export async function getAdvisorPendingTeamInvites") + 2500);
  assert.doesNotMatch(slice, /\.delete\(|\.update\(/);
});

test("Menue: allein gefuehrte Organisation heisst Mein Programm, geteilte behaelt ihren Namen", () => {
  const data = readFileSync("src/features/dashboard/dashboardRoleData.ts", "utf8");
  assert.match(data, /solo = \(active \?\? \[\]\)\.length === 1/);
  assert.match(data, /role === "owner"/);
  assert.match(readFileSync("src/app/layout.tsx", "utf8"), /advisorSoloOrg=\{roleViews\.advisorSoloOrg \?\? false\}/);
});

test("Stammdaten: die Organisation schreibt ueber die Datenbankfunktion, das Team sieht sie nur schreibgeschuetzt", () => {
  const ui = readFileSync("src/features/advisor/ProgramOrgData.tsx", "utf8");
  const actions = readFileSync("src/features/advisor/teamProgramActions.ts", "utf8");
  assert.match(actions, /rpc\("save_team_program_org_data"/);
  assert.doesNotMatch(actions.slice(actions.indexOf("saveProgramOrgDataAction")), /\.from\("team_program_org_data"\)/);
  // Das Formular steht nur in der Sicht der Organisation, das Team bekommt eine Leseansicht ohne Formular.
  const teamView = ui.slice(ui.indexOf("export async function ProgramOrgDataTeamView"));
  assert.doesNotMatch(teamView, /<form|<input|<textarea/);
  const teamPage = readFileSync("src/app/(product)/programm/page.tsx", "utf8");
  assert.match(teamPage, /<ProgramOrgDataTeamView/);
  assert.doesNotMatch(teamPage, /<ProgramOrgDataForm/);
  const advisorPage = readFileSync("src/app/(product)/advisor/programm/[programId]/page.tsx", "utf8");
  assert.match(advisorPage, /<ProgramOrgDataForm/);
  assert.doesNotMatch(ui, /score|rank|percent|compatib/i);
  const sql = readFileSync("../supabase/migrations/20270214120000_program_org_data.sql", "utf8");
  assert.match(sql, /can_manage_team_program\(p_program_id\)/);
  assert.match(sql, /can_use_team_program\(p_program_id\)/);
  assert.match(sql, /create trigger team_programs_delete_org_data/);
  assert.match(sql, /'team_program_org_data'/);
});

test("Programmunterlagen: nur Links (https), der Inhaber schreibt, das Team liest ohne Formular", () => {
  const ui = readFileSync("src/features/advisor/ProgramMaterials.tsx", "utf8");
  const actions = readFileSync("src/features/advisor/teamProgramActions.ts", "utf8");
  assert.match(actions, /rpc\("save_program_material"/);
  assert.match(actions, /\^https:\\\/\\\/\\S\+\$/);
  // Das Team bekommt eine Leseansicht ohne Formular, Links oeffnen ohne Referrer und ohne Zugriff auf das Fenster.
  const teamView = ui.slice(ui.indexOf("export async function TeamProgramMaterials"));
  assert.doesNotMatch(teamView, /<form|<input|<textarea/);
  assert.match(ui, /rel="noopener noreferrer"/);
  assert.doesNotMatch(ui, /type="file"|score|rank|percent|compatib/i);
  assert.match(readFileSync("src/app/(product)/programm/page.tsx", "utf8"), /<TeamProgramMaterials/);
  assert.match(page, /<OrgProgramMaterials/);
  const sql = readFileSync("../supabase/migrations/20270216120000_program_materials.sql", "utf8");
  assert.match(sql, /url ~\* '\^https:\/\/\[\^\[:space:\]\]\+\$'/);
  assert.match(sql, /is_advisor_org_owner_of\(p_org_id\)/);
});

test("Experten und Speaker: interne Liste, Inhaber schreibt, Teams sehen nichts, Datenschutz-Hinweis ist da", () => {
  const ui = readFileSync("src/features/advisor/OrgProgramExperts.tsx", "utf8");
  const actions = readFileSync("src/features/advisor/teamProgramActions.ts", "utf8");
  assert.match(actions, /rpc\("save_program_expert"/);
  assert.match(page, /<OrgProgramExperts/);
  // Die Liste gibt es nur in der Organisation, nie auf der Team-Seite oder im Team-Programm.
  assert.doesNotMatch(readFileSync("src/app/(product)/programm/page.tsx", "utf8"), /Expert/);
  assert.match(ui, /expertsPrivacy/);
  assert.match(ui, /rel="noopener noreferrer"/);
  // Keine Preise, keine Dateien, keine Bewertung; sortiert wird nach Name.
  assert.doesNotMatch(ui, /type="file"|price|preis|betrag|score|rank|percent|compatib/i);
  const sql = readFileSync("../supabase/migrations/20270217120000_program_experts.sql", "utf8");
  assert.match(sql, /is_advisor_org_owner_of\(p_org_id\)/);
  assert.match(sql, /order by e\.archived, lower\(e\.name\)/);
  for (const locale of ["de", "en"]) {
    const messages = JSON.parse(readFileSync(`messages/${locale}/advisor.json`, "utf8"));
    assert.ok(messages.teamProgram.expertsPrivacy, locale);
    assert.equal(messages.area.orgPage.tabs.split(" | ").length, 13, locale);
  }
});

test("Ergebnisse je Batch: nur Zaehlungen bestaetigter Ergebnisse, keine Sterne, keine Namen, Hinweis fuer Teams", () => {
  const ui = readFileSync("src/features/advisor/OrgProgramOverview.tsx", "utf8");
  assert.match(ui, /dashOutcomesOf/);
  assert.doesNotMatch(ui, /stars|sort\([^)]*(done|teamsDone)/i);
  const sql = readFileSync("../supabase/migrations/20270218120000_program_outcome_counts.sql", "utf8");
  assert.match(sql, /confirmed_at is not null/);
  assert.match(sql, /org_success_enabled\(p_org_id\)/);
  assert.match(sql, /is_advisor_org_owner_of\(p_org_id\)/);
  assert.doesNotMatch(sql, /stars|team_name|founder_teams/);
  const team = readFileSync("src/features/advisor/ProgramOutcomes.tsx", "utf8");
  assert.match(team, /mode === "team" \? <p[^>]*>\{t\("outcomesCountedNote"\)\}/);
  const de = readFileSync("messages/de/advisor.json", "utf8");
  assert.match(de, /"outcomesCountedNote": "Eure bestätigten Ergebnisse fließen ohne Teamnamen/);
});

test("Speaker an Veranstaltungen: nur Inhaber ordnen zu, Teams sehen keine Namen", () => {
  const sql = readFileSync("../supabase/migrations/20270219120000_program_event_experts.sql", "utf8");
  assert.match(sql, /is_advisor_org_owner_of\(v_org\)/);
  assert.match(sql, /expert_not_in_org/);
  assert.match(sql, /on delete cascade/);
  const plan = readFileSync("src/features/advisor/OrgProgramPlan.tsx", "utf8");
  assert.match(plan, /setEventExpertsAction/);
  assert.match(plan, /planSpeakersNote/);
  // Die Team-Seite und die Team-Funktion kennen keine Speaker.
  const team = readFileSync("src/app/(product)/programm/page.tsx", "utf8");
  assert.doesNotMatch(team, /Speaker|listEventExperts|planSpeakers/);
  const events = readFileSync("../supabase/migrations/20270208120000_program_plan.sql", "utf8");
  assert.doesNotMatch(events.slice(events.indexOf("get_my_program_events")), /event_experts/);
});

test("Lernbereich: nur Links, nur der Inhaber schreibt, Teams sehen nur Veroeffentlichtes, keine Auswertung", () => {
  const sql = readFileSync("../supabase/migrations/20270220120000_program_learning.sql", "utf8");
  assert.match(sql, /url ~\* '\^https:\/\/\[\^\[:space:\]\]\+\$'/);
  assert.match(sql, /is_advisor_org_owner_of/);
  assert.match(sql, /m\.published/);
  assert.match(sql, /team_program_is_active\(p\.id\)/);
  assert.doesNotMatch(sql, /viewed|opened_at|progress|completed/i);
  const ui = readFileSync("src/features/advisor/ProgramLearning.tsx", "utf8");
  assert.match(ui, /rel="noopener noreferrer"/);
  assert.doesNotMatch(ui, /<iframe|<video|<embed|<object|score|rank|percent/i);
  const actions = readFileSync("src/features/advisor/teamProgramActions.ts", "utf8");
  assert.match(actions, /learningError=invalid/);
  const team = readFileSync("src/app/(product)/programm/page.tsx", "utf8");
  assert.match(team, /getMyLearning/);
});

test("Lernbereich fuer Teams und Personen: Freigabe der Person ist die Voraussetzung und wird bei jedem Lesen geprueft", () => {
  const sql = readFileSync("../supabase/migrations/20270222120000_learning_audience.sql", "utf8");
  // Nur mit aktivem, nicht widerrufenem, nicht abgelaufenem Umfang base.
  assert.match(sql, /g\.scope = 'base'/);
  assert.match(sql, /g\.revoked_at is null/);
  assert.match(sql, /person_not_accompanied/);
  // Beim Lesen wird die Freigabe neu geprueft, nicht nur beim Freischalten.
  assert.match(sql, /public\.person_grant_covers_org\(auth\.uid\(\), m\.org_id\)/);
  assert.match(sql, /revoke all on function public\.person_grant_covers_org/);
  assert.doesNotMatch(sql, /viewed|opened_at|progress|completed/i);
  const ui = readFileSync("src/features/advisor/ProgramLearning.tsx", "utf8");
  assert.match(ui, /setModuleAudienceAction/);
  assert.match(ui, /learningAudienceNote/);
  const actions = readFileSync("src/features/advisor/teamProgramActions.ts", "utf8");
  // Das Modulformular aendert den Kreis nicht mehr nebenbei.
  assert.match(actions, /p_published: null/);
});

test("Planen und Lernen: Termine, Unterlagen und Lernbereich sind je ein eigener Reiter mit eigener Rueckkehr", () => {
  const page = readFileSync("src/app/(product)/advisor/organisation/page.tsx", "utf8");
  assert.match(page, /\{ key: "care", tabs: \["overview", "program", "plan", "report"\] \}/);
  assert.match(page, /\{ key: "content", tabs: \["materials", "learning", "experts"\] \}/);
  assert.match(page, /tab === "materials" && !tabOff \? \(/);
  assert.match(page, /tab === "learning" && !tabOff \? \(/);
  // Jeder Reiter liest nur seine eigenen Daten.
  assert.match(page, /tab === "materials" \? listProgramMaterials/);
  assert.match(page, /tab === "learning" \? listLearning/);
  const plan = page.slice(page.indexOf('{tab === "plan" && !tabOff ? ('), page.indexOf('{tab === "materials" && !tabOff ? ('));
  assert.doesNotMatch(plan, /OrgProgramMaterials|OrgProgramLearning/);
  const actions = readFileSync("src/features/advisor/teamProgramActions.ts", "utf8");
  assert.match(actions, /tab=materials/);
  assert.match(actions, /tab=learning/);
});

test("Funktionen: neue Organisationen waehlen einmal, aus heisst verbergen, Teams lesen nur Eingeschaltetes", () => {
  const sql = readFileSync("../supabase/migrations/20270223120000_org_features.sql", "utf8");
  // Bestehende Organisationen behalten alles; nur neu angelegte bekommen die Auswahl.
  assert.match(sql, /features_setup_done boolean not null default true/);
  assert.match(sql, /values \(btrim\(p_name\), v_user, array\['plan', 'materials', 'learning'\]::text\[\], false\)/);
  // Alle vier Funktionen, die Teams lesen, fragen nach dem Schalter, in der Datenbank.
  for (const [fn, key] of [["get_my_program_events", "plan"], ["get_my_program_materials", "materials"], ["get_my_learning", "learning"], ["get_team_program_org_data", "orgdata"]]) {
    const start = sql.indexOf(`function public.${fn}(`);
    assert.ok(start > 0, fn);
    const body = sql.slice(start, sql.indexOf("revoke all on function", start));
    assert.match(body, new RegExp(`org_feature_enabled\\([a-z.]+org_id, '${key}'\\)`), fn);
  }
  // Ausschalten loescht nichts.
  assert.doesNotMatch(sql, /delete from|truncate/i);
  const page = readFileSync("src/app/(product)/advisor/organisation/page.tsx", "utf8");
  assert.match(page, /!org\.featuresSetupDone && tab !== "features"/);
  assert.match(page, /tabEnabled\(org, entry\)/);
  assert.match(page, /\.filter\(\(group\) => group\.tabs\.length > 0\)/);
  const actions = readFileSync("src/features/advisor/orgActions.ts", "utf8");
  assert.match(actions, /tab=features&setup=1/);
  for (const locale of ["de", "en"]) {
    const messages = JSON.parse(readFileSync(`messages/${locale}/advisor.json`, "utf8"));
    for (const key of ["plan", "materials", "learning", "experts", "orgdata", "success"]) {
      assert.ok(messages.org.features[`${key}Title`] && messages.org.features[`${key}Text`], `${locale} ${key}`);
    }
  }
});

test("Beispiel Gruppenauswertung: nur lesend, dieselben Bauteile wie die echte Seite, keine Datenbank, keine Wertung", () => {
  const page = readFileSync("src/app/(product)/advisor/beispiel/page.tsx", "utf8");
  assert.match(page, /tab === "group"/);
  assert.match(page, /CapabilityTeamReadoutView data=\{exampleGroup\.group\}/);
  assert.match(page, /<AlignmentSideBySide/);
  const real = readFileSync("src/app/(product)/advisor/review/[reviewId]/page.tsx", "utf8");
  assert.match(real, /CapabilityTeamReadoutView/);
  assert.match(real, /AlignmentSideBySide/);
  const fixture = readFileSync("src/features/advisor/exampleGroup.ts", "utf8");
  assert.doesNotMatch(fixture, /createClient|supabase|rpc\(/);
  assert.match(fixture, /buildCapabilityTeamReadout/);
  // Das Beispiel steht im gesperrten Block: kein Feld und kein Knopf loest etwas aus.
  assert.match(page, /<fieldset disabled/);
});

test("Gespraech zum Stand gehoert zur Begleitung: im Ueberblick der Team-Seite, auch ohne Erfolge", () => {
  const team = readFileSync("src/app/(product)/advisor/programm/[programId]/page.tsx", "utf8");
  const overview = team.slice(team.indexOf('tab === "overview" ? ('), team.indexOf('tab === "erfolge" ? ('));
  assert.match(overview, /<ProgramCheckIn programId=\{programId\} checkIns=\{checkIns\} returnTo=\{base\} \/>/);
  const success = team.slice(team.indexOf('tab === "erfolge" ? ('), team.indexOf('tab === "notizen" ? ('));
  assert.doesNotMatch(success, /ProgramCheckIn/);
  // Die Aktion fuehrt zur Team-Seite zurueck, nicht nach /programm.
  const actions = readFileSync("src/features/advisor/teamProgramActions.ts", "utf8");
  assert.match(actions.slice(actions.indexOf("export async function saveCheckInAction")), /^[^}]*safeReturn\(formData\.get\("returnTo"\)\)/);
  // Auf der Seite des Teams steht es ausserhalb des Erfolge-Blocks.
  const mine = readFileSync("src/app/(product)/programm/page.tsx", "utf8");
  const outcomesBlock = mine.slice(mine.indexOf("outcomes.length ?? 0) > 0"), mine.indexOf("<ProgramMilestones"));
  assert.match(outcomesBlock, /\) : null\}[\s\S]*<ProgramCheckIn/);
  const sql = readFileSync("../supabase/migrations/20270311120000_check_ins_without_success.sql", "utf8");
  assert.doesNotMatch(sql.slice(sql.indexOf("function public.program_check_in_side")), /org_success_enabled/);
});

test("Einrichten fuer alle lesbar: wer nicht fuehrt, sieht einen Hinweis und das Profil statt einer leeren Seite", () => {
  assert.match(page, /!isOwner && \(tab === "enroll" \|\| tab === "page" \|\| tab === "features" \|\| tab === "profile"\)/);
  assert.match(page, /orgPage\.ownerOnlyNote/);
  const section = readFileSync("src/features/advisor/AdvisorOrgSection.tsx", "utf8");
  assert.match(section, /\) : showProfile && part === "profile" \? \(/);
  for (const locale of ["de", "en"]) {
    const messages = JSON.parse(readFileSync(`messages/${locale}/advisor.json`, "utf8"));
    assert.match(messages.area.orgPage.ownerOnlyNote, /\{names\}/, locale);
  }
});
