import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { startStepHref, type FounderStart, type StepState } from "@/features/dashboard/founderStart";

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
      className="brand-panel relative overflow-hidden rounded-[28px] px-6 py-8 sm:px-9 sm:py-9"
    >
      {/* Schwebende Kreise: reiner Schmuck, stehen still bei „Bewegung reduzieren". */}
      <span aria-hidden="true" className="orb -right-8 -top-10 h-28 w-28 sm:h-44 sm:w-44" />
      <span aria-hidden="true" className="orb bottom-16 right-28 hidden h-24 w-24 sm:block" style={{ animationDelay: "0.8s" }} />
      <span aria-hidden="true" className="orb right-6 top-20 h-7 w-7 bg-white/20 sm:right-16 sm:top-24 sm:h-10 sm:w-10" style={{ animationDelay: "0.3s" }} />

      <div className="relative">
        <p className="text-[13px] font-semibold uppercase tracking-[0.1em] text-white opacity-90">{t("eyebrow")}</p>
        <h1 id="dashboard-next-title" className="mt-2.5 max-w-xl pr-6 text-[26px] font-semibold leading-[1.15] sm:text-[32px]">
          {t(`next.${copyKey}.title`, values)}
        </h1>
        <p className="mt-3.5 max-w-xl text-[17px] leading-7 text-white sm:text-lg">{t(`next.${copyKey}.text`, values)}</p>
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
        </div>

        <div className="mt-8 border-t border-white/30 pt-5">
          {start.phase === "everyday" ? (
            <>
              <p className="flex items-center gap-2 text-[15px] text-white opacity-90">
                <StepIcon state="done" small />
                {t("path.foundationDone")}
              </p>
              <p className="mt-4 text-[13px] font-semibold uppercase tracking-[0.1em] text-white opacity-90">{t("path.everydayTitle")}</p>
            </>
          ) : null}
          <ol
            aria-label={start.phase === "everyday" ? t("path.everydayTitle") : t("path.label")}
            className={`grid gap-2.5 ${start.phase === "everyday" ? "mt-2.5 md:grid-cols-3" : "md:grid-cols-4"} md:gap-3`}
          >
            {start.steps.map((step) => (
              <li
                key={step.key}
                aria-current={step.state === "current" ? "step" : undefined}
                className={`flex items-start gap-2.5 text-[15px] leading-snug text-white ${step.state === "current" ? "font-semibold" : step.state === "open" ? "opacity-85" : ""}`}
              >
                <StepIcon state={step.state} />
                <span>
                  {start.phase === "everyday" ? t(`path.everyday.${step.key}`) : t(`path.foundation.${step.key}`)}
                  <span className="sr-only"> – {t(`path.state.${step.state}`)}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

function StepIcon({ state, small = false }: { state: StepState; small?: boolean }) {
  const size = small ? 18 : 22;
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-none">
      <circle cx="12" cy="12" r="10" strokeDasharray={state === "open" ? "3 3" : undefined} />
      {state === "done" ? <path d="m8 12 3 3 5-6" /> : null}
      {state === "current" ? <circle cx="12" cy="12" r="5" fill="#ffffff" stroke="none" /> : null}
    </svg>
  );
}
