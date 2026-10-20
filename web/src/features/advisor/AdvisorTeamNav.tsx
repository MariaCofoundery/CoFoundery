import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { buildAdvisorReportHref, buildAdvisorSnapshotHref } from "@/features/reporting/advisorTeamTargets";

type TeamContext = NonNullable<Parameters<typeof buildAdvisorReportHref>[1]>;

type Active = "report" | "session" | "snapshot";

/**
 * Die drei Ansichten eines begleiteten Teams: Report (das gemeinsame Bild),
 * Vorbereitung (die eigene Arbeit des Advisors) und Snapshot (der
 * festgehaltene Stand). Stand vorher als drei Knoepfe auf der Teamkarte; jetzt
 * als Reiter ueber jeder der drei Seiten, mit dem Weg zurueck zur Begleitung.
 *
 * Nicht im Druck.
 */
export async function AdvisorTeamNav({
  invitationId,
  teamContext,
  active,
}: {
  invitationId: string;
  teamContext?: TeamContext | null;
  active: Active;
}) {
  const t = await getTranslations("advisor.area");
  const tabs: { key: Active; href: string }[] = [
    { key: "report", href: buildAdvisorReportHref(invitationId, teamContext) },
    { key: "session", href: `/advisor/session?invitationId=${encodeURIComponent(invitationId)}` },
    { key: "snapshot", href: buildAdvisorSnapshotHref(invitationId, teamContext) },
  ];
  return (
    <div className="mb-6 print:hidden">
      <Link
        href="/advisor/begleitung"
        className="inline-flex min-h-11 items-center text-sm font-medium text-slate-600 underline-offset-4 hover:text-slate-900 hover:underline"
      >
        ← {t("detail.back")}
      </Link>
      <nav aria-label={t("team.tabsLabel")} className="-mx-4 mt-1 overflow-x-auto border-b border-slate-200 px-4 sm:mx-0 sm:px-0">
        <ul className="flex min-w-max items-end gap-1">
          {tabs.map((tab) => (
            <li key={tab.key}>
              <Link
                href={tab.href}
                aria-current={active === tab.key ? "page" : undefined}
                className={`-mb-px inline-flex min-h-11 items-center whitespace-nowrap border-b-2 px-3 text-sm transition sm:px-4 ${
                  active === tab.key
                    ? "border-violet-500 font-semibold text-slate-950"
                    : "border-transparent font-medium text-slate-500 hover:border-slate-300 hover:text-slate-900"
                }`}
              >
                {t(`team.tabs.${tab.key}`)}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
