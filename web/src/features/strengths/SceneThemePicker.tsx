"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { reopenSceneAction, saveSceneThemesAction } from "@/features/strengths/strengthsDiscoverActions";
import { SCENE_THEME_SUGGESTIONS, THEMES_PER_SCENE_MAX, type SceneId } from "@/features/strengths/strengthsDiscoverGuide";
import { STRENGTH_DOMAINS, STRENGTH_THEMES_BY_DOMAIN, type StrengthThemeId } from "@/features/strengths/strengthThemes";
import { SubmitButton } from "@/features/ui/SubmitButton";
import { UserText } from "@/features/ui/UserText";
import "@/features/align/align.css";

/**
 * Nach dem Text zu einer Szene: bis zu zwei Themen wählen (25.11.2026). Vier liegen nahe und stehen oben; alle 28 sind
 * erreichbar. Gewählt wird immer von der Person - der Vorschlag ist eine feste Liste je Szene, keine Auswertung ihres Textes.
 */
export function SceneThemePicker({
  turnId,
  sceneId,
  index,
  total,
  story,
}: {
  turnId: string;
  sceneId: SceneId;
  index: number;
  total: number;
  story: string;
}) {
  const t = useTranslations("strengths");
  const [picked, setPicked] = useState<StrengthThemeId[]>([]);
  const [all, setAll] = useState(false);
  const last = index >= total;
  const suggested = SCENE_THEME_SUGGESTIONS[sceneId] as readonly StrengthThemeId[];

  function toggle(theme: StrengthThemeId) {
    setPicked((current) => (current.includes(theme) ? current.filter((value) => value !== theme) : current.length < THEMES_PER_SCENE_MAX ? [...current, theme] : current));
  }

  const pill = (theme: StrengthThemeId) => {
    const on = picked.includes(theme);
    return (
      <button
        key={theme}
        type="button"
        aria-pressed={on}
        onClick={() => toggle(theme)}
        className={`min-h-11 rounded-full border px-4 py-2 text-[15px] font-medium transition ${on ? "border-[#6d49e0] bg-[#6d49e0] text-white" : "border-[#d5d3e6] bg-white text-[#14152b] hover:border-[#6d49e0]"}`}
      >
        {t(`themes.items.${theme}.name`)}
      </button>
    );
  };

  return (
    <form action={saveSceneThemesAction} className="mx-auto flex w-full max-w-[860px] flex-col gap-6">
      <input type="hidden" name="turnId" value={turnId} />
      {picked.map((theme) => (
        <input key={theme} type="hidden" name="theme" value={theme} />
      ))}

      <div className="flex flex-col gap-2">
        <p className="text-[13px] font-semibold uppercase tracking-[0.1em] text-[#5b36d4]">{t("discover.scene.counter", { index, total })}</p>
        <h2 className="font-brand text-[clamp(28px,3.4vw,42px)] font-normal leading-[1.1] tracking-[-0.01em] text-[#14152b]">{t("discover.themes.title")}</h2>
        <p className="text-[17px] leading-relaxed text-[#4a4d68]">{t("discover.themes.text", { max: THEMES_PER_SCENE_MAX })}</p>
      </div>

      <blockquote className="m-0 rounded-2xl bg-[#f4f1fe] px-5 py-4 font-brand text-[17px] leading-snug text-[#2b2d47]">
        <UserText text={story} />
      </blockquote>

      <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2">
        {suggested.map((theme) => {
          const on = picked.includes(theme);
          return (
            <li key={theme}>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => toggle(theme)}
                className={`flex h-full w-full flex-col gap-1 rounded-2xl border-2 p-4 text-left transition ${on ? "border-[#6d49e0] bg-[#f1ecfe]" : "border-[#e6e4f2] bg-white hover:border-[#c9bbf7]"}`}
              >
                <span className="flex items-center justify-between font-semibold text-[#14152b]">
                  {t(`themes.items.${theme}.name`)}
                  <span aria-hidden="true" className={on ? "text-[#6d49e0]" : "text-transparent"}>✓</span>
                </span>
                <span className="text-[14px] text-[#4a4d68]">{t(`themes.items.${theme}.shows`)}</span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-col gap-3">
        <button type="button" aria-expanded={all} onClick={() => setAll(!all)} className="inline-flex min-h-11 items-center self-start text-[15px] font-semibold text-[#5b36d4]">
          {all ? t("discover.themes.hideAll") : t("discover.themes.showAll")}
        </button>
        {all ? (
          <div className="flex flex-col gap-4">
            {STRENGTH_DOMAINS.map((domain) => (
              <div key={domain} className="flex flex-col gap-2">
                <h3 className="text-sm font-semibold text-[#4a4d68]">{t(`themes.domains.${domain}.title`)}</h3>
                <div className="flex flex-wrap gap-2">{(STRENGTH_THEMES_BY_DOMAIN[domain] as readonly StrengthThemeId[]).map(pill)}</div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton
          formAction={reopenSceneAction}
          label={t("discover.themes.back")}
          pendingLabel={t("discover.scene.savePending")}
          className="min-h-12 rounded-[14px] border border-[#d5d3e6] bg-white px-5 font-semibold text-[#14152b]"
        />
        <div className="ml-auto flex items-center gap-3">
          <span role="status" className="text-sm text-[#4a4d68]">{t("discover.themes.chosen", { count: picked.length, max: THEMES_PER_SCENE_MAX })}</span>
          <SubmitButton
            label={last ? t("discover.themes.toResult") : t("discover.themes.nextScene")}
            pendingLabel={t("discover.scene.savePending")}
            className="inline-flex min-h-12 items-center rounded-[14px] bg-[#14152b] px-6 font-semibold text-white"
          />
        </div>
      </div>
    </form>
  );
}
