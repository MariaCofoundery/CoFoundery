"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { IconTile } from "@/features/ui/Icons";
import { setResearchConsentAction } from "@/features/research/actions";
import { configureResearchConsentState, type ResearchConsentState } from "@/features/research/client";

export function ResearchConsentSettings({ initialState }: { initialState: ResearchConsentState }) {
  const t = useTranslations("researchConsent.settings");
  const [state, setState] = useState(initialState);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(false);
  const active = state === "accepted";
  // `unknown` heisst: Wir konnten deinen Stand gerade nicht lesen. Ihn als
  // "aus" darzustellen waere die sichere Richtung fuer die Daten und die
  // falsche fuer die Person - sie koennte glauben, ihre Zustimmung sei
  // verschwunden. Also steht es dabei.
  const unreadable = state === "unknown";

  const update = (next: "accepted" | "declined") => {
    setError(false);
    startTransition(async () => {
      const result = await setResearchConsentAction(next, "settings");
      if (!result.ok) return setError(true);
      configureResearchConsentState(next);
      setState(next);
    });
  };

  return (
    <section className="mt-5 border-t border-[#e4e2f0] pt-5" aria-labelledby="research-settings-title">
      <div className="flex items-start gap-3">
        <IconTile name="flask" tone="violet" size="sm" />
        <div className="min-w-0 flex-1">
          <h3 id="research-settings-title" className="font-semibold text-[#0b1f3a]">{t("title")}</h3>
          <p className="mt-0.5 text-[13.5px] leading-[1.5] text-[#5f5e7a]">{t("description")}</p>
        </div>
        <span className={`rounded-full px-2.5 py-0.5 text-[13px] font-semibold ${active ? "bg-[#e3f6ec] text-[#17794a]" : "bg-[#f1f0f7] text-[#33325e]"}`}>{active ? t("active") : t("inactive")}</span>
      </div>
      <Link href="/research/workstyle-pretest?version=8.5a-v3&teil=forschung" className="mt-3 inline-flex min-h-11 items-center underline">{t("workstylePretest")}</Link>
            {unreadable ? (
        <p className="mt-2 text-sm text-amber-800">{t("unreadable")}</p>
      ) : null}
      <button type="button" disabled={pending} onClick={() => update(active ? "declined" : "accepted")} className="mt-4 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#f1f0f7] px-[18px] text-[15px] font-semibold text-[#0b1f3a] transition hover:bg-[#e9e7f4] disabled:opacity-60">{active ? t("withdraw") : t("activate")}</button>
      {active ? <p className="mt-3 text-xs leading-5 text-slate-500">{t("withdrawal")}</p> : null}
      {error ? <p role="alert" className="mt-3 text-sm text-red-700">{t("error")}</p> : null}
    </section>
  );
}
