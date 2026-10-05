import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { workstyleSessionItems } from "@/features/instruments/workstyle/registry";

/**
 * Phase 11.6 - Arbeitsprofil aus den 29 Core-Situationen, Forschung freiwillig
 * und getrennt; gemeinsamer Teambericht auch fuer Advisors erst bei
 * gegenseitiger Bereitschaft. Die DB-Regeln selbst pruefen die pgTAP-Tests in
 * supabase/tests/workstyle_product_core_completion.sql.
 */

const src = (p: string) => readFileSync(p, "utf8");
const code = (p: string) => src(p).replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\{\/\*[\s\S]*?\*\/\}/g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");
const json = (p: string) => JSON.parse(src(p));
const MIGRATION = "../supabase/migrations/20261118130000_workstyle_product_core_completion.sql";
const FLOW = "src/features/instruments/workstyle/WorkstyleProfileFlow.tsx";

test("Instrument unveraendert: 29 Core-, 23 Forschungssituationen", () => {
  const items = workstyleSessionItems("8.5a-v3", null);
  assert.equal(items.filter(item => item.usage === "core").length, 29);
  assert.equal(items.filter(item => item.usage !== "core").length, 23);
});

test("Migration: Produktabschluss nur aus Core, Forschung mit eigener Einwilligung, keine Rechteerweiterung", () => {
  const sql = src(MIGRATION);
  assert.match(sql, /create function public\.start_workstyle_product\(p_new boolean default false\)/);
  assert.match(sql, /create function public\.start_workstyle_research\(p_consent_version text,p_context jsonb\)/);
  assert.match(sql, /alter column consent_version drop not null/);
  assert.match(sql, /add constraint workstyle_session_research_consent/);
  // Produktabschluss = submitted_at bei vollstaendigem Core; Forschung nur mit Einwilligung.
  assert.match(sql, /if core_n<>core_total then return; end if;\s*update public\.assessments set submitted_at=done_at/);
  assert.match(sql, /if s\.consent_version is null or s\.withdrawn_at is not null or s\.completed_at is not null then return; end if;/);
  assert.match(sql, /if not is_core and s\.consent_version is null then raise exception 'research_consent_required'/);
  assert.match(sql, /revoke all on function public\.workstyle_v3_sync_completion\(uuid\) from public,anon,authenticated/);
  // Widerruf und Export nur fuer Sitzungen mit Einwilligung.
  assert.match(sql, /r\.withdrawn_at is null and r\.consent_version is not null for update of r/);
  assert.match(sql, /s\.withdrawn_at is null and s\.consent_version is not null and s\.assessment_version=p_assessment_version/);
  // Advisor: Gegenseitigkeit fuer jede lesende Person, nicht nur fuer Mitglieder.
  const team = sql.slice(sql.indexOf("create or replace function public.get_workstyle_product_team("));
  assert.doesNotMatch(team.slice(0, team.indexOf("end $$;")), /is_current_user_founder_team_member\(p_team_id\) and exists/);
  assert.match(team, /where x\.team_id=p_team_id and not public\.workstyle_core_visible_to\(x\.user_id,y\.user_id\)/);
  // Nichts davon legt Freigaben, Instrumente oder Items an oder loescht Antworten ausserhalb des Widerrufs.
  assert.doesNotMatch(sql, /insert into public\.(alignment_shares|instruments|workstyle_item_versions)|create table|drop table/i);
  assert.equal((sql.match(/delete from public\.alignment_answers/g) ?? []).length, 1, "nur der bestehende Widerrufsweg");
});

