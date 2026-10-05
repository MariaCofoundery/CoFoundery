import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { CURRENT_WORKSTYLE_HREF, CURRENT_WORKSTYLE_REPORT_HREF } from "@/features/instruments/workstyle/current";
import { readinessState, type TeamReadiness } from "@/features/reporting/workstyle/teamReadiness";

/**
 * "Fuer euren gemeinsamen Bericht fehlt noch ..." - mit den tatsaechlichen
 * Freigabezustaenden je Person. Kein Knopf fuer fremde Freigaben.
 */
export async function TeamReadinessPanel({ readiness }: { readiness: TeamReadiness }) {
  const [t, locale] = await Promise.all([getTranslations("report.workstyle.readiness"), getLocale()]);
  const { state, waitingFor, viewerAction } = readinessState(readiness);
  const names = new Intl.ListFormat(locale, { style: "long", type: "conjunction" }).format(waitingFor);
  return (
    <section aria-labelledby="team-readiness-title" className="rounded-3xl border border-slate-200 bg-white p-5 md:p-6">
      <h2 id="team-readiness-title" className="text-xl font-semibold text-slate-950">
        {t("title")}
      </h2>
      <p className="mt-3 max-w-2xl leading-7 text-slate-700">{t(state === "INSUFFICIENT_WORKSTYLE" && !waitingFor.length ? "state.INSUFFICIENT_WORKSTYLE_SELF" : `state.${state}`, { names })}</p>
      <ul className="mt-5 space-y-2" aria-label={t("listLabel")}>
        {readiness.members.map((m) => {
          const done = m.has_current_workstyle && m.shared_with_all_members;
          const status = !m.has_current_workstyle ? "noWorkstyle" : m.shared_with_all_members ? "shared" : "notShared";
          return (
            <li key={m.person_id} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3">
              <span
                aria-hidden="true"
                className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-sm font-semibold ${
                  done ? "border-violet-300 bg-violet-50 text-violet-800" : "border-slate-300 bg-white text-slate-500"
                }`}
              >
                {done ? "✓" : "○"}
              </span>
              <span className="text-sm leading-6">
                <span className="font-semibold text-slate-900">
                  {m.name}
                  {m.is_viewer ? ` (${t("you")})` : ""}
                </span>
                <span className="block text-slate-600">{t(`member.${status}`)}</span>
              </span>
            </li>
          );
        })}
      </ul>
      <div className="mt-5 flex flex-wrap gap-3">
        {viewerAction === "review_shares" ? (
          <Link href={`${CURRENT_WORKSTYLE_REPORT_HREF}#freigaben`} className="inline-flex min-h-11 items-center rounded-full bg-[color:var(--brand-primary)] px-5 text-sm font-semibold text-slate-950">
            {t("reviewShares")}
          </Link>
        ) : null}
        {viewerAction === "complete_workstyle" ? (
          <Link href={CURRENT_WORKSTYLE_HREF} className="inline-flex min-h-11 items-center rounded-full bg-[color:var(--brand-primary)] px-5 text-sm font-semibold text-slate-950">
            {t("completeWorkstyle")}
          </Link>
        ) : null}
      </div>
      <p className="mt-5 max-w-2xl text-xs leading-5 text-slate-500">{t("rule")}</p>
    </section>
  );
}
