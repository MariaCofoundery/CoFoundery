"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { spokenText } from "@/features/interviews/interviewAudio";
import { SpaceBackdrop } from "@/features/align/SpaceBackdrop";
import { INTRO_NOTES_MAX, INTRO_NOTE_MAX_LENGTH } from "@/features/strengths/strengthsDiscoverGuide";
import { startDiscoverAction } from "@/features/strengths/strengthsDiscoverActions";
import { SubmitButton } from "@/features/ui/SubmitButton";
import "@/features/align/align.css";

/** Wie lange jeder der fünf Teile steht (Millisekunden). Zusammen etwa eine halbe Minute. */
const DURATIONS = [5000, 6500, 7000, 7000, 7500];
const TICK = 250;
/** Mit Ton: Zeit zum Nachdenken NACH dem gesprochenen Satz (Millisekunden) - je Teil, die fragenden etwas laenger. */
const REFLECT_AFTER_SPEECH = [6000, 5000, 8000, 7000, 5000];
const MOMENT_X = [190, 300, 450, 560, 700];
const MOMENT_RAISED_Y = [120, 160, 80, 140, 100];
const BUBBLE_X = [190, 450, 560, 700];

/**
 * Runde 1 von „Stärken entdecken“: das Einstimmen (Entwurf vom 12.11.2026).
 *
 * Kein Video, sondern fünf kurze Bilder aus CSS und SVG - anhalten, zurück, überspringen und „Intro
 * nochmal“ gehen jederzeit. Am Ende können freiwillig Stichworte festgehalten werden; sie landen
 * nur am Gespräch der Person (`intro_notes`), tauchen beim Wählen der Szenen wieder auf und gehen
 * nicht in die Auswertung.
 *
 * Bei „weniger Bewegung“ im Gerät stehen die Bilder still (align.css); die Texte laufen weiter.
 */
