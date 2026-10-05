"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import consentV2 from "../../../../docs/founder-workstyle-research-consent-v2.json";
import consentV3 from "../../../../docs/founder-workstyle-research-consent-v3.json";
import { workstyleResponseOptions, workstyleSessionItems, type WorkstyleItem } from "@/features/instruments/workstyle/registry";
import { startWorkstylePretest, saveWorkstyleAnswer, saveWorkstyleFeedback, withdrawWorkstyleResearch, finishWorkstyleV2, setWorkstylePosition, saveWorkstyleV3 } from "@/features/instruments/workstyle/actions";
import { WorkstyleFeedback } from "@/features/instruments/workstyle/WorkstylePretest";
import type { PretestSession, ResearchAnswer, ResearchContext } from "@/features/instruments/workstyle/data";

const button =
  "inline-flex min-h-12 items-center justify-center rounded-full bg-violet-800 px-6 py-3 font-semibold text-white transition hover:bg-violet-900 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-200 disabled:opacity-50";
const secondary =
  "inline-flex min-h-12 items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-3 font-semibold text-slate-800 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-100 disabled:opacity-50";
const field = "mt-2 block w-full rounded-xl border border-slate-300 bg-white p-3";
const versionItems = { "8.5a-v2": workstyleSessionItems("8.5a-v2", null), "8.5a-v3": workstyleSessionItems("8.5a-v3", null) };

/** Kontext fuer den Abschluss: aus welcher Einladung / welchem Team jemand kommt. */
export type WorkstyleCompletionContext = { teamId: string | null; partnerNames: string[] };

