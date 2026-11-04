import Link from "next/link";
import type { AlignDashboardState } from "@/features/instruments/align/dashboardData";

import { getTranslations } from "next-intl/server";
import { founderWorkProfileHref, resolveFounderWorkProfileState } from "@/features/dashboard/founderWorkProfileState";

/**
 * Zwei Darstellungsteile aus demselben Zustand (`getAlignDashboardState`).
 *
 * Bis Phase 9.4A war das eine grosse Karte "Founder-Arbeitsprofil" mit
 * Arbeitsweise, Vorhaben und Teamreport-Links nebeneinander. Die Teile gehoeren
 * aber auf verschiedene Ebenen: die Arbeitsweise ist persoenlich ("Über dich"),
 * das Vorhaben gehoert zum Team. Die Statuslogik ist unveraendert.
 */

export function alignWorkProfileState(state: AlignDashboardState) {
  return resolveFounderWorkProfileState({
    answered: state.profile.answered,
    started: state.profile.started,
    submitted: state.profile.submitted,
    legacyBaseSubmitted: state.hasPrevious,
  });
}

/** Persoenliche Arbeitsweise: Status und genau eine Aktion. */
export async function AlignWorkstyleStatus({ state }: { state: AlignDashboardState }) {
  const t = await getTranslations("dashboard.workProfile");
  if (!state.show) return <p className="text-sm text-slate-600">{t("unavailable")}</p>;
  const profileState = alignWorkProfileState(state);

  return (
    <div data-align-workstyle>
      <p className="text-sm font-semibold text-slate-900">{t("profileTitle")}</p>
      <p className="mt-1 text-xs text-slate-500">
        {profileState === "completed"
          ? t("completed")
          : profileState === "started"
            ? t("started")
            : t("notStarted")}
      </p>
      {profileState === "legacy" && (
        <p className="mt-2 text-xs leading-5 text-slate-600">{t("migrationTitle")}</p>
      )}
      <Link href={founderWorkProfileHref(profileState)} className="mt-3 inline-block text-sm text-slate-900 underline">
        {t(`actions.${profileState}`)}
      </Link>
    </div>
  );
}
