"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createCoFounderInvitationAction } from "@/app/(product)/dashboard/actions";
import { toPublicAppUrl } from "@/lib/publicAppOrigin";
type TeamContext = "pre_founder" | "existing_team";

function toAbsoluteUrl(path: string) {
  return typeof window === "undefined" ? path : toPublicAppUrl(path, window.location.origin);
}

export function CoFounderInviteForm({ targetTeam }: { targetTeam?: { id: string; name: string; context: TeamContext } }) {
  const router = useRouter();
  const t = useTranslations("dashboard.coFounderInviteForm");
  const [label, setLabel] = useState(targetTeam?.name ?? "");
  const [email, setEmail] = useState("");
  const [teamContext, setTeamContext] = useState<TeamContext | null>(targetTeam?.context ?? null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copyNotice, setCopyNotice] = useState<string | null>(null);
  const [resultState, setResultState] = useState<{
    tone: "success" | "warning";
    recipient: string;
    message: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  const teamContextLabel =
    teamContext === "existing_team"
      ? t("teamContext.existingTeam")
      : t("teamContext.preFounder");

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const invitedEmail = email.trim().toLowerCase();
    if (!invitedEmail || !invitedEmail.includes("@")) {
      setError(t("validation.email"));
      return;
    }
    if (!teamContext) {
      setError(t("validation.teamContext"));
      return;
    }

    setError(null);
    setCopyNotice(null);
    setResultState(null);

    startTransition(async () => {
      const formData = new FormData();
      formData.set("label", label.trim());
      formData.set("invitedEmail", invitedEmail);
      // Phase 10: Keine Auswahl "Basis / Werte" mehr - die Einladung fuehrt in
      // den aktuellen Weg, der diese Module nicht kennt.
      formData.set("includeValues", "false");
      formData.set("teamContext", teamContext);
      if (targetTeam) formData.set("targetTeamId", targetTeam.id);

      const result = await createCoFounderInvitationAction(formData);
      if (!result.ok) {
        setInviteUrl(null);
        setResultState(null);
        setError(mapInviteActionError(result.error, t));
        return;
      }

      const absoluteInviteUrl = toAbsoluteUrl(result.inviteUrl);
      setInviteUrl(absoluteInviteUrl);
      setCopyNotice(null);
      setResultState(
        result.emailStatus === "sent"
          ? {
              tone: "success",
              recipient: result.emailRecipient,
              message: t("result.sentMessage", { email: result.emailRecipient }),
            }
          : {
              tone: "warning",
              recipient: result.emailRecipient,
              message: t("result.manualShareMessage"),
            }
      );
      router.refresh();
    });
  };

  const onCopy = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopyNotice(t("copy.success"));
    } catch {
      setCopyNotice(t("copy.error"));
    }
  };

  return (
    <section
      id="cofounder-invite-form"
      className="scroll-mt-24 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,.05)] sm:p-7"
    >
      <form onSubmit={onSubmit} className="space-y-6">
        <div>
          <label htmlFor="invite-email" className="text-sm font-semibold text-slate-900">
            {t("label.email")}
          </label>
          <input
            id="invite-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            placeholder="cofounder@example.com"
            className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-base text-slate-900"
          />
        </div>

        {!targetTeam && <fieldset>
          <legend className="text-sm font-semibold text-slate-900">{t("teamContext.label")}</legend>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            {(["pre_founder", "existing_team"] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setTeamContext(value);
                  setError(null);
                }}
                className={`min-h-12 rounded-xl border px-4 py-3 text-left text-sm font-medium transition ${
                  teamContext === value
                    ? "border-violet-500 bg-violet-50 text-violet-950 ring-2 ring-violet-200"
                    : "border-slate-300 bg-white text-slate-800 hover:border-violet-300"
                }`}
                aria-pressed={teamContext === value}
              >
                {value === "pre_founder" ? t("teamContext.preFounder") : t("teamContext.existingTeam")}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-500">{t("teamContext.dataHint")}</p>
        </fieldset>}

        {!targetTeam && <details className="rounded-xl border border-slate-200 px-4 py-3">
          <summary className="cursor-pointer text-sm font-medium text-slate-700">{t("optionalName")}</summary>
          <div className="mt-3">
            <label htmlFor="invite-label" className="sr-only">{t("label.projectName")}</label>
            <input
              id="invite-label"
              type="text"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder={t("placeholder.projectName")}
              className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800"
            />
            <p className="mt-1 text-xs leading-5 text-slate-500">{t("help.projectName")}</p>
          </div>
        </details>}

        {/* Phase 11.5: Vor dem Absenden klar sagen, dass nichts automatisch
            geteilt wird. Freigaben sind erst nach der Annahme moeglich. */}
        <div className="rounded-xl bg-violet-50/70 px-4 py-3">
          <p className="text-sm font-semibold text-violet-950">{t("sharingTitle")}</p>
          <p className="mt-1 text-sm leading-6 text-violet-950/80">{t("sharingNote")}</p>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[linear-gradient(120deg,var(--brand-accent),var(--brand-primary))] px-6 text-base font-semibold text-slate-900 shadow-[0_10px_28px_rgba(124,58,237,0.16)] transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {isPending ? t("submit.pending") : t("submit.idle")}
        </button>
      </form>

      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}

      {inviteUrl && resultState ? (
        <div
          className={`mt-5 rounded-xl border p-4 ${
            resultState.tone === "success"
              ? "border-emerald-200 bg-emerald-50/60"
              : "border-amber-200 bg-amber-50/60"
          }`}
        >
          <p
            className={`text-xs font-semibold uppercase tracking-[0.08em] ${
              resultState.tone === "success" ? "text-emerald-800" : "text-amber-800"
            }`}
          >
            {resultState.tone === "success" ? t("result.sentTitle") : t("result.createdTitle")}
          </p>
          <p
            className={`mt-2 text-sm ${
              resultState.tone === "success" ? "text-emerald-900" : "text-amber-900"
            }`}
          >
            {resultState.message}
          </p>
          {targetTeam ? (
            <p
              className={`mt-2 text-sm ${
                resultState.tone === "success" ? "text-emerald-900" : "text-amber-900"
              }`}
            >
              {t("targetTeam", { name: targetTeam.name })}
            </p>
          ) : null}
          {teamContext ? (
            <p
              className={`mt-1 text-sm ${
                resultState.tone === "success" ? "text-emerald-900" : "text-amber-900"
              }`}
            >
              {t("result.context", { context: teamContextLabel })}
            </p>
          ) : null}
          <p
            className={`mt-2 text-xs leading-6 ${
              resultState.tone === "success" ? "text-emerald-800" : "text-amber-800"
            }`}
          >
            {resultState.tone === "success"
              ? t("result.successManualHint")
              : t("result.warningManualHint")}
          </p>
          <p
            className={`mt-2 break-all rounded-md border bg-white px-3 py-2 text-xs ${
              resultState.tone === "success"
                ? "border-emerald-200 text-emerald-900"
                : "border-amber-200 text-amber-900"
            }`}
          >
            {inviteUrl}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onCopy}
              className={`inline-flex rounded-lg border bg-white px-3 py-1.5 text-sm ${
                resultState.tone === "success"
                  ? "border-emerald-300 text-emerald-900"
                  : "border-amber-300 text-amber-900"
              }`}
            >
              {t("copy.button")}
            </button>
            <a
              href="/dashboard"
              className="inline-flex rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700"
            >
              {t("dashboardCta")}
            </a>
          </div>
          {copyNotice ? (
            <p
              className={`mt-2 text-xs ${
                resultState.tone === "success" ? "text-emerald-900" : "text-amber-900"
              }`}
            >
              {copyNotice}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function mapInviteActionError(
  reason: string,
  t: ReturnType<typeof useTranslations<"dashboard.coFounderInviteForm">>
) {
  if (reason === "not_authenticated") return t("actionErrors.notAuthenticated");
  if (reason === "ungueltige_email") return t("actionErrors.invalidEmail");
  if (reason === "ungueltiger_teamkontext") return t("actionErrors.invalidTeamContext");
  if (reason === "self_invite_not_allowed") return t("actionErrors.selfInvite");
  if (reason === "duplicate_invite") return t("actionErrors.duplicateInvite");
  if (reason === "invite_create_failed") return t("actionErrors.createFailed");
  return t("actionErrors.generic");
}
