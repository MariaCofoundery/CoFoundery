import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { CURRENT_WORKSTYLE_HREF } from "@/features/instruments/workstyle/current";
import { memberReady, memberShared, readinessState, type TeamReadiness } from "@/features/reporting/workstyle/teamReadiness";
import { TeamShareCard } from "@/features/teams/TeamShareCard";

/**
 * "Fuer euren gemeinsamen Bericht fehlt noch ..." (Phase 11.7B): je Person
 * nur "geteilt" / "noch nicht geteilt" / "Arbeitsprofil fehlt" - keine
 * Paarfreigaben. Kein Knopf fuer fremde Freigaben; die eigene Teamfreigabe
 * steht direkt darunter.
 */
export async function TeamReadinessPanel({ readiness, teamId, status = null }: { readiness: TeamReadiness; teamId: string; status?: string | null }) {
  const [t, locale] = await Promise.all([getTranslations("report.workstyle.readiness"), getLocale()]);
  const { state, waitingFor, viewerAction } = readinessState(readiness);
  const names = new Intl.ListFormat(locale, { style: "long", type: "conjunction" }).format(waitingFor);
  const viewer = readiness.members.find((m) => m.is_viewer);
  return (
    <div className="space-y-4">
      <section aria-labelledby="team-readiness-title" className="rounded-3xl border border-slate-200 bg-white p-5 md:p-6">
        <h2 id="team-readiness-title" className="text-xl font-semibold text-slate-950">
          {t("title")}
        </h2>
        <p className="mt-2 max-w-2xl leading-7 text-slate-700">
          {t(state === "INSUFFICIENT_WORKSTYLE" && !waitingFor.length ? "state.INSUFFICIENT_WORKSTYLE_SELF" : `state.${state}`, { names })}
        </p>
        <ul className="mt-4 divide-y divide-slate-100 rounded-2xl border border-slate-200" aria-label={t("listLabel")}>
          {readiness.members.map((m) => {
            const done = memberReady(m);
            const status = !memberShared(m) ? "notShared" : m.has_current_workstyle ? "shared" : "noWorkstyle";
            return (
              <li key={m.person_id} className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="min-w-0 truncate text-sm font-semibold text-slate-900">
                  {m.name}
                  {m.is_viewer ? ` (${t("you")})` : ""}
                </span>
                <span className={`inline-flex shrink-0 items-center gap-2 text-sm ${done ? "text-emerald-800" : "text-slate-500"}`}>
                  <span aria-hidden="true">{done ? "✓" : "○"}</span>
                  {t(`member.${status}`)}
                </span>
              </li>
            );
          })}
        </ul>
        {viewer && !viewer.has_current_workstyle ? (
          <Link href={CURRENT_WORKSTYLE_HREF} className="mt-4 inline-flex min-h-11 items-center rounded-full bg-[color:var(--brand-primary)] px-5 text-sm font-semibold text-slate-950">
            {t("completeWorkstyle")}
          </Link>
        ) : null}
        <p className="mt-4 max-w-2xl text-xs leading-5 text-slate-500">{t("rule")}</p>
      </section>
      {viewerAction === "share_team" ? (
        <TeamShareCard teamId={teamId} active={false} legacyShared={false} returnTo={`/teams/${encodeURIComponent(teamId)}/workstyle`} status={status} compact />
      ) : null}
    </div>
  );
}
