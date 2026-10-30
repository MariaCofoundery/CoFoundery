"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createCoFounderInvitationAction, createInviteTeamAction } from "@/app/(product)/dashboard/actions";
import { EmailChipsField } from "@/features/advisor/EmailChipsField";
import { toPublicAppUrl } from "@/lib/publicAppOrigin";
type TeamContext = "pre_founder" | "existing_team";

function toAbsoluteUrl(path: string) {
  return typeof window === "undefined" ? path : toPublicAppUrl(path, window.location.origin);
}

type InviteOutcome = { email: string; ok: boolean; sent: boolean; url: string | null; error: string | null };

const LOOKS_LIKE_EMAIL = /^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$/;

/**
 * Mitgruender:innen einladen - mehrere Adressen auf einmal. Mit einem Zielteam (aus dem
 * Team heraus geoeffnet) so viele, wie das Team noch Plaetze hat. Ohne Zielteam wird das Team
 * vorher angelegt (oder das eigene Einzel-Team wiederverwendet), damit alle Einladungen auf
 * dasselbe Team zeigen: Sonst bildete jede Annahme ein neues Paar-Team.
 */
export function CoFounderInviteForm({
  targetTeam,
  freeSlots = 3,
}: {
  targetTeam?: { id: string; name: string; context: TeamContext };
  freeSlots?: number;
}) {
  const router = useRouter();
  const t = useTranslations("dashboard.coFounderInviteForm");
  const [label, setLabel] = useState(targetTeam?.name ?? "");
  const [teamContext, setTeamContext] = useState<TeamContext | null>(targetTeam?.context ?? null);
  const [error, setError] = useState<string | null>(null);
  const [outcomes, setOutcomes] = useState<InviteOutcome[]>([]);
  const [resultTeamId, setResultTeamId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const typed = String(form.get("emailDraft") ?? "").trim().toLowerCase();
    const emails = [...new Set([...form.getAll("email").map((entry) => String(entry).toLowerCase()), ...(typed ? [typed] : [])])];
    if (emails.length === 0 || emails.some((entry) => !LOOKS_LIKE_EMAIL.test(entry))) {
      setError(t("validation.email"));
      return;
    }
    if (!teamContext) {
      setError(t("validation.teamContext"));
      return;
    }
    const context = teamContext;
    setError(null);
    setOutcomes([]);
    setResultTeamId(null);

    startTransition(async () => {
      let teamId = targetTeam?.id ?? null;
      if (!teamId) {
        const created = await createInviteTeamAction(context, label.trim());
        if (!created.ok) {
          setError(created.error === "not_a_founder" ? t("actionErrors.notFounder") : t("actionErrors.createFailed"));
          return;
        }
        teamId = created.teamId;
      }
      setResultTeamId(teamId);

      const results: InviteOutcome[] = [];
      for (const invitedEmail of emails) {
        const formData = new FormData();
        formData.set("label", label.trim());
        formData.set("invitedEmail", invitedEmail);
        // Phase 10: Keine Auswahl "Basis / Werte" mehr - die Einladung fuehrt in den aktuellen Weg.
        formData.set("includeValues", "false");
        formData.set("teamContext", context);
        formData.set("targetTeamId", teamId);
        const result = await createCoFounderInvitationAction(formData);
        results.push(
          result.ok
            ? { email: invitedEmail, ok: true, sent: result.emailStatus === "sent", url: toAbsoluteUrl(result.inviteUrl), error: null }
            : { email: invitedEmail, ok: false, sent: false, url: null, error: mapInviteActionError(result.error, t) }
        );
        setOutcomes([...results]);
      }
      router.refresh();
    });
  };

  return (
    <section
      id="cofounder-invite-form"
      className="scroll-mt-24 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_16px_40px_rgba(15,23,42,.05)] sm:p-7"
    >
      <form onSubmit={onSubmit} className="space-y-6">
        <EmailChipsField
          label={t("many.label")}
          addLabel={t("many.add")}
          removeLabel={t.raw("many.remove") as string}
          hint={t("many.hint", { count: targetTeam ? Math.max(1, freeSlots) : 3 })}
          invalidLabel={t("many.invalid")}
          maxCount={targetTeam ? Math.max(1, freeSlots) : 3}
        />

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
              maxLength={60}
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
          {isPending ? t("submit.pending") : t("many.submit")}
        </button>
      </form>

      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}

      {outcomes.length > 0 ? (
        <div className="mt-5 grid gap-2" role="status" aria-live="polite">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-600">{t("many.resultTitle")}</p>
          <ul className="grid gap-2">
            {outcomes.map((outcome) => (
              <li
                key={outcome.email}
                className={`rounded-xl border px-4 py-3 text-sm ${outcome.ok ? (outcome.sent ? "border-emerald-200 bg-emerald-50/60 text-emerald-900" : "border-amber-200 bg-amber-50/60 text-amber-900") : "border-rose-200 bg-rose-50/60 text-rose-900"}`}
              >
                <span className="font-semibold">{outcome.email}</span>
                <span className="block">{outcome.ok ? (outcome.sent ? t("many.sent") : t("many.manual")) : outcome.error}</span>
                {outcome.ok && !outcome.sent && outcome.url ? (
                  <span className="mt-1 block break-all rounded-md border border-amber-200 bg-white px-3 py-2 text-xs">{outcome.url}</span>
                ) : null}
              </li>
            ))}
          </ul>
          <a
            href={resultTeamId ? `/teams/${encodeURIComponent(resultTeamId)}` : "/dashboard"}
            className="mt-1 inline-flex w-fit rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700"
          >
            {resultTeamId ? t("many.backToTeam") : t("dashboardCta")}
          </a>
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
