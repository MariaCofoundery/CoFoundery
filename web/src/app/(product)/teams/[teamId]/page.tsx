import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { ProfileAvatar } from "@/features/profile/ProfileAvatar";
import { ReadMyMindHomebaseCard } from "@/features/collaborationLab/ReadMyMindHomebaseCard";
import { FounderLibraryHomebaseCard } from "@/features/founderLibrary/FounderLibraryHomebaseCard";
import { FounderTeamNavigation } from "@/features/teams/FounderTeamNavigation";
import { FounderRelationshipAdvisorPanel } from "@/features/teams/FounderRelationshipAdvisorPanel";
import {
  getFounderTeamHomebase,
  type FounderTeamHomebase,
} from "@/features/teams/founderTeamHomebaseData";
import { getFounderSetupStarted } from "@/features/teams/founderSetupData";
import { getFounderSetupAdvisorAccess } from "@/features/teams/founderSetupAdvisorAccessData";

type TeamHomebasePageProps = {
  params: Promise<{ teamId: string }>;
};

const SECTION_CLASS =
  "rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.04)] sm:p-6";
const LINK_CLASS =
  "inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2";

function memberNames(
  team: FounderTeamHomebase,
  fallback: (index: number) => string
) {
  return new Map(
    team.members.map((member, index) => [
      member.userId,
      member.displayName ?? fallback(index + 1),
    ])
  );
}

function pairName(
  userIds: [string, string],
  names: Map<string, string>,
  fallback: (index: number) => string
) {
  return userIds
    .map((userId, index) => names.get(userId) ?? fallback(index + 1))
    .join(" & ");
}

