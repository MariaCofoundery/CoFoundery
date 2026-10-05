"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import consentV3 from "../../../../docs/founder-workstyle-research-consent-v3.json";
import { workstyleSessionItems, type WorkstyleItem } from "@/features/instruments/workstyle/registry";
import { workstyleV3Item } from "@/features/instruments/workstyle/researchSets";
import { saveWorkstyleFeedback, saveWorkstyleV3, startWorkstyleProduct, startWorkstyleResearch, withdrawWorkstyleResearch } from "@/features/instruments/workstyle/actions";
import { WorkstyleProgress, WorkstyleQuestion, type WorkstyleCompletionContext } from "@/features/instruments/workstyle/WorkstylePretestV2";
import { WorkstyleFeedback } from "@/features/instruments/workstyle/WorkstylePretest";
import type { PretestSession, ResearchContext } from "@/features/instruments/workstyle/data";

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
  return <div className="grid gap-4">
    <label className="block text-sm">An wie vielen Gründungsvorhaben bist oder warst du bisher als Founder oder Co-Founder aktiv beteiligt?<span className="mt-1 block text-slate-600">Zähle dein aktuelles Vorhaben mit.</span><select name="experience" className={field} required defaultValue=""><option value="" disabled>Bitte auswählen</option><option value="0">0</option><option value="1">1</option><option value="2-3">2–3</option><option value="4-5">4–5</option><option value="6_plus">6 oder mehr</option><option value="prefer_not_to_say">möchte ich nicht angeben</option></select></label>
    <label className="block text-sm">Aktuelle Teamsituation<select name="team" className={field} required defaultValue=""><option value="" disabled>Bitte auswählen</option><option value="solo">Solo</option><option value="two">2-Founder-Team</option><option value="larger">Größeres Team</option><option value="no_venture">Noch kein Venture</option></select></label>
    <label className="block text-sm">Venture-Phase (optional)<select name="phase" className={field} defaultValue=""><option value="">Keine Angabe</option><option value="idea">Idee / Orientierung</option><option value="building">Aufbau / Erprobung</option><option value="operating">Laufender Betrieb</option></select></label>
  </div>;
}
const contextFrom = (data: FormData): ResearchContext => ({ founder_experience: String(data.get("experience")) as ResearchContext["founder_experience"], team_size: String(data.get("team")) as ResearchContext["team_size"], venture_phase: String(data.get("phase")) });

