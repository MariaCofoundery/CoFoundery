"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { DictatedTextarea } from "@/features/dictation/DictatedTextarea";
import { clearDraft, draftKey, readDraft, writeDraft } from "@/features/interviews/interviewDrafts";
import { saveSceneAction, skipSceneAction } from "@/features/strengths/strengthsDiscoverActions";
import {
  needsFollowUp,
  PART_MAX_LENGTH,
  SCENE_WHENS,
  STEP_KEYS,
  type SceneParts,
  type SceneWhen,
  type StepKey,
} from "@/features/strengths/strengthsDiscoverGuide";
import { SubmitButton } from "@/features/ui/SubmitButton";
import "@/features/align/align.css";

type Draft = { parts: SceneParts; when: SceneWhen | null };

/**
 * Eine Szene in drei Schritten (Entwurf vom 12.11.2026): Was war los? Was hast du getan? Was kam
 * heraus? Dazu eine Zeitangabe, ein Beispiel von jemand anderem, Diktat und - nur bei sehr kurzer
 * Antwort auf „Was hast du getan?“, nur einmal - eine Nachfrage.
 *
 * ALLE DREI FELDER STEHEN IM SELBEN FORMULAR; es ist immer nur eines zu sehen. So gehen alle Teile
 * mit einem Absenden an den Server, und beim Zurückgehen ist nichts verloren. Der Browser sichert
 * jede Änderung zusätzlich (wie in den anderen Gesprächen), falls das Fenster zugeht.
 */
