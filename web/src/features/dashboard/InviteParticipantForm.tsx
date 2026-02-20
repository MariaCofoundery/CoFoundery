"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { inviteParticipantBAction } from "@/app/(product)/dashboard/actions";

type Props = {
  sessionId: string;
  canInvite: boolean;
  defaultEmail?: string;
  onInviteCreated?: (payload: { sessionId: string; inviteUrl: string }) => void;
};

export function InviteParticipantForm({
  sessionId,
  canInvite,
  defaultEmail = "",
  onInviteCreated,
}: Props) {
  const router = useRouter();
  const [email, setEmail] = useState(defaultEmail);
  const [reportScope, setReportScope] = useState<"basis" | "basis_plus_values">("basis");
  const [inviteConsent, setInviteConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ text: string; tone: "success" | "warning" } | null>(null);
  const [isPending, startTransition] = useTransition();

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canInvite) {
      return;
    }
    const invitedEmail = email.trim().toLowerCase();
    if (!invitedEmail || !invitedEmail.includes("@")) {
      setError("Bitte eine gueltige E-Mail eingeben.");
      return;
    }
    if (!inviteConsent) {
      setError("Bitte bestaetige die Einwilligung zur Nutzung der E-Mail-Adresse.");
      return;
    }

    setError(null);
    setNotice(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("sessionId", sessionId);
      formData.set("invitedEmail", invitedEmail);
      formData.set("reportScope", reportScope);
      formData.set("inviteConsent", inviteConsent ? "true" : "false");
      const result = await inviteParticipantBAction(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }

      const inviteUrl = result.inviteUrl.startsWith("/")
        ? `${window.location.origin}${result.inviteUrl}`
        : result.inviteUrl;
      onInviteCreated?.({ sessionId: result.sessionId, inviteUrl });

      let nextNotice: { text: string; tone: "success" | "warning" };
      if (result.emailStatus === "sent") {
        nextNotice = { text: "Einladung per E-Mail versendet.", tone: "success" };
      } else {
        try {
          await navigator.clipboard.writeText(inviteUrl);
          nextNotice = {
            text: "E-Mail nicht versendet. Einladungslink wurde automatisch kopiert.",
            tone: "warning",
          };
        } catch {
          nextNotice = {
            text: "E-Mail nicht versendet. Bitte nutze den Button 'Link kopieren'.",
            tone: "warning",
          };
        }
      }

      setEmail("");
      setInviteConsent(false);
      setNotice(nextNotice);
      router.refresh();
    });
  };

  return (
    <div className="mt-3">
      {canInvite ? (
        <form onSubmit={onSubmit} className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setNotice(null);
            }}
            required
            placeholder="person-b@firma.de"
            className="min-w-[240px] w-full rounded-lg border border-[color:var(--line)] px-3 py-2 text-xs"
          />
          <select
            value={reportScope}
            onChange={(event) =>
              setReportScope(
                event.target.value === "basis_plus_values" ? "basis_plus_values" : "basis"
              )
            }
            className="w-full rounded-lg border border-[color:var(--line)] px-3 py-2 text-xs text-slate-700"
          >
            <option value="basis">Report-Umfang: Nur Basis</option>
            <option value="basis_plus_values">Report-Umfang: Basis + Werte-Add-on</option>
          </select>
          <label className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
            <input
              type="checkbox"
              checked={inviteConsent}
              onChange={(event) => {
                setInviteConsent(event.target.checked);
                setNotice(null);
              }}
              className="mt-0.5"
            />
            <span>
              Ich bestaetige, dass ich die E-Mail-Adresse fuer die Einladung zur Analyse verwenden darf
              (zweckgebunden fuer dieses Matching).
            </span>
          </label>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-[color:var(--ink)] px-3 py-2 text-xs text-white disabled:opacity-60"
          >
            {isPending ? "Sende..." : "Potenziellen Co-Founder einladen"}
          </button>
        </form>
      ) : (
        <p className="text-xs text-[color:var(--muted)]">
          Einladung erst nach Abschluss deiner eigenen Analyse moeglich.
        </p>
      )}
      {error ? <p className="mt-2 text-xs text-red-700">{error}</p> : null}
      {notice ? (
        <p
          className={`mt-2 rounded-md border px-3 py-2 text-xs ${
            notice.tone === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-amber-200 bg-amber-50 text-amber-800"
          }`}
        >
          {notice.text}
        </p>
      ) : null}
    </div>
  );
}
