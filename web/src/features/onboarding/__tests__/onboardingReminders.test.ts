import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import test from "node:test";

import { getOnboardingReminderCopy } from "@/features/email/onboardingReminderCopy";
import { isValidReminderToken, reminderUnsubscribeToken } from "@/features/onboarding/reminderToken";
import { buildOnboardingReminderHtml } from "@/lib/email/sendOnboardingReminderEmail";

const read = (path: string) => readFileSync(path, "utf8");
const code = (path: string) => read(path).replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");

test("der Abmelde-Link ist unterschrieben: nur die richtige Person mit dem richtigen Geheimnis", () => {
  const token = reminderUnsubscribeToken("user-1", "geheim");
  assert.equal(isValidReminderToken("user-1", token, "geheim"), true);
  assert.equal(isValidReminderToken("user-2", token, "geheim"), false, "nicht fuer eine andere Person");
  assert.equal(isValidReminderToken("user-1", token, "anderes"), false, "nicht mit einem anderen Geheimnis");
  assert.equal(isValidReminderToken("user-1", "zz", "geheim"), false);
  assert.equal(isValidReminderToken("user-1", token, ""), false, "ohne Geheimnis nie");
});

test("zwei Mails, beide freundlich, mit dem Gesamtwert von Made2Found in wenigen Zeilen", () => {
  for (const locale of ["de", "en"] as const) {
    for (const round of [1, 2] as const) {
      const copy = getOnboardingReminderCopy(locale, { round, nextStep: "workstyle", name: "Lena" });
      assert.match(copy.headline, /Lena/);
      assert.ok(copy.values.length >= 3 && copy.values.length <= 5, `${locale} ${round}: wenige Punkte`);
      assert.ok(copy.values.every((value) => value.length < 140), `${locale} ${round}: kurz`);
      assert.ok(copy.cta && copy.ctaHint && /Maria \| Made2Found/.test(copy.signoff), `${locale} ${round}`);
      // Keine Bewertung, kein Versprechen, keine Zahl.
      assert.doesNotMatch(JSON.stringify(copy), /Punktzahl|Prozent|your score|\d\s*%|garantiert|guaranteed|kompatibel|compatible|Typ\b/i, `${locale} ${round}`);
    }
    assert.notEqual(
      getOnboardingReminderCopy(locale, { round: 1, nextStep: "setup", name: null }).subject,
      getOnboardingReminderCopy(locale, { round: 2, nextStep: "setup", name: null }).subject,
      `${locale}: zwei verschiedene Betreffs`,
    );
    // Ohne Namen steht keine Luecke da.
    assert.doesNotMatch(getOnboardingReminderCopy(locale, { round: 1, nextStep: "setup", name: null }).headline, /undefined|null|\s,/);
  }
  const en = JSON.stringify([1, 2].map((round) => getOnboardingReminderCopy("en", { round: round as 1 | 2, nextStep: "setup", name: "Lena" })));
  assert.doesNotMatch(en, /[äöüÄÖÜß]/);
  // Die zweite sagt, dass sie die letzte ist.
  assert.match(getOnboardingReminderCopy("de", { round: 2, nextStep: "setup", name: null }).intro, /letzte Erinnerung/);
  assert.match(getOnboardingReminderCopy("en", { round: 2, nextStep: "setup", name: null }).intro, /last reminder/);
  // Der Knopf führt zum naechsten sinnvollen Schritt.
  assert.notEqual(
    getOnboardingReminderCopy("de", { round: 1, nextStep: "workstyle", name: null }).cta,
    getOnboardingReminderCopy("de", { round: 1, nextStep: "setup", name: null }).cta,
  );
});

test("die Mail nennt den Grund, hat Abmelden und enthält nichts aus dem Konto außer dem Vornamen", () => {
  const html = buildOnboardingReminderHtml({
    recipientEmail: "x@example.com",
    round: 1,
    nextStep: "workstyle",
    name: "Lena <b>",
    url: "https://made2found.test/research/workstyle-pretest?version=8.5a-v5",
    unsubscribeUrl: "https://made2found.test/abmelden/erinnerung?u=1&t=2",
    locale: "de",
  });
  assert.match(html, /Du bekommst diese Mail, weil du dich bei Made2Found angemeldet hast und noch nicht fertig bist/);
  assert.match(code("src/lib/email/sendOnboardingReminderEmail.ts"), /Maria \| \$\{PRODUCT_NAME\}/);
  assert.match(html, /abmelden\/erinnerung\?u=1&amp;t=2/);
  assert.match(html, /workstyle-pretest\?version=8\.5a-v5/);
  assert.doesNotMatch(html, /<b>/, "Eingaben werden maskiert");
});