export function SceneForm({
  sessionId,
  turnId,
  sceneId,
  index,
  total,
  savedParts,
  savedWhen,
  canSkip,
}: {
  sessionId: string;
  turnId: string;
  sceneId: string;
  index: number;
  total: number;
  savedParts: SceneParts;
  savedWhen: SceneWhen | null;
  canSkip: boolean;
}) {
  const t = useTranslations("strengths");
  const key = draftKey(sessionId, turnId);
  const [step, setStep] = useState(0);
  const [when, setWhen] = useState<SceneWhen | null>(savedWhen ?? "year");
  const [initial, setInitial] = useState<SceneParts>(savedParts);
  const [revision, setRevision] = useState(0);
  const [values, setValues] = useState<SceneParts>(savedParts);
  const [exampleOpen, setExampleOpen] = useState(false);
  const [askedFollowUp, setAskedFollowUp] = useState(false);
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const loaded = useRef(false);

  // Einen Browserstand wiederherstellen, falls das Fenster vorher zuging. Erst nach dem Aufbau, damit
  // Server und Browser dasselbe zuerst zeichnen.
  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;
    const raw = readDraft(key);
    if (!raw) return;
    try {
      const draft = JSON.parse(raw) as Partial<Draft>;
      const parts: SceneParts = {};
      for (const part of STEP_KEYS) if (typeof draft.parts?.[part] === "string") parts[part] = draft.parts[part];
      if (Object.keys(parts).length > 0) {
        setInitial(parts);
        setValues(parts);
        setRevision((value) => value + 1);
      }
      if (draft.when && (SCENE_WHENS as readonly string[]).includes(draft.when)) setWhen(draft.when);
    } catch {
      clearDraft(key);
    }
  }, [key]);

  function remember(next: SceneParts, nextWhen: SceneWhen | null) {
    writeDraft(key, JSON.stringify({ parts: next, when: nextWhen }));
  }

  function onValue(part: StepKey, text: string) {
    setValues((current) => {
      const next = { ...current, [part]: text };
      remember(next, when);
      return next;
    });
  }

  function chooseWhen(next: SceneWhen) {
    setWhen(next);
    remember(values, next);
  }

  function goNext() {
    if (step === 1 && needsFollowUp(values.action ?? "", askedFollowUp)) {
      setAskedFollowUp(true);
      setFollowUpOpen(true);
      return;
    }
    setFollowUpOpen(false);
    setExampleOpen(false);
    setStep((current) => Math.min(2, current + 1));
  }

  const sceneTitle = t(`interview.questions.${sceneId}.scene`);

  return (
    <form action={saveSceneAction} onSubmit={() => clearDraftSoon(key)} className="flex flex-col gap-8 xl:flex-row">
      <input type="hidden" name="turnId" value={turnId} />
      <input type="hidden" name="when" value={when ?? ""} />

      <aside className="relative flex flex-none flex-col gap-5 overflow-hidden rounded-3xl bg-[#5b36d4] p-7 text-white xl:w-[340px]">
        <svg className="sd-spin pointer-events-none absolute -bottom-[150px] -right-[170px] opacity-35" aria-hidden="true" width="420" height="420" viewBox="0 0 420 420">
          <circle cx="210" cy="210" r="200" fill="none" stroke="#c9bbf7" strokeWidth="1" strokeDasharray="2 8" />
          <circle cx="210" cy="210" r="150" fill="none" stroke="#c9bbf7" strokeWidth="1" />
          <circle cx="210" cy="210" r="100" fill="none" stroke="#c9bbf7" strokeWidth="1" strokeDasharray="40 14" />
          <circle cx="210" cy="60" r="6" fill="#fff" />
          <circle cx="360" cy="230" r="4" fill="#fff" />
        </svg>
        <div className="relative flex items-center gap-3.5">
          <svg width="56" height="56" viewBox="0 0 56 56" aria-hidden="true">
            <circle cx="28" cy="28" r="24" fill="none" stroke="#7f62e6" strokeWidth="4" />
            <circle
              cx="28"
              cy="28"
              r="24"
              fill="none"
              stroke="#fff"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={`${(150.8 * (index - 1 + (step + 1) / 3)) / total} 150.8`}
              transform="rotate(-90 28 28)"
              style={{ transition: "stroke-dasharray .6s ease" }}
            />
          </svg>
          <div className="flex flex-col">
            <span className="font-semibold">{t("discover.scene.counter", { index, total })}</span>
            <span className="text-[13px] text-[#dcd3fb]">{t("discover.scene.minutes")}</span>
          </div>
        </div>
        <p className="font-brand relative text-[28px] leading-[1.2]">{sceneTitle}</p>
        <fieldset className="relative m-0 flex flex-col gap-2.5 border-0 p-0">
          <legend className="mb-2.5 text-sm text-[#dcd3fb]">{t("discover.scene.whenLegend")}</legend>
          <div className="flex flex-wrap gap-2">
            {SCENE_WHENS.map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={when === option}
                onClick={() => chooseWhen(option)}
                className={`min-h-10 rounded-full border px-3.5 py-2 text-sm font-medium transition ${
                  when === option ? "border-white bg-white text-[#3f1fb0]" : "border-white/35 bg-white/10 text-white hover:bg-white/20"
                }`}
              >
                {t(`discover.scene.when.${option}`)}
              </button>
            ))}
          </div>
        </fieldset>
        <div className="relative mt-auto flex flex-col gap-1.5 border-t border-white/20 pt-4 text-[13px] text-[#dcd3fb]">
          <p className="hidden font-semibold text-white xl:block">{t("discover.scene.whyTitle")}</p>
          <p className="hidden xl:block">{t("discover.scene.why")}</p>
          <p className="xl:mt-2">{t("discover.scene.private")}</p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <h2 className="font-brand text-[clamp(28px,3vw,40px)] font-normal leading-[1.15] tracking-[-0.01em] text-[#14152b]">
          {t(`interview.questions.${sceneId}.title`)}
        </h2>

        <ol aria-label={t("discover.scene.stepsLabel")} className="m-0 grid list-none grid-cols-3 p-0">
          {STEP_KEYS.map((part, position) => {
            const done = position < step;
            const current = position === step;
            return (
              <li key={part} className="relative flex flex-col gap-2">
                {position > 0 ? (
                  <span aria-hidden="true" className={`absolute right-[calc(100%+8px)] top-4 h-0.5 w-[calc(100%-50px)] rounded-sm transition-colors duration-500 ${position <= step ? "bg-[#6d49e0]" : "bg-[#dcd8ee]"}`} />
                ) : null}
                <button
                  type="button"
                  aria-current={current ? "step" : undefined}
                  onClick={() => {
                    setStep(position);
                    setFollowUpOpen(false);
                    setExampleOpen(false);
                  }}
                  className="relative flex min-h-11 flex-col items-start gap-2 text-left"
                >
                  <span
                    className={`flex size-[34px] items-center justify-center rounded-full text-sm font-semibold transition-all duration-300 ${
                      done ? "bg-[#e3f3ef] text-[#0b5f57]" : current ? "bg-[#6d49e0] text-white shadow-[0_0_0_6px_#e4dcfb]" : "border border-[#d5d3e6] bg-white text-[#4a4d68]"
                    }`}
                  >
                    {done ? "✓" : position + 1}
                  </span>
                  <span className={`text-[15px] ${current ? "font-semibold text-[#14152b]" : "text-[#4a4d68]"}`}>{t(`discover.scene.steps.${part}.title`)}</span>
                </button>
              </li>
            );
          })}
        </ol>

        {STEP_KEYS.map((part, position) => (
          <section
            key={`${part}-${revision}`}
            hidden={position !== step}
            className="sd-slide flex flex-col gap-3.5 rounded-[22px] border border-[#e6e4f2] bg-white p-6 shadow-[0_18px_40px_-26px_rgba(46,30,120,0.35)]"
          >
            <div className="flex flex-col gap-0.5">
              <label htmlFor={`scene-${part}`} className="text-xl font-semibold">{t(`discover.scene.steps.${part}.title`)}</label>
              <span className="text-[15px] text-[#4a4d68]">{t(`discover.scene.steps.${part}.help`)}</span>
            </div>
            <DictatedTextarea
              id={`scene-${part}`}
              name={part}
              defaultValue={initial[part] ?? ""}
              rows={5}
              maxLength={PART_MAX_LENGTH}
              placeholder={t(`discover.scene.steps.${part}.placeholder`)}
              className="w-full rounded-2xl border border-[#d5d3e6] bg-[#fbfaff] p-4 text-[17px] leading-relaxed text-[#14152b] focus:border-[#6d49e0] focus:outline focus:outline-[3px] focus:outline-[#c9bbf7]"
              onValueChange={(text) => onValue(part, text)}
            />
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5">
              <button
                type="button"
                aria-expanded={exampleOpen}
                onClick={() => setExampleOpen(!exampleOpen)}
                className="inline-flex min-h-11 items-center text-[15px] font-semibold text-[#5b36d4]"
              >
                {exampleOpen ? t("discover.scene.hideExample") : t("discover.scene.showExample")}
              </button>
              <span className="ml-auto text-sm text-[#4a4d68]">{t("discover.scene.lengthHint")}</span>
            </div>
            {exampleOpen && position === step ? (
              <div className="flex gap-3.5 rounded-2xl bg-[#f4f1fe] px-[18px] py-4">
                <span aria-hidden="true" className="font-brand text-[44px] leading-[0.8] text-[#9c86f0]">»</span>
                <div className="flex flex-col gap-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#5b36d4]">{t("discover.scene.exampleLabel")}</p>
                  <p className="font-brand text-lg text-[#2b2d47]">{t(`discover.scene.steps.${part}.example`)}</p>
                </div>
              </div>
            ) : null}
            {followUpOpen && part === "action" && position === step ? (
              <div role="status" className="sd-slide flex flex-col gap-2 rounded-2xl border border-[#e4dcfb] bg-[#faf8ff] px-[18px] py-4">
                <p className="font-semibold">{t("discover.scene.followUpTitle")}</p>
                <p className="text-[15px] text-[#2b2d47]">{t("discover.scene.followUp")}</p>
                <button type="button" onClick={goNext} className="min-h-11 self-start text-[15px] font-semibold text-[#5b36d4] underline underline-offset-4">
                  {t("discover.scene.followUpKeep")}
                </button>
              </div>
            ) : null}
          </section>
        ))}

        <div className="flex flex-wrap items-center gap-3">
          {canSkip ? (
            <SubmitButton
              formAction={skipSceneAction}
              label={t("discover.scene.skip")}
              pendingLabel={t("discover.scene.skipPending")}
              className="min-h-11 text-sm text-[#4a4d68] underline-offset-4 hover:underline"
            />
          ) : null}
          <Link href="/me/profile" className="inline-flex min-h-11 items-center text-sm text-[#4a4d68] underline-offset-4 hover:underline">
            {t("discover.pick.pauseLink")}
          </Link>
          <div className="ml-auto flex gap-3">
            {step > 0 ? (
              <button type="button" onClick={() => { setStep(step - 1); setFollowUpOpen(false); }} className="min-h-12 rounded-[14px] border border-[#d5d3e6] bg-white px-5 font-semibold text-[#14152b]">
                {t("discover.scene.back")}
              </button>
            ) : null}
            {step < 2 ? (
              <button type="button" onClick={goNext} className="min-h-12 rounded-[14px] bg-[#14152b] px-6 font-semibold text-white">
                {t("discover.scene.next")}
              </button>
            ) : (
              <SubmitButton
                label={t("discover.scene.save")}
                pendingLabel={t("discover.scene.savePending")}
                className="inline-flex min-h-12 items-center rounded-[14px] bg-[#14152b] px-6 font-semibold text-white"
              />
            )}
          </div>
        </div>
      </div>

    </form>
  );
}

/** Der Browserstand wird erst nach dem Absenden geleert - schlägt das Speichern fehl, bleibt der Text erhalten. */
function clearDraftSoon(key: string) {
  setTimeout(() => clearDraft(key), 4000);
}
