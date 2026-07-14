"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createCoFounderInvitationAction } from "@/app/(product)/dashboard/actions";
import { toPublicAppUrl } from "@/lib/publicAppOrigin";
type TeamContext = "pre_founder" | "existing_team";

function toAbsoluteUrl(path: string) {
  return typeof window === "undefined" ? path : toPublicAppUrl(path, window.location.origin);
}

export function CoFounderInviteForm() {
  const router = useRouter();
  const t = useTranslations("dashboard.coFounderInviteForm");
  const [label, setLabel] = useState("");
  const [email, setEmail] = useState("");
  const [includeValues, setIncludeValues] = useState(false);
  const [teamContext, setTeamContext] = useState<TeamContext | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copyNotice, setCopyNotice] = useState<string | null>(null);
  const [resultState, setResultState] = useState<{
    tone: "success" | "warning";
    recipient: string;
    message: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedModulesLabel = useMemo(() => {
    return includeValues ? t("modules.selectedBasisValues") : t("modules.selectedBasis");
  }, [includeValues, t]);

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
      formData.set("includeValues", includeValues ? "true" : "false");
      formData.set("teamContext", teamContext);

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
      className="scroll-mt-24 rounded-2xl border border-slate-200/80 bg-white/95 p-6"
    >
      <h1 className="text-xl font-semibold text-slate-900">{t("title")}</h1>
      <p className="mt-2 text-sm text-slate-600">
        {t("intro")}
      </p>

      <form onSubmit={onSubmit} className="mt-5 space-y-4">
        <div>
          <label htmlFor="invite-label" className="text-xs font-medium uppercase tracking-[0.08em] text-slate-600">
            {t("label.projectName")}
          </label>
          <input
            id="invite-label"
            type="text"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder={t("placeholder.projectName")}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
          />
          <p className="mt-1 text-xs leading-5 text-slate-500">
            {t("help.projectName")}
          </p>
        </div>

        <div>
          <label htmlFor="invite-email" className="text-xs font-medium uppercase tracking-[0.08em] text-slate-600">
            {t("label.email")}
          </label>
          <input
            id="invite-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            placeholder="cofounder@example.com"
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
          />
        </div>

        <div className="rounded-2xl border border-cyan-100 bg-cyan-50/70 p-4">
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-slate-600">
            {t("teamContext.label")}
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {t("teamContext.help")}
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                setTeamContext("pre_founder");
                setError(null);
              }}
              className={`rounded-2xl border px-4 py-4 text-left transition ${
                teamContext === "pre_founder"
                  ? "border-cyan-400 bg-white shadow-[0_10px_25px_rgba(34,211,238,0.12)]"
                  : "border-slate-200 bg-white/90 hover:border-cyan-200"
              }`}
              aria-pressed={teamContext === "pre_founder"}
            >
              <p className="text-sm font-semibold text-slate-900">{t("teamContext.preFounder")}</p>
            </button>
            <button
              type="button"
              onClick={() => {
                setTeamContext("existing_team");
                setError(null);
              }}
              className={`rounded-2xl border px-4 py-4 text-left transition ${
                teamContext === "existing_team"
                  ? "border-cyan-400 bg-white shadow-[0_10px_25px_rgba(34,211,238,0.12)]"
                  : "border-slate-200 bg-white/90 hover:border-cyan-200"
              }`}
              aria-pressed={teamContext === "existing_team"}
            >
              <p className="text-sm font-semibold text-slate-900">{t("teamContext.existingTeam")}</p>
            </button>
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-500">
            {t("teamContext.reportHint")}
          </p>
          <p className="mt-2 max-w-2xl text-xs leading-5 text-slate-500">
            {t("teamContext.dataHint")}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-slate-600">{t("modules.label")}</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {t("modules.help")}
          </p>
          <div className="mt-3 space-y-2 text-sm text-slate-700">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked disabled className="h-4 w-4" />
              <span>{t("modules.baseActive")}</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={includeValues}
                onChange={(event) => setIncludeValues(event.target.checked)}
                className="h-4 w-4"
              />
              <span>{t("modules.valuesOptional")}</span>
            </label>
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="inline-flex rounded-lg border border-[color:var(--brand-primary)] bg-[color:var(--brand-primary)] px-4 py-2 text-sm text-slate-900 shadow-[0_10px_30px_rgba(103,232,249,0.22)] transition hover:bg-[#4fd4e6] disabled:opacity-60"
        >
          {isPending ? t("submit.pending") : t("submit.idle")}
        </button>
        <p className="text-xs text-slate-500">
          {t("fallbackHint")}
        </p>
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
          <p
            className={`mt-2 text-sm ${
              resultState.tone === "success" ? "text-emerald-900" : "text-amber-900"
            }`}
          >
            {t("result.activeModules", { modules: selectedModulesLabel })}
          </p>
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
  if (reason === "invite_create_failed") return t("actionErrors.createFailed");
  return t("actionErrors.generic");
}
