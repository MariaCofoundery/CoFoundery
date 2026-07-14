"use client";

import { useTranslations } from "next-intl";
import { ReportActionButton } from "@/features/reporting/ReportActionButton";

export function MatchingStartBlock() {
  const t = useTranslations("dashboard.inviteStart");

  return (
    <section className="rounded-[32px] border border-slate-200/80 bg-white/96 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:p-8">
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
        {t("eyebrow")}
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-[-0.02em] text-slate-950 sm:text-4xl">
        {t("title")}
      </h1>
      <div className="mt-4 space-y-2 text-sm leading-7 text-slate-700">
        <p>{t("stepInvite")}</p>
        <p>{t("stepReport")}</p>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <ReportActionButton href="#cofounder-invite-form" className="w-full justify-center sm:w-auto">
          {t("inviteCta")}
        </ReportActionButton>
        <a
          href="https://www.paypal.com/ncp/payment/ENC94PBCF5H7G"
          target="_blank"
          rel="noreferrer"
          className="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 transition duration-200 ease-out hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 hover:shadow-[0_10px_24px_rgba(15,23,42,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-accent)] sm:w-auto"
        >
          {t("supportCta")}
        </a>
      </div>

      <p className="mt-3 text-sm leading-6 text-slate-500">
        {t("paymentWindowHint")}
      </p>
      <p className="mt-2 text-sm leading-6 text-slate-500">
        {t("invoiceHint")}
      </p>
      <p className="mt-4 text-xs leading-6 text-slate-400">
        {t("regularPrice")}
      </p>
    </section>
  );
}