export function WorkstyleProgress({ position, total, noun = "Frage", ariaLabel = "Fortschritt" }: { position: number; total: number; noun?: string; ariaLabel?: string }) {
  const label = `${noun} ${position + 1} von ${total}`;
  return (
    <div className="mb-6">
      <div className="mb-2 flex items-center justify-between text-sm text-slate-600">
        <span>{label}</span>
      </div>
      {/* Fortschritt ist Fortschritt, keine Bewertung: Markenfarben statt Ampel-Gruen. */}
      <div role="progressbar" aria-label={ariaLabel} aria-valuemin={1} aria-valuemax={total} aria-valuenow={position + 1} aria-valuetext={label} className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-gradient-to-r from-violet-600 to-cyan-400 transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${((position + 1) / total) * 100}%` }} />
      </div>
    </div>
  );
}

export function WorkstyleQuestion({ item, initial, pending, last, canGoBack, onSave, onBack }: {
  item: WorkstyleItem; initial?: ResearchAnswer; pending: boolean; last: boolean; canGoBack: boolean;
  onSave: (value: number | string, elapsed: number) => void; onBack: () => void;
}) {
  const [value, setValue] = useState<number | string | null>(initial?.missing_reason ?? initial?.response_option ?? initial?.response_value ?? null);
  const [started] = useState(() => Date.now());
  const card = useRef<HTMLDivElement>(null);
  const question = useRef<HTMLLegendElement>(null);
  useEffect(() => {
    // Phase 11.5: Nach jedem Wechsel steht die neue Frage vollstaendig im Blick.
    // scroll-mt beruecksichtigt die feste Kopfleiste der App; gescrollt wird nur,
    // wenn der Kartenanfang nicht sichtbar ist. Danach Fokus auf die Frage, damit
    // Screenreader sie ansagen - ohne zweiten Sprung.
    const box = card.current;
    if (box) {
      const top = box.getBoundingClientRect().top;
      const offset = parseFloat(getComputedStyle(box).scrollMarginTop) || 0;
      // "instant": die globale scroll-behavior:smooth wuerde sonst animieren und die Frage erst verspaetet zeigen.
      if (top < offset || top > window.innerHeight * 0.6) box.scrollIntoView({ block: "start", behavior: "instant" });
    }
    question.current?.focus({ preventScroll: true });
  }, []);
  // Visual separation only: concatenate these two substrings to recover the exact supplied prompt.
  const split = Math.max(0, item.prompt.lastIndexOf("Wie "), item.prompt.lastIndexOf("Was "));
  return <div ref={card} className="scroll-mt-36 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.05)] sm:p-9">
    <form onSubmit={event => { event.preventDefault(); if (value !== null) onSave(value, Date.now() - started); }}>
      <fieldset disabled={pending}>
        <legend ref={question} tabIndex={-1} className="mb-8 w-full outline-none">
          <span className="block text-lg leading-8 text-slate-600">{item.prompt.slice(0, split)}</span>
          <span className="mt-3 block text-2xl font-semibold leading-9 tracking-[-0.01em] text-slate-950">{item.prompt.slice(split)}</span>
        </legend>
        {item.response_format === "comparative" && <div className="mb-6 grid gap-3" aria-label="Zwei Vorgehensweisen">
          {item.alternatives?.map(alternative => <p key={alternative.option_id} className="flex gap-3 rounded-2xl bg-slate-50 p-4 leading-7 text-slate-800">
            <span aria-hidden="true" className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-sm font-semibold text-violet-800 ring-1 ring-violet-200">{alternative.option_id}</span>
            <span><span className="sr-only">{alternative.option_id}: </span>{alternative.label}</span>
          </p>)}
        </div>}
        <div className="grid gap-2.5">
          {workstyleResponseOptions(item).map(option => <label key={option.value} className={`flex min-h-14 cursor-pointer items-center gap-4 rounded-2xl border px-5 py-3.5 leading-6 transition ${value === option.value ? "border-violet-500 bg-violet-50/70 ring-1 ring-violet-200" : "border-slate-200 hover:border-slate-300"}`}>
            <input type="radio" className="h-5 w-5 shrink-0 accent-violet-700" name={item.item_key} value={option.value} checked={value === option.value} onChange={() => setValue(option.value)} />{option.label}
          </label>)}
          <label className={`mt-2 flex min-h-14 cursor-pointer items-center gap-4 rounded-2xl border border-dashed px-5 py-3.5 leading-6 text-slate-700 transition ${value === "cannot_assess" ? "border-violet-400 bg-violet-50/50" : "border-slate-300 hover:border-slate-400"}`}>
            <input type="radio" className="h-5 w-5 shrink-0 accent-violet-700" name={item.item_key} value="cannot_assess" checked={value === "cannot_assess"} onChange={() => setValue("cannot_assess")} />Kann ich noch nicht einschätzen
          </label>
        </div>
      </fieldset>
      <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        {canGoBack ? <button type="button" className={secondary} disabled={pending} onClick={onBack}>Zurück</button> : <span />}
        <button className={button} disabled={pending || value === null}>{pending ? "Wird gespeichert …" : last ? "Abschließen" : "Weiter"}</button>
      </div>
    </form>
  </div>;
}

export function WorkstylePretestV2({ initialSession, version = "8.5a-v2", context = null }: { initialSession: PretestSession | null; version?: "8.5a-v2" | "8.5a-v3"; context?: WorkstyleCompletionContext | null }) {
  const items = versionItems[version];
  const coreCount = items.filter(item => item.usage === "core").length;
  const consentText = version === "8.5a-v3" ? consentV3 : consentV2;
  const [session, setSession] = useState(initialSession);
  const [stage, setStage] = useState<"intro" | "consent" | "context">("intro");
  const [consent, setConsent] = useState(false);
  const [retake, setRetake] = useState(false);
  const [feedbackDone, setFeedbackDone] = useState(Boolean(initialSession?.feedback));
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const [position, setPosition] = useState(initialSession?.resume_position ?? 0);
  function run(action: () => Promise<void>) {
    setError("");
    startTransition(async () => { try { await action(); } catch { setError("Das hat nicht geklappt. Deine gespeicherten Antworten bleiben erhalten. Bitte versuche es erneut."); } });
  }
  const active = session && !session.withdrawn_at;
  const names = context?.partnerNames.length ? new Intl.ListFormat("de", { style: "long", type: "conjunction" }).format(context.partnerNames) : null;
  return <section className="mt-8">
    {error && <p role="alert" className="mb-5 rounded-xl bg-red-50 p-4 text-red-900">{error}</p>}
    {!active && <>
      {stage === "intro" && <div className="space-y-5 rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.05)] sm:p-9">
        <h2 className="text-2xl font-semibold tracking-[-0.01em]">Mach’s dir kurz bequem.</h2>
        <p className="leading-7 text-slate-700">Hol dir gern einen Kaffee, einen Tee oder etwas zum Snacken. Auf den nächsten Seiten geht es um ganz unterschiedliche Situationen aus dem Arbeitsalltag – um Entscheidungen, Zusammenarbeit, offene Fragen und die Art, wie du Dinge angehst.</p>
        <p className="leading-7 text-slate-700">Es gibt keine richtigen oder falschen Antworten. Antworte so, wie du in solchen Situationen meistens wirklich reagierst – nicht so, wie du gern wärst.</p>
        <p className="leading-7 text-slate-700">Insgesamt sind es {items.length} Situationen. {coreCount} davon bilden dein Arbeitsprofil; die übrigen {items.length - coreCount} helfen uns, das Instrument weiterzuentwickeln. Deshalb fragen wir vorher nach deiner Einwilligung zur Forschung.</p>
        <p className="leading-7 text-slate-700">Nimm dir Zeit. Jede Antwort wird sofort gespeichert – du kannst jederzeit aufhören und später weitermachen.</p>
        {session?.withdrawn_at && <p className="rounded-2xl bg-slate-50 p-4 text-sm leading-6">Deine Forschungseinwilligung wurde widerrufen. Dein abgeschlossenes Arbeitsprofil bleibt als private Produktinformation erhalten.</p>}
        <button className={button} onClick={() => setStage("consent")}>Los geht’s</button>
      </div>}
      {stage === "consent" && <div className="space-y-5 rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-9"><h2 className="text-xl font-semibold">Deine Entscheidung zur Forschung</h2>
        {consentText.paragraphs.map(paragraph => <p key={paragraph} className="leading-7">{paragraph}</p>)}
        <label className="flex items-start gap-3"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} className="mt-1 h-5 w-5 accent-violet-700" /><span>{consentText.confirmation}</span></label>
        <button className={button} disabled={!consent} onClick={() => setStage("context")}>Weiter zu den Kontextfragen</button>
      </div>}
      {stage === "context" && <form className="space-y-6 rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-9" onSubmit={event => {
        event.preventDefault(); const data = new FormData(event.currentTarget);
        run(async () => {
          const result = await startWorkstylePretest(consent, { founder_experience: String(data.get("experience")) as ResearchContext["founder_experience"], team_size: String(data.get("team")) as ResearchContext["team_size"], venture_phase: String(data.get("phase")) }, retake, version);
          if (!result.ok) return setError(result.error);
          setSession(result.session); setPosition(result.session.resume_position ?? 0); setFeedbackDone(false);
        });
      }}><h2 className="text-xl font-semibold">Kurz zu deinem Kontext</h2>
        <label className="block">An wie vielen Gründungsvorhaben bist oder warst du bisher als Founder oder Co-Founder aktiv beteiligt?<span className="mt-1 block">Zähle dein aktuelles Vorhaben mit.</span><select name="experience" className={field} required defaultValue=""><option value="" disabled>Bitte auswählen</option><option value="0">0</option><option value="1">1</option><option value="2-3">2–3</option><option value="4-5">4–5</option><option value="6_plus">6 oder mehr</option><option value="prefer_not_to_say">möchte ich nicht angeben</option></select></label>
        <label className="block">Aktuelle Teamsituation<select name="team" className={field} required defaultValue=""><option value="" disabled>Bitte auswählen</option><option value="solo">Solo</option><option value="two">2-Founder-Team</option><option value="larger">Größeres Team</option><option value="no_venture">Noch kein Venture</option></select></label>
        <label className="block">Venture-Phase (optional)<select name="phase" className={field} defaultValue=""><option value="">Keine Angabe</option><option value="idea">Idee / Orientierung</option><option value="building">Aufbau / Erprobung</option><option value="operating">Laufender Betrieb</option></select></label>
        <button disabled={pending} className={button}>Starten</button>
      </form>}
    </>}
    {active && !session.completed_at && <>
      <WorkstyleProgress position={position} total={items.length} />
      <WorkstyleQuestion key={items[position].item_key} item={items[position]} initial={session.answers.find(answer => answer.item_key === items[position].item_key)} pending={pending} last={position === items.length - 1}
        canGoBack={position > 0}
        onBack={() => run(async () => {
          const result = await setWorkstylePosition(session.assessment_id, position - 1);
          if (!result.ok) return setError(result.error);
          setPosition(position - 1);
        })}
        onSave={(value, elapsed) => run(async () => {
        const input = { response_value: value === "cannot_assess" ? null : value, missing_reason: value === "cannot_assess" ? value : null };
        if (version === "8.5a-v3") {
          const result = await saveWorkstyleV3(session.assessment_id, items[position].item_key, {
            response_value: typeof value === "number" ? value : null,
            response_option: typeof value === "string" && value !== "cannot_assess" ? value : null,
            missing_reason: value === "cannot_assess" ? "cannot_assess" : null,
            rendered_order: items[position].rendered_order ?? null,
          }, elapsed, position === items.length - 1);
          if (!result.ok) return setError(result.error);
          setSession({ ...session, completed_at: result.completed_at, resume_position: Math.min(position + 1, items.length - 1),
            answers: [...session.answers.filter(answer => answer.item_key !== result.answer.item_key), result.answer] });
          if (!result.completed_at) setPosition(position + 1);
        } else if (position === items.length - 1) {
          const result = await finishWorkstyleV2(session.assessment_id, input, elapsed);
          if (!result.ok) return setError(result.error);
          setSession(result.session);
        } else {
          const result = await saveWorkstyleAnswer(session.assessment_id, items[position].item_key, input, elapsed, "8.5a-v2");
          if (!result.ok) return setError(result.error);
          setSession({ ...session, resume_position: position + 1, answers: [...session.answers.filter(answer => answer.item_key !== result.answer.item_key), result.answer] });
          setPosition(position + 1);
        }
      })} />
      <p className="mt-6 text-center text-sm text-slate-600">
        Jede Antwort ist gespeichert. <Link href="/dashboard" className="font-medium text-slate-900 underline">Später weitermachen</Link>
      </p>
    </>}
    {active && session.completed_at && <>
      {/* Phase 11.5: Erst der Erfolg und der Weg zum eigenen Arbeitsprofil;
          Forschung bleibt vollstaendig, aber nachgeordnet. */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.05)] sm:p-9">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">Geschafft</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-[-0.02em]">Dein Arbeitsprofil ist bereit.</h2>
        <p className="mt-4 max-w-2xl leading-7 text-slate-700">Dein Arbeitsprofil bleibt privat, bis du etwas freigibst. Niemand sieht deine Antworten automatisch – auch nicht die Person, die dich eingeladen hat.</p>
        <div className="mt-7 flex flex-wrap gap-3">
          {version === "8.5a-v3" && <Link href="/me/profile/workstyle" className={button}>Arbeitsprofil ansehen</Link>}
          {version === "8.5a-v3" && context && <Link href="/me/profile/workstyle#freigaben" className={secondary}>{names ? `Freigaben für ${names} prüfen` : "Freigaben prüfen"}</Link>}
          {context?.teamId && <Link href={`/teams/${context.teamId}`} className={secondary}>Zu eurem Team</Link>}
          <Link href="/dashboard" className={secondary}>Zum Dashboard</Link>
        </div>
      </div>
      <details className="mt-8 rounded-2xl border border-slate-200 bg-white/70 p-5">
        <summary className="cursor-pointer text-sm font-medium text-slate-700">Forschung & Feedback (freiwillig)</summary>
        <div className="mt-4">
          {!feedbackDone ? <WorkstyleFeedback v2 items={items} pending={pending} onSkip={() => setFeedbackDone(true)} onSave={feedback => run(async () => {
            const result = await saveWorkstyleFeedback(session.assessment_id, feedback, version);
            if (!result.ok) return setError(result.error); setFeedbackDone(true);
          })} /> : <p role="status" className="text-sm">Danke für dein Feedback zur Forschung.</p>}
          <button className="mt-6 min-h-11 text-sm underline" disabled={pending} onClick={() => { setSession(null); setStage("consent"); setConsent(false); setRetake(true); }}>Späteren Stand neu erheben</button>
        </div>
      </details>
    </>}
    {active && <div className="mt-10 border-t border-slate-200 pt-5"><p className="text-sm text-slate-600">Die Forschungsteilnahme ist freiwillig.</p><button disabled={pending} className="mt-2 min-h-11 text-sm underline" onClick={() => run(async () => {
      const result = await withdrawWorkstyleResearch(); if (!result.ok) return setError(result.error);
      setSession(session.completed_at ? { ...session, withdrawn_at: new Date().toISOString() } : null); setStage("intro"); setConsent(false);
    })}>Forschungseinwilligung widerrufen</button></div>}
  </section>;
}
