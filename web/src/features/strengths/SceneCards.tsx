"use client";

import Link from "next/link";
import { useState } from "react";
import { useTranslations } from "next-intl";

import { pickScenesAction } from "@/features/strengths/strengthsDiscoverActions";
import { SCENE_IDS, SCENE_MAX, SCENE_MIN, type SceneId } from "@/features/strengths/strengthsDiscoverGuide";
import { SubmitButton } from "@/features/ui/SubmitButton";
import "@/features/align/align.css";

const ICON: Record<SceneId, string> = {
  sc_unsure: "M3 20l6-10 4 6 3-4 5 8z M9 10V4l5 2-5 2",
  sc_nobody: "M7 11V6a1.5 1.5 0 0 1 3 0v5 M10 10V4.5a1.5 1.5 0 0 1 3 0V10 M13 10V6a1.5 1.5 0 0 1 3 0v7c0 4-2.5 8-6.5 8-3 0-4.5-2-6-5l-1-2a1.5 1.5 0 0 1 2.6-1.5L7 14",
  sc_fast_decision: "M13 2L4 14h7l-1 8 9-12h-7z",
  sc_stuck_problem: "M9 18h6 M10 22h4 M12 2a7 7 0 0 0-4 12.7V16h8v-1.3A7 7 0 0 0 12 2z",
  sc_from_zero: "M3 21h18 M5 21V12h5v9 M10 21V7h5v14 M15 21V3h5v18",
  sc_convinced: "M21 12a8 8 0 0 1-11.6 7.1L4 21l1.9-5.4A8 8 0 1 1 21 12z M8.5 12h7",
  sc_uncomfortable: "M12 3l10 18H2z M12 10v4 M12 17v.5",
  sc_helped_grow: "M12 22V11 M12 11C12 7 9 4 4 4c0 4 3 7 8 7z M12 13c0-3 2.5-6 7-6 0 3.5-2.5 6-7 6z",
  sc_connected: "M3 12a3 3 0 1 0 6 0a3 3 0 1 0-6 0 M15 6a3 3 0 1 0 6 0a3 3 0 1 0-6 0 M15 18a3 3 0 1 0 6 0a3 3 0 1 0-6 0 M8.7 10.7l6.6-3.4 M8.7 13.3l6.6 3.4",
  sc_learned_fast: "M4 19V5a2 2 0 0 1 2-2h14v15H6a2 2 0 0 0-2 2 2 2 0 0 0 2 2h14 M9 7h7",
  sc_order: "M4 6h16 M4 12h11 M4 18h6",
  sc_asked_for: "M12 21s-8-5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 6-8 11-8 11z",
};

/**
 * Runde 2: die Szenen wählen (Entwurf vom 12.11.2026). Zwölf Karten, fünf oder sechs davon.
 * „Weiter“ gibt es erst ab fünf. Die Reihenfolge der Auswahl ist die Reihenfolge der Fragen.
 * Die Stichworte aus dem Intro stehen oben, damit man sieht, welche Szene dazu passt.
 */
