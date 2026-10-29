"use client";

import { useMemo, useRef, useState, type KeyboardEvent } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { completeJourneyAction } from "@/features/profile/journey/journeyActions";
import {
  JOURNEY_ALIGN_PLANS,
  JOURNEY_AREAS,
  JOURNEY_FOCI,
  JOURNEY_REMOTE_MODES,
  nextPathFor,
  type JourneyAlignPlan,
  type JourneyArea,
  type JourneyFocus,
  type JourneyRemoteMode,
} from "@/features/profile/journey/journeyModel";

type StepId = "areas" | "name" | "headline" | "about" | "can" | "where" | "alignPlan" | "done";

const ICONS: Record<JourneyFocus, string> = {
  product: "M12 3l8 4.5v9L12 21l-8-4.5v-9z M12 12l8-4.5 M12 12v9 M12 12L4 7.5",
  tech: "M8 8l-4 4 4 4 M16 8l4 4-4 4 M13.5 6l-3 12",
  design: "M4 20l4-1 11-11-3-3L5 16z M14 6l3 3",
  sales: "M3 17l6-6 4 4 8-8 M15 7h6v6",
  marketing: "M4 10v4h3l8 4V6L7 10z M18 9a4 4 0 010 6",
  finance: "M5 20V10 M12 20V4 M19 20v-7",
  operations: "M3 19c0-3 3-5 6-5s6 2 6 5 M16 14c3 0 5 1.5 5 4 M9 5a3 3 0 100 6 3 3 0 000-6z M17 6.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5z",
  strategy: "M5 21V4 M5 4h11l-2 4 2 4H5",
  research: "M11 5a6 6 0 100 12 6 6 0 000-12z M20 20l-4.5-4.5",
};
const HUES: Record<JourneyFocus, string> = {
  product: "#5b3df5", tech: "#0a88c2", design: "#d4531a", sales: "#0a8a68", marketing: "#c4287c",
  finance: "#a8620a", operations: "#3f61e0", strategy: "#8a3ff0", research: "#0f8296",
};

