import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type {
  FounderDashboardConnectionStatus,
  FounderDashboardConnections,
} from "@/features/dashboard/founderDashboardConnections";
import { ProfileAvatar } from "@/features/profile/ProfileAvatar";

const CARD_LINK =
  "inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-accent)] focus-visible:ring-offset-2";

type CardT = Awaited<ReturnType<typeof getTranslations>>;

function statusText(status: FounderDashboardConnectionStatus, t: CardT) {
  switch (status.type) {
    case "setup_confirmed":
      return t("statuses.setupConfirmed", { count: status.count });
    case "setup_in_progress":
      return t("statuses.setupInProgress");
    case "alignment_report":
      return status.personLabel
        ? t("statuses.alignmentReportWith", { name: status.personLabel })
        : t("statuses.alignmentReport");
    case "commitment_lab":
      return status.personLabel
        ? t("statuses.commitmentLabWith", { name: status.personLabel })
        : t("statuses.commitmentLab");
    case "relationship_advisor":
      return status.personLabel
        ? t("statuses.advisorWith", { name: status.personLabel })
        : t("statuses.advisor");
    case "connection_pending":
      return t("statuses.connectionPending");
    case "alignment_in_progress":
      return t("statuses.alignmentInProgress");
  }
}

function StatusList({
  statuses,
  t,
}: {
  statuses: FounderDashboardConnectionStatus[];
  t: CardT;
}) {
  if (statuses.length === 0) return null;
  return (
    <ul className="mt-4 space-y-2" aria-label={t("statusLabel")}>
      {statuses.map((status, index) => (
        <li
          key={`${status.type}:${"relationshipId" in status ? status.relationshipId : index}`}
          className="flex items-start gap-2 text-sm leading-6 text-slate-600"
        >
          <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
          <span>{statusText(status, t)}</span>
        </li>
      ))}
    </ul>
  );
}

export async function DashboardConnectionCards({
  overview,
}: {
  overview: FounderDashboardConnections;
}) {
  const t = await getTranslations("dashboard.team.cards");
  const hasCards = overview.teams.length > 0 || overview.connections.length > 0;

  if (!hasCards) {
    return (
      <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
        {t("empty")}
      </p>
    );
  }

  return (
    <ul className="mt-4 grid gap-4 lg:grid-cols-2">
      {overview.teams.map((team) => {
        const memberNames = team.members.map(
          (member, index) => member.displayName ?? t("founderFallback", { index: index + 1 })
        );
        const title = team.name ?? memberNames.join(" + ");
        return (
          <li key={`team:${team.id}`}>
            <article className="flex h-full flex-col rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
              <div className="flex items-start gap-3">
                <div className="flex shrink-0 -space-x-2">
                  {team.members.map((member, index) => {
                    const name = memberNames[index] ?? t("founderFallback", { index: index + 1 });
                    return (
                      <ProfileAvatar
                        key={member.userId}
                        displayName={name}
                        avatarId={member.avatarId}
                        imageUrl={member.avatarUrl}
                        alt={t("avatarAlt", { name })}
                        className="h-10 w-10 rounded-full object-cover ring-2 ring-white"
                        fallbackClassName="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-xs font-semibold text-slate-700 ring-2 ring-white"
                      />
                    );
                  })}
                </div>
                <div className="min-w-0">
                  <h3 className="break-words text-base font-semibold text-slate-950">{title}</h3>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {team.teamContext === "existing_team"
                      ? t("contexts.existingTeam")
                      : t("contexts.potentialTeam")}
                  </p>
                </div>
              </div>
              <StatusList statuses={team.statuses} t={t} />
              <div className="mt-auto pt-5">
                <Link href={team.href} className={CARD_LINK}>
                  {t("openTeam")}
                </Link>
              </div>
            </article>
          </li>
        );
      })}

      {overview.connections.map((connection) => {
        const name = connection.counterpartName ?? t("founderUnknown");
        return (
          <li key={connection.id}>
            <article className="flex h-full flex-col rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
              <div>
                <h3 className="break-words text-base font-semibold text-slate-950">{name}</h3>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {connection.teamContext === "existing_team"
                    ? t("contexts.existingConnection")
                    : t("contexts.potentialConnection")}
                </p>
              </div>
              <StatusList statuses={connection.statuses} t={t} />
              <div className="mt-auto pt-5">
                <Link href={connection.href} className={CARD_LINK}>
                  {t("openConnection")}
                </Link>
              </div>
            </article>
          </li>
        );
      })}
    </ul>
  );
}
