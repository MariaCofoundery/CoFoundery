import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import {
  getFounderTeamHomebase,
  type FounderTeamHomebase,
} from "@/features/teams/founderTeamHomebaseData";
import { getFounderSetupStarted } from "@/features/teams/founderSetupData";

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
  const setupState = await getFounderSetupStarted(teamId, user.id, supabase);

  const t = await getTranslations("teams.homebase");
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

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <Link
        href="/dashboard"
        className="text-sm font-medium text-slate-600 underline-offset-4 hover:text-slate-900 hover:underline"
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

      <div className="mt-6 grid gap-6">
        <section className={SECTION_CLASS} aria-labelledby="team-founders-title">
          <h2 id="team-founders-title" className="text-xl font-semibold text-slate-950">
            {t("founders.title")}
          </h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {founderNames.map((name, index) => (
              <li
                key={team.members[index]?.userId ?? name}
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900"
              >
                {name}
              </li>
            ))}
          </ul>
        </section>

        <section className={SECTION_CLASS} aria-labelledby="team-setup-title">
          <h2 id="team-setup-title" className="text-xl font-semibold text-slate-950">
            {t("setup.title")}
          </h2>
          <p className="mt-2 text-sm leading-7 text-slate-600">{t("setup.description")}</p>
          <p className="mt-4 text-sm font-medium text-slate-700">
            {setupState?.started ? t("setup.started") : t("setup.notStarted")}
          </p>
          <Link href={`/teams/${teamId}/setup`} className={`${LINK_CLASS} mt-4`}>
            {t("setup.open")}
          </Link>
        </section>

        <section className={SECTION_CLASS} aria-labelledby="team-alignment-title">
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

        {team.advisors.length > 0 ? (
          <section className={SECTION_CLASS} aria-labelledby="team-advisor-title">
            <h2 id="team-advisor-title" className="text-xl font-semibold text-slate-950">
              {t("advisor.title")}
            </h2>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              {t("advisor.description")}
            </p>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {team.advisors.map((advisor) => {
                const participants = pairName(advisor.participantUserIds, names, fallback);
                return (
                  <li
                    key={advisor.id}
                    className="rounded-xl border border-slate-200 bg-slate-50/70 p-4"
                  >
                    <p className="text-sm font-semibold text-slate-900">
                      {t("advisor.pair", { names: participants })}
                    </p>
                    <p className="mt-2 text-sm text-slate-600">
                      {t(`advisor.statuses.${advisor.status}`)}
                    </p>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}
      </div>
    </main>
  );
}
