"use client";

import { useTranslations, useLocale } from "next-intl";

import Link from "next/link";
import { useState, useTransition } from "react";

import { workstyleSessionItems, type WorkstyleItem } from "@/features/instruments/workstyle/registry";
import { workstyleV3Item } from "@/features/instruments/workstyle/researchSets";
import { saveWorkstyleFeedback, saveWorkstyleV3, startWorkstyleProduct, startWorkstyleResearch, withdrawWorkstyleResearch } from "@/features/instruments/workstyle/actions";
import { WorkstyleProgress, WorkstyleQuestion, type WorkstyleCompletionContext } from "@/features/instruments/workstyle/WorkstylePretestV2";
import { WorkstyleFeedback } from "@/features/instruments/workstyle/WorkstylePretest";
import type { PretestSession, ResearchContext } from "@/features/instruments/workstyle/data";
import { researchConsentDocument } from "@/features/instruments/workstyle/researchConsent";
import type { AppLocale } from "@/i18n/config";

/**
 * Aktueller Ablauf (8.5a-v3).
 *
 * Phase 11.6C: Der Einstieg bietet zwei gleichwertige Wege -
 * - "Nur mein Arbeitsprofil": 29 Core-Situationen, ohne Forschungseinwilligung;
 * - "Ja, ich unterstuetze die Weiterentwicklung": 29 Core + 8 Entwicklungsfragen
 *   (Set A oder B) = 37, gemischt in EINEM Fragebogen.
 * Set und Reihenfolge erzeugt der Server einmalig (start_workstyle_research) und
 * speichert sie in der Sitzung (item_order); der Client zeigt nur diese Reihenfolge.
 * Das Arbeitsprofil ist mit der 29. Core-Antwort fertig (submitted_at); der
 * Abschluss erscheint trotzdem erst am Ende des gewaehlten Ablaufs.
 *
 * Bestehende full-23-Teilnahmen: Arbeitsprofil-Teil zeigt nur Core, die
 * Forschung laeuft wie in 11.6 getrennt auf ?teil=forschung.
 */
const manifestItems = workstyleSessionItems("8.5a-v3", null);
const isCore = (item: WorkstyleItem) => item.usage === "core";
const coreItems = manifestItems.filter(isCore);
const legacyResearchItems = manifestItems.filter(item => !isCore(item));
const RESEARCH_HREF = "/research/workstyle-pretest?version=8.5a-v3&teil=forschung";
const DEVELOPMENT_COUNT = 8;

const button =
  "inline-flex min-h-12 items-center justify-center rounded-full bg-violet-800 px-6 py-3 font-semibold text-white transition hover:bg-violet-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-200 disabled:opacity-50";
const secondary =
  "inline-flex min-h-12 items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-800 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-100 disabled:opacity-50";
const card = "rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.05)] sm:p-9";
const field = "mt-2 block w-full rounded-xl border border-slate-300 bg-white p-3";

function storedOrder(session: PretestSession | null): WorkstyleItem[] | null {
  if (!session?.item_order) return null;
  return session.item_order.map(key => workstyleV3Item(key)).filter((item): item is WorkstyleItem => Boolean(item));
}
/** Fragebogen-Reihenfolge: gemischt (37) aus der Sitzung, sonst die 29 Core-Situationen. */
function flowItems(session: PretestSession | null) {
  const order = storedOrder(session);
  return order && order.some(isCore) ? order : coreItems;
}
/** Entwicklungsfragen der Teilnahme: Welle 1 aus der Sitzung, sonst full-23. */
function researchItemsOf(session: PretestSession | null) {
  const order = storedOrder(session);
  return order ? order.filter(item => !isCore(item)) : legacyResearchItems;
}
const answered = (session: PretestSession | null, item: WorkstyleItem) => Boolean(session?.answers.some(answer => answer.item_key === item.item_key));
function firstOpen(list: readonly WorkstyleItem[], session: PretestSession | null) {
  const index = list.findIndex(item => !answered(session, item));
  return index === -1 ? list.length - 1 : index;
}

