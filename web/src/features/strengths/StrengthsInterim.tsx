import { getTranslations } from "next-intl/server";

import type { StrengthsTurn } from "@/features/strengths/strengthsInterviewData";
import { keySentence } from "@/features/strengths/strengthsDiscoverGuide";
import { StrengthThemeCard } from "@/features/strengths/StrengthThemeCard";
import { domainOfTheme, evidenceLevelFor, STRENGTH_DOMAINS, type StrengthThemeId } from "@/features/strengths/strengthThemes";
import { finishWithoutRoundThreeAction, startRoundThreeAction } from "@/features/strengths/strengthsDiscoverActions";
import { SubmitButton } from "@/features/ui/SubmitButton";
import Link from "next/link";
import "@/features/align/align.css";

/**
 * „Dein Stärkenbild“ direkt nach den drei Szenen (25.11.2026).
 *
 * ES ZEIGT NUR, WAS DIE PERSON SELBST GEWÄHLT HAT: die Themen, die sie nach jeder Szene angetippt hat, gruppiert nach den vier
 * Bereichen. Wie gut ein Thema belegt ist, folgt aus der Zahl ihrer Szenen (eine / zwei / drei) und steht in drei Worten, nicht
 * als Zahl. Jede Karte nennt die eigene Stelle als Beleg. Ins Profil kommt ein Thema erst, wenn die Person es übernimmt.
 * Eine KI-Auswertung gibt es nur auf ausdrücklichen Wunsch nach dem Abschluss (`request_strength_proposals`).
 */
export async function StrengthsInterim({ turns, confirmedThemes }: { turns: StrengthsTurn[]; confirmedThemes: string[] }) {
  const t = await getTranslations("strengths");
  const scenes = turns.filter((turn) => turn.answer !== null && turn.themes !== null);

  const byTheme = new Map<StrengthThemeId, StrengthsTurn[]>();
  for (const turn of scenes) {
    for (const theme of turn.themes ?? []) byTheme.set(theme, [...(byTheme.get(theme) ?? []), turn]);
  }
  const groups = STRENGTH_DOMAINS.map((domain) => ({
    domain,
    items: [...byTheme.entries()].filter(([theme]) => domainOfTheme(theme) === domain),
  })).filter((group) => group.items.length > 0);

  return (
    <section className="flex flex-col gap-7">
      <div className="sd-fade flex max-w-[820px] flex-col gap-2">
        <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-[#5b36d4]">{t("discover.result.eyebrow")}</p>
        <h2 className="font-brand text-[clamp(34px,4vw,50px)] font-normal leading-[1.05] tracking-[-0.01em] text-[#14152b]">
          {t("discover.result.title")}
        </h2>
        <p className="text-[17px] leading-relaxed text-[#4a4d68]">{t("discover.result.text")}</p>
        <p className="text-sm text-[#4a4d68]">{t("levelNoteShort")}</p>
      </div>

      {groups.length === 0 ? (
        <p className="max-w-[640px] rounded-2xl bg-[#f4f1fe] p-5 text-[16px] text-[#2b2d47]">{t("discover.result.empty")}</p>
      ) : (
        groups.map(({ domain, items }) => (
          <div key={domain} className="flex flex-col gap-3.5">
            <div className="flex flex-col">
              <h3 className="font-brand text-[28px] font-normal text-[#14152b]">{t(`themes.domains.${domain}.title`)}</h3>
              <p className="text-sm text-[#4a4d68]">{t(`themes.domains.${domain}.text`)}</p>
            </div>
            <div className="grid gap-3.5 [grid-template-columns:repeat(auto-fit,minmax(300px,1fr))]">
              {items.map(([theme, sources]) => (
                <StrengthThemeCard
                  key={theme}
                  theme={theme}
                  level={evidenceLevelFor(sources.length)}
                  quote={keySentence({ parts: { action: sources[0]!.parts.story }, answer: sources[0]!.answer })}
                  confirmed={confirmedThemes.includes(theme)}
                />
              ))}
            </div>
          </div>
        ))
      )}

      <div className="sd-fade flex flex-wrap items-center gap-8 rounded-3xl bg-[#14152b] p-7 text-white">
        <div className="flex min-w-0 flex-[1_1_380px] flex-col gap-2.5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#c9bbf7]">{t("discover.interim.nextEyebrow")}</p>
          <p className="font-brand text-[28px] leading-[1.2]">{t("discover.interim.nextTitle")}</p>
          <p className="text-[15px] text-[#b9bbd6]">{t("discover.interim.nextText")}</p>
        </div>
        <div className="flex w-full flex-none flex-col gap-2.5 sm:w-[260px]">
          <form action={startRoundThreeAction}>
            <SubmitButton
              label={t("discover.interim.continue")}
              pendingLabel={t("discover.interim.continuePending")}
              className="flex min-h-12 w-full items-center justify-center rounded-[14px] bg-white px-5 font-semibold text-[#14152b]"
            />
          </form>
          <form action={finishWithoutRoundThreeAction}>
            <SubmitButton
              label={t("discover.interim.finishNow")}
              pendingLabel={t("discover.interim.continuePending")}
              className="flex min-h-12 w-full items-center justify-center rounded-[14px] border border-[#3a3c66] px-5 font-semibold text-white hover:bg-white/10"
            />
          </form>
          <Link href="/me/profile" className="min-h-11 text-center text-sm leading-[2.75rem] text-[#a9abcb] hover:text-white">
            {t("discover.interim.later")}
          </Link>
          <p className="text-center text-[13px] text-[#a9abcb]">{t("discover.interim.saved")}</p>
        </div>
      </div>
    </section>
  );
}
