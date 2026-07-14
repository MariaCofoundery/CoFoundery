"use client";

import { InviteParticipantForm } from "@/features/dashboard/InviteParticipantForm";
import { PersonBStatusBadge } from "@/features/reporting/PersonBStatusBadge";
import { type PersonBStatus } from "@/features/reporting/types";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { toPublicAppUrl } from "@/lib/publicAppOrigin";

type Props = {
  sessionId: string;
  canInvite: boolean;
  status: PersonBStatus;
  statusDateLabel: string;
  analysisDateLabel: string;
  partnerName: string | null;
  reportHref: string;
  demoReportHref: string;
  staleInvite: { invitedEmail: string; invitedAt: string | null } | null;
  requestedScope: "basis" | "basis_plus_values";
  inviteConsentCaptured: boolean;
  valuesAnsweredA: number;
  valuesAnsweredB: number;
  valuesTotal: number;
  outboundInvites: Array<{
    sessionId: string;
    invitedEmail: string;
    invitedAt: string | null;
    status: "offen" | "in_bearbeitung" | "abgeschlossen";
  }>;
};

export function TeamMatchingPanel({
  sessionId,
  canInvite,
  status,
  statusDateLabel,
  analysisDateLabel,
  partnerName,
  reportHref,
  demoReportHref,
  staleInvite,
  requestedScope,
  inviteConsentCaptured,
  valuesAnsweredA,
  valuesAnsweredB,
  valuesTotal,
  outboundInvites,
}: Props) {
  const t = useTranslations("invite.teamMatching");
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [latestInviteUrl, setLatestInviteUrl] = useState<string | null>(null);
  const latestOpenInvite =
    outboundInvites.find((invite) => invite.status !== "abgeschlossen") ?? outboundInvites[0] ?? null;
  const targetSessionId = latestOpenInvite?.sessionId ?? null;

  const onCopyLink = async () => {
    if (!targetSessionId && !latestInviteUrl) {
      setCopyError(t("copyErrors.missingInvite"));
      setCopied(false);
      return;
    }
    const link =
      latestInviteUrl ??
      (typeof window !== "undefined"
        ? toPublicAppUrl(`/join/start?invitationId=${targetSessionId}`, window.location.origin)
        : `/join/start?invitationId=${targetSessionId}`);
    try {
      await navigator.clipboard.writeText(link);
      setCopyError(null);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopyError(t("copyErrors.copyFailed"));
      setCopied(false);
    }
  };

  const isOpen = status !== "match_ready";
  const isPremiumReport = status === "match_ready";
  const addOnRequested = requestedScope === "basis_plus_values";
  const valuesCompletedA = valuesTotal > 0 && valuesAnsweredA >= valuesTotal;

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white/95 p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-slate-500">
          <span aria-hidden>👥</span>
          {t("title")}
        </h3>
        <PersonBStatusBadge status={status} />
      </div>
      <p className="mt-4 text-sm leading-7 text-slate-600">
        {t("intro")}
      </p>
      <p className="mt-2 text-xs leading-6 tracking-[0.02em] text-slate-500">
        {t("privacyHint")}
      </p>
      <p className="mt-2 text-xs tracking-[0.08em] text-slate-500">{analysisDateLabel}</p>
      <p className="mt-3 text-xs tracking-[0.08em] text-slate-500">{statusDateLabel}</p>
      <p className="mt-2 text-xs tracking-[0.08em] text-slate-500">
        {t("requestedScope", {
          scope: addOnRequested ? t("scopes.basisValues") : t("scopes.basis"),
        })}
      </p>
      {inviteConsentCaptured ? (
        <p className="mt-1 text-xs tracking-[0.08em] text-slate-500">{t("consentCaptured")}</p>
      ) : null}
      {!isOpen && partnerName ? (
        <p className="mt-2 text-xs tracking-[0.08em] text-slate-500">{t("partner", { name: partnerName })}</p>
      ) : null}
      {staleInvite ? (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          {t("staleInvite", { date: formatDate(staleInvite.invitedAt, t) })}
        </div>
      ) : null}
      <div className="mt-5">
        <InviteParticipantForm
          sessionId={sessionId}
          canInvite={canInvite}
          defaultEmail={staleInvite?.invitedEmail ?? ""}
          onInviteCreated={({ inviteUrl }) => setLatestInviteUrl(inviteUrl)}
        />
      </div>
      <button
        type="button"
        onClick={onCopyLink}
        className="mt-4 inline-flex rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium tracking-[0.08em] text-slate-700"
      >
        {copied ? t("copied") : t("copyLink")}
      </button>
      {copyError ? <p className="mt-2 text-xs text-amber-700">{copyError}</p> : null}
      <a
        href={demoReportHref}
        className="mt-3 inline-flex rounded-lg border border-violet-300 bg-violet-50 px-3 py-2 text-xs font-medium tracking-[0.08em] text-violet-700"
      >
        {t("demoCta")}
      </a>

      {isPremiumReport ? (
        <div className="mt-4 space-y-2">
          <a
            href={reportHref}
            className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm font-semibold tracking-[0.08em] text-emerald-800 hover:bg-emerald-100"
          >
            <span aria-hidden>📘</span>
            {t("openMatchReport")}
          </a>
          {addOnRequested ? (
            <p className="text-xs tracking-[0.08em] text-slate-600">
              {t("valuesStatus", {
                answeredA: valuesAnsweredA,
                answeredB: valuesAnsweredB,
                total: valuesTotal,
              })}
            </p>
          ) : null}
          {addOnRequested && !valuesCompletedA ? (
            <a
              href={`/session/${sessionId}/values`}
              className="inline-flex rounded-lg border border-cyan-300 bg-cyan-50 px-3 py-2 text-xs font-semibold tracking-[0.08em] text-cyan-800"
            >
              {t("completeValuesA")}
            </a>
          ) : null}
        </div>
      ) : null}

      {outboundInvites.length > 0 ? (
        <section className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">
            {t("sentInvitations")}
          </p>
          <ul className="mt-3 space-y-2 text-xs text-slate-700">
            {outboundInvites.map((invite) => (
              <li key={invite.sessionId} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p>
                  {t.rich("sentInvitationRow", {
                    email: invite.invitedEmail,
                    date: formatDate(invite.invitedAt, t),
                    strong: (chunks) => <span className="font-semibold">{chunks}</span>,
                  })}
                </p>
                <p className="mt-1 text-slate-600">
                  {t("status")} <StatusBadge status={invite.status} />
                </p>
                {invite.status === "abgeschlossen" ? (
                  <a
                    href={`/report/${invite.sessionId}`}
                    className="mt-2 inline-flex rounded-md border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-800"
                  >
                    {t("openComparisonReport")}
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </section>
  );
}

function formatDate(value: string | null, t: ReturnType<typeof useTranslations>) {
  if (!value) return t("unknownDate");
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return t("unknownDate");
  return date.toLocaleDateString(t("dateLocale"));
}

function statusLabel(status: "offen" | "in_bearbeitung" | "abgeschlossen", t: ReturnType<typeof useTranslations>) {
  if (status === "abgeschlossen") return t("statuses.completed");
  if (status === "in_bearbeitung") return t("statuses.processing");
  return t("statuses.open");
}

function StatusBadge({ status }: { status: "offen" | "in_bearbeitung" | "abgeschlossen" }) {
  const t = useTranslations("invite.teamMatching");
  const classes =
    status === "abgeschlossen"
      ? "border-emerald-300 bg-emerald-50 text-emerald-800"
      : status === "in_bearbeitung"
      ? "border-amber-300 bg-amber-50 text-amber-800"
      : "border-slate-300 bg-slate-100 text-slate-700";
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-[0.08em] ${classes}`}>
      {statusLabel(status, t)}
    </span>
  );
}