function Check({ on }: { on: boolean }) {
  return (
    <span aria-hidden="true" className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition ${on ? "border-violet-600 bg-violet-600 text-white" : "border-slate-300 text-transparent"}`}>
      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-none stroke-current" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
    </span>
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
  next,
  error,
}: {
  initialName: string;
  next: string;
  error: string | null;
}) {
  const t = useTranslations("profile.journey");
  const [areas, setAreas] = useState<JourneyArea[]>([]);
  const [name, setName] = useState(initialName);
  const [headline, setHeadline] = useState("");
  const [bio, setBio] = useState("");
  const [foci, setFoci] = useState<JourneyFocus[]>([]);
  const [subs, setSubs] = useState<Partial<Record<JourneyFocus, string[]>>>({});
  const [openOne, setOpenOne] = useState<JourneyFocus | null>(null);
  const [where, setWhere] = useState<JourneyRemoteMode | "">("");
  const [alignPlan, setAlignPlan] = useState<JourneyAlignPlan>("first");
  const [index, setIndex] = useState(0);
  const scroller = useRef<HTMLDivElement>(null);

  const steps = useMemo<StepId[]>(
    () => ["areas", "name", "headline", "about", "can", "where", ...(areas.includes("align") ? (["alignPlan"] as StepId[]) : []), "done"],
    [areas]
  );
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

  const payload = JSON.stringify({ areas, name, headline, bio, foci, expertise, where, alignPlan });
  const nextPath = nextPathFor({ areas, alignPlan });
  const canNext = step === "areas" ? areas.length > 0 : step === "name" ? name.trim().length > 0 : true;
  const isDone = step === "done";

  function go(to: number) {
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
      if (!isDone && canNext) go(index + 1);
    }
  }

  const nextLabel =
    nextPath === "/dashboard"
      ? t("done.nextDashboard")
      : nextPath === "/discovery/profile"
        ? t("done.nextFind")
        : nextPath === "/connect/profile"
          ? t("done.nextConnect")
          : t("done.nextAlign");

  return (
    <form action={completeJourneyAction} onKeyDown={onKeyDown} className="mx-auto flex w-full max-w-xl flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_30px_80px_-30px_rgba(60,40,180,.3)]">
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
            {step === "done" ? t("done.q") : step === "alignPlan" ? t("alignPlan.q") : t(`${step}.q`)}
          </h1>

          {step === "areas" ? (
            <>
              <p className="text-sm leading-6 text-slate-600">{t("areas.hint")}</p>
              <div className="grid gap-2.5">
                {JOURNEY_AREAS.map((area) => {
                  const on = areas.includes(area);
                  return (
                    <button key={area} type="button" aria-pressed={on} onClick={() => toggleArea(area)} className={`flex min-h-16 items-center justify-between gap-3 rounded-2xl border-[1.5px] p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${on ? "border-violet-600 bg-violet-50" : "border-slate-200 bg-white hover:border-slate-300"}`}>
                      <span><strong className="block text-base text-slate-950">{t(`areas.${area}.name`)}</strong><span className="mt-0.5 block text-sm leading-5 text-slate-600">{t(`areas.${area}.text`)}</span></span>
                      <Check on={on} />
                    </button>
                  );
                })}
              </div>
              <a href="/welcome?classic=1" className="text-sm font-medium text-slate-600 underline underline-offset-4 hover:text-slate-900">{t("classic")}</a>
            </>
          ) : null}

          {step === "name" ? (
            <>
              <input name="journeyName" value={name} onChange={(event) => setName(event.target.value)} maxLength={80} autoFocus autoComplete="name" placeholder={t("name.placeholder")} className="min-h-14 w-full rounded-2xl border-[1.5px] border-slate-200 bg-white px-4 text-base text-slate-950 outline-none transition focus:border-violet-600 focus:ring-4 focus:ring-violet-100" />
              <p className="text-sm text-slate-500">{t("name.hint")}</p>
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

          {step === "alignPlan" ? (
            <>
              <div className="grid gap-1.5 text-sm">
                {([["workstyle", 12], ["strengths", 10], ["drive", 5]] as const).map(([row, minutes]) => (
                  <div key={row} className="flex items-center justify-between rounded-xl bg-slate-100 px-3 py-2.5"><b className="font-bold text-slate-900">{t(`alignPlan.rows.${row}`)}</b><span className="font-semibold text-slate-500">{t("alignPlan.minutes", { minutes })}</span></div>
                ))}
              </div>
              <p className="text-sm leading-6 text-slate-600">{t("alignPlan.hint")}</p>
              <div className="grid gap-2.5">
                {JOURNEY_ALIGN_PLANS.map((plan) => {
                  const on = alignPlan === plan;
                  return (
                    <button key={plan} type="button" aria-pressed={on} onClick={() => setAlignPlan(plan)} className={`flex min-h-16 items-center justify-between gap-3 rounded-2xl border-[1.5px] p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${on ? "border-violet-600 bg-violet-50" : "border-slate-200 bg-white hover:border-slate-300"}`}>
                      <span><strong className="block text-base text-slate-950">{t(`alignPlan.${plan}.name`)}</strong><span className="mt-0.5 block text-sm leading-5 text-slate-600">{t(`alignPlan.${plan}.text`)}</span></span>
                      <Check on={on} />
                    </button>
                  );
                })}
              </div>
            </>
          ) : null}

          {step === "done" ? (
            <>
              <p className="text-base leading-7 text-slate-700">{t("done.text")}</p>
              <div className="rounded-2xl bg-slate-100 p-4"><span className="text-[11px] font-bold uppercase tracking-[.08em] text-slate-500">{t("done.next")}</span><p className="mt-1 text-base font-semibold text-slate-950">{nextLabel}</p></div>
            </>
          ) : null}
        </div>
      </div>

      <div className="grid gap-1.5 border-t border-slate-200 px-6 pb-5 pt-3">
        {isDone ? (
          <FinishButton label={t("finish")} pendingLabel={t("finishing")} />
        ) : (
          <button type="button" disabled={!canNext} onClick={() => go(index + 1)} className="brand-cta inline-flex min-h-12 w-full items-center justify-center rounded-2xl px-6 text-base font-semibold disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2">
            {t("next")}
          </button>
        )}
        {!isDone && step !== "areas" && step !== "name" ? (
          <button type="button" onClick={() => go(index + 1)} className="min-h-10 text-sm font-semibold text-slate-500 hover:text-slate-900">{t("skip")}</button>
        ) : <span className="min-h-10" />}
      </div>
    </form>
  );
}
