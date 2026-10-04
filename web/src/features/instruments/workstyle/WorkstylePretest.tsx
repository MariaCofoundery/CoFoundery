"use client";

import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import consentText from "../../../../docs/founder-workstyle-research-consent-v1.json";
import { WORKSTYLE_PRETEST_V1, previewWorkstyleForm, type WorkstyleItem } from "@/features/instruments/workstyle/registry";
import { startWorkstylePretest, saveWorkstyleAnswer, completeWorkstylePretest, saveWorkstyleFeedback, withdrawWorkstyleResearch } from "@/features/instruments/workstyle/actions";
import type { PretestSession, ResearchAnswer, ResearchContext, ResearchFeedback } from "@/features/instruments/workstyle/data";

const button = "inline-flex min-h-11 items-center justify-center rounded-xl bg-violet-800 px-5 py-3 font-semibold text-white disabled:opacity-50";
const field = "mt-2 block w-full rounded-xl border border-slate-300 bg-white p-3";

function Question({ item, initial, pending, onSave }: { item: WorkstyleItem; initial?: ResearchAnswer; pending: boolean; onSave: (value: number | "cannot_assess", elapsed: number) => void }) {
  const [value, setValue] = useState<number | "cannot_assess" | null>(initial?.missing_reason ?? initial?.response_value ?? null);
  const [started] = useState(() => Date.now());
  const question = useRef<HTMLLegendElement>(null);
  useEffect(() => { question.current?.focus(); }, []);
  return <form onSubmit={event => { event.preventDefault(); if (value !== null) onSave(value, Date.now() - started); }}>
    <fieldset disabled={pending}>
      <legend ref={question} tabIndex={-1} className="my-5 text-xl font-semibold leading-8 outline-none">{item.stem && <span className="mb-3 block text-base font-normal">{item.stem}</span>}{item.prompt}</legend>
      <div className="grid gap-3">
        {WORKSTYLE_PRETEST_V1.response_formats[item.response_format].map(option => <label key={option.value} className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border p-4 ${value === option.value ? "border-violet-700 bg-violet-50" : "border-slate-200"}`}>
          <input type="radio" name={item.item_key} value={option.value} checked={value === option.value} onChange={() => setValue(option.value)} />{option.label}
        </label>)}
        {item.missing_reasons.includes("cannot_assess") && <label className="mt-2 flex min-h-12 items-center gap-3 rounded-xl border border-dashed border-slate-300 p-4">
          <input type="radio" name={item.item_key} value="cannot_assess" checked={value === "cannot_assess"} onChange={() => setValue("cannot_assess")} />Kann ich noch nicht einschätzen
        </label>}
      </div>
    </fieldset>
    <button className={`${button} mt-6`} disabled={pending || value === null}>{pending ? "Wird gespeichert …" : "Speichern und weiter"}</button>
  </form>;
}

export function WorkstyleFeedback({ items, pending, onSave, onSkip, v2 = false }: { v2?: boolean; items: readonly WorkstyleItem[]; pending: boolean; onSave: (feedback: ResearchFeedback) => void; onSkip: () => void }) {
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const feedback: ResearchFeedback = {};
    if (form.get("clarity")) feedback.clarity = Number(form.get("clarity"));
    if (form.get("desirable")) feedback.desirable = form.get("desirable") === "yes";
    for (const key of ["unclear_text", "unsuitable_text", "other"] as const) if (form.get(key)) feedback[key] = String(form.get(key));
    for (const key of ["unclear_items", "unsuitable_items", "desirable_items"] as const) feedback[key] = form.getAll(key).map(String);
    if (v2) feedback.clear_realistic_items = form.getAll("clear_realistic_items").map(String);
    onSave(feedback);
  }
  return <form onSubmit={submit} className="mt-6 space-y-6">
    <h2 className="text-xl font-semibold">Freiwilliges Feedback</h2>
    <p>Deine Antworten sind bereits abgeschlossen. Du kannst alle Feedbackfragen überspringen. Bitte nenne keine Namen oder andere persönliche Angaben im Freitext.</p>
    <label className="block">Verständlichkeit insgesamt<select name="clarity" className={field} defaultValue=""><option value="">Keine Angabe</option>{[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}{n === 1 ? " – sehr unverständlich" : n === 5 ? " – sehr verständlich" : ""}</option>)}</select></label>
    {([['unclear', 'Gab es Fragen, bei denen unklar war, was gemeint ist?'], ['unsuitable', 'Gab es Fragen, bei denen keine Antwort richtig gepasst hat?'], ['desirable', 'Gab es Fragen, bei denen offensichtlich war, welche Antwort „gut“ wirken soll?']] as const).map(([key, label]) => <fieldset key={key} className="rounded-xl border border-slate-200 p-4">
      <legend className="px-1 font-medium">{label}</legend>
      {key === "desirable" && <label className="block">Deine Einschätzung<select name="desirable" className={field} defaultValue=""><option value="">Keine Angabe</option><option value="yes">Ja</option><option value="no">Nein</option></select></label>}
      <details className="mt-3"><summary className="cursor-pointer py-2 underline">Fragen auswählen (optional)</summary><div className="max-h-64 overflow-y-auto">{items.map(item => <label key={item.item_key} className="flex items-start gap-3 py-3 text-sm"><input type="checkbox" name={`${key}_items`} value={item.item_key} className="mt-1" /><span>{!v2 && `${item.item_key}: `}{item.prompt}</span></label>)}</div></details>
      {key !== "desirable" && <label className="mt-3 block text-sm">Dein Hinweis (optional)<textarea name={`${key}_text`} maxLength={2000} className={field} /></label>}
    </fieldset>)}
    {v2 && <fieldset className="rounded-xl border border-slate-200 p-4">
      <legend className="px-1 font-medium">Gab es Fragen, die sich für dich besonders klar oder realistisch angefühlt haben?</legend>
      <details className="mt-3"><summary className="cursor-pointer py-2 underline">Fragen auswählen (optional)</summary><div className="max-h-64 overflow-y-auto">{items.map(item => <label key={item.item_key} className="flex items-start gap-3 py-3 text-sm"><input type="checkbox" name="clear_realistic_items" value={item.item_key} className="mt-1" /><span>{item.prompt}</span></label>)}</div></details>
    </fieldset>}
    <label className="block">Sonstige Hinweise (optional)<textarea name="other" maxLength={2000} className={field} /></label>
    <div className="flex flex-wrap gap-4"><button disabled={pending} className={button}>Feedback speichern</button><button type="button" disabled={pending} className="min-h-11 underline" onClick={onSkip}>Ohne Feedback abschließen</button></div>
  </form>;
}

export function WorkstylePretest({ initialSession }: { initialSession: PretestSession | null }) {
  const [session, setSession] = useState(initialSession);
  const [stage, setStage] = useState<"intro" | "consent" | "context">("intro");
  const [consent, setConsent] = useState(false);
  const [retake, setRetake] = useState(false);
  const [feedbackDone, setFeedbackDone] = useState(Boolean(initialSession?.feedback));
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const [position, setPosition] = useState(() => {
    if (!initialSession) return 0;
    const items = previewWorkstyleForm(initialSession.form!);
    const missing = items.findIndex(item => !initialSession.answers.some(answer => answer.item_key === item.item_key));
    return missing === -1 ? items.length : missing;
  });
  const items = session ? previewWorkstyleForm(session.form!) : [];
  function run(action: () => Promise<void>) { setError(""); startTransition(async () => { try { await action(); } catch { setError("Der Stand konnte nicht geladen werden. Bitte versuche es erneut."); } }); }
  const active = session && !session.withdrawn_at;
  return <section className="mt-8">
    {error && <p role="alert" className="mb-5 rounded-xl bg-red-50 p-4 text-red-900">{error}</p>}
    {!active && <>
      {stage === "intro" && <div className="space-y-5"><h2 className="text-xl font-semibold">Ein Entwicklungsinstrument</h2><p className="leading-7">Wir prüfen, wie verständlich die Fragen sind und wie gut die Antworten passen. Die gemeinsame Auswahl ist noch keine validierte Kurzskala. Unterschiede in Arbeitsweisen sind Gesprächsanlässe, keine Defizite.</p>{session?.withdrawn_at && <p>Deine Forschungseinwilligung wurde widerrufen. Dein abgeschlossenes gemeinsames Arbeitsprofil bleibt als private Produktinformation erhalten.</p>}<button className={button} onClick={() => setStage("consent")}>Zur Forschungseinwilligung</button></div>}
      {stage === "consent" && <div className="space-y-5"><h2 className="text-xl font-semibold">Deine Entscheidung zur Forschung</h2>
        {consentText.paragraphs.map((paragraph, index) => <p key={index} className="leading-7">{paragraph}</p>)}


        <p className="text-sm text-slate-500">Einwilligungsfassung workstyle_research_v1 · Assessment 8.5a-v1</p>
        <label className="flex items-start gap-3"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} className="mt-1" /><span>{consentText.confirmation}</span></label>
        <button className={button} disabled={!consent} onClick={() => setStage("context")}>Weiter zu den Kontextfragen</button>
      </div>}
      {stage === "context" && <form className="space-y-5" onSubmit={event => { event.preventDefault(); const data = new FormData(event.currentTarget); run(async () => {
        const result = await startWorkstylePretest(consent, { founder_experience: String(data.get("experience")) as ResearchContext["founder_experience"], team_size: String(data.get("team")) as ResearchContext["team_size"], venture_phase: String(data.get("phase")) }, retake);
        if (!result.ok) return setError(result.error); setSession(result.session);
        const nextItems = previewWorkstyleForm(result.session.form!);
        const nextMissing = nextItems.findIndex(item => !result.session.answers.some(answer => answer.item_key === item.item_key));
        setPosition(nextMissing === -1 ? nextItems.length : nextMissing); setFeedbackDone(false);
      }); }}><h2 className="text-xl font-semibold">Kurz zu deinem Kontext</h2>
        <label className="block">Founder-Erfahrung<select name="experience" className={field} required defaultValue=""><option value="" disabled>Bitte auswählen</option><option value="none">Noch keine Gründungserfahrung</option><option value="first_venture">Erstes Vorhaben</option><option value="multiple_ventures">Mehrere Vorhaben</option></select></label>
        <label className="block">Aktuelle Teamsituation<select name="team" className={field} required defaultValue=""><option value="" disabled>Bitte auswählen</option><option value="solo">Solo</option><option value="two">2-Founder-Team</option><option value="larger">Größeres Team</option><option value="no_venture">Noch kein Venture</option></select></label>
        <label className="block">Venture-Phase (optional)<select name="phase" className={field} defaultValue=""><option value="">Keine Angabe</option><option value="idea">Idee / Orientierung</option><option value="building">Aufbau / Erprobung</option><option value="operating">Laufender Betrieb</option></select></label>
        <button disabled={pending} className={button}>Pretest starten</button>
      </form>}
    </>}
    {active && !session.completed_at && <>
      <p className="text-sm font-medium">{position < 20 ? "Gemeinsamer Workstyle Core" : "Zusatzfragen zur Forschung"} · {Math.min(position + 1, items.length)} von {items.length}</p>
      <progress className="mt-3 w-full" max={items.length} value={session.answers.length} aria-label="Gespeicherte Antworten" />
      {position >= 20 && <p className="mt-3 text-sm text-slate-600">Diese zusätzlichen Fragen dienen ausschließlich der Forschung. Sie fließen nicht in produktive Teaminterpretationen ein.</p>}
      {position < items.length ? <Question key={items[position].item_key} item={items[position]} initial={session.answers.find(answer => answer.item_key === items[position].item_key)} pending={pending} onSave={(value, elapsed) => run(async () => {
        const result = await saveWorkstyleAnswer(session.assessment_id, items[position].item_key, { response_value: value === "cannot_assess" ? null : value, missing_reason: value === "cannot_assess" ? value : null }, elapsed);
        if (!result.ok) return setError(result.error);
        setSession({ ...session, answers: [...session.answers.filter(answer => answer.item_key !== result.answer.item_key), result.answer] }); setPosition(position + 1);
      })} /> : <button className={`${button} mt-5`} disabled={pending} onClick={() => run(async () => { const result = await completeWorkstylePretest(session.assessment_id); if (!result.ok) return setError(result.error); setSession(result.session); })}>Antworten abschließen</button>}
      {position > 0 && <button disabled={pending} onClick={() => setPosition(position - 1)} className="mt-4 block min-h-11 underline">Zur vorherigen Frage</button>}
      <p className="mt-4 text-sm text-slate-600">Gespeicherte Antworten und Zusatzform bleiben beim Neuladen erhalten. Du kannst später an dieser Stelle fortsetzen.</p>
    </>}
    {active && session.completed_at && <>
      <h2 className="text-2xl font-semibold">Danke, dein Pretest ist abgeschlossen.</h2><p className="mt-3">Dein gemeinsames Arbeitsprofil bleibt privat. Es wurde kein Teamreport erzeugt und nichts automatisch freigegeben.</p>
      {!feedbackDone ? <WorkstyleFeedback items={items} pending={pending} onSkip={() => setFeedbackDone(true)} onSave={feedback => run(async () => { const result = await saveWorkstyleFeedback(session.assessment_id, feedback); if (!result.ok) return setError(result.error); setFeedbackDone(true); })} /> : <p role="status" className="mt-4">Alles erledigt. Danke für deine Teilnahme.</p>}
      <button className="mt-6 min-h-11 underline" disabled={pending} onClick={() => { setSession(null); setStage("consent"); setConsent(false); setRetake(true); }}>Späteren Stand neu erheben</button>
    </>}
    {active && <div className="mt-10 border-t border-slate-200 pt-5"><p className="text-sm text-slate-600">Die Forschungsteilnahme ist freiwillig. Ein Widerruf löscht die noch zuordenbaren Forschungszusätze.</p><button disabled={pending} className="mt-2 min-h-11 text-sm underline" onClick={() => run(async () => { const result = await withdrawWorkstyleResearch(); if (!result.ok) return setError(result.error); setSession(session.completed_at ? { ...session, withdrawn_at: new Date().toISOString() } : null); setStage("intro"); setConsent(false); })}>Forschungseinwilligung widerrufen</button></div>}
  </section>;
}