test("Arbeitsprofil-Ablauf: nur Core, eigener Fortschritt, kein Pretest-Wording, keine 52", () => {
  const flow = code(FLOW);
  assert.match(flow, /const coreItems = manifestItems\.filter\(isCore\)/);
  // Phase 11.6C: Fragebogen zaehlt "Frage x von 29/37"; nur der getrennte Forschungsteil sagt "Entwicklungsfrage".
  assert.match(flow, /questions\(flow, "Frage", mixed \? "Fortschritt Fragebogen" : "Fortschritt Arbeitsprofil"\)/);
  assert.match(flow, /questions\(research, "Entwicklungsfrage", "Fortschritt Entwicklungsfragen"\)/);
  assert.match(flow, /startWorkstyleProduct\(\)/);
  // Sichtbarer Text: ohne Importpfade und technische Routen, die intern weiter "pretest" heissen.
  const visible = flow.replace(/^import .*$/gm, "").replace(/\/research\/workstyle-pretest[^"`]*/g, "");
  assert.doesNotMatch(visible, /\bPretest\b|\b52\b|items\.length\} Situationen/);
});

test("Abschluss: Arbeitsprofil zuerst, Forschung nur als freiwilliges, nachgeordnetes Angebot", () => {
  const flow = code(FLOW);
  const actions = flow.slice(flow.indexOf("const actions ="), flow.indexOf("const withdrawal ="));
  const order = ["Arbeitsprofil ansehen", "Freigaben für", "Zu eurem Team", "Zum Dashboard"].map(m => actions.indexOf(m));
  order.forEach((at, n) => assert.ok(at > (n ? order[n - 1] : -1), `Reihenfolge ${n}`));
  const done = flow.slice(flow.indexOf("Dein Arbeitsprofil ist bereit."));
  assert.ok(done.indexOf("{actions}") < done.indexOf("Forschung später unterstützen"), "Forschung nur nachgeordnet");
  assert.match(done, /!session\.consent_version && !session\.withdrawn_at && <Link href=\{RESEARCH_HREF\}/);
  // Kein automatisches Weiterleiten in die Forschung.
  assert.doesNotMatch(flow, /router\.push|redirect\(|location\.href/);
});

test("Forschung: eigene Einleitung, Einwilligung nicht vorausgewaehlt, Ablehnen gleichwertig, widerrufbar", () => {
  const flow = code(FLOW);
  assert.match(flow, /const \[consent, setConsent\] = useState\(false\)/);
  assert.match(flow, /disabled=\{pending \|\| !consent\}/);
  assert.match(flow, /<Link href="\/me\/profile\/workstyle" className=\{secondary\}>Nein, danke<\/Link>/);
  assert.match(flow, /Sie verändern dein Arbeitsprofil und deinen Report nicht\./);
  assert.match(flow, /auch die zu deinem Arbeitsprofil/);
  assert.match(flow, /Forschungseinwilligung widerrufen/);
  assert.match(flow, /Dein Arbeitsprofil bleibt\./);
  const actions = code("src/features/instruments/workstyle/actions.ts");
  assert.match(actions, /export async function startWorkstyleProduct\(newAssessment = false\) \{\s*const client = await createClient\(\);\s*const \{ data, error \} = await client\.rpc\("start_workstyle_product"/);
  assert.match(actions, /export async function startWorkstyleResearch\(consent: boolean, context: ResearchContext\) \{\s*if \(consent !== true\)/);
});

test("Route: bestehende Seite unterscheidet Arbeitsprofil und Forschung, keine neue Produkt-Route", () => {
  const page = code("src/app/(product)/research/workstyle-pretest/page.tsx");
  assert.match(page, /const research = version === "8\.5a-v3" && query\.teil === "forschung"/);
  assert.match(page, /<WorkstyleProfileFlow key=\{research \? "research" : "profile"\} part=\{research \? "research" : "profile"\}/);
  assert.doesNotMatch(page, /title: "[^"]*Pretest/);
  // Nur die historische Forschungsfassung 8.5a-v1 heisst fuer Nutzer noch Pretest.
  const current = page.slice(page.indexOf('if (version === "8.5a-v2" || version === "8.5a-v3")'), page.indexOf("Entwicklungsfassung 8.5a-v1"));
  assert.doesNotMatch(current, /\bPretest\b/);
  const settings = code("src/features/research/ResearchConsentSettings.tsx");
  assert.match(settings, /version=8\.5a-v3&teil=forschung/);
});

test("Profil: Forschungsangebot nur zum fertigen, aktuellen Arbeitsprofil, nie im Druck oder Snapshot", () => {
  const page = code("src/app/me/profile/workstyle/page.tsx");
  assert.match(page, /!snapshot && current && participation\?\.submitted_at && participation\.assessment_id === current\.assessment_id &&\s*!participation\.withdrawn_at && !participation\.completed_at/);
  assert.match(page, /className="ws-no-print mt-10 rounded-2xl border border-dashed/);
  for (const locale of ["de", "en"]) {
    const r = json(`messages/${locale}/report.json`).workstyle;
    assert.ok(r.researchOffer.title && r.researchOffer.offer && r.researchOffer.continue, locale);
    assert.ok(r.advisorNotReady.title && r.advisorNotReady.body, locale);
  }
});

test("Teamseite: Advisors sehen vor der Bereitschaft einen neutralen Hinweis ohne Details", () => {
  const page = code("src/app/(product)/teams/[teamId]/workstyle/page.tsx");
  assert.match(page, /team === "not_ready" && !membership \? \(/);
  assert.match(page, /t\("advisorNotReady\.title"\)/);
  assert.match(page, /current === "not_ready" && membership \? await client\.rpc\("get_workstyle_product_team_status"/);
  const advisor = page.slice(page.indexOf('team === "not_ready" && !membership'), page.indexOf('t("advisorNotReady.body")'));
  assert.doesNotMatch(advisor, /TeamReadinessPanel|share|Link/);
});
