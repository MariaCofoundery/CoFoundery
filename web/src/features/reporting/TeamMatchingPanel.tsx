"use client";

import { InviteParticipantForm } from "@/features/dashboard/InviteParticipantForm";
import { PersonBStatusBadge } from "@/features/reporting/PersonBStatusBadge";
import { type PersonBStatus } from "@/features/reporting/types";
import { useState } from "react";

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
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [latestInviteUrl, setLatestInviteUrl] = useState<string | null>(null);
  const latestOpenInvite =
    outboundInvites.find((invite) => invite.status !== "abgeschlossen") ?? outboundInvites[0] ?? null;
  const targetSessionId = latestOpenInvite?.sessionId ?? null;

  const onCopyLink = async () => {
    if (!targetSessionId && !latestInviteUrl) {
      setCopyError("Bitte erst eine Einladung erstellen.");
      setCopied(false);
      return;
    }
    const base = typeof window !== "undefined" ? window.location.origin : "";
    const link = latestInviteUrl ?? `${base}/join?sessionId=${targetSessionId}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopyError(null);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopyError("Link konnte nicht kopiert werden.");
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
          Team-Matching
        </h3>
        <PersonBStatusBadge status={status} />
      </div>
      <p className="mt-4 text-sm leading-7 text-slate-600">
        Lade potenzielle Co-Founder ein, um das Matching auf Basis deiner aktuellen Auswertung zu starten.
      </p>
      <p className="mt-2 text-xs leading-6 tracking-[0.02em] text-slate-500">
        Datenschutz: Die E-Mail-Adresse wird ausschließlich für die Einladung und Zuordnung zu dieser Analyse genutzt.
      </p>
      <p className="mt-2 text-xs tracking-[0.08em] text-slate-500">{analysisDateLabel}</p>
      <p className="mt-3 text-xs tracking-[0.08em] text-slate-500">{statusDateLabel}</p>
      <p className="mt-2 text-xs tracking-[0.08em] text-slate-500">
        Angeforderter Umfang: {addOnRequested ? "Basis + Werte-Add-on" : "Nur Basis"}
      </p>
      {inviteConsentCaptured ? (
        <p className="mt-1 text-xs tracking-[0.08em] text-slate-500">Einwilligung zur E-Mail-Nutzung dokumentiert.</p>
      ) : null}
      {!isOpen && partnerName ? (
        <p className="mt-2 text-xs tracking-[0.08em] text-slate-500">Partner: {partnerName}</p>
      ) : null}
      {staleInvite ? (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          Einladung zur vorherigen Analyse ({formatDate(staleInvite.invitedAt)}) erkannt. Für diese aktuelle Analyse bitte neu versenden.
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
        {copied ? "Link kopiert" : "Einladungslink kopieren"}
      </button>
      {copyError ? <p className="mt-2 text-xs text-amber-700">{copyError}</p> : null}
      <a
        href={demoReportHref}
        className="mt-3 inline-flex rounded-lg border border-violet-300 bg-violet-50 px-3 py-2 text-xs font-medium tracking-[0.08em] text-violet-700"
      >
        Demo: Partner abgeschlossen simulieren
      </a>

      {isPremiumReport ? (
        <div className="mt-4 space-y-2">
          <a
            href={reportHref}
            className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm font-semibold tracking-[0.08em] text-emerald-800 hover:bg-emerald-100"
          >
            <span aria-hidden>📘</span>
            Match-Report öffnen
          </a>
          {addOnRequested ? (
            <p className="text-xs tracking-[0.08em] text-slate-600">
              Werte-Add-on Status: A {valuesAnsweredA}/{valuesTotal}, B {valuesAnsweredB}/{valuesTotal}. Vollreport wird aktiviert, sobald beide 10/10 erreicht haben.
            </p>
          ) : null}
          {addOnRequested && !valuesCompletedA ? (
            <a
              href={`/session/${sessionId}/values`}
              className="inline-flex rounded-lg border border-cyan-300 bg-cyan-50 px-3 py-2 text-xs font-semibold tracking-[0.08em] text-cyan-800"
            >
              Werte-Add-on für Profil A abschließen
            </a>
          ) : null}
        </div>
      ) : null}

      {outboundInvites.length > 0 ? (
        <section className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">
            Versandte Einladungen
          </p>
          <ul className="mt-3 space-y-2 text-xs text-slate-700">
            {outboundInvites.map((invite) => (
              <li key={invite.sessionId} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                <p>
                  Einladung an <span className="font-semibold">{invite.invitedEmail}</span> versendet am{" "}
                  {formatDate(invite.invitedAt)}
                </p>
                <p className="mt-1 text-slate-600">
                  Status: <StatusBadge status={invite.status} />
                </p>
                {invite.status === "abgeschlossen" ? (
                  <a
                    href={`/report/${invite.sessionId}`}
                    className="mt-2 inline-flex rounded-md border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-800"
                  >
                    Vergleichsreport öffnen
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

function formatDate(value: string | null) {
  if (!value) return "unbekannt";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "unbekannt";
  return date.toLocaleDateString("de-DE");
}

function statusLabel(status: "offen" | "in_bearbeitung" | "abgeschlossen") {
  if (status === "abgeschlossen") return "Bearbeitung abgeschlossen";
  if (status === "in_bearbeitung") return "In Bearbeitung";
  return "Offen";
}

function StatusBadge({ status }: { status: "offen" | "in_bearbeitung" | "abgeschlossen" }) {
  const classes =
    status === "abgeschlossen"
      ? "border-emerald-300 bg-emerald-50 text-emerald-800"
      : status === "in_bearbeitung"
      ? "border-amber-300 bg-amber-50 text-amber-800"
      : "border-slate-300 bg-slate-100 text-slate-700";
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-[0.08em] ${classes}`}>
      {statusLabel(status)}
    </span>
  );
}
