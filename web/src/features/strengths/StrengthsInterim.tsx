import { getTranslations } from "next-intl/server";

import type { StrengthsTurn } from "@/features/strengths/strengthsInterviewData";
import { isSceneId, keySentence } from "@/features/strengths/strengthsDiscoverGuide";
import { finishWithoutRoundThreeAction, startRoundThreeAction } from "@/features/strengths/strengthsDiscoverActions";
import { SubmitButton } from "@/features/ui/SubmitButton";
import { UserText } from "@/features/ui/UserText";
import Link from "next/link";
import "@/features/align/align.css";

/**
 * Der Zwischenstand nach Runde 2 (Entwurf vom 12.11.2026).
 *
 * ER ZEIGT, WAS DIE PERSON SELBST ERZÄHLT HAT - nicht, was eine Auswertung daraus macht. Die
 * Vorschläge zu Stärken entstehen erst nach dem Abschluss und nur auf ausdrücklichen Wunsch
 * (`request_strength_proposals`); hier etwas als Befund zu zeigen, hieße, etwas zu behaupten, das
 * niemand geprüft hat. Jede Szene steht mit dem Satz da, in dem die Person beschreibt, was sie getan hat.
 */
export async function StrengthsInterim({ turns }: { turns: StrengthsTurn[] }) {
  const t = await getTranslations("strengths");
  const scenes = turns.filter((turn) => isSceneId(turn.questionId));

  return (
    <section className="flex flex-col gap-7">
      <div className="sd-fade flex max-w-[820px] flex-col gap-2">
        <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-[#5b36d4]">{t("discover.interim.eyebrow")}</p>
        <h2 className="font-brand text-[clamp(34px,4vw,50px)] font-normal leading-[1.05] tracking-[-0.01em] text-[#14152b]">
          {t("discover.interim.title")}
        </h2>
        <p className="text-[17px] leading-relaxed text-[#4a4d68]">{t("discover.interim.text")}</p>
      </div>

      <ol aria-label={t("discover.interim.scenesLabel")} className="m-0 grid list-none gap-3.5 p-0 [grid-template-columns:repeat(auto-fit,minmax(300px,1fr))]">
        {scenes.map((turn, index) => (
          <li
            key={turn.id}
            className={`sd-slide-left flex flex-col gap-3 rounded-[18px] p-[18px] ${
              turn.answer !== null ? "border border-[#e6e4f2] bg-white shadow-[0_12px_30px_-24px_rgba(46,30,120,0.5)]" : "border border-dashed border-[#c9c6dd]"
            }`}
            style={{ animationDelay: `${(0.1 + index * 0.1).toFixed(2)}s` }}
          >
            <div className="flex items-center gap-3">
              <span className="flex size-7 flex-none items-center justify-center rounded-full bg-[#efeafd] text-[13px] font-semibold text-[#4b2bb8]">{index + 1}</span>
              <span className="font-medium">{t(`interview.questions.${turn.questionId}.short`)}</span>
              {turn.answer === null ? <span className="ml-auto text-xs text-[#4a4d68]">{t("discover.interim.skipped")}</span> : null}
            </div>
            {turn.answer !== null ? (
              <p className="font-brand text-base italic leading-snug text-[#2b2d47]">
                »<UserText text={keySentence(turn)} />«
              </p>
            ) : null}
          </li>
        ))}
      </ol>

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
