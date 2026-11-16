import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { startStepHref, type FounderStart } from "@/features/dashboard/founderStart";

/**
 * "Dein naechster Schritt" in der Marken-Flaeche der Startseite: der Verlauf
 * und die schwebenden Kreise von vorher, aber nur noch EIN Schritt statt eines
 * Karussells. Was andere von der Person brauchen, steht darunter unter
 * "Wartet auf dich" - nichts davon ist hier versteckt.
 *
 * Darunter der Weg: erledigt, jetzt dran, noch offen - als Text fuer
 * Screenreader, nie nur als Zeichen. Kein Prozent, kein "x von y".
 */
export async function DashboardNextStep({
  start,
  teamName,
  setupTotal,
  locale,
}: {
  start: FounderStart;
  teamName: string | null;
  setupTotal: number;
  locale: string;
}) {
  const t = await getTranslations("dashboard.start");
  const next = start.next;
  const copyKey = next.kind === "test_project" && next.running ? "test_project_running" : next.kind;
  const values = {
    team: teamName ?? "",
    total: setupTotal,
    count: next.kind === "setup_confirm" ? next.count : 0,
    open: next.kind === "setup_continue" ? next.open : 0,
    date:
      next.kind === "check_in_scheduled"
        ? new Date(next.due).toLocaleDateString(locale, { day: "numeric", month: "long", timeZone: "Europe/Berlin" })
        : "",
  };
  const secondary =
    start.phase === "everyday" && "teamId" in next && next.teamId
      ? { href: `/teams/${encodeURIComponent(next.teamId)}/setup`, label: t("adjust") }
      : null;

  return (
    <section
      id="dashboard-block-next"
      data-dashboard-hero
      aria-labelledby="dashboard-next-title"
      className="dashboard-hero-night rounded-[28px] px-6 py-8 sm:px-9 sm:py-9"
    >
      <div className="relative">
        <p className="text-[13px] font-semibold uppercase tracking-[0.1em] text-white opacity-90">{t("eyebrow")}</p>
        <h1 id="dashboard-next-title" className="mt-2.5 max-w-xl pr-6 text-[26px] font-semibold leading-[1.15] sm:text-[32px]">
          {t(`next.${copyKey}.title`, values)}
        </h1>
        <p className="mt-3 max-w-xl text-[16px] leading-6 text-[#d7d3f7] sm:text-[17px]">{t(`next.${copyKey}.text`, values)}</p>
        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
          <Link
            href={startStepHref(next)}
            className="inline-flex min-h-12 items-center rounded-[14px] bg-white px-6 text-[17px] font-semibold text-violet-800 transition hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-violet-700"
          >
            {t(`next.${copyKey}.action`, values)}
          </Link>
          {secondary ? (
            <Link href={secondary.href} className="text-base text-white underline underline-offset-4">
              {secondary.label}
            </Link>
          ) : null}
          <span aria-hidden="true" className="flex items-center gap-1.5">
            {start.steps.map((step) => (
              <span key={step.key} className={`h-2 rounded-full ${step.state === "current" ? "w-7 bg-white" : step.state === "done" ? "w-2.5 bg-white" : "w-2.5 bg-white/35"}`} />
            ))}
          </span>
        </div>

        {/* Der Weg: vier Punkte fuers Auge, die Liste mit Stand als Text fuer Screenreader (nie nur ein Zeichen). */}
        <ol aria-label={start.phase === "everyday" ? t("path.everydayTitle") : t("path.label")} className="sr-only">
          {start.steps.map((step) => (
            <li key={step.key} aria-current={step.state === "current" ? "step" : undefined}>
              {start.phase === "everyday" ? t(`path.everyday.${step.key}`) : t(`path.foundation.${step.key}`)} – {t(`path.state.${step.state}`)}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