function ContextFields() {
  const t = useTranslations("workstyleFlow");

  return <div className="grid gap-4">
    <label className="block text-sm">{t("how_many_ventures_have_you_actively_worked")}<span className="mt-1 block text-slate-600">{t("include_your_current_venture")}</span><select name="experience" className={field} required defaultValue=""><option value="" disabled>{t("please_select")}</option><option value="0">0</option><option value="1">1</option><option value="2-3">2–3</option><option value="4-5">4–5</option><option value="6_plus">{t("6_or_more")}</option><option value="prefer_not_to_say">{t("prefer_not_to_say")}</option></select></label>
    <label className="block text-sm">{t("current_team_situation")}<select name="team" className={field} required defaultValue=""><option value="" disabled>{t("please_select_m011")}</option><option value="solo">Solo</option><option value="two">{t("twofounder_team")}</option><option value="larger">{t("larger_team")}</option><option value="no_venture">{t("no_venture_yet")}</option></select></label>
    <label className="block text-sm">{t("venture_stage_optional")}<select name="phase" className={field} defaultValue=""><option value="">{t("no_entry")}</option><option value="idea">{t("idea_exploration")}</option><option value="building">{t("building_testing")}</option><option value="operating">{t("operating")}</option></select></label>
  </div>;
}
const contextFrom = (data: FormData): ResearchContext => ({ founder_experience: String(data.get("experience")) as ResearchContext["founder_experience"], team_size: String(data.get("team")) as ResearchContext["team_size"], venture_phase: String(data.get("phase")) });