export function StrengthsIntro() {
  const locale = useLocale();
  const t = useTranslations("strengths.discover");
  const tRoot = useTranslations("strengths");
  const [step, setStep] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [notes, setNotes] = useState<string[]>([]);
  const [draft, setDraft] = useState("");

  const stepKeys = ["s1", "s2", "s3", "s4", "s5"] as const;
  const bubbles = ["b1", "b2", "b3", "b4"].map((key) => t(`intro.bubbles.${key}`));
  const outline = ["o1", "o2", "o3"].map((key) => t(`intro.outline.${key}`));
  const atEnd = step >= DURATIONS.length;

  // Ton: nur, wenn fuer die Sprache eine Aufnahme vorliegt (scripts/tts-build.ts). Er ist aus, bis man ihn anschaltet -
  // der Browser erlaubt Ton ohnehin erst nach einem Klick. Mit Ton wartet jeder Teil, bis sein Satz zu Ende gesprochen ist.
  const clips = stepKeys.map((_, index) => spokenText(locale, `strengths_intro.s${index + 1}`));
  const hasSound = clips.every(Boolean);
  const [sound, setSound] = useState(false);
  // Mit Ton laeuft ein Teil: gesprochener Satz + Zeit zum Nachdenken. Er geht erst weiter, wenn der Satz wirklich zu Ende
  // gesprochen ist (clipDone) - auch wenn die Datei langsam laedt. So bricht der Ton nie ab.
  const durationOf = (index: number) => (sound && clips[index] ? Math.ceil(clips[index]!.seconds * 1000) + REFLECT_AFTER_SPEECH[index] : DURATIONS[index]);
  const [clipDone, setClipDone] = useState(true);
  const player = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    player.current?.pause();
    player.current = null;
    const clip = sound && playing && !atEnd ? clips[step] : null;
    if (!clip) {
      setClipDone(true);
      return;
    }
    setClipDone(false);
    const audio = new Audio(clip.src);
    player.current = audio;
    audio.addEventListener("ended", () => setClipDone(true));
    audio.addEventListener("error", () => setClipDone(true));
    void audio.play().catch(() => {
      setSound(false);
      setClipDone(true);
    });
    return () => {
      audio.pause();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sound, playing, atEnd, step]);

  useEffect(() => {
    if (!playing || atEnd) return;
    const timer = setInterval(() => {
      setElapsed((value) => {
        // Mit Ton erst weiter, wenn der Satz zu Ende gesprochen ist.
        if (value + TICK >= durationOf(step) && !clipDone) return value;
        if (value + TICK >= durationOf(step)) {
          setStep((current) => current + 1);
          return 0;
        }
        return value + TICK;
      });
    }, TICK);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, atEnd, step, sound, clipDone]);

  const go = (next: number) => {
    setStep(Math.max(0, Math.min(DURATIONS.length, next)));
    setElapsed(0);
    setPlaying(true);
  };

  function addNote() {
    const text = draft.replace(/\s+/g, " ").trim().slice(0, INTRO_NOTE_MAX_LENGTH);
    if (text && !notes.includes(text) && notes.length < INTRO_NOTES_MAX) setNotes([...notes, text]);
    setDraft("");
  }

  const control =
    "flex size-10 items-center justify-center rounded-full border border-[#3a3c66] bg-transparent text-white hover:bg-white/10";

  return (
    <section className="align-hero relative min-h-[640px] rounded-[28px]" aria-label={t("intro.round")}>
      <SpaceBackdrop count={40} seed={7} glowClassName="left-[26%] top-[100px] h-[420px] w-[600px] blur-[140px]" />

      <div className="relative flex flex-col gap-4 px-6 pt-6 sm:px-10">
        <div className="flex gap-1.5" aria-hidden="true">
          {DURATIONS.map((_duration, index) => {
            const pct = step > index ? 100 : step === index ? Math.min(100, (elapsed / durationOf(index)) * 100) : 0;
            return (
              <button key={index} type="button" tabIndex={-1} onClick={() => go(index)} className="flex h-3.5 flex-1 items-center">
                <span className="block h-[3px] w-full overflow-hidden rounded-sm bg-[#2a2c4a]">
                  <span className="block h-full bg-white transition-[width] duration-200 ease-linear" style={{ width: `${pct}%` }} />
                </span>
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-col">
            <span className="font-semibold">{tRoot("title")}</span>
            <span className="text-[13px] text-[#a9abcb]">{t("intro.round")}</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {hasSound ? (
              <button type="button" onClick={() => setSound(!sound)} aria-pressed={sound} className={`${control} w-auto px-3.5 text-[13px]`}>
                {sound ? t("controls.soundOff") : t("controls.soundOn")}
              </button>
            ) : null}
            <button type="button" onClick={() => go(step - 1)} aria-label={t("controls.prev")} className={control}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6" /></svg>
            </button>
            <button
              type="button"
              onClick={() => (atEnd ? go(0) : setPlaying(!playing))}
              aria-label={playing && !atEnd ? t("controls.pause") : t("controls.play")}
              className="flex size-10 items-center justify-center rounded-full bg-white text-[#0b0c1a]"
            >
              {playing && !atEnd ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="5" y="4" width="5" height="16" rx="1" /><rect x="14" y="4" width="5" height="16" rx="1" /></svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4l13 8-13 8z" /></svg>
              )}
            </button>
            <button type="button" onClick={() => go(step + 1)} aria-label={t("controls.next")} className={control}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
            </button>
            {!atEnd ? (
              <button type="button" onClick={() => go(DURATIONS.length)} className="min-h-10 px-2 text-sm font-medium text-[#a9abcb] hover:text-white">
                {t("controls.skip")}
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {!atEnd ? (
        <div className="relative flex flex-col items-center px-6 pb-10">
          <div className="relative mt-3 w-full max-w-[960px]">
            <svg viewBox="0 0 960 330" aria-hidden="true" className="h-auto w-full overflow-visible">
              {step === 0 ? (
                <>
                  <circle className="sd-breathe-slow" cx="480" cy="170" r="120" fill="none" stroke="#3b2c8a" strokeWidth="1.5" />
                  <circle className="sd-breathe" cx="480" cy="170" r="78" fill="#2a1f6b" />
                  <circle className="sd-breathe" cx="480" cy="170" r="10" fill="#c9bbf7" />
                </>
              ) : null}
              <g style={{ transition: "opacity 1s", opacity: step >= 1 && step <= 4 ? 1 : 0 }}>
                <line x1="80" y1="220" x2="880" y2="220" stroke="#3a3c66" strokeWidth="1.5" />
                <g fontFamily="Inter, sans-serif" fontSize="14" fill="#8e90b8" textAnchor="middle">
                  <text x="140" y="258">{t("intro.timeline.years")}</text>
                  <text x="380" y="258">{t("intro.timeline.months")}</text>
                  <text x="620" y="258">{t("intro.timeline.weeks")}</text>
                  <text x="840" y="258">{t("intro.timeline.today")}</text>
                </g>
              </g>
              {step === 1 ? (
                <g className="sd-travel">
                  <circle cx="840" cy="220" r="22" fill="#6d49e0" opacity="0.35" />
                  <circle cx="840" cy="220" r="7" fill="#e6deff" />
                </g>
              ) : null}
              {step === 4 ? <polyline className="sd-draw" points="190,120 300,160 450,80 560,140 700,100" fill="none" stroke="#9c86f0" strokeWidth="1.5" strokeLinejoin="round" /> : null}
              {step >= 2 && step <= 4
                ? MOMENT_X.map((x, index) => (
                    <g key={x} style={{ transition: "transform 1.4s cubic-bezier(.2,.8,.2,1)", transform: `translateY(${step >= 4 ? MOMENT_RAISED_Y[index] - 220 : 0}px)` }}>
                      <g className="sd-pop" style={{ animationDelay: `${(index * 0.35).toFixed(2)}s` }}>
                        <circle cx={x} cy="220" r="20" fill="#6d49e0" opacity="0.3" />
                        <circle cx={x} cy="220" r="6" fill="#fff" />
                      </g>
                    </g>
                  ))
                : null}
            </svg>
            {step === 3
              ? bubbles.slice(0, 4).map((text, index) => (
                  <div
                    key={text}
                    className="sd-bubble absolute whitespace-nowrap rounded-[16px_16px_16px_4px] bg-white px-3.5 py-2 text-sm font-medium text-[#14152b]"
                    style={{ left: `${((BUBBLE_X[index] - 20) / 960) * 100}%`, top: `${((index % 2 ? 70 : 120) / 330) * 100}%`, animationDelay: `${(index * 0.6).toFixed(1)}s` }}
                  >
                    {text}
                  </div>
                ))
              : null}
          </div>
          <div key={step} className="flex max-w-[820px] flex-col items-center gap-3.5 text-center">
            <h2 className="align-fade-up font-brand text-[clamp(30px,4vw,48px)] font-normal leading-[1.12] tracking-[-0.01em]">{t(`intro.steps.${stepKeys[step]}.title`)}</h2>
            <p className="align-fade-up max-w-[640px] text-[19px] text-[#b9bbd6]" style={{ animationDelay: "0.7s" }}>{t(`intro.steps.${stepKeys[step]}.text`)}</p>
          </div>
        </div>
      ) : (
        <form action={startDiscoverAction} className="align-fade-up relative mx-auto flex w-full max-w-[760px] flex-col items-center gap-5 px-6 pb-10 pt-6 text-center">
          <input type="hidden" name="notes" value={JSON.stringify(notes)} />
          <h2 className="font-brand text-[clamp(30px,4vw,46px)] font-normal leading-[1.12]">{t("intro.endTitle")}</h2>
          <p className="text-lg text-[#b9bbd6]">{t("intro.endText")}</p>
          <div className="flex w-full flex-col gap-3.5 rounded-[18px] border border-[#2e3050] bg-[#15162b] p-[18px] text-left">
            <label htmlFor="intro-note" className="text-[13px] text-[#a9abcb]">{t("intro.notesLabel")}</label>
            <div className="flex gap-2.5">
              <input
                id="intro-note"
                type="text"
                value={draft}
                maxLength={INTRO_NOTE_MAX_LENGTH}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    addNote();
                  }
                }}
                placeholder={t("intro.notesPlaceholder")}
                className="min-h-[46px] flex-1 rounded-xl border border-[#3a3c66] bg-[#0b0c1a] px-3.5 text-base text-white placeholder:text-[#8e90b8]"
              />
              <button type="button" onClick={addNote} className="min-h-[46px] rounded-xl bg-[#2a2c4a] px-[18px] font-semibold text-white hover:bg-[#363860]">
                {t("intro.addNote")}
              </button>
            </div>
            {notes.length > 0 ? (
              <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
                {notes.map((note) => (
                  <li key={note} className="align-fade-up inline-flex items-center gap-1.5 rounded-full bg-[#2a1f6b] py-1.5 pl-3.5 pr-1.5 text-sm text-[#e6deff]">
                    {note}
                    <button
                      type="button"
                      aria-label={t("intro.removeNote", { note })}
                      onClick={() => setNotes(notes.filter((value) => value !== note))}
                      className="flex size-7 items-center justify-center rounded-full text-base leading-none text-[#a9abcb] hover:text-white"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <SubmitButton
              label={t("intro.continue")}
              pendingLabel={t("intro.continuePending")}
              className="inline-flex min-h-12 items-center rounded-xl bg-white px-6 py-3.5 text-base font-semibold text-[#0b0c1a]"
            />
            <button type="button" onClick={() => go(0)} className="min-h-12 rounded-xl border border-[#3a3c66] px-5 font-semibold text-white hover:bg-white/10">
              {t("intro.replay")}
            </button>
          </div>
          <ul className="m-0 flex list-none flex-wrap justify-center gap-x-7 gap-y-1 p-0 text-[13px] text-[#a9abcb]">
            {outline.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <p className="text-[13px] text-[#8e90b8]">{t("intro.private")} {t("intro.noTest")}</p>
        </form>
      )}
    </section>
  );
}
