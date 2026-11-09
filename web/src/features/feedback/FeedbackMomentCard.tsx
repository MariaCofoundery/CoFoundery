"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { answerFeedbackMomentAction } from "@/features/feedback/actions";
import { ProductFeedbackDialog } from "@/features/feedback/ProductFeedbackEntry";
import type { FeedbackKind, FeedbackMoment, FeedbackMomentAnswer } from "@/features/feedback/feedbackModel";

type Phase = "asking" | "thanks" | "gone";

/**
 * Die kleine Frage selbst. "Ja" und "Nicht so" werden gleich vermerkt und danken; "Mehr sagen" oeffnet das Feedback-Panel
 * (mit der Art, die zur Antwort passt, und dem Anlass); das Kreuz heisst "nicht fragen". Nichts ist Pflicht.
 */
export function FeedbackMomentCard({ moment }: { moment: FeedbackMoment }) {
  const t = useTranslations("feedback.moment");
  const [phase, setPhase] = useState<Phase>("asking");
  const [answer, setAnswer] = useState<"yes" | "no" | null>(null);
  const [panel, setPanel] = useState(false);

  const record = (value: FeedbackMomentAnswer) => void answerFeedbackMomentAction(moment, value).catch(() => null);

  const react = (value: "yes" | "no") => {
    record(value);
    setAnswer(value);
    setPhase("thanks");
  };
  const more = () => {
    // Wer zuvor Ja/Nicht so gesagt hat, bleibt dabei - die erste Reaktion gilt (die Datenbank haelt sich daran).
    if (!answer) record("more");
    setPanel(true);
  };
  const close = () => {
    if (phase === "asking") record("dismissed");
    setPhase("gone");
    setPanel(false);
  };

  const initialKind: FeedbackKind | null = answer === "yes" ? "help" : answer === "no" ? "unclear" : null;
  const button = "inline-flex min-h-11 items-center rounded-xl px-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6D49E0] focus-visible:ring-offset-2";

  return (
    <>
      {phase !== "gone" ? (
        <section aria-label={t("label")} className="ws-no-print print:hidden my-6 flex flex-wrap items-center gap-3 rounded-2xl border border-[#DCDEEC] bg-white px-4 py-3.5 shadow-[0_10px_30px_-14px_rgba(20,21,43,0.3)]">
          {phase === "asking" ? (
            <>
              <p className="min-w-0 flex-1 basis-72 text-[14.5px] leading-[22px] text-[#14152B]">
                <b>{t(`questions.${moment}`)}</b> <span className="text-[#4A4D68]">{t("subline")}</span>
              </p>
              <button type="button" onClick={() => react("yes")} className={`${button} border border-[#C9CCE0] bg-white text-[#14152B] hover:bg-slate-50`}>{t("yes")}</button>
              <button type="button" onClick={() => react("no")} className={`${button} border border-[#C9CCE0] bg-white text-[#14152B] hover:bg-slate-50`}>{t("no")}</button>
              <button type="button" onClick={more} className={`${button} text-[#4B2FB8] hover:underline`}>{t("more")}</button>
              <button type="button" onClick={close} aria-label={t("dismiss")} className="grid h-11 w-11 place-items-center rounded-xl text-[22px] leading-none text-[#3C3F5A] hover:bg-slate-100">
                <span aria-hidden="true">×</span>
              </button>
            </>
          ) : (
            <>
              <p role="status" className="min-w-0 flex-1 basis-72 text-[14.5px] leading-[22px] text-[#14152B]">
                <b>{t("thanks")}</b> <span className="text-[#4A4D68]">{answer === "no" ? t("thanksNo") : t("thanksYes")}</span>
              </p>
              <button type="button" onClick={more} className={`${button} text-[#4B2FB8] hover:underline`}>{t("moreAfter")}</button>
              <button type="button" onClick={close} aria-label={t("close")} className="grid h-11 w-11 place-items-center rounded-xl text-[22px] leading-none text-[#3C3F5A] hover:bg-slate-100">
                <span aria-hidden="true">×</span>
              </button>
            </>
          )}
        </section>
      ) : null}
      {panel ? <ProductFeedbackDialog source="nav" invitationId={null} initialKind={initialKind} moment={moment} onClose={() => { setPanel(false); setPhase("gone"); }} /> : null}
    </>
  );
}
