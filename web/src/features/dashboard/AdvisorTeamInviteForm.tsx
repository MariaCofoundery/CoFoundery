"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  createAdvisorTeamInviteAction,
  type CreateAdvisorTeamInviteActionResult,
} from "@/features/dashboard/advisorTeamInviteActions";

function InviteLinkRow({
  label,
  href,
  copyLink,
  copied,
  copyFailed,
}: {
  label: string;
  href: string;
  copyLink: string;
  copied: string;
  copyFailed: string;
}) {
  const [notice, setNotice] = useState<string | null>(null);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/90 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-2 break-all text-xs leading-6 text-slate-600">{href}</p>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(href);
            setNotice(copied);
          } catch {
            setNotice(copyFailed);
          }
        }}
        className="mt-3 inline-flex rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
      >
        {copyLink}
      </button>
      {notice ? <p className="mt-2 text-xs text-slate-500">{notice}</p> : null}
    </div>
  );
}

export function AdvisorTeamInviteForm() {
  const t = useTranslations("advisor");
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [founderAEmail, setFounderAEmail] = useState("");
  const [founderBEmail, setFounderBEmail] = useState("");
  const [teamName, setTeamName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CreateAdvisorTeamInviteActionResult | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <section className="rounded-[32px] border border-slate-200/80 bg-white/95 p-6 shadow-[0_16px_40px_rgba(15,23,42,0.04)] md:p-7">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
        className="flex w-full items-start justify-between gap-4 text-left"
      >
        <div className="max-w-3xl">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
            {t("dashboard.inviteTeam.eyebrow")}
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">
            {t("dashboard.inviteTeam.title")}
          </h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            {t("dashboard.inviteTeam.description")}
          </p>
        </div>
        <span className="mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-500">
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            className={`h-5 w-5 transition-transform ${isOpen ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m5 8 5 5 5-5" />
          </svg>
        </span>
      </button>

      {isOpen ? (
        <>
          <form
            className="mt-6 grid gap-4 lg:grid-cols-[1fr_1fr]"
            onSubmit={(event) => {
              event.preventDefault();
              setError(null);
              setResult(null);
              setIsOpen(true);

              startTransition(async () => {
                const formData = new FormData();
                formData.set("founderAEmail", founderAEmail);
                formData.set("founderBEmail", founderBEmail);
                formData.set("teamName", teamName);

                const actionResult = await createAdvisorTeamInviteAction(formData);
                setResult(actionResult);

                if (!actionResult.ok) {
                  setError(actionResult.error);
                  return;
                }

                setFounderAEmail("");
                setFounderBEmail("");
                setTeamName("");
                router.refresh();
              });
            }}
          >
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                {t("dashboard.inviteTeam.founderAEmail")}
              </label>
              <input
                type="email"
                value={founderAEmail}
                onChange={(event) => setFounderAEmail(event.target.value)}
                placeholder="founder-a@example.com"
                required
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                {t("dashboard.inviteTeam.founderBEmail")}
              </label>
              <input
                type="email"
                value={founderBEmail}
                onChange={(event) => setFounderBEmail(event.target.value)}
                placeholder="founder-b@example.com"
                required
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700"
              />
            </div>

            <div className="lg:col-span-2">
              <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                {t("dashboard.inviteTeam.teamName")}
              </label>
              <input
                type="text"
                value={teamName}
                onChange={(event) => setTeamName(event.target.value)}
                placeholder={t("dashboard.inviteTeam.teamNamePlaceholder")}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700"
              />
              <p className="mt-2 text-xs leading-6 text-slate-500">
                {t("dashboard.inviteTeam.teamNameHint")}
              </p>
            </div>

            <div className="lg:col-span-2 flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={isPending}
                className="inline-flex rounded-lg border border-[color:var(--brand-primary)] bg-[color:var(--brand-primary)] px-4 py-2 text-sm font-medium text-slate-900 transition hover:bg-[color:var(--brand-primary-hover)] disabled:opacity-60"
              >
                {isPending ? t("dashboard.inviteTeam.submitting") : t("dashboard.inviteTeam.submit")}
              </button>
              <p className="text-xs leading-6 text-slate-500">
                {t("dashboard.inviteTeam.v1Hint")}
              </p>
            </div>
          </form>

          {error ? (
            <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          {result?.ok ? (
            <div
              className={`mt-5 rounded-3xl border p-5 ${
                result.emailStatus === "sent"
                  ? "border-emerald-200 bg-emerald-50/70"
                  : "border-amber-200 bg-amber-50/70"
              }`}
            >
              <p
                className={`text-[11px] font-semibold uppercase tracking-[0.12em] ${
                  result.emailStatus === "sent" ? "text-emerald-800" : "text-amber-800"
                }`}
              >
                {result.emailStatus === "sent"
                  ? t("dashboard.inviteTeam.sent")
                  : t("dashboard.inviteTeam.created")}
              </p>
              <p
                className={`mt-2 text-sm leading-7 ${
                  result.emailStatus === "sent" ? "text-emerald-950" : "text-amber-950"
                }`}
              >
                {result.emailStatus === "sent"
                  ? t("dashboard.inviteTeam.sentText")
                  : t("dashboard.inviteTeam.createdText")}
              </p>
              {result.emailError ? (
                <p className="mt-2 text-xs leading-6 text-amber-900">{result.emailError}</p>
              ) : null}
              {result.emailStatus !== "sent" ? (
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <InviteLinkRow
                    label={`Founder A · ${result.founderAEmail}`}
                    href={result.founderAInviteUrl}
                    copyLink={t("dashboard.inviteTeam.copyLink")}
                    copied={t("dashboard.inviteTeam.copied")}
                    copyFailed={t("dashboard.inviteTeam.copyFailed")}
                  />
                  <InviteLinkRow
                    label={`Founder B · ${result.founderBEmail}`}
                    href={result.founderBInviteUrl}
                    copyLink={t("dashboard.inviteTeam.copyLink")}
                    copied={t("dashboard.inviteTeam.copied")}
                    copyFailed={t("dashboard.inviteTeam.copyFailed")}
                  />
                </div>
              ) : null}
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
