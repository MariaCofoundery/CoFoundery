"use client";

import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { AreasExplainer } from "@/features/onboarding/AreasExplainer";
import { FOCUS_HUES, FOCUS_ICONS } from "@/features/profile/journey/focusVisuals";
import {
  completeJourneyAction,
  completeJourneyLaterAction,
  finishSetupAction,
  saveSetupProgressAction,
} from "@/features/profile/journey/journeyActions";
import {
  JOURNEY_AREAS,
  JOURNEY_FOCI,
  JOURNEY_REMOTE_MODES,
  startAreaFor,
  type SetupStep,
  type JourneyAlignPlan,
  type JourneyArea,
  type JourneyFocus,
  type JourneyRemoteMode,
} from "@/features/profile/journey/journeyModel";

type StepId = "welcome" | "headline" | "about" | "can" | "where";

const ICONS = FOCUS_ICONS;
const HUES = FOCUS_HUES;

function Check({ on }: { on: boolean }) {
  return (
    <span aria-hidden="true" className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition ${on ? "border-violet-600 bg-violet-600 text-white" : "border-slate-300 text-transparent"}`}>
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-current" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
    </span>
  );
}

/**
 * Die zwei Wege der Willkommensseite.
 *
 * "Los geht's" fuehrt direkt in den echten ersten Schritt des gewaehlten Bereichs. "Gerade keine Zeit? Erinnere mich
 * morgen" speichert dasselbe, schaltet die Erinnerung ein und verabschiedet sich bis morgen - der Knopf IST die
 * ausdrueckliche Zustimmung, der Satz darunter sagt es offen. Beide Wege sind gleichwertig; nichts ist vorangekreuzt,
 * und ohne Zustimmung gibt es keine Mail.
 */
function WelcomeButtons({ canFinish, startLabel, laterLabel, laterNote }: { canFinish: boolean; startLabel: string; laterLabel: string; laterNote: string }) {
  const { pending } = useFormStatus();
  return (
    <>
      <button type="submit" disabled={pending || !canFinish} className="brand-cta inline-flex min-h-12 w-full items-center justify-center rounded-2xl px-6 text-base font-semibold disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2">
        {startLabel}
      </button>
      <button type="submit" formAction={completeJourneyLaterAction} disabled={pending || !canFinish} className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl border border-slate-300 bg-white px-6 text-base font-semibold text-slate-900 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2">
        {laterLabel}
      </button>
      <p className="text-center text-xs leading-5 text-slate-600" data-reminder-note>{laterNote}</p>
    </>
  );
}

function FinishButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="brand-cta inline-flex min-h-12 w-full items-center justify-center rounded-2xl px-6 text-base font-semibold disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2">
      {pending ? pendingLabel : label}
    </button>
  );
}

/**
 * Der Einstieg als Karten: eine Frage pro Karte, und nur die Bereiche, die man
 * gewaehlt hat.
 *
 * Ein ZUSATZWEG zum bisherigen Einstieg (`ProfileBasicsForm`), nicht dessen
 * Ersatz. Er schreibt am Ende dieselben Angaben (siehe `completeJourneyAction`).
 * Es wird nichts waehrend der Reise gespeichert: Antworten liegen bis zum
 * letzten Schritt im Browser. Wer abbricht, hat nichts angelegt.
 */
export function ProfileJourney({
  initialName,
  initialAreas = [],
  next,
  error,
  mode = "start",
  setup,
}: {
  initialName: string;
  /**
   * "start": zwei Karten (Bereiche, Name) und der Abschluss - danach ist man drin.
   * "setup": die kleinen Profilschritte, jeder wird beim Weitergehen sofort gespeichert.
   */
  mode?: "start" | "setup";
  /** Nur im Setup: was schon gespeichert ist und welche Schritte noch offen sind. */
  setup?: { headline: string; bio: string; where: JourneyRemoteMode | ""; openSteps: SetupStep[] };
  /** Vorbelegt nur, wenn ein Magic Link ausdruecklich eine Rolle mitbringt. */
  initialAreas?: JourneyArea[];
  next: string;
  error: string | null;
}) {
  const t = useTranslations("profile.journey");
  const [areas, setAreas] = useState<JourneyArea[]>(initialAreas);
  const start: JourneyArea | "" = "";
  const [infoOpen, setInfoOpen] = useState<JourneyArea | null>(null);
  const [name, setName] = useState(initialName);
  const [headline, setHeadline] = useState(setup?.headline ?? "");
  const [bio, setBio] = useState(setup?.bio ?? "");
  const [foci, setFoci] = useState<JourneyFocus[]>([]);
  const [subs, setSubs] = useState<Partial<Record<JourneyFocus, string[]>>>({});
  const [openOne, setOpenOne] = useState<JourneyFocus | null>(null);
  const [where, setWhere] = useState<JourneyRemoteMode | "">(setup?.where ?? "");
  const alignPlan: JourneyAlignPlan = "first";
  const [index, setIndex] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);

  const isSetup = mode === "setup";
  const setupSteps = useMemo<StepId[]>(() => (setup?.openSteps ?? []).map((item) => (item === "headline" ? "headline" : item === "about" ? "about" : item === "can" ? "can" : "where")), [setup]);
  // Der Start ist EINE Willkommensseite (Name, Anliegen, zwei Wege); Profilfragen und Align-Plan gibt es erst danach.
  const steps = useMemo<StepId[]>(() => (isSetup ? setupSteps : ["welcome"]), [isSetup, setupSteps]);
  const step = steps[Math.min(index, steps.length - 1)];

  const expertise = useMemo(() => {
    const out: string[] = [];
    for (const focus of foci) {
      const picked = subs[focus] ?? [];
      if (picked.length > 0) out.push(...picked);
      else out.push(t(`foci.${focus}.name`));
    }
    return out;
  }, [foci, subs, t]);

  const effectiveStart = startAreaFor(areas, start);
  const payload = JSON.stringify(isSetup ? { headline, bio, expertise, where } : { areas, name, headline, bio, foci, expertise, where, alignPlan, start: effectiveStart });
  const canFinish = areas.length > 0 && name.trim().length > 0;
  const isLastSetupStep = isSetup && index >= steps.length - 1;

  function go(to: number) {
    // Im Setup wird beim Weitergehen gespeichert - nicht erst am Ende. Ein Fehler hier stoert den Weg nicht.
    if (isSetup && to > index) void saveSetupProgressAction(payload);
    setIndex(Math.max(0, Math.min(steps.length - 1, to)));
    scroller.current?.scrollTo({ top: 0 });
  }
  function toggleArea(area: JourneyArea) {
    setAreas((current) => JOURNEY_AREAS.filter((item) => (item === area ? !current.includes(item) : current.includes(item))));
  }
  function toggleFocus(focus: JourneyFocus) {
    setFoci((current) => {
      if (current.includes(focus)) {
        setOpenOne((open) => (open === focus ? null : open));
        return current.filter((item) => item !== focus);
      }
      setOpenOne(focus);
      return [...current, focus];
    });
  }
  function openFocus(focus: JourneyFocus) {
    // Immer nur eine offen: Wer die naechste oeffnet, schliesst die vorige.
    if (openOne === focus) return setOpenOne(null);
    if (!foci.includes(focus)) setFoci((current) => [...current, focus]);
    setOpenOne(focus);
  }
  function toggleSub(focus: JourneyFocus, label: string) {
    setSubs((current) => {
      const list = current[focus] ?? [];
      return { ...current, [focus]: list.includes(label) ? list.filter((item) => item !== label) : [...list, label] };
    });
  }
  // Enter in einem Feld geht zur naechsten Karte und schickt nichts ab.
  function onKeyDown(event: KeyboardEvent<HTMLFormElement>) {
    const target = event.target as HTMLElement;
    if (event.key === "Enter" && target.tagName === "INPUT") {
      event.preventDefault();
      if (isSetup && !isLastSetupStep) go(index + 1);
    }
  }

  return (
    <form action={isSetup ? finishSetupAction : completeJourneyAction} onKeyDown={onKeyDown} className="mx-auto flex w-full max-w-xl flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_30px_80px_-30px_rgba(60,40,180,.3)]">
      <input type="hidden" name="payload" value={payload} />
      <input type="hidden" name="next" value={next} />

      <div className="grid gap-3 px-6 pt-5">
        <div className="flex min-h-9 items-center justify-between gap-3">
          <button type="button" onClick={() => go(index - 1)} disabled={index === 0} aria-label={t("back")} className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-slate-800 disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[18px] w-[18px] fill-none stroke-current" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 5l-7 7 7 7" /></svg>
          </button>
          <span className="text-[13px] font-bold text-slate-500">{t("progress", { current: Math.min(index + 1, steps.length), total: steps.length })}</span>
          <span className="w-9" />
        </div>
        {/* Eine Leiste statt Prozente: Sie zeigt nur, wo man in der Reihe steht. */}
        <div className="h-[5px] overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
          <div className="h-full rounded-full bg-gradient-to-r from-violet-600 to-sky-500 transition-[width] duration-300" style={{ width: `${((index + 1) / steps.length) * 100}%` }} />
        </div>
      </div>

      <div ref={scroller} className="max-h-[62vh] min-h-[22rem] overflow-y-auto px-6 pb-4 pt-6">
        {error ? <p role="alert" className="mb-4 rounded-2xl bg-amber-50 p-3 text-sm text-amber-900">{t(`errors.${["areas", "name", "save", "join"].includes(error) ? error : "save"}`)}</p> : null}
        <div key={step} className="grid gap-4">
          <h1 className="text-[1.65rem] font-extrabold leading-tight tracking-tight text-slate-950">
            {isSetup ? t(`${step}.q`) : t("welcome.title")}
          </h1>

          {!isSetup ? <AreasExplainer /> : null}

          {!isSetup ? (
            <>
              <input name="journeyName" value={name} onChange={(event) => setName(event.target.value)} maxLength={80} autoFocus autoComplete="name" placeholder={t("name.placeholder")} className="min-h-14 w-full rounded-2xl border-[1.5px] border-slate-200 bg-white px-4 text-base text-slate-950 outline-none transition focus:border-violet-600 focus:ring-4 focus:ring-violet-100" />
              <p className="text-sm text-slate-500">{t("name.hint")}</p>
            </>
          ) : null}

          {!isSetup ? (
            <>
              <p className="text-sm leading-6 text-slate-600">{t("areas.hint")}</p>
              <div className="grid gap-2.5">
                {JOURNEY_AREAS.map((area) => {
                  const on = areas.includes(area);
                  const open = infoOpen === area;
                  return (
                    <div key={area} className={`overflow-hidden rounded-2xl border-[1.5px] transition ${on ? "border-violet-600 bg-violet-50" : "border-slate-200 bg-white"}`}>
                      <button type="button" aria-pressed={on} onClick={() => toggleArea(area)} className="flex min-h-16 w-full items-center justify-between gap-3 p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500">
                        <span><strong className="block text-base text-slate-950">{t(`areas.${area}.name`)}</strong><span className="mt-0.5 block text-sm leading-5 text-slate-600">{t(`areas.${area}.text`)}</span></span>
                        <Check on={on} />
                      </button>
                      {/* Was passiert, wenn ich das waehle? Eine Karte offen, die anderen zu. */}
                      <button type="button" aria-expanded={open} onClick={() => setInfoOpen(open ? null : area)} className="ml-4 inline-flex min-h-9 items-center gap-1 pb-1 text-xs font-bold text-violet-800 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500">
                        {open ? t("areas.less") : t("areas.more")} <span aria-hidden="true">{open ? "\u25B4" : "\u25BE"}</span>
                      </button>
                      <div className={`grid transition-[grid-template-rows] duration-300 ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                        <div className="min-h-0 overflow-hidden">
                          <dl className="grid gap-3 px-4 pb-4 text-sm leading-6">
                            {(["what", "ask", "lands", "visible"] as const).map((row) => (
                              <div key={row}>
                                <dt className="text-[11px] font-bold uppercase tracking-[.08em] text-slate-500">{t(`areas.infoLabels.${row}`)}</dt>
                                <dd className="text-slate-800">{t(`areas.info.${area}.${row}`)}</dd>
                              </div>
                            ))}
                          </dl>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <a href="/welcome?classic=1" className="text-sm font-medium text-slate-600 underline underline-offset-4 hover:text-slate-900">{t("classic")}</a>
            </>
          ) : null}

          {step === "headline" ? (
            <>
              <input value={headline} onChange={(event) => setHeadline(event.target.value)} maxLength={160} autoFocus placeholder={t("headline.placeholder")} className="min-h-14 w-full rounded-2xl border-[1.5px] border-slate-200 bg-white px-4 text-base text-slate-950 outline-none transition focus:border-violet-600 focus:ring-4 focus:ring-violet-100" />
              <p className="text-sm text-slate-500">{t("headline.hint")}</p>
            </>
          ) : null}

          {step === "about" ? (
            <>
              <textarea value={bio} onChange={(event) => setBio(event.target.value)} maxLength={1200} rows={5} autoFocus placeholder={t("about.placeholder")} className="w-full resize-y rounded-2xl border-[1.5px] border-slate-200 bg-white p-4 text-base text-slate-950 outline-none transition focus:border-violet-600 focus:ring-4 focus:ring-violet-100" />
              <p className="text-sm text-slate-500">{t("about.hint")}</p>
            </>
          ) : null}

          {step === "can" ? (
            <>
              <p className="text-sm leading-6 text-slate-600">{t("can.hint")}</p>
              <div className="grid gap-2">
                {JOURNEY_FOCI.map((focus) => {
                  const on = foci.includes(focus);
                  const open = openOne === focus;
                  const picked = subs[focus] ?? [];
                  const parts = t(`foci.${focus}.parts`).split(" | ");
                  return (
                    <div key={focus} style={{ ["--hue" as string]: HUES[focus] }} className={`overflow-hidden rounded-[1.15rem] border-[1.5px] bg-white transition ${on ? "border-[color:var(--hue)]" : "border-slate-200"}`}>
                      <div className="grid grid-cols-[2.6rem_1fr_1.75rem] items-center gap-3 p-3">
                        <span aria-hidden="true" className="grid h-[2.6rem] w-[2.6rem] place-items-center rounded-xl" style={{ background: on ? HUES[focus] : `${HUES[focus]}22`, color: on ? "#fff" : HUES[focus] }}>
                          <svg viewBox="0 0 24 24" className="h-[1.3rem] w-[1.3rem] fill-none stroke-current" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d={ICONS[focus]} /></svg>
                        </span>
                        <button type="button" aria-expanded={open} onClick={() => openFocus(focus)} className="grid min-h-11 gap-0.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500">
                          <strong className="text-[0.95rem] text-slate-950">{t(`foci.${focus}.name`)}</strong>
                          <span className="text-[0.8rem] font-medium leading-snug text-slate-500">{t(`foci.${focus}.text`)}</span>
                        </button>
                        <button type="button" aria-pressed={on} aria-label={`${t(`foci.${focus}.name`)} ${on ? t("can.unselect") : t("can.select")}`} onClick={() => toggleFocus(focus)} className={`grid h-7 w-7 place-items-center rounded-full border-2 transition ${on ? "text-white" : "border-slate-300 text-transparent"}`} style={on ? { background: HUES[focus], borderColor: HUES[focus] } : undefined}>
                          <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5 fill-none stroke-current" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
                        </button>
                      </div>
                      <div className={`grid transition-[grid-template-rows] duration-300 ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                        <div className="min-h-0 overflow-hidden">
                          <div className="grid gap-2 px-3 pb-4">
                            <span className="text-[11px] font-bold uppercase tracking-[.08em] text-slate-500">{t("can.whatBelongs")}{picked.length > 0 ? ` · ${picked.length} ${t("can.chosen")}` : ""}</span>
                            <div className="flex flex-wrap gap-2">
                              {parts.map((part) => {
                                const sel = picked.includes(part);
                                return (
                                  <button key={part} type="button" tabIndex={open ? 0 : -1} aria-pressed={sel} onClick={() => toggleSub(focus, part)} className={`min-h-9 rounded-[10px] border-[1.5px] px-3 text-[0.82rem] font-semibold transition ${sel ? "text-white" : "border-slate-200 bg-white text-slate-800 hover:border-slate-300"}`} style={sel ? { background: HUES[focus], borderColor: HUES[focus] } : undefined}>
                                    {part}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : null}

          {step === "where" ? (
            <div className="grid gap-2.5">
              {JOURNEY_REMOTE_MODES.map((mode) => {
                const on = where === mode;
                return (
                  <button key={mode} type="button" aria-pressed={on} onClick={() => setWhere(on ? "" : mode)} className={`flex min-h-16 items-center justify-between gap-3 rounded-2xl border-[1.5px] p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${on ? "border-violet-600 bg-violet-50" : "border-slate-200 bg-white hover:border-slate-300"}`}>
                    <span><strong className="block text-base text-slate-950">{t(`where.${mode}.name`)}</strong><span className="mt-0.5 block text-sm text-slate-600">{t(`where.${mode}.text`)}</span></span>
                    <Check on={on} />
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid gap-1.5 border-t border-slate-200 px-6 pb-5 pt-3">
        {isSetup ? (
          <>
            {isLastSetupStep ? (
              <FinishButton label={t("setup.finish")} pendingLabel={t("finishing")} />
            ) : (
              <button type="button" onClick={() => go(index + 1)} className="brand-cta inline-flex min-h-12 w-full items-center justify-center rounded-2xl px-6 text-base font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2">
                {t("next")}
              </button>
            )}
            {!isLastSetupStep ? (
              <button type="button" onClick={() => go(index + 1)} className="min-h-10 text-sm font-semibold text-slate-500 hover:text-slate-900">{t("skip")}</button>
            ) : <span className="min-h-10" />}
          </>
        ) : (
          <WelcomeButtons canFinish={canFinish} startLabel={t("welcome.start")} laterLabel={t("welcome.later")} laterNote={t("welcome.laterNote")} />
        )}
      </div>
    </form>
  );
}
