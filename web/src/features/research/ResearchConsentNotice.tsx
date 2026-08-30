"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { setResearchConsentAction } from "@/features/research/actions";
import type { ResearchConsentState } from "@/features/research/client";

export function ResearchConsentNotice({ onDecision }: { onDecision: (state: ResearchConsentState) => void }) {
  const t = useTranslations("researchConsent.notice");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(false);

  const decide = (state: "accepted" | "declined") => {
    setError(false);
    startTransition(async () => {
      const result = await setResearchConsentAction(state);
      if (!result.ok) return setError(true);
      onDecision(state);
    });
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/30 p-4 backdrop-blur-sm md:items-center" role="presentation">
      <section role="dialog" aria-modal="true" aria-labelledby="research-consent-title" aria-describedby="research-consent-body" className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl md:p-8">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-violet-700">{t("eyebrow")}</p>
        <h2 id="research-consent-title" className="mt-3 text-2xl font-semibold text-slate-950">{t("title")}</h2>
        <p id="research-consent-body" className="mt-4 whitespace-pre-line text-sm leading-6 text-slate-650">{t("body")}</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button autoFocus type="button" disabled={pending} onClick={() => decide("declined")} className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 disabled:opacity-60">{t("decline")}</button>
          <button type="button" disabled={pending} onClick={() => decide("accepted")} className="rounded-xl border border-violet-600 bg-violet-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 disabled:opacity-60">{t("accept")}</button>
        </div>
        {error ? <p role="alert" className="mt-4 text-sm text-red-700">{t("error")}</p> : null}
      </section>
    </div>
  );
}
