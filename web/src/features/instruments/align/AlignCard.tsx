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

/**
 * Vorhaben mit einer tatsaechlich offenen Aktion - und nur diese.
 *
 * Offen heisst: begonnen und nicht abgegeben, oder jemand ist dazugekommen und
 * die eigenen Angaben sollten noch einmal angesehen werden. Ein noch nicht
 * begonnenes Vorhaben ist keine Pflicht (der Teamreport kommt ohne aus) und
 * steht in der Team-Homebase. Ohne jedes Vorhaben bleibt der Einstieg sichtbar,
 * weil er fuer Solo-Founder der einzige Weg dorthin ist.
 */
export async function AlignVentureActions({ state }: { state: AlignDashboardState }) {
  const t = await getTranslations("dashboard.workProfile");
  if (!state.show) return null;

  if (state.ventures.length === 0) {
    return (
      <div data-align-venture-entry>
        <p className="text-sm font-semibold text-slate-900">{t("ventureTitle")}</p>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          {t("ventureDescription")}{" "}
          <Link href="/founder-alignment/vorhaben" className="text-slate-900 underline">
            {t("begin")}
          </Link>
        </p>
      </div>
    );
  }

  const open = state.ventures.filter((venture) => venture.confirm || (venture.started && !venture.submitted));
  if (open.length === 0) return null;

  return (
    <div data-align-venture-actions>
      <p className="text-sm font-semibold text-slate-900">{t("ventureTitle")}</p>
      <ul className="mt-2 space-y-2">
        {open.map((venture) => (
          <li key={venture.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span className="text-slate-700">
              {venture.name ?? t("unnamed")}
              {venture.alone && <span className="text-slate-500">{t("onlyYou")}</span>}
            </span>
            {venture.confirm ? (
              <Link
                href={`/founder-alignment/vorhaben/bestaetigen?venture=${encodeURIComponent(venture.id)}`}
                className="text-slate-900 underline"
              >
                {t("confirm")}
              </Link>
            ) : (
              <Link
                href={`/founder-alignment/vorhaben?venture=${encodeURIComponent(venture.id)}`}
                className="text-slate-900 underline"
              >
                {t("continue")}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