export function ConsentDetails({ consent, onConsent }: { consent: boolean; onConsent: (value: boolean) => void }) {
  const t = useTranslations("workstyleFlow");
  const consentDocument = researchConsentDocument(useLocale() as AppLocale);

  return <div className="space-y-4">
    <p className="text-sm leading-6 text-slate-700">{t("we_need_your_consent_to_analyze_the")}</p>
    <details className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
      <summary className="cursor-pointer font-medium text-slate-900">{t("read_the_consent_text")}</summary>
      <div className="mt-3 space-y-3">{consentDocument.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}</div>
    </details>
    <ContextFields />
    <label className="flex items-start gap-3 text-sm leading-6"><input type="checkbox" checked={consent} onChange={event => onConsent(event.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-violet-700" /><span>{consentDocument.confirmation}</span></label>
  </div>;
}

export function WorkstyleProfileFlow({ initialSession, part = "profile", context = null }: {
  initialSession: PretestSession | null; part?: "profile" | "research"; context?: WorkstyleCompletionContext | null;
}) {
  const t = useTranslations("workstyleFlow");
  const locale = useLocale();
  // Server actions answer in German; keep their specific guidance in DE, use the generic EN line otherwise.
  const serverError = (message: string) => locale === "en" ? t("something_went_wrong_your_saved_responses_are") : message;

  const [session, setSession] = useState(initialSession);
  const [position, setPosition] = useState(() => firstOpen(part === "research" ? researchItemsOf(initialSession) : flowItems(initialSession), initialSession));
  // Wer mitten im Ablauf ist, wird nicht auf einen Zwischenstand umgeleitet.
  const [continuing, setContinuing] = useState(!initialSession?.submitted_at);
  const [choice, setChoice] = useState<"profile" | "research" | null>(null);
  // Nach "Los geht's" sofort zur ersten Frage - auch bevor es eine Antwort gibt.
  const [started, setStarted] = useState(false);
  const [consent, setConsent] = useState(false);
  const [confirmRetake, setConfirmRetake] = useState(false);
  const [confirmWithdraw, setConfirmWithdraw] = useState(false);
  const [feedbackDone, setFeedbackDone] = useState(Boolean(initialSession?.feedback));
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  function run(action: () => Promise<void>) {
    setError("");
    startTransition(async () => { try { await action(); } catch { setError(t("something_went_wrong_your_saved_responses_are")); } });
  }
  const profileDone = Boolean(session?.submitted_at);
  const consented = Boolean(session?.consent_version) && !session?.withdrawn_at;
  const mixed = Boolean(storedOrder(session)?.some(isCore));
  const flow = flowItems(session);
  const openInFlow = flow.filter(item => !answered(session, item)).length;
  const research = researchItemsOf(session);
  const openResearch = consented ? research.filter(item => !answered(session, item)).length : 0;
  const names = context?.partnerNames.length ? new Intl.ListFormat(locale, { style: "long", type: "conjunction" }).format(context.partnerNames) : null;
  const fresh = !session || (!started && !profileDone && !session.consent_version && session.answers.length === 0);

  function questions(list: readonly WorkstyleItem[], noun: string, ariaLabel: string) {
    const s = session!;
    const item = list[position];
    // Naechste offene Frage nach der aktuellen (beim Fortsetzen nicht erneut durch Beantwortetes).
    const nextOpen = (current: PretestSession) => list.findIndex((candidate, index) => index > position && !answered(current, candidate));
    return <>
      <WorkstyleProgress position={position} total={list.length} noun={noun} ariaLabel={ariaLabel} />
      <WorkstyleQuestion key={item.item_key} item={item} initial={s.answers.find(answer => answer.item_key === item.item_key)} pending={pending}
        last={nextOpen(s) === -1} canGoBack={position > 0} onBack={() => setPosition(position - 1)}
        onSave={(value, elapsed) => run(async () => {
          const result = await saveWorkstyleV3(s.assessment_id, item.item_key, {
            response_value: typeof value === "number" ? value : null,
            response_option: typeof value === "string" && value !== "cannot_assess" ? value : null,
            missing_reason: value === "cannot_assess" ? "cannot_assess" : null,
            rendered_order: item.rendered_order ?? null,
          }, elapsed);
          if (!result.ok) return setError(serverError(result.error));
          const saved = { ...s, submitted_at: result.submitted_at, completed_at: result.completed_at,
            answers: [...s.answers.filter(answer => answer.item_key !== result.answer.item_key), result.answer] };
          setSession(saved);
          setContinuing(true);
          const next = nextOpen(saved);
          if (next !== -1) setPosition(next);
          else if (list.some(candidate => !answered(saved, candidate))) setPosition(firstOpen(list, saved));
        })} />
    </>;
  }

  const actions = <div className="mt-7 flex flex-wrap gap-3">
    <Link href="/me/profile/workstyle" className={button}>{t("view_workstyle_profile")}</Link>
    {/* Phase 11.7B: geteilt wird einmal mit dem Team, nicht je Person. */}
    {context?.teamId && <Link href={`/teams/${context.teamId}/workstyle`} className={secondary}>{names ? t("view_team_workstyle_with_value", { p0: names }) : t("view_team_workstyle")}</Link>}
    <Link href="/dashboard" className={secondary}>{t("go_to_dashboard")}</Link>
  </div>;

  const withdrawal = (note: string) => <div className="mt-10 border-t border-slate-200 pt-5 text-sm leading-6 text-slate-600">
    {!confirmWithdraw ? <button className="min-h-11 underline" onClick={() => setConfirmWithdraw(true)}>{t("stop_taking_part_in_the_development_questions")}</button>
      : <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <p>{note}</p>
        <div className="mt-3 flex flex-wrap gap-3">
          <button className={secondary} disabled={pending} onClick={() => run(async () => {
            const result = await withdrawWorkstyleResearch(); if (!result.ok) return setError(serverError(result.error));
            setSession(session?.submitted_at ? { ...session, withdrawn_at: new Date().toISOString(), item_order: null, research_set: null, research_set_version: null } : null);
            setConfirmWithdraw(false); setPosition(0); setChoice(null); setConsent(false);
          })}>{t("withdraw_research_consent")}</button>
          <button className={secondary} onClick={() => setConfirmWithdraw(false)}>{t("cancel")}</button>
        </div>
      </div>}
  </div>;
  const withdrawNote = profileDone
    ? t("your_development_responses_context_entries_completion_times")
    : t("your_unfinished_participation_will_be_deleted_as");

  if (part === "research") return <section className="mt-8">
    {error && <p role="alert" className="mb-5 rounded-xl bg-red-50 p-4 text-red-900">{error}</p>}
    {!profileDone && (mixed && consented
      ? <div className={`space-y-4 ${card}`}><h2 className="text-xl font-semibold">{t("your_questionnaire_is_still_in_progress")}</h2><p className="leading-7 text-slate-700">{t("the_development_questions_are_mixed_into_your")}</p><Link href="/research/workstyle-pretest?version=8.5a-v3" className={button}>{t("go_to_questionnaire")}</Link></div>
      : <div className={`space-y-4 ${card}`}><h2 className="text-xl font-semibold">{t("your_workstyle_profile_comes_first")}</h2><p className="leading-7 text-slate-700">{t("development_questions_are_available_once_your_workstyle")}</p><Link href="/research/workstyle-pretest?version=8.5a-v3" className={button}>{t("go_to_workstyle_profile")}</Link></div>)}
    {profileDone && session?.withdrawn_at && <div className={`space-y-4 ${card}`}>
      <h2 className="text-xl font-semibold">{t("research_consent_withdrawn")}</h2>
      <p className="leading-7 text-slate-700">{t("your_development_responses_context_entries_completion_times_m040")}</p>
      <Link href="/me/profile/workstyle" className={secondary}>{t("go_to_workstyle_profile_m041")}</Link>
    </div>}
    {profileDone && !session?.withdrawn_at && !session?.consent_version && <form className={`space-y-6 ${card}`} onSubmit={event => {
      event.preventDefault(); const data = new FormData(event.currentTarget);
      run(async () => {
        const result = await startWorkstyleResearch(consent, contextFrom(data));
        if (!result.ok) return setError(serverError(result.error));
        setSession(result.session); setPosition(firstOpen(researchItemsOf(result.session), result.session));
      });
    }}>
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">{t("optional")}</p>
        <h2 className="text-2xl font-semibold tracking-[-0.01em]">{t("help_develop_made2found")}</h2>
        <p className="leading-7 text-slate-700">{t("with")} {DEVELOPMENT_COUNT} {t("additional_situations_you_can_help_us_develop")}</p>
      </div>
      <ConsentDetails consent={consent} onConsent={setConsent} />
      <div className="flex flex-wrap gap-3">
        <button disabled={pending || !consent} className={button}>{t("start_development_questions")}</button>
        <Link href="/me/profile/workstyle" className={secondary}>{t("no_thanks")}</Link>
      </div>
    </form>}
    {profileDone && consented && !session?.completed_at && <>
      {questions(research, t("development_question"), t("development_questions_progress"))}
      <p className="mt-6 text-center text-sm text-slate-600">{t("each_response_is_saved")} <Link href="/me/profile/workstyle" className="font-medium text-slate-900 underline">{t("continue_later")}</Link></p>
      {withdrawal(withdrawNote)}
    </>}
    {profileDone && consented && session?.completed_at && <>
      <div className={card}>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">{t("thank_you")}</p>
        <h2 className="mt-2 text-2xl font-semibold">{t("you_have_completed_the_development_questions")}</h2>
        <p className="mt-3 max-w-2xl leading-7 text-slate-700">{t("your_responses_help_us_develop_the_workstyle")}</p>
        <div className="mt-5">
          {!feedbackDone ? <WorkstyleFeedback v2 items={[...flowItems(session), ...(mixed ? [] : research)]} pending={pending} onSkip={() => setFeedbackDone(true)} onSave={feedback => run(async () => {
            const result = await saveWorkstyleFeedback(session.assessment_id, feedback, "8.5a-v3");
            if (!result.ok) return setError(serverError(result.error)); setFeedbackDone(true);
          })} /> : <p role="status" className="text-sm">{t("thank_you_for_your_feedback")}</p>}
        </div>
        <Link href="/me/profile/workstyle" className={`mt-6 ${secondary}`}>{t("go_to_workstyle_profile_m055")}</Link>
      </div>
      {withdrawal(withdrawNote)}
    </>}
  </section>;

  return <section className="mt-8">
    {error && <p role="alert" className="mb-5 rounded-xl bg-red-50 p-4 text-red-900">{error}</p>}

    {fresh && <form className={`space-y-6 ${card}`} onSubmit={event => {
      event.preventDefault(); const data = new FormData(event.currentTarget);
      run(async () => {
        const result = choice === "research" ? await startWorkstyleResearch(consent, contextFrom(data)) : await startWorkstyleProduct();
        if (!result.ok) return setError(serverError(result.error));
        setSession(result.session); setStarted(true); setContinuing(true); setPosition(firstOpen(flowItems(result.session), result.session));
      });
    }}>
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-[-0.01em]">{t("take_a_moment_to_settle_in")}</h2>
        <p className="leading-7 text-slate-700">{t("feel_free_to_grab_a_coffee_tea")}</p>
        <p className="leading-7 text-slate-700">{t("there_are_no_right_or_wrong_answers")}</p>
        <p className="leading-7 text-slate-700">{t("each_response_is_saved_straight_away_you")}</p>
      </div>
      <div className="space-y-3 rounded-2xl bg-violet-50/60 p-5">
        <p className="font-semibold text-slate-900">{t("your_workstyle_profile_is_based_on")} {coreItems.length} {t("situations")}</p>
        <p className="leading-7 text-slate-700">{t("if_you_like_you_can_also_answer")} {DEVELOPMENT_COUNT} {t("development_questions_to_help_us_improve_made2found")} {coreItems.length + DEVELOPMENT_COUNT} {t("situations_with_the_additional_questions_mixed_in")}</p>
      </div>
      <fieldset className="space-y-3">
        <legend className="mb-3 font-semibold text-slate-900">{t("how_would_you_like_to_start")}</legend>
        {([
          ["profile", t("just_my_workstyle_profile"), t("value_situations", { p0: coreItems.length })],
          ["research", t("yes_i_would_like_to_help_develop"), t("value_situations_including_value_development_questions", { p0: coreItems.length + DEVELOPMENT_COUNT, p1: DEVELOPMENT_COUNT })],
        ] as const).map(([value, title, detail]) => <label key={value} className={`flex min-h-16 cursor-pointer items-start gap-4 rounded-2xl border px-5 py-4 transition ${choice === value ? "border-violet-500 bg-violet-50/70 ring-1 ring-violet-200" : "border-slate-200 hover:border-slate-300"}`}>
          <input type="radio" name="start" value={value} checked={choice === value} onChange={() => setChoice(value)} className="mt-1 h-5 w-5 shrink-0 accent-violet-700" />
          <span><span className="block font-semibold text-slate-900">{title}</span><span className="block text-sm text-slate-600">{detail}</span></span>
        </label>)}
      </fieldset>
      {choice === "research" && <ConsentDetails consent={consent} onConsent={setConsent} />}
      <button className={button} disabled={pending || !choice || (choice === "research" && !consent)}>{t("lets_begin")}</button>
    </form>}

    {!fresh && session && openInFlow > 0 && (!profileDone || continuing) && <>
      {questions(flow, t("question"), mixed ? t("questionnaire_progress") : t("workstyle_profile_progress"))}
      <p className="mt-6 text-center text-sm text-slate-600">
        {t("each_response_is_saved_m074")} <Link href="/dashboard" className="font-medium text-slate-900 underline">{t("continue_later_m075")}</Link>
      </p>
      {consented && withdrawal(withdrawNote)}
    </>}

    {!fresh && session && profileDone && openInFlow > 0 && !continuing && <div className={card}>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">{t("progress_update")}</p>
      <h2 className="mt-2 text-3xl font-semibold tracking-[-0.02em]">{t("your_workstyle_profile_is_complete")}</h2>
      <p className="mt-4 max-w-2xl leading-7 text-slate-700">{openInFlow === 1 ? t("one_development_question_open") : t("you_still_have_value_optional_development_questions", { p0: openInFlow })} {t("they_do_not_change_your_report_you")}</p>
      <div className="mt-7 flex flex-wrap gap-3">
        <Link href="/me/profile/workstyle" className={button}>{t("view_workstyle_profile_m080")}</Link>
        <button className={secondary} onClick={() => { setContinuing(true); setPosition(firstOpen(flow, session)); }}>{t("continue_development_questions")}</button>
        <Link href="/dashboard" className={secondary}>{t("go_to_dashboard_m082")}</Link>
      </div>
    </div>}

    {!fresh && session && profileDone && openInFlow === 0 && <>
      <div className={card}>
        {mixed && session.completed_at ? <>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">{t("complete")}</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-[-0.02em]">{t("all_done_thank_you")}</h2>
          <p className="mt-4 max-w-2xl leading-7 text-slate-700">{t("your_workstyle_profile_is_complete_and_you")}</p>
        </> : <>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">{t("all_done")}</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-[-0.02em]">{t("your_workstyle_profile_is_ready")}</h2>
          <p className="mt-4 max-w-2xl leading-7 text-slate-700">{t("only_people_you_share_it_with_such")}</p>
        </>}
        {actions}
        {mixed && session.completed_at && <p className="mt-6 text-sm text-slate-600">{t("your")} {DEVELOPMENT_COUNT} {t("development_responses_do_not_change_your_current")} <Link href={RESEARCH_HREF} className="underline">{t("manage_research_participation")}</Link></p>}
      </div>
      <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
        {!session.consent_version && !session.withdrawn_at && <Link href={RESEARCH_HREF} className="min-h-11 py-3 underline">{t("support_research_later")}</Link>}
        {consented && !mixed && openResearch > 0 && <Link href={RESEARCH_HREF} className="min-h-11 py-3 underline">{t("continue_development_questions_m093")}</Link>}
        {!confirmRetake ? <button className="min-h-11 underline" onClick={() => setConfirmRetake(true)}>{t("answer_the_workstyle_questions_again_later")}</button>
          : <div className="w-full rounded-2xl border border-slate-200 bg-white p-4 leading-6">
            <p>{t("you_will_answer_the_situations_again_your")}</p>
            <div className="mt-3 flex flex-wrap gap-3">
              <button className={secondary} disabled={pending} onClick={() => run(async () => {
                const result = await startWorkstyleProduct(true); if (!result.ok) return setError(serverError(result.error));
                setSession(result.session); setPosition(0); setConfirmRetake(false); setChoice(null); setConsent(false); setStarted(false);
              })}>{t("start_again")}</button>
              <button className={secondary} onClick={() => setConfirmRetake(false)}>{t("cancel_m097")}</button>
            </div>
          </div>}
      </div>
    </>}
  </section>;
}