function ConsentDetails({ consent, onConsent }: { consent: boolean; onConsent: (value: boolean) => void }) {
  return <div className="space-y-4">
    <p className="text-sm leading-6 text-slate-700">Damit wir die Entwicklungsfragen auswerten dürfen, brauchen wir deine Einwilligung. Ausgewertet werden pseudonymisiert deine Antworten – auch die zu deinem Arbeitsprofil –, zwei kurze Angaben zu deinem Kontext und die Bearbeitungszeiten. Niemand im Team und kein Advisor sieht die Entwicklungsantworten. Du kannst die Einwilligung jederzeit widerrufen; ein fertiges Arbeitsprofil bleibt erhalten.</p>
    <details className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
      <summary className="cursor-pointer font-medium text-slate-900">Einwilligungstext lesen</summary>
      <div className="mt-3 space-y-3">{consentV3.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}</div>
    </details>
    <ContextFields />
    <label className="flex items-start gap-3 text-sm leading-6"><input type="checkbox" checked={consent} onChange={event => onConsent(event.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-violet-700" /><span>{consentV3.confirmation}</span></label>
  </div>;
}

export function WorkstyleProfileFlow({ initialSession, part = "profile", context = null }: {
  initialSession: PretestSession | null; part?: "profile" | "research"; context?: WorkstyleCompletionContext | null;
}) {
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
    startTransition(async () => { try { await action(); } catch { setError("Das hat nicht geklappt. Deine gespeicherten Antworten bleiben erhalten. Bitte versuche es erneut."); } });
  }
  const profileDone = Boolean(session?.submitted_at);
  const consented = Boolean(session?.consent_version) && !session?.withdrawn_at;
  const mixed = Boolean(storedOrder(session)?.some(isCore));
  const flow = flowItems(session);
  const openInFlow = flow.filter(item => !answered(session, item)).length;
  const research = researchItemsOf(session);
  const openResearch = consented ? research.filter(item => !answered(session, item)).length : 0;
  const names = context?.partnerNames.length ? new Intl.ListFormat("de", { style: "long", type: "conjunction" }).format(context.partnerNames) : null;
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
          if (!result.ok) return setError(result.error);
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
    <Link href="/me/profile/workstyle" className={button}>Arbeitsprofil ansehen</Link>
    {/* Phase 11.7B: geteilt wird einmal mit dem Team, nicht je Person. */}
    {context?.teamId && <Link href={`/teams/${context.teamId}/workstyle`} className={secondary}>{names ? `Zum Zusammenspiel mit ${names}` : "Zu eurem Zusammenspiel"}</Link>}
    <Link href="/dashboard" className={secondary}>Zum Dashboard</Link>
  </div>;

  const withdrawal = (note: string) => <div className="mt-10 border-t border-slate-200 pt-5 text-sm leading-6 text-slate-600">
    {!confirmWithdraw ? <button className="min-h-11 underline" onClick={() => setConfirmWithdraw(true)}>Teilnahme an den Entwicklungsfragen beenden</button>
      : <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <p>{note}</p>
        <div className="mt-3 flex flex-wrap gap-3">
          <button className={secondary} disabled={pending} onClick={() => run(async () => {
            const result = await withdrawWorkstyleResearch(); if (!result.ok) return setError(result.error);
            setSession(session?.submitted_at ? { ...session, withdrawn_at: new Date().toISOString(), item_order: null, research_set: null, research_set_version: null } : null);
            setConfirmWithdraw(false); setPosition(0); setChoice(null); setConsent(false);
          })}>Forschungseinwilligung widerrufen</button>
          <button className={secondary} onClick={() => setConfirmWithdraw(false)}>Abbrechen</button>
        </div>
      </div>}
  </div>;
  const withdrawNote = profileDone
    ? "Deine Entwicklungsantworten, Kontextangaben, Zeiten und dein Feedback werden gelöscht. Dein Arbeitsprofil bleibt."
    : "Deine noch nicht abgeschlossene Teilnahme wird dabei gelöscht – so steht es in der Einwilligung. Danach kannst du dein Arbeitsprofil mit 29 Situationen neu beginnen.";

  if (part === "research") return <section className="mt-8">
    {error && <p role="alert" className="mb-5 rounded-xl bg-red-50 p-4 text-red-900">{error}</p>}
    {!profileDone && (mixed && consented
      ? <div className={`space-y-4 ${card}`}><h2 className="text-xl font-semibold">Dein Fragebogen läuft noch</h2><p className="leading-7 text-slate-700">Die Entwicklungsfragen sind in deinen Fragebogen eingemischt. Mach einfach dort weiter.</p><Link href="/research/workstyle-pretest?version=8.5a-v3" className={button}>Zum Fragebogen</Link></div>
      : <div className={`space-y-4 ${card}`}><h2 className="text-xl font-semibold">Zuerst dein Arbeitsprofil</h2><p className="leading-7 text-slate-700">Die Entwicklungsfragen stehen dir offen, sobald dein Arbeitsprofil fertig ist – oder du wählst sie gleich zu Beginn mit aus.</p><Link href="/research/workstyle-pretest?version=8.5a-v3" className={button}>Zum Arbeitsprofil</Link></div>)}
    {profileDone && session?.withdrawn_at && <div className={`space-y-4 ${card}`}>
      <h2 className="text-xl font-semibold">Forschungseinwilligung widerrufen</h2>
      <p className="leading-7 text-slate-700">Deine Entwicklungsantworten, Kontextangaben, Zeiten und dein Feedback sind gelöscht. Dein Arbeitsprofil bleibt erhalten.</p>
      <Link href="/me/profile/workstyle" className={secondary}>Zum Arbeitsprofil</Link>
    </div>}
    {profileDone && !session?.withdrawn_at && !session?.consent_version && <form className={`space-y-6 ${card}`} onSubmit={event => {
      event.preventDefault(); const data = new FormData(event.currentTarget);
      run(async () => {
        const result = await startWorkstyleResearch(consent, contextFrom(data));
        if (!result.ok) return setError(result.error);
        setSession(result.session); setPosition(firstOpen(researchItemsOf(result.session), result.session));
      });
    }}>
      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">Freiwillig</p>
        <h2 className="text-2xl font-semibold tracking-[-0.01em]">Made2Found bei der Weiterentwicklung unterstützen</h2>
        <p className="leading-7 text-slate-700">Mit {DEVELOPMENT_COUNT} zusätzlichen Situationen hilfst du uns, das Arbeitsprofil weiterzuentwickeln. Sie verändern dein Arbeitsprofil und deinen Report nicht.</p>
      </div>
      <ConsentDetails consent={consent} onConsent={setConsent} />
      <div className="flex flex-wrap gap-3">
        <button disabled={pending || !consent} className={button}>Entwicklungsfragen starten</button>
        <Link href="/me/profile/workstyle" className={secondary}>Nein, danke</Link>
      </div>
    </form>}
    {profileDone && consented && !session?.completed_at && <>
      {questions(research, "Entwicklungsfrage", "Fortschritt Entwicklungsfragen")}
      <p className="mt-6 text-center text-sm text-slate-600">Jede Antwort ist gespeichert. <Link href="/me/profile/workstyle" className="font-medium text-slate-900 underline">Später weitermachen</Link></p>
      {withdrawal(withdrawNote)}
    </>}
    {profileDone && consented && session?.completed_at && <>
      <div className={card}>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">Danke</p>
        <h2 className="mt-2 text-2xl font-semibold">Du hast die Entwicklungsfragen abgeschlossen.</h2>
        <p className="mt-3 max-w-2xl leading-7 text-slate-700">Deine Antworten helfen uns, das Arbeitsprofil weiterzuentwickeln. An deinem Arbeitsprofil ändert sich dadurch nichts.</p>
        <div className="mt-5">
          {!feedbackDone ? <WorkstyleFeedback v2 items={[...flowItems(session), ...(mixed ? [] : research)]} pending={pending} onSkip={() => setFeedbackDone(true)} onSave={feedback => run(async () => {
            const result = await saveWorkstyleFeedback(session.assessment_id, feedback, "8.5a-v3");
            if (!result.ok) return setError(result.error); setFeedbackDone(true);
          })} /> : <p role="status" className="text-sm">Danke für deine Rückmeldung.</p>}
        </div>
        <Link href="/me/profile/workstyle" className={`mt-6 ${secondary}`}>Zum Arbeitsprofil</Link>
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
        if (!result.ok) return setError(result.error);
        setSession(result.session); setStarted(true); setContinuing(true); setPosition(firstOpen(flowItems(result.session), result.session));
      });
    }}>
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold tracking-[-0.01em]">Mach’s dir kurz bequem.</h2>
        <p className="leading-7 text-slate-700">Nimm dir gern einen Kaffee, einen Tee oder etwas zum Snacken dazu. In den nächsten Situationen geht es um Entscheidungen, Zusammenarbeit, offene Fragen und die Art, wie du Dinge angehst.</p>
        <p className="leading-7 text-slate-700">Es gibt kein Richtig oder Falsch. Antworte so, wie du im echten Arbeitsalltag wahrscheinlich reagieren würdest – nicht so, wie es ideal klingen würde.</p>
        <p className="leading-7 text-slate-700">Jede Antwort wird sofort gespeichert. Du kannst jederzeit aufhören und später weitermachen. Dein Arbeitsprofil bleibt privat, bis du selbst etwas freigibst.</p>
      </div>
      <div className="space-y-3 rounded-2xl bg-violet-50/60 p-5">
        <p className="font-semibold text-slate-900">Dein Arbeitsprofil basiert auf {coreItems.length} Situationen.</p>
        <p className="leading-7 text-slate-700">Wenn du möchtest, kannst du uns zusätzlich mit {DEVELOPMENT_COUNT} Entwicklungsfragen helfen, Made2Found weiterzuentwickeln. Dann sind es insgesamt {coreItems.length + DEVELOPMENT_COUNT} Situationen – die zusätzlichen Fragen werden ganz normal zwischen die anderen gemischt. Sie verändern dein Arbeitsprofil und deinen Report nicht. Ob du mitmachst, entscheidest du frei.</p>
      </div>
      <fieldset className="space-y-3">
        <legend className="mb-3 font-semibold text-slate-900">Wie möchtest du starten?</legend>
        {([
          ["profile", "Nur mein Arbeitsprofil", `${coreItems.length} Situationen`],
          ["research", "Ja, ich unterstütze die Weiterentwicklung", `${coreItems.length + DEVELOPMENT_COUNT} Situationen – ${DEVELOPMENT_COUNT} davon helfen bei der Weiterentwicklung`],
        ] as const).map(([value, title, detail]) => <label key={value} className={`flex min-h-16 cursor-pointer items-start gap-4 rounded-2xl border px-5 py-4 transition ${choice === value ? "border-violet-500 bg-violet-50/70 ring-1 ring-violet-200" : "border-slate-200 hover:border-slate-300"}`}>
          <input type="radio" name="start" value={value} checked={choice === value} onChange={() => setChoice(value)} className="mt-1 h-5 w-5 shrink-0 accent-violet-700" />
          <span><span className="block font-semibold text-slate-900">{title}</span><span className="block text-sm text-slate-600">{detail}</span></span>
        </label>)}
      </fieldset>
      {choice === "research" && <ConsentDetails consent={consent} onConsent={setConsent} />}
      <button className={button} disabled={pending || !choice || (choice === "research" && !consent)}>Los geht’s</button>
    </form>}

    {!fresh && session && openInFlow > 0 && (!profileDone || continuing) && <>
      {questions(flow, "Frage", mixed ? "Fortschritt Fragebogen" : "Fortschritt Arbeitsprofil")}
      <p className="mt-6 text-center text-sm text-slate-600">
        Jede Antwort ist gespeichert. <Link href="/dashboard" className="font-medium text-slate-900 underline">Später weitermachen</Link>
      </p>
      {consented && withdrawal(withdrawNote)}
    </>}

    {!fresh && session && profileDone && openInFlow > 0 && !continuing && <div className={card}>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">Zwischenstand</p>
      <h2 className="mt-2 text-3xl font-semibold tracking-[-0.02em]">Dein Arbeitsprofil ist fertig.</h2>
      <p className="mt-4 max-w-2xl leading-7 text-slate-700">{openInFlow === 1 ? "Du hast noch 1 freiwillige Entwicklungsfrage offen." : `Du hast noch ${openInFlow} freiwillige Entwicklungsfragen offen.`} Sie verändern deinen Report nicht – du kannst sie jetzt beantworten oder einfach später.</p>
      <div className="mt-7 flex flex-wrap gap-3">
        <Link href="/me/profile/workstyle" className={button}>Arbeitsprofil ansehen</Link>
        <button className={secondary} onClick={() => { setContinuing(true); setPosition(firstOpen(flow, session)); }}>Entwicklungsfragen fortsetzen</button>
        <Link href="/dashboard" className={secondary}>Zum Dashboard</Link>
      </div>
    </div>}

    {!fresh && session && profileDone && openInFlow === 0 && <>
      <div className={card}>
        {mixed && session.completed_at ? <>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">Fertig</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-[-0.02em]">Geschafft – danke.</h2>
          <p className="mt-4 max-w-2xl leading-7 text-slate-700">Dein Arbeitsprofil ist fertig, und du hast uns zusätzlich bei der Weiterentwicklung unterstützt. Dein Arbeitsprofil sehen nur die, mit denen du es teilst, etwa dein Team – niemand sieht deine Antworten automatisch, auch nicht die Person, die dich eingeladen hat.</p>
        </> : <>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">Geschafft</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-[-0.02em]">Dein Arbeitsprofil ist bereit.</h2>
          <p className="mt-4 max-w-2xl leading-7 text-slate-700">Dein Arbeitsprofil sehen nur die, mit denen du es teilst, etwa dein Team. Niemand sieht deine Antworten automatisch – auch nicht die Person, die dich eingeladen hat.</p>
        </>}
        {actions}
        {mixed && session.completed_at && <p className="mt-6 text-sm text-slate-600">Deine {DEVELOPMENT_COUNT} Entwicklungsantworten verändern deinen aktuellen Report nicht. <Link href={RESEARCH_HREF} className="underline">Forschungsteilnahme verwalten</Link></p>}
      </div>
      <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
        {!session.consent_version && !session.withdrawn_at && <Link href={RESEARCH_HREF} className="min-h-11 py-3 underline">Forschung später unterstützen</Link>}
        {consented && !mixed && openResearch > 0 && <Link href={RESEARCH_HREF} className="min-h-11 py-3 underline">Entwicklungsfragen fortsetzen</Link>}
        {!confirmRetake ? <button className="min-h-11 underline" onClick={() => setConfirmRetake(true)}>Arbeitsprofil später neu beantworten</button>
          : <div className="w-full rounded-2xl border border-slate-200 bg-white p-4 leading-6">
            <p>Du beantwortest die Situationen dann noch einmal. Dein bisheriges Arbeitsprofil bleibt aktuell, bis die neue Fassung fertig ist; Freigaben gelten für die neue Fassung erst, wenn du sie erneut erteilst.</p>
            <div className="mt-3 flex flex-wrap gap-3">
              <button className={secondary} disabled={pending} onClick={() => run(async () => {
                const result = await startWorkstyleProduct(true); if (!result.ok) return setError(result.error);
                setSession(result.session); setPosition(0); setConfirmRetake(false); setChoice(null); setConsent(false); setStarted(false);
              })}>Neu beginnen</button>
              <button className={secondary} onClick={() => setConfirmRetake(false)}>Abbrechen</button>
            </div>
          </div>}
      </div>
    </>}
  </section>;
}
