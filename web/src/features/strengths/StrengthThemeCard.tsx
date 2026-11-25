"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { confirmThemeStrengthAction, dismissThemeAction } from "@/features/strengths/strengthsDiscoverActions";
import type { EvidenceLevel, StrengthThemeId } from "@/features/strengths/strengthThemes";
import { SubmitButton } from "@/features/ui/SubmitButton";
import { UserText } from "@/features/ui/UserText";

/**
 * Ein Thema im Stärkenbild: Name, wie gut belegt (drei Worte, keine Zahl), die eigene Stelle als Beleg und drei Wege -
 * übernehmen, umschreiben, entfernen. Nichts kommt ins Profil, bevor die Person übernimmt.
 */
export function StrengthThemeCard({
  theme,
  level,
  quote,
  confirmed,
}: {
  theme: StrengthThemeId;
  level: EvidenceLevel;
  quote: string;
  confirmed: boolean;
}) {
  const t = useTranslations("strengths");
  const [rewriting, setRewriting] = useState(false);
  const shows = t(`themes.items.${theme}.shows`);

  return (
    <article className="flex flex-col gap-3 rounded-[20px] border border-[#e6e4f2] bg-white p-5 shadow-[0_12px_30px_-24px_rgba(46,30,120,0.5)]">
      <div className="flex flex-wrap items-center gap-2.5">
        <h3 className="font-brand text-2xl font-normal text-[#14152b]">{t(`themes.items.${theme}.name`)}</h3>
        <span className="rounded-full bg-[#efeafd] px-2.5 py-1 text-xs font-semibold text-[#4b2bb8]">{t(`proposals.level.${level}`)}</span>
      </div>
      <p className="text-[15px] text-[#2b2d47]">{shows}</p>
      <blockquote className="m-0 rounded-xl bg-[#f4f1fe] px-4 py-3 text-[15px] leading-snug text-[#2b2d47]">
        <small className="mb-1 block text-xs font-semibold uppercase tracking-[0.08em] text-[#5b36d4]">{t("discover.result.inYourWords")}</small>
        »<UserText text={quote} />«
      </blockquote>
      {confirmed ? (
        <p className="text-sm font-semibold text-[#0b5f57]">✓ {t("discover.result.taken")}</p>
      ) : (
        <form className="flex flex-col gap-3">
          <input type="hidden" name="theme" value={theme} />
          {rewriting ? (
            <div className="flex flex-col gap-1.5">
              <label htmlFor={`rewrite-${theme}`} className="text-sm font-semibold">{t("discover.result.rewriteLabel")}</label>
              <textarea
                id={`rewrite-${theme}`}
                name="statement"
                defaultValue={shows}
                rows={3}
                maxLength={200}
                className="w-full rounded-xl border border-[#d5d3e6] bg-[#fbfaff] p-3 text-[16px] focus:border-[#6d49e0] focus:outline focus:outline-[3px] focus:outline-[#c9bbf7]"
              />
            </div>
          ) : null}
          <div className="flex flex-wrap items-center gap-3">
            <SubmitButton
              formAction={confirmThemeStrengthAction}
              label={t("discover.result.take")}
              pendingLabel={t("proposals.pending")}
              className="inline-flex min-h-11 items-center rounded-xl bg-[#14152b] px-5 text-[15px] font-semibold text-white"
            />
            {!rewriting ? (
              <button type="button" onClick={() => setRewriting(true)} className="min-h-11 text-[15px] font-semibold text-[#5b36d4] underline underline-offset-4">
                {t("discover.result.rewrite")}
              </button>
            ) : null}
            <SubmitButton
              formAction={dismissThemeAction}
              label={t("discover.result.remove")}
              pendingLabel={t("proposals.pending")}
              className="ml-auto min-h-11 text-sm text-[#4a4d68] underline-offset-4 hover:underline"
            />
          </div>
        </form>
      )}
    </article>
  );
}