export function SceneCards({ introNotes }: { introNotes: string[] }) {
  const t = useTranslations("strengths");
  const [picked, setPicked] = useState<SceneId[]>([]);
  const count = picked.length;
  const ready = count >= SCENE_MIN;

  function toggle(id: SceneId) {
    setPicked((current) => (current.includes(id) ? current.filter((value) => value !== id) : current.length < SCENE_MAX ? [...current, id] : current));
  }

  return (
    <form action={pickScenesAction} className="flex flex-col gap-6 pb-28">
      {picked.map((id) => (
        <input key={id} type="hidden" name="scene" value={id} />
      ))}

      <div className="flex flex-wrap items-end gap-x-10 gap-y-5">
        <div className="sd-fade flex min-w-0 flex-[1_1_420px] flex-col gap-2.5">
          <p className="text-[13px] font-semibold uppercase tracking-[0.1em] text-[#5b36d4]">{t("discover.pick.round")}</p>
          <h2 className="font-brand text-[clamp(30px,3.6vw,46px)] font-normal leading-[1.08] tracking-[-0.01em] text-[#14152b]">
            {t("discover.pick.title")}
          </h2>
          <p className="max-w-[620px] text-[17px] leading-relaxed text-[#4a4d68]">{t("discover.pick.text")}</p>
        </div>
        {introNotes.length > 0 ? (
          <div className="flex w-full flex-col gap-2.5 rounded-[18px] bg-[#14152b] px-5 py-[18px] text-white sm:w-[360px]">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#c9bbf7]">{t("discover.pick.yourNotes")}</p>
            <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
              {introNotes.map((note) => (
                <li key={note} className="rounded-full bg-[#2a1f6b] px-3 py-1 text-sm text-[#e6deff]">{note}</li>
              ))}
            </ul>
            <p className="text-[13px] text-[#b9bbd6]">{t("discover.pick.whichFits")}</p>
          </div>
        ) : null}
      </div>

      <div role="group" aria-label={t("discover.pick.title")} className="grid gap-3.5 [grid-template-columns:repeat(auto-fill,minmax(230px,1fr))]">
        {SCENE_IDS.map((id, index) => {
          const on = picked.includes(id);
          const full = !on && count >= SCENE_MAX;
          return (
            <button
              key={id}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(id)}
              title={full ? t("discover.pick.limit") : undefined}
              className={`sd-card align-rise flex min-h-[178px] flex-col gap-2.5 rounded-[18px] border-2 p-4 text-left text-[#14152b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6d49e0] ${
                on
                  ? "border-[#6d49e0] bg-white shadow-[0_10px_26px_-14px_rgba(109,73,224,0.6)]"
                  : "border-[#e6e4f2] bg-white/90"
              } ${full ? "opacity-60" : ""}`}
              style={{ animationDelay: `${(index * 0.05).toFixed(2)}s` }}
            >
              <span className="flex items-start justify-between">
                <span className={`flex size-11 items-center justify-center rounded-[14px] transition-colors ${on ? "bg-[#6d49e0]" : "bg-[#efeafd]"}`}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={on ? "#fff" : "#5b36d4"} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d={ICON[id]} />
                  </svg>
                </span>
                {on ? (
                  <span className="sd-check flex size-[26px] items-center justify-center rounded-full bg-[#6d49e0]" aria-hidden="true">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10" /></svg>
                  </span>
                ) : null}
              </span>
              <span className="text-[15px] font-semibold leading-snug">{t(`interview.questions.${id}.scene`)}</span>
              {on ? (
                <span className="sd-fade text-[13px] text-[#4b2bb8]">{t("discover.pick.question", { question: t(`interview.questions.${id}.title`) })}</span>
              ) : (
                <span className="text-[13px] text-[#4a4d68]">{t(`interview.questions.${id}.hint`)}</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="sd-tray sticky bottom-4 z-10 mx-auto flex w-full max-w-[1060px] flex-wrap items-center gap-x-5 gap-y-3 rounded-[22px] bg-[#14152b] py-3.5 pl-6 pr-3.5 text-white shadow-[0_24px_50px_-18px_rgba(20,21,43,0.55)]">
        <div className="flex flex-none flex-col gap-1.5">
          <p className="font-semibold" role="status">{t("discover.pick.selected", { count })}</p>
          <div className="flex gap-[5px]" aria-hidden="true">
            {Array.from({ length: SCENE_MAX }, (_, index) => (
              <span key={index} className={`h-1.5 w-[18px] rounded-sm transition-colors duration-300 ${index < count ? "bg-[#9c86f0]" : index < SCENE_MIN ? "bg-[#3a3c66]" : "bg-[#2a2c4a]"}`} />
            ))}
          </div>
        </div>
        <ul className="m-0 flex min-w-0 flex-1 list-none flex-wrap gap-1.5 p-0">
          {picked.map((id) => (
            <li key={id} className="sd-fade whitespace-nowrap rounded-full bg-[#2a2c4a] px-3 py-[5px] text-[13px] text-[#e6e7f2]">
              {t(`interview.questions.${id}.short`)}
            </li>
          ))}
        </ul>
        {ready ? (
          <SubmitButton
            label={t("discover.pick.go", { count })}
            pendingLabel={t("discover.pick.goPending")}
            className="inline-flex min-h-12 flex-none items-center rounded-[14px] bg-white px-[22px] font-semibold text-[#14152b]"
          />
        ) : (
          <span className="flex min-h-12 flex-none items-center rounded-[14px] bg-[#2a2c4a] px-[22px] font-semibold text-[#b9bbd6]">
            {t("discover.pick.need", { count: SCENE_MIN - count })}
          </span>
        )}
      </div>
      <p className="text-center text-[13px] text-[#4a4d68]">
        {t("discover.pick.tip")} ·{" "}
        <Link href="/profile?step=strengths" className="underline underline-offset-4">{t("discover.pick.pauseLink")}</Link>
      </p>
    </form>
  );
}
