"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { inviteParticipantBAction } from "@/app/(product)/dashboard/actions";
type TeamContext = "pre_founder" | "existing_team";

function teamContextMeta(teamContext: TeamContext | null) {
  if (teamContext === "existing_team") {
    return {
      badge: "Bestehendes Team",
      text: "Dieser Invite führt in einen Alignment-Flow für ein Team, das bereits zusammenarbeitet.",
    };
  }

  return {
    badge: "Mögliche Gründungspartnerschaft",
    text: "Dieser Invite führt in einen Matching- und Kennenlern-Flow vor einer engeren Zusammenarbeit.",
  };
}

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
  const [teamContext, setTeamContext] = useState<TeamContext | null>(null);
  const [inviteConsent, setInviteConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ text: string; tone: "success" | "warning" } | null>(null);
  const [isPending, startTransition] = useTransition();
  const selectedContextMeta = teamContextMeta(teamContext);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canInvite) {
      return;
    }
    const invitedEmail = email.trim().toLowerCase();
    if (!invitedEmail || !invitedEmail.includes("@")) {
      setError("Bitte eine gültige E-Mail eingeben.");
      return;
    }
    if (!teamContext) {
      setError("Bitte wähle den Team-Kontext für diese Einladung.");
      return;
    }
    if (!inviteConsent) {
      setError("Bitte bestätige die Einwilligung zur Nutzung der E-Mail-Adresse.");
      return;
    }

    setError(null);
    setNotice(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("sessionId", sessionId);
      formData.set("invitedEmail", invitedEmail);
      formData.set("reportScope", reportScope);
      formData.set("teamContext", teamContext);
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
          <div className="rounded-xl border border-cyan-100 bg-cyan-50/70 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">
              Team-Kontext
            </p>
            <p className="mt-2 text-xs leading-6 text-slate-600">
              So ist früh klar, ob ihr einen Matching-Flow oder ein Alignment für ein bestehendes Team startet.
            </p>
            <div className="mt-3 grid gap-2">
              <button
                type="button"
                onClick={() => {
                  setTeamContext("pre_founder");
                  setNotice(null);
                }}
                className={`rounded-lg border px-3 py-2 text-left text-xs transition ${
                  teamContext === "pre_founder"
                    ? "border-cyan-400 bg-white text-slate-900 shadow-[0_8px_18px_rgba(34,211,238,0.10)]"
                    : "border-slate-200 bg-white/90 text-slate-700 hover:border-cyan-200"
                }`}
              >
                Wir überlegen, zusammenzuarbeiten
              </button>
              <button
                type="button"
                onClick={() => {
                  setTeamContext("existing_team");
                  setNotice(null);
                }}
                className={`rounded-lg border px-3 py-2 text-left text-xs transition ${
                  teamContext === "existing_team"
                    ? "border-cyan-400 bg-white text-slate-900 shadow-[0_8px_18px_rgba(34,211,238,0.10)]"
                    : "border-slate-200 bg-white/90 text-slate-700 hover:border-cyan-200"
                }`}
              >
                Wir arbeiten bereits zusammen
              </button>
            </div>
            <div className="mt-3 rounded-xl border border-white/80 bg-white/85 px-3 py-3">
              <p className="inline-flex rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.1em] text-slate-700">
                {selectedContextMeta.badge}
              </p>
              <p className="mt-2 text-xs leading-6 text-slate-600">{selectedContextMeta.text}</p>
            </div>
          </div>
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
              Ich bestätige, dass ich die E-Mail-Adresse für die Einladung zur Analyse verwenden darf
              (zweckgebunden für dieses Matching).
            </span>
          </label>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg border border-[color:var(--brand-primary)] bg-[color:var(--brand-primary)] px-3 py-2 text-xs font-medium text-slate-900 shadow-[0_10px_24px_rgba(103,232,249,0.16)] transition hover:bg-[#4fd4e6] disabled:opacity-60"
          >
            {isPending ? "Sende..." : "Potenziellen Co-Founder einladen"}
          </button>
        </form>
      ) : (
        <p className="text-xs text-[color:var(--muted)]">
          Einladung erst nach Abschluss deiner eigenen Analyse möglich.
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
      <p className="mt-2 text-[11px] leading-5 text-slate-500">
        Aktuell wird der Einladungslink manuell geteilt. Ein späterer E-Mail-Versand kann denselben Link verwenden.
      </p>
    </div>
  );
}
