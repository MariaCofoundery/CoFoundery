"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { setResearchConsentAction } from "@/features/research/actions";
import { configureResearchConsentState, type ResearchConsentState } from "@/features/research/client";

export function ResearchConsentSettings({ initialState }: { initialState: ResearchConsentState }) {
  const t = useTranslations("researchConsent.settings");
  const [state, setState] = useState(initialState);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(false);
  const active = state === "accepted";

  const update = (next: "accepted" | "declined") => {
    setError(false);
    startTransition(async () => {
      const result = await setResearchConsentAction(next);
      if (!result.ok) return setError(true);
      configureResearchConsentState(next);
      setState(next);
    });
  };

  return (
    <section className="mt-5 border-t border-slate-200 pt-5" aria-labelledby="research-settings-title">
      <h3 id="research-settings-title" className="text-sm font-semibold text-slate-950">{t("title")}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{t("description")}</p>
      <p className="mt-3 text-sm text-slate-700">{t("statusLabel")} <strong>{active ? t("active") : t("inactive")}</strong></p>
      <button type="button" disabled={pending} onClick={() => update(active ? "declined" : "accepted")} className="mt-4 inline-flex rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 disabled:opacity-60">{active ? t("withdraw") : t("activate")}</button>
      {active ? <p className="mt-3 text-xs leading-5 text-slate-500">{t("withdrawal")}</p> : null}
      {error ? <p role="alert" className="mt-3 text-sm text-red-700">{t("error")}</p> : null}
    </section>
  );
}
