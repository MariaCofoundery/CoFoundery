import Link from "next/link";
import type { AlignDashboardState } from "@/features/instruments/align/dashboardData";
import { screenSet } from "@/features/instruments/align/screens";
import type { AssessmentScope } from "@/features/instruments/align/registries";

import { getTranslations } from "next-intl/server";
import { founderWorkProfileHref, resolveFounderWorkProfileState } from "@/features/dashboard/founderWorkProfileState";

// Counts use the existing screen definitions; instrument content is unchanged.
function schritte(scope: AssessmentScope): number {
  return screenSet(scope, () => true).screens.length;
}

export async function AlignCard({ state }: { state: AlignDashboardState }) {
  const t = await getTranslations("dashboard.workProfile");
  if (!state.show) return <p className="mb-8 text-sm text-slate-600">{t("unavailable")}</p>;
  const profileState = resolveFounderWorkProfileState({
    answered: state.profile.answered,
    started: state.profile.started,
    submitted: state.profile.submitted,
    legacyBaseSubmitted: state.hasPrevious,
  });
  const mehrere = state.ventures.length > 1;

  return (
    <section
      id="dashboard-block-align"
      className="dashboard-fade-up mb-8 scroll-mt-28 rounded-[28px] border border-slate-200/80 bg-white/96 p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)] sm:p-6"
      aria-labelledby="dashboard-align-title"
    >
      <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
        {t("eyebrow")}
      </p>
      <h2 id="dashboard-align-title" className="mt-2 text-2xl font-semibold text-slate-950">
        {t("title")}
      </h2>
      <p className="mt-2 text-sm leading-7 text-slate-600">{t("description")}</p>
      {profileState === "legacy" && (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
          <h3 className="font-medium">{t("migrationTitle")}</h3>
          <p className="mt-2 text-sm leading-7 text-slate-700">{t("migrationDescription")}</p>
        </div>
      )}

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
          <p className="text-sm font-medium text-slate-900">{t("profileTitle")}</p>
          <p className="mt-1 text-xs text-slate-500">
            {profileState === "completed" ? t("completed") : profileState === "started"
              ? t("started") : "Noch nicht begonnen"}
          </p>
          <div className="mt-3 flex flex-wrap gap-3 text-sm">
            <Link href={founderWorkProfileHref(profileState)} className="text-slate-900 underline">
              {t(`actions.${profileState}`)}
            </Link>
            {state.profile.submitted && (
              <>
                <Link
                  href="/me/profile/workstyle"
                  className="text-slate-900 underline"
                >
                  {t("answers")}
                </Link>
                <Link href="/discovery/suche" className="text-slate-900 underline">
                  {t("search")}
                </Link>
              </>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
          <p className="text-sm font-medium text-slate-900">{t("ventureTitle")}</p>
          {state.ventures.length === 0 ? (
            <>
              <p className="mt-1 text-xs text-slate-500">
                {t("ventureDescription")}
              </p>
              <Link
                href="/founder-alignment/vorhaben"
                className="mt-3 inline-block text-sm text-slate-900 underline"
              >
                {t("begin")}
              </Link>
            </>
          ) : (
            <ul className="mt-2 space-y-3">
              {state.ventures.map((venture) => (
                <li key={venture.id}>
                  {mehrere && (
                    <p className="text-xs font-medium text-slate-700">
                      {venture.name ?? t("unnamed")}
                      {venture.alone && <span className="text-slate-500">{t("onlyYou")}</span>}
                    </p>
                  )}
                  <p className="text-xs text-slate-500">
                    {venture.submitted
                      ? t("completed")
                      : venture.started
                        ? t("started")
                        : t("ventureSteps", { count: schritte("venture_alignment") })}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-3 text-sm">
                    <Link
                      href={`/founder-alignment/vorhaben?venture=${encodeURIComponent(venture.id)}`}
                      className="text-slate-900 underline"
                    >
                      {venture.started ? t("continue") : t("begin")}
                    </Link>
                    {venture.submitted && (
                      <Link
                        href={`/founder-alignment/vorhaben/antworten?venture=${encodeURIComponent(venture.id)}`}
                        className="text-slate-900 underline"
                      >
                        {t("answers")}
                      </Link>
                    )}
                  </div>
                  {venture.confirm && (
                    <Link
                      href={`/founder-alignment/vorhaben/bestaetigen?venture=${encodeURIComponent(venture.id)}`}
                      className="mt-2 inline-block rounded-lg bg-amber-100 px-3 py-1 text-xs text-amber-900 underline"
                    >
                      {t("confirm")}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {state.ventures.length > 0 && <div className="mt-5 rounded-2xl border border-slate-200 p-4">
        <h3 className="font-medium">Euer Zusammenspiel</h3>
        <p className="mt-1 text-sm text-slate-600">Der Teamreport verbindet eure freigegebenen Arbeitsweisen. Angaben zum Vorhaben und Vereinbarungen bleiben eigene Bereiche.</p>
        <ul className="mt-3 space-y-2">{state.ventures.filter(v => !v.alone).map(v => <li key={v.id}><Link className="underline" href={`/teams/${v.id}/workstyle`}>{v.name ?? "Teamreport öffnen"}</Link></li>)}</ul>
      </div>}
    </section>
  );
}
