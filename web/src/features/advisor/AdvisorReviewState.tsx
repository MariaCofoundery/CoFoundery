import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AccessStatePanel } from "@/features/access/AccessStatePanel";
import type { TeamReviewState } from "@/features/access/accessStateModel";

/**
 * Phase 12C.1C: Die Review-Seite, wenn es nichts (mehr) zu zeigen gibt.
 *
 * Nur fuer den Advisor des Reviews (die Datenbank sagt sonst 'none' -> 404).
 * "Beendet" nennt keinen Grund und keine Person: Ob jemand abgelehnt oder
 * zurueckgezogen hat, sagt der Zustand nicht.
 */
export async function AdvisorReviewUnavailable({ state }: { state: TeamReviewState }) {
  const t = await getTranslations("advisor.access");
  const key =
    state.state === "ended"
      ? "review.ended"
      : state.state === "requested"
        ? "review.requested"
        : state.state === "org_membership_ended"
          ? "orgMembershipEnded"
          : state.state === "org_suspended"
            ? "orgSuspended"
            : null;
  // Aktiv, aber der Inhalt laedt nicht - oder nie Advisor dieses Reviews.
  if (!key) notFound();
  return (
    <AccessStatePanel
      eyebrow={t("eyebrow")}
      title={t(`${key}.title`)}
      body={t(`${key}.body`)}
      actions={[
        { href: "/advisor/group", label: t("toPeople") },
        { href: "/advisor/dashboard", label: t("toAdvisor") },
      ]}
    />
  );
}

/**
 * Phase 12C.1C: Der Teambezug eines aktiven Reviews.
 *
 * Ein Gruppenreview kann legitim aktiv sein, ohne einen Teambericht zu oeffnen
 * (Phase 12C.1B). Das steht jetzt hier - mit dem bestehenden Weg zu einer neuen
 * Anfrage. Die Anfrage zeigt der Advisor fuer dieselbe Gruppe vor, die er
 * selbst zusammengestellt hat; zustimmen muessen alle erneut. Ob es gerade ein
 * passendes Team gibt, sagt die Seite absichtlich nicht - das waere eine
 * Auskunft ueber Teammitgliedschaften.
 */
export async function ReviewTeamContext({
  state,
  teamName,
  subjectUserIds,
}: {
  state: TeamReviewState;
  teamName: string | null;
  subjectUserIds: string[];
}) {
  const t = await getTranslations("advisor.review.teamContext");
  const requestHref = `/advisor/group?${subjectUserIds.map((id) => `p=${encodeURIComponent(id)}`).join("&")}`;
  const text =
    state.state === "active_with_team"
      ? t("withTeam")
      : state.state === "active_without_team"
        ? t("withoutTeam")
        : state.state === "active_team_changed"
          ? t("teamChanged")
          : state.state === "active_team_inactive"
            ? t("teamInactive")
            : t("teamUnavailable");
  const canRequestNew = state.state === "active_without_team" || state.state === "active_team_changed";

  return (
    <section
      aria-labelledby="review-team-context-title"
      className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5"
    >
      <h2 id="review-team-context-title" className="text-base font-semibold text-slate-950">
        {t("title")}
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-700">{text}</p>
      {state.state === "active_with_team" ? (
        <Link
          href={`/teams/${encodeURIComponent(state.teamId)}/workstyle`}
          className="mt-3 inline-flex min-h-11 items-center break-words text-sm font-medium text-slate-900 underline underline-offset-4"
        >
          {t("openTeam", { team: teamName ?? t("teamFallback") })}
        </Link>
      ) : null}
      {canRequestNew && subjectUserIds.length >= 2 ? (
        <Link
          href={requestHref}
          className="mt-3 inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
        >
          {t("requestNew")}
        </Link>
      ) : null}
    </section>
  );
}
