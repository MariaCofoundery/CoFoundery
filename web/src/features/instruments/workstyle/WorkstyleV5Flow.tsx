"use client";

import { useTranslations, useLocale } from "next-intl";

import Link from "next/link";
import { useState, useTransition } from "react";

import { workstyleSessionItems, WORKSTYLE_PRETEST_V5, type WorkstyleItem } from "@/features/instruments/workstyle/registry";
import { saveWorkstyleV5, startWorkstyleV5 } from "@/features/instruments/workstyle/actions";
import { WorkstyleProgress, WorkstyleQuestion, type WorkstyleCompletionContext } from "@/features/instruments/workstyle/WorkstyleQuestion";
import type { PretestSession } from "@/features/instruments/workstyle/data";

/**
 * Aktueller Ablauf (8.5a-v5, seit 13.11.2026): die 29 Produktfragen der Zweierwahl-Fassung.
 *
 * Kein Forschungsteil, keine Einwilligung, kein Kontext, keine Antwortzeiten.
 * Das Arbeitsprofil ist mit der 29. Antwort fertig (submitted_at, gesetzt von
 * der DB). Die Reihenfolge kommt aus dem Manifest; die DB nimmt eine Antwort nur
 * an, wenn alle vorherigen schon da sind. Ein frueheres v3-Profil bleibt fuer
 * die Person selbst lesbar, zaehlt aber nicht mehr fuer Teams, Freigaben und FIND. Eine frühere Fassung (v4, v3) wird
 * von hier aus nicht fortgesetzt; wer dort etwas offen hat, beginnt Fassung 5.
 *
 * VOR DER ERSTEN FRAGE steht die Anleitung aus dem Manifest („Wähle … was im Arbeitsalltag eher zu dir passt – nicht
 * die, die du für besser hältst“); bei jeder Zweierwahl erinnert eine Zeile daran (WorkstyleQuestion).
 */
const items = workstyleSessionItems("8.5a-v5", null);

const button =
  "inline-flex min-h-12 items-center justify-center rounded-full bg-violet-800 px-6 py-3 font-semibold text-white transition hover:bg-violet-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-200 disabled:opacity-50";
const secondary =
  "inline-flex min-h-12 items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-800 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-100 disabled:opacity-50";
const card = "rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.05)] sm:p-9";

const answered = (session: PretestSession | null, item: WorkstyleItem) => Boolean(session?.answers.some(answer => answer.item_key === item.item_key));
function firstOpen(session: PretestSession | null) {
  const index = items.findIndex(item => !answered(session, item));
  return index === -1 ? items.length - 1 : index;
}

