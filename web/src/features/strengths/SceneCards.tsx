"use client";

import Link from "next/link";
import { useState } from "react";
import { useTranslations } from "next-intl";

import { pickScenesAction } from "@/features/strengths/strengthsDiscoverActions";
import { SCENE_IDS, SCENE_MAX, SCENE_MIN, type SceneId } from "@/features/strengths/strengthsDiscoverGuide";
import { SceneVignette } from "@/features/strengths/SceneVignette";
import { SubmitButton } from "@/features/ui/SubmitButton";
import "@/features/align/align.css";

/**
 * Runde 2: die Szenen wählen (Entwurf vom 12.11.2026). Zwölf Szenen als ruhige Liste, drei davon.
 * „Weiter“ gibt es erst bei drei. Die Reihenfolge der Auswahl ist die Reihenfolge der Fragen.
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

      <div role="group" aria-label={t("discover.pick.title")} className="flex flex-col">
        {SCENE_IDS.map((id) => {
          const on = picked.includes(id);
          const full = !on && count >= SCENE_MAX;
          return (
            <button
              key={id}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(id)}
              title={full ? t("discover.pick.limit") : undefined}
              className={`grid min-h-[88px] grid-cols-[64px_minmax(0,1fr)_28px] items-center gap-4 border-b px-3 py-3.5 text-left text-[#14152b] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6d49e0] ${
                on ? "rounded-[18px] border-transparent bg-[#f1ecfe]" : "border-[#e6e4f2] hover:bg-[#6d49e0]/5"
              } ${full ? "opacity-55" : ""}`}
            >
              <SceneVignette id={id} selected={on} />
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-[16px] font-semibold leading-snug">{t(`interview.questions.${id}.scene`)}</span>
                {on ? <span className="text-[13px] text-[#4a4d68]">{t(`interview.questions.${id}.hint`)}</span> : null}
              </span>
              <span
                aria-hidden="true"
                className={`flex size-[26px] items-center justify-center rounded-full border-[1.5px] text-[13px] ${on ? "border-[#6d49e0] bg-[#6d49e0] text-white" : "border-[#cfcde3] text-transparent"}`}
              >
                ✓
              </span>
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
        <Link href="/me/profile" className="underline underline-offset-4">{t("discover.pick.pauseLink")}</Link>
      </p>
    </form>
  );
}