export default async function TeamHomebasePage({ params }: TeamHomebasePageProps) {
  const { teamId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/teams/${teamId}`)}`);
  }

  const team = await getFounderTeamHomebase(teamId, user.id, supabase);
  if (!team) notFound();
  const [setupState, setupAdvisorAccess, labStateResult] = await Promise.all([
    getFounderSetupStarted(teamId, user.id, supabase),
    getFounderSetupAdvisorAccess(teamId, supabase),
    team.alignment.length
      ? supabase.from("commitment_labs").select("relationship_id").in("relationship_id", team.alignment.map((entry) => entry.relationshipId))
      : Promise.resolve({ data: [], error: null }),
  ]);
  const startedLabRelationships = new Set(
    labStateResult.error ? [] : ((labStateResult.data ?? []) as Array<{ relationship_id: string }>).map((row) => row.relationship_id)
  );

  const [t, navigationT, commitmentT] = await Promise.all([
    getTranslations("teams.homebase"),
    getTranslations("teams.teamNavigation"),
    getTranslations("teams.commitmentLab"),
  ]);
  const fallback = (index: number) => t("founders.fallback", { index });
  const names = memberNames(team, fallback);
  const founderNames = team.members.map(
    (member, index) => names.get(member.userId) ?? fallback(index + 1)
  );
  const title = team.name ?? founderNames.join(" + ");
  const context =
    team.teamContext === "existing_team"
      ? t("context.existingTeam")
      : t("context.preFounder");
  const pendingSetupAdvisorTask = setupAdvisorAccess.find(
    (entry) => Boolean(entry.grantId) && !entry.accessActive && !entry.consentedFounderUserIds.includes(user.id)
  );

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <Link
        href="/connections"
        className="rounded-sm text-sm font-medium text-slate-600 underline-offset-4 hover:text-slate-900 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-accent)] focus-visible:ring-offset-2"
      >
        {t("back")}
      </Link>

      <header className="mt-6 rounded-[28px] border border-slate-200/80 bg-slate-50/80 p-6 sm:p-8">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
          {t("eyebrow")}
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
          {t("title")}
        </h1>
        <p className="mt-4 text-xl font-medium text-slate-900">{title}</p>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">{context}</p>
      </header>

      <FounderTeamNavigation
        teamId={teamId}
        active="overview"
        labels={{
          ariaLabel: navigationT("ariaLabel"),
          context: navigationT("context", { team: title }),
          overview: navigationT("overview"),
          setup: navigationT("setup"),
          library: navigationT("library"),
          alignment: navigationT("alignment"),
        }}
      />

      <div className="mt-6 grid gap-6">
        <section className={SECTION_CLASS} aria-labelledby="team-founders-title">
          <h2 id="team-founders-title" className="text-xl font-semibold text-slate-950">
            {t("founders.title")}
          </h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {founderNames.map((name, index) => (
              <li
                key={team.members[index]?.userId ?? name}
                className="flex min-h-16 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm font-medium text-slate-900"
              >
                <ProfileAvatar
                  displayName={name}
                  avatarId={team.members[index]?.avatarId}
                  imageUrl={team.members[index]?.avatarUrl}
                  alt={t("founders.avatarAlt", { name })}
                  className="h-10 w-10 shrink-0 rounded-full object-cover"
                  fallbackClassName="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-sm font-semibold text-slate-700 shadow-sm"
                />
                <span className="min-w-0 break-words">{name}</span>
              </li>
            ))}
          </ul>
        </section>

        <section
          id="team-alignment"
          className={`${SECTION_CLASS} scroll-mt-32`}
          aria-labelledby="team-alignment-title"
        >
          <h2 id="team-alignment-title" className="text-xl font-semibold text-slate-950">
            {t("alignment.title")}
          </h2>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            {t("alignment.description")}
          </p>

          {team.alignment.length === 0 ? (
            <p className="mt-5 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
              {t("alignment.empty")}
            </p>
          ) : (
            <div className="mt-5 grid gap-4">
              {team.alignment.map((entry) => {
                const participants = pairName(entry.participantUserIds, names, fallback);
                const hasLinks = Boolean(
                  entry.workbook ||
                    entry.matchingWorkspace ||
                    entry.classicReport ||
                    entry.matchingReport
                );
                return (
                  <article
                    key={entry.relationshipId}
                    className="rounded-xl border border-slate-200 bg-slate-50/70 p-4"
                  >
                    <h3 className="text-sm font-semibold text-slate-900">
                      {t("alignment.pair", { names: participants })}
                    </h3>
                    {hasLinks ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {entry.workbook ? (
                          <Link href={entry.workbook.href} className={LINK_CLASS}>
                            {entry.workbook.exists
                              ? t("alignment.workbook")
                              : t("alignment.continue")}
                          </Link>
                        ) : null}
                        {entry.matchingWorkspace ? (
                          <Link href={entry.matchingWorkspace.href} className={LINK_CLASS}>
                            {t("alignment.workspace")}
                          </Link>
                        ) : null}
                        {entry.classicReport ? (
                          <Link href={entry.classicReport.href} className={LINK_CLASS}>
                            {t("alignment.report")}
                          </Link>
                        ) : null}
                        {entry.matchingReport ? (
                          <Link href={entry.matchingReport.href} className={LINK_CLASS}>
                            {t("alignment.matchingReport")}
                          </Link>
                        ) : null}
                      </div>
                    ) : (
                      <p className="mt-3 text-sm leading-6 text-slate-600">
                        {t("alignment.noArtifacts")}
                      </p>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {team.alignment.length > 0 ? (
          <section className={SECTION_CLASS} aria-labelledby="commitment-lab-title">
            <h2 id="commitment-lab-title" className="text-xl font-semibold text-slate-950">{commitmentT("title")}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">{commitmentT("description")}</p>
            <div className="mt-5 grid gap-3">
              {team.alignment.map((entry) => {
                const participants = pairName(entry.participantUserIds, names, fallback);
                const started = startedLabRelationships.has(entry.relationshipId);
                return <article key={entry.relationshipId} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm font-semibold text-slate-900">{commitmentT("pair", { names: participants })}</p><Link href={`/teams/${encodeURIComponent(teamId)}/commitment-lab/${encodeURIComponent(entry.relationshipId)}`} className={LINK_CLASS}>{commitmentT(started ? "continue" : "start")}</Link></article>;
              })}
            </div>
          </section>
        ) : null}

        <ReadMyMindHomebaseCard
          currentUserId={user.id}
          team={{
            id: team.id,
            name: team.name,
            members: team.members.map((member) => ({
              userId: member.userId,
              displayName: member.displayName,
              avatarId: member.avatarId,
              avatarUrl: member.avatarUrl,
            })),
          }}
        />

        <FounderLibraryHomebaseCard teamId={teamId} />

        <section
          className="rounded-2xl border border-violet-200/80 bg-violet-50/45 p-5 shadow-[0_12px_30px_rgba(76,29,149,0.05)] sm:p-6"
          aria-labelledby="team-setup-title"
        >
          <h2 id="team-setup-title" className="text-xl font-semibold text-slate-950">
            {t("setup.title")}
          </h2>
          <p className="mt-2 text-sm leading-7 text-slate-600">{t("setup.description")}</p>
          {pendingSetupAdvisorTask ? (
            <div className="mt-4 rounded-xl border border-violet-200 bg-white/80 p-4">
              <p className="text-sm font-semibold text-slate-900">{t("setup.advisorTask.title")}</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">{t("setup.advisorTask.description")}</p>
              <Link href={`/teams/${teamId}/setup#advisor-setup-access`} className={`${LINK_CLASS} mt-3`}>{t("setup.advisorTask.cta")}</Link>
            </div>
          ) : null}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium text-slate-700">
              {setupState?.started ? t("setup.started") : t("setup.notStarted")}
            </p>
            <Link
              href={`/teams/${teamId}/setup`}
              className="inline-flex min-h-10 items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-accent)] focus-visible:ring-offset-2"
            >
              {t("setup.open")}
            </Link>
          </div>
        </section>

        <section className={SECTION_CLASS} aria-labelledby="team-agreements-title">
          <h2 id="team-agreements-title" className="text-xl font-semibold text-slate-950">
            {t("agreements.title")}
          </h2>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            {t("agreements.description")}
          </p>
          {team.agreements.length === 0 ? (
            <p className="mt-5 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
              {t("agreements.empty")}
            </p>
          ) : (
            <ul className="mt-5 grid gap-3">
              {team.agreements.map((agreement) => {
                const participants = pairName(agreement.participantUserIds, names, fallback);
                return (
                  <li
                    key={`${agreement.source}:${agreement.relationshipId}`}
                    className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {agreement.source === "workbook"
                          ? t("agreements.workbook")
                          : t("agreements.workspace")}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {t("agreements.pair", { names: participants })}
                      </p>
                    </div>
                    <Link href={agreement.href} className={LINK_CLASS}>
                      {t("agreements.open")}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <FounderRelationshipAdvisorPanel team={team} currentUserId={user.id} names={names} />

      </div>
    </main>
  );
}
