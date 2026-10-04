"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import consentText from "../../../../docs/founder-workstyle-research-consent-v2.json";
import { WORKSTYLE_PRETEST_V2, workstyleSessionItems, type WorkstyleItem } from "@/features/instruments/workstyle/registry";
import { startWorkstylePretest, saveWorkstyleAnswer, saveWorkstyleFeedback, withdrawWorkstyleResearch, finishWorkstyleV2, setWorkstylePosition } from "@/features/instruments/workstyle/actions";
import { WorkstyleFeedback } from "@/features/instruments/workstyle/WorkstylePretest";
import type { PretestSession, ResearchAnswer, ResearchContext } from "@/features/instruments/workstyle/data";

const button = "inline-flex min-h-12 items-center justify-center rounded-xl bg-violet-800 px-6 py-3 font-semibold text-white disabled:opacity-50";
const field = "mt-2 block w-full rounded-xl border border-slate-300 bg-white p-3";
const items = workstyleSessionItems("8.5a-v2", null);

function Question({ item, initial, pending, last, onSave }: { item: WorkstyleItem; initial?: ResearchAnswer; pending: boolean; last: boolean; onSave: (value: number | "cannot_assess", elapsed: number) => void }) {
  const [value, setValue] = useState<number | "cannot_assess" | null>(initial?.missing_reason ?? initial?.response_value ?? null);
  const [started] = useState(() => Date.now());
  const question = useRef<HTMLLegendElement>(null);
  useEffect(() => {
    question.current?.focus({ preventScroll: true });
    question.current?.scrollIntoView({ block: "start" });
  }, []);
  // Visual separation only: concatenate these two substrings to recover the exact supplied prompt.
  const split = item.prompt.lastIndexOf("Wie ");
  return <form onSubmit={event => { event.preventDefault(); if (value !== null) onSave(value, Date.now() - started); }}>
    <fieldset disabled={pending}>
      <legend ref={question} tabIndex={-1} className="mb-7 mt-6 w-full outline-none">
        <span className="block text-xl leading-8 text-slate-700">{item.prompt.slice(0, split)}</span>
        <span className="mt-4 block text-2xl font-semibold leading-9">{item.prompt.slice(split)}</span>
      </legend>
      <div className="grid gap-3">
        {WORKSTYLE_PRETEST_V2.response_formats[item.response_format].map(option => <label key={option.value} className={`flex min-h-14 cursor-pointer items-center gap-4 rounded-xl border px-5 py-4 ${value === option.value ? "border-violet-700 bg-violet-50" : "border-slate-200"}`}>
          <input type="radio" name={item.item_key} value={option.value} checked={value === option.value} onChange={() => setValue(option.value)} />{option.label}
        </label>)}
        <label className="mt-2 flex min-h-14 cursor-pointer items-center gap-4 rounded-xl border border-dashed border-slate-300 px-5 py-4">
          <input type="radio" name={item.item_key} value="cannot_assess" checked={value === "cannot_assess"} onChange={() => setValue("cannot_assess")} />Kann ich noch nicht einschätzen
        </label>
      </div>
    </fieldset>
    <button className={`${button} mt-7 w-full sm:w-auto`} disabled={pending || value === null}>{pending ? "Wird gespeichert …" : last ? "Fragebogen abschließen" : "Weiter"}</button>
  </form>;
}

export function WorkstylePretestV2({ initialSession }: { initialSession: PretestSession | null }) {
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
  return <section className="mt-8">
    {error && <p role="alert" className="mb-5 rounded-xl bg-red-50 p-4 text-red-900">{error}</p>}
    {!active && <>
      {stage === "intro" && <div className="space-y-5">
        <p className="leading-7">In den nächsten Fragen geht es um ganz unterschiedliche Situationen aus dem Arbeitsalltag – um Entscheidungen, Zusammenarbeit, offene Fragen und die Art, wie du Dinge angehst.</p>
        <p className="leading-7">Antworte so, wie es bei dir meistens wirklich läuft. Nicht so, wie es im Idealfall sein sollte.</p>
        <p>Es gibt keine richtigen oder falschen Antworten.</p>
        {session?.withdrawn_at && <p>Deine Forschungseinwilligung wurde widerrufen. Dein abgeschlossenes Arbeitsprofil bleibt als private Produktinformation erhalten.</p>}
        <button className={button} onClick={() => setStage("consent")}>Zur Forschungseinwilligung</button>
      </div>}
      {stage === "consent" && <div className="space-y-5"><h2 className="text-xl font-semibold">Deine Entscheidung zur Forschung</h2>
        {consentText.paragraphs.map(paragraph => <p key={paragraph} className="leading-7">{paragraph}</p>)}
        <label className="flex items-start gap-3"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} className="mt-1" /><span>{consentText.confirmation}</span></label>
        <button className={button} disabled={!consent} onClick={() => setStage("context")}>Weiter zu den Kontextfragen</button>
      </div>}
      {stage === "context" && <form className="space-y-6" onSubmit={event => {
        event.preventDefault(); const data = new FormData(event.currentTarget);
        run(async () => {
          const result = await startWorkstylePretest(consent, { founder_experience: String(data.get("experience")) as ResearchContext["founder_experience"], team_size: String(data.get("team")) as ResearchContext["team_size"], venture_phase: String(data.get("phase")) }, retake, "8.5a-v2");
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
      <progress className="h-1 w-full accent-violet-600" max={items.length} value={position} aria-label="Fortschritt" />
      <Question key={items[position].item_key} item={items[position]} initial={session.answers.find(answer => answer.item_key === items[position].item_key)} pending={pending} last={position === items.length - 1} onSave={(value, elapsed) => run(async () => {
        const input = { response_value: value === "cannot_assess" ? null : value, missing_reason: value === "cannot_assess" ? value : null };
        if (position === items.length - 1) {
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
      {position > 0 && <button disabled={pending} onClick={() => run(async () => {
        const result = await setWorkstylePosition(session.assessment_id, position - 1);
        if (!result.ok) return setError(result.error);
        setPosition(position - 1);
      })} className="mt-4 block min-h-11 underline">Zur vorherigen Frage</button>}
    </>}
    {active && session.completed_at && <>
      <h2 className="text-2xl font-semibold">Danke für deine Teilnahme.</h2><p className="mt-3">Deine Antworten sind gespeichert. Dein Arbeitsprofil bleibt privat.</p>
      {!feedbackDone ? <WorkstyleFeedback v2 items={items} pending={pending} onSkip={() => setFeedbackDone(true)} onSave={feedback => run(async () => {
        const result = await saveWorkstyleFeedback(session.assessment_id, feedback, "8.5a-v2");
        if (!result.ok) return setError(result.error); setFeedbackDone(true);
      })} /> : <p role="status" className="mt-4">Alles erledigt. Danke für deine Teilnahme.</p>}
      <button className="mt-6 min-h-11 underline" disabled={pending} onClick={() => { setSession(null); setStage("consent"); setConsent(false); setRetake(true); }}>Späteren Stand neu erheben</button>
    </>}
    {active && <div className="mt-10 border-t border-slate-200 pt-5"><p className="text-sm text-slate-600">Die Forschungsteilnahme ist freiwillig.</p><button disabled={pending} className="mt-2 min-h-11 text-sm underline" onClick={() => run(async () => {
      const result = await withdrawWorkstyleResearch(); if (!result.ok) return setError(result.error);
      setSession(session.completed_at ? { ...session, withdrawn_at: new Date().toISOString() } : null); setStage("intro"); setConsent(false);
    })}>Forschungseinwilligung widerrufen</button></div>}
  </section>;
}