test("die Zustimmung steckt im Knopf „Gerade keine Zeit“ oder in der Frage nach dem ersten Erfolg - kein Haken, nichts vorangekreuzt", () => {
  const ui = code("src/features/profile/journey/ProfileJourney.tsx");
  assert.doesNotMatch(ui, /type="checkbox"|name="reminder"/);
  // Zwei gleichwertige Wege auf der Willkommensseite; nur der zweite erlaubt Mails.
  assert.match(ui, /formAction=\{completeJourneyLaterAction\}/);
  assert.match(ui, /data-reminder-note/);
  const action = code("src/features/profile/journey/journeyActions.ts");
  assert.match(action, /if \(later\) await client\.rpc\("set_onboarding_reminder", \{ p_wants: true, p_source: "later" \}\)/);
  assert.match(action, /export async function completeJourneyAction[\s\S]*?finishJourney\(formData, false\)/);
  assert.match(action, /export async function completeJourneyLaterAction[\s\S]*?finishJourney\(formData, true\)/);
  assert.match(action, /if \(later\) redirect\(LATER\)/);
  // Erst nach der Markierung "eingefuehrt", und ein Fehler macht den Einstieg nicht rueckgaengig.
  assert.ok(action.indexOf("markOnboardingComplete(client") < action.indexOf("set_onboarding_reminder"));
  // Die zweite Stelle: nach dem ersten Erfolg im Fragebogen, einmal, Ja oder Nein danke.
  const flow = code("src/features/instruments/workstyle/WorkstyleV5Flow.tsx");
  assert.match(flow, /data-workstyle-reminder/);
  assert.match(flow, /answerReminderAction\(true\)[\s\S]*?answerReminderAction\(false\)/);
  assert.match(code("src/features/onboarding/reminderActions.ts"), /p_source: "midway"/);
  assert.match(code("src/app/(product)/research/workstyle-pretest/page.tsx"), /from\("onboarding_reminders"\)/);
  for (const locale of ["de", "en"]) {
    const profile = JSON.parse(read(`messages/${locale}/profile.json`)).journey;
    for (const key of ["start", "later", "laterNote", "title"]) assert.ok(profile.welcome[key], `${locale}: welcome.${key}`);
    for (const key of ["title", "text", "doNow", "note"]) assert.ok(profile.later[key], `${locale}: later.${key}`);
    const flowText = JSON.parse(read(`messages/${locale}/workstyleFlow.json`));
    for (const key of ["interim_reminder_title", "interim_reminder_text", "interim_reminder_yes", "interim_reminder_no"]) assert.ok(flowText[key], `${locale}: ${key}`);
  }
  const runner = code("src/features/onboarding/onboardingReminders.ts");
  assert.match(runner, /prepare_onboarding_reminders/);
  assert.match(runner, /if \(!secret\) return \{ ok: true, prepared: 0, mailed: 0 \}/);
  assert.match(code("src/app/api/cron/connect-suggestions/route.ts"), /runOnboardingReminders\(\)/);
});

test("die Mail nennt nur die gewählten Bereiche und spricht je nach Grund anders an", () => {
  const find = getOnboardingReminderCopy("de", { round: 1, nextStep: "setup", name: "Lena", areas: ["find", "connect"], source: "later" });
  assert.equal(find.values.length, 3, "zwei Bereiche und der Satz zur Privatsphaere");
  assert.match(find.values.join(" "), /Mitgründer/);
  assert.match(find.values.join(" "), /Netzwerk/);
  assert.doesNotMatch(find.values.join(" "), /wie du arbeitest|begleitest/, "Align und Advisor nur, wenn gewählt");
  assert.match(find.headline, /gestern hattest du keine Zeit/);
  const midway = getOnboardingReminderCopy("de", { round: 1, nextStep: "workstyle", name: "Lena", areas: ["align"], source: "midway" });
  assert.match(midway.headline, /schön, dass du angefangen hast/);
  assert.match(midway.values.join(" "), /wie du arbeitest/);
  const advisor = getOnboardingReminderCopy("en", { round: 1, nextStep: "setup", name: null, areas: ["advise"], source: "later" });
  assert.match(advisor.values.join(" "), /Support founders/);
  // Ohne Angabe: die drei, die fast alle brauchen.
  assert.equal(getOnboardingReminderCopy("de", { round: 1, nextStep: "setup", name: null }).values.length, 4);
  assert.doesNotMatch(JSON.stringify(advisor), /[äöüÄÖÜß]/);
});

test("Abmelden: ein Abruf ändert nichts, erst der Knopf; die Unterschrift wird geprüft", () => {
  const page = code("src/app/abmelden/erinnerung/page.tsx");
  assert.match(page, /isValidReminderToken\(userId, token, secret\)/);
  assert.match(page, /<button type="submit"/);
  // Die Seite selbst liest nur; geschrieben wird in der Aktion.
  const render = page.slice(page.indexOf("export default async function"));
  assert.doesNotMatch(render.replace(/async function confirm[\s\S]*?\n  }\n/, ""), /\.update\(/);
  for (const locale of ["de", "en"]) {
    const bundle = JSON.parse(read(`messages/${locale}/auth.json`)).reminderUnsubscribe;
    for (const key of ["title", "text", "button", "doneTitle", "doneText", "invalidTitle", "invalidText"]) assert.ok(bundle[key], `${locale}: ${key}`);
  }
});

test("die Datenbank: Tabelle nur lesbar, Funktionen nur für die Richtigen, Test vorhanden", () => {
  const migration = readdirSync("../supabase/migrations").find((name) => name.endsWith("_onboarding_reminders.sql"));
  assert.ok(migration);
  const sql = read(`../supabase/migrations/${migration}`);
  assert.match(sql, /revoke all on table public\.onboarding_reminders from public, anon, authenticated;\ngrant select on table public\.onboarding_reminders to authenticated;/);
  assert.match(sql, /grant execute on function public\.set_onboarding_reminder\(boolean, text\) to authenticated;/);
  assert.match(sql, /revoke all on function public\.prepare_onboarding_reminders\(integer\) from public, anon, authenticated;\ngrant execute on function public\.prepare_onboarding_reminders\(integer\) to service_role;/);
  assert.match(sql, /constraint onboarding_reminders_consent check \(not wants_email or consent_at is not null\)/);
  // Gestempelt wird vor der Rueckgabe.
  assert.ok(sql.indexOf("update public.onboarding_reminders r") < sql.indexOf("select s.user_id, s.rnd::smallint"));
  assert.ok(existsSync("../supabase/tests/onboarding_reminders.sql"));
});