export function WorkstyleV5Flow({ initialSession, context = null, previousVersion = false }: {
  initialSession: PretestSession | null; context?: WorkstyleCompletionContext | null; previousVersion?: boolean;
}) {
  const t = useTranslations("workstyleFlow");
  const locale = useLocale();
  // Server actions answer in German; keep their specific guidance in DE, use the generic EN line otherwise.
  const serverError = (message: string) => locale === "en" ? t("something_went_wrong_your_saved_responses_are") : message;

  const [session, setSession] = useState(initialSession);
  const [position, setPosition] = useState(() => firstOpen(initialSession));
  // Nach "Los geht's" sofort zur ersten Frage - auch bevor es eine Antwort gibt.
  const [started, setStarted] = useState(false);
  const [confirmRetake, setConfirmRetake] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  function run(action: () => Promise<void>) {
    setError("");
    startTransition(async () => { try { await action(); } catch { setError(t("something_went_wrong_your_saved_responses_are")); } });
  }
  const profileDone = Boolean(session?.submitted_at);
  const open = items.filter(item => !answered(session, item)).length;
  const names = context?.partnerNames.length ? new Intl.ListFormat(locale, { style: "long", type: "conjunction" }).format(context.partnerNames) : null;
  const fresh = !session || (!started && !profileDone && session.answers.length === 0);

  if (fresh) return <section className="mt-8">
    {error && <p role="alert" className="mb-5 rounded-xl bg-red-50 p-4 text-red-900">{error}</p>}
    <form className={`space-y-6 ${card}`} onSubmit={event => {
      event.preventDefault();
      run(async () => {
        const result = await startWorkstyleV5();
        if (!result.ok) return setError(serverError(result.error));
        setSession(result.session); setStarted(true); setPosition(firstOpen(result.session));
      });
    }}>
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-[-0.01em]">{t("take_a_moment_to_settle_in")}</h2>
        <p className="leading-7 text-slate-700">{t("feel_free_to_grab_a_coffee_tea")}</p>
        <p className="leading-7 text-slate-700">{t("there_are_no_right_or_wrong_answers")}</p>
        <p className="rounded-2xl bg-violet-50/60 p-4 font-medium leading-7 text-slate-900" data-workstyle-instruction>{WORKSTYLE_PRETEST_V5.instruction?.[locale === "en" ? "en" : "de"]}</p>
        <p className="leading-7 text-slate-700">{t("each_response_is_saved_straight_away_you")}</p>
      </div>
      <div className="space-y-3 rounded-2xl bg-violet-50/60 p-5">
        <p className="font-semibold text-slate-900">{t("your_workstyle_profile_is_based_on")} {items.length} {t("situations")}</p>
        {previousVersion && <p className="leading-7 text-slate-700">{t("v4_previous_version_note")}</p>}
      </div>
      <button className={button} disabled={pending}>{t("lets_begin")}</button>
    </form>
  </section>;

  const s = session!;
  return <section className="mt-8">
    {error && <p role="alert" className="mb-5 rounded-xl bg-red-50 p-4 text-red-900">{error}</p>}

    {open > 0 && <>
      <WorkstyleProgress position={position} total={items.length} noun={t("question")} ariaLabel={t("workstyle_profile_progress")} />
      <WorkstyleQuestion key={items[position].item_key} item={items[position]} initial={s.answers.find(answer => answer.item_key === items[position].item_key)} pending={pending}
        last={open === 1 && !answered(s, items[position])} canGoBack={position > 0} onBack={() => setPosition(position - 1)}
        onSave={value => run(async () => {
          const item = items[position];
          const result = await saveWorkstyleV5(s.assessment_id, item.item_key, {
            response_value: typeof value === "number" ? value : null,
            response_option: typeof value === "string" && value !== "cannot_assess" ? value : null,
            missing_reason: value === "cannot_assess" ? "cannot_assess" : null,
            rendered_order: item.rendered_order ?? null,
          });
          if (!result.ok) return setError(serverError(result.error));
          const saved = { ...s, submitted_at: result.submitted_at,
            answers: [...s.answers.filter(answer => answer.item_key !== result.answer.item_key), result.answer] };
          setSession(saved);
          // Naechste offene Frage nach der aktuellen, sonst die erste offene.
          const next = items.findIndex((candidate, index) => index > position && !answered(saved, candidate));
          setPosition(next !== -1 ? next : firstOpen(saved));
        })} />
      <p className="mt-6 text-center text-sm text-slate-600">
        {t("each_response_is_saved_m074")} <Link href="/dashboard" className="font-medium text-slate-900 underline">{t("continue_later_m075")}</Link>
      </p>
    </>}

    {open === 0 && profileDone && <>
      <div className={card}>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">{t("all_done")}</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-[-0.02em]">{t("your_workstyle_profile_is_ready")}</h2>
        <p className="mt-4 max-w-2xl leading-7 text-slate-700">{t("only_people_you_share_it_with_such")}</p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link href="/me/profile/workstyle" className={button}>{t("view_workstyle_profile")}</Link>
          {/* Phase 11.7B: geteilt wird einmal mit dem Team, nicht je Person. */}
          {context?.teamId && <Link href={`/teams/${context.teamId}/workstyle`} className={secondary}>{names ? t("view_team_workstyle_with_value", { p0: names }) : t("view_team_workstyle")}</Link>}
          <Link href="/dashboard" className={secondary}>{t("go_to_dashboard")}</Link>
        </div>
      </div>
      <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
        {!confirmRetake ? <button className="min-h-11 underline" onClick={() => setConfirmRetake(true)}>{t("answer_the_workstyle_questions_again_later")}</button>
          : <div className="w-full rounded-2xl border border-slate-200 bg-white p-4 leading-6">
            <p>{t("you_will_answer_the_situations_again_your")}</p>
            <div className="mt-3 flex flex-wrap gap-3">
              <button className={secondary} disabled={pending} onClick={() => run(async () => {
                const result = await startWorkstyleV5(true); if (!result.ok) return setError(serverError(result.error));
                setSession(result.session); setPosition(0); setConfirmRetake(false); setStarted(true);
              })}>{t("start_again")}</button>
              <button className={secondary} onClick={() => setConfirmRetake(false)}>{t("cancel_m097")}</button>
            </div>
          </div>}
      </div>
    </>}
  </section>;
}
