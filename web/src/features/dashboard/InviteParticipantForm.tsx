"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { inviteParticipantBAction } from "@/app/(product)/dashboard/actions";
import { toPublicAppUrl } from "@/lib/publicAppOrigin";
type TeamContext = "pre_founder" | "existing_team";

function teamContextMeta(teamContext: TeamContext | null, t: ReturnType<typeof useTranslations>) {
  if (teamContext === "existing_team") {
    return {
      badge: t("participantInvite.teamContext.existingBadge"),
      text: t("participantInvite.teamContext.existingText"),
    };
  }

  return {
    badge: t("participantInvite.teamContext.preFounderBadge"),
    text: t("participantInvite.teamContext.preFounderText"),
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
  const t = useTranslations("dashboard");
  const [label, setLabel] = useState("");
  const [email, setEmail] = useState(defaultEmail);
  const [reportScope, setReportScope] = useState<"basis" | "basis_plus_values">("basis");
  const [teamContext, setTeamContext] = useState<TeamContext | null>(null);
  const [inviteConsent, setInviteConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ text: string; tone: "success" | "warning" } | null>(null);
  const [isPending, startTransition] = useTransition();
  const selectedContextMeta = teamContextMeta(teamContext, t);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canInvite) {
      return;
    }
    const invitedEmail = email.trim().toLowerCase();
    if (!invitedEmail || !invitedEmail.includes("@")) {
      setError(t("participantInvite.validation.email"));
      return;
    }
    if (!teamContext) {
      setError(t("participantInvite.validation.teamContext"));
      return;
    }
    if (!inviteConsent) {
      setError(t("participantInvite.validation.consent"));
      return;
    }

    setError(null);
    setNotice(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("sessionId", sessionId);
      formData.set("label", label.trim());
      formData.set("invitedEmail", invitedEmail);
      formData.set("reportScope", reportScope);
      formData.set("teamContext", teamContext);
      formData.set("inviteConsent", inviteConsent ? "true" : "false");
      const result = await inviteParticipantBAction(formData);
      if (!result.ok) {
        setError(mapParticipantInviteActionError(result.error, t));
        return;
      }

      const inviteUrl = toPublicAppUrl(result.inviteUrl, window.location.origin);
      onInviteCreated?.({ sessionId: result.sessionId, inviteUrl });

      let nextNotice: { text: string; tone: "success" | "warning" };
      if (result.emailStatus === "sent") {
        nextNotice = { text: t("participantInvite.notice.sent"), tone: "success" };
      } else {
        try {
          await navigator.clipboard.writeText(inviteUrl);
          nextNotice = {
            text: t("participantInvite.notice.copied"),
            tone: "warning",
          };
        } catch {
          nextNotice = {
            text: t("participantInvite.notice.copyManually"),
            tone: "warning",
          };
        }
      }

      setLabel("");
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
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">
              {t("participantInvite.projectLabel")}
            </label>
            <input
              type="text"
              value={label}
              onChange={(event) => {
                setLabel(event.target.value);
                setNotice(null);
              }}
              placeholder={t("participantInvite.projectPlaceholder")}
              className="mt-1 min-w-[240px] w-full rounded-lg border border-[color:var(--line)] px-3 py-2 text-xs"
            />
            <p className="mt-1 text-[11px] leading-5 text-slate-500">
              {t("participantInvite.projectHelp")}
            </p>
          </div>
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
            <option value="basis">{t("participantInvite.scopeBasis")}</option>
            <option value="basis_plus_values">{t("participantInvite.scopeBasisValues")}</option>
          </select>
          <div className="rounded-xl border border-cyan-100 bg-cyan-50/70 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">
              {t("participantInvite.teamContext.label")}
            </p>
            <p className="mt-2 text-xs leading-6 text-slate-600">
              {t("participantInvite.teamContext.help")}
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
                {t("participantInvite.teamContext.preFounder")}
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
                {t("participantInvite.teamContext.existingTeam")}
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
              {t("participantInvite.consent")}
            </span>
          </label>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg border border-[color:var(--brand-primary)] bg-[color:var(--brand-primary)] px-3 py-2 text-xs font-medium text-slate-900 shadow-[0_10px_24px_rgba(103,232,249,0.16)] transition hover:bg-[#4fd4e6] disabled:opacity-60"
          >
            {isPending ? t("participantInvite.submitPending") : t("participantInvite.submit")}
          </button>
        </form>
      ) : (
        <p className="text-xs text-[color:var(--muted)]">
          {t("participantInvite.disabled")}
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
        {t("participantInvite.manualLinkHint")}
      </p>
    </div>
  );
}

function mapParticipantInviteActionError(reason: string, t: ReturnType<typeof useTranslations>) {
  if (reason === "not_authenticated") return t("participantInvite.actionErrors.notAuthenticated");
  if (reason === "ungueltige_email") return t("participantInvite.actionErrors.invalidEmail");
  if (reason === "ungueltiger_teamkontext") return t("participantInvite.actionErrors.invalidTeamContext");
  if (reason === "legacy_sessions_disabled") return t("participantInvite.actionErrors.legacyDisabled");
  if (reason === "invite_create_failed") return t("participantInvite.actionErrors.createFailed");
  return t("participantInvite.actionErrors.generic");
}
