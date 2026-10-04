import { TeamJourneyStatus, loadTeamJourneyStatus, ventureHref } from "@/features/teams/TeamJourneyStatus";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient, getRequestUser } from "@/lib/supabase/server";
import { ProfileAvatar } from "@/features/profile/ProfileAvatar";
import { ReadMyMindHomebaseCard } from "@/features/collaborationLab/ReadMyMindHomebaseCard";
import { FounderInTheWildHomebaseCard } from "@/features/founderInTheWild/FounderInTheWildHomebaseCard";
import { FounderLibraryHomebaseCard } from "@/features/founderLibrary/FounderLibraryHomebaseCard";
import { FounderTeamNavigation } from "@/features/teams/FounderTeamNavigation";
import { FounderRelationshipAdvisorPanel } from "@/features/teams/FounderRelationshipAdvisorPanel";
import {
  getFounderTeamHomebase,
  type FounderTeamHomebase,
} from "@/features/teams/founderTeamHomebaseData";
import { getFounderSetup } from "@/features/teams/founderSetupData";
import { countFounderSetupStatuses } from "@/features/teams/founderSetupModel";
import { getFounderSetupAdvisorAccess } from "@/features/teams/founderSetupAdvisorAccessData";

type TeamHomebasePageProps = {
  params: Promise<{ teamId: string }>;
};

const SECTION_CLASS =
  "rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.04)] sm:p-6";
const CARD_CLASS = "flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5";
const CARD_LINK_CLASS =
  "inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-accent)] focus-visible:ring-offset-2";
const GROUP_TITLE_CLASS = "text-lg font-semibold text-slate-950";
const GROUP_TEXT_CLASS = "mt-1 max-w-3xl text-sm leading-6 text-slate-600";
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
  } = await getRequestUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/teams/${teamId}`)}`);
  }

  const team = await getFounderTeamHomebase(teamId, user.id, supabase);
  if (!team) notFound();
  const [setup, setupAdvisorAccess, labStateResult] = await Promise.all([
    // Das bestehende Setup-Readmodel - dieselbe Quelle wie die Setup-Seite.
    // Nicht lesbar heisst "Status nicht verfuegbar", nicht "offen".
    getFounderSetup(teamId, user.id, supabase).catch(() => null),
    getFounderSetupAdvisorAccess(teamId, supabase),
    team.alignment.length
      ? supabase.from("commitment_labs").select("relationship_id").in("relationship_id", team.alignment.map((entry) => entry.relationshipId))
      : Promise.resolve({ data: [], error: null }),
  ]);
  const labRows = labStateResult.error
    ? []
    : ((labStateResult.data ?? []) as Array<{ relationship_id: string }>);
  const startedLabRelationships = new Set(labRows.map((row) => row.relationship_id));
  const labCompletionResults = await Promise.all(
    labRows.map(async (row) => ({
      relationshipId: row.relationship_id,
      result: await supabase.rpc("is_commitment_lab_complete", {
        p_relationship_id: row.relationship_id,
      }),
    }))
  );
  const completedLabRelationships = new Set(
    labCompletionResults.flatMap(({ relationshipId, result }) =>
      !result.error && result.data ? [relationshipId] : []
    )
  );

  /**
   * Ein Paar, das gerade erst zusammengefunden hat.
   *
   * Absichtlich nur aus dem, was diese Seite ohnehin weiss: kein Report, kein
   * Setup begonnen, kein Lab gestartet. Eine feinere Empfehlung waere geraten -
   * und ein falscher Rat ist schlechter als keiner.
   */
  const isNewPair =
    team.members.length === 2 &&
    team.alignment.every((entry) => !entry.matchingReport && !entry.classicReport) &&
    !setup?.started &&
    startedLabRelationships.size === 0;

  const [t, navigationT, commitmentT, setupT, journey] = await Promise.all([
    getTranslations("teams.homebase"),
    getTranslations("teams.teamNavigation"),
    getTranslations("teams.commitmentLab"),
    getTranslations("teams.setup"),
    loadTeamJourneyStatus({ teamId: team.id, userId: user.id, client: supabase, setup }),
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
  // Dieselbe Zaehlung wie auf der Setup-Seite - keine eigene Ableitung, kein
  // Nenner, kein Prozentwert.
  const setupCounts = setup?.started ? countFounderSetupStatuses(setup) : null;
  const rosterChanged = Boolean(setup?.items.some((item) => item.rosterConfirmationMissing));
  const isPairTeam = team.members.length === 2;
  // Nur verbundene Begleitung aus dem bestehenden Paar-Reader - keine neue
  // Advisor-Abfrage, keine Ableitung aus Rollen.
  const linkedAdvisors = [
    ...new Set(
      team.advisors
        .filter((advisor) => advisor.status === "linked")
        .flatMap((advisor) => (advisor.advisorName?.trim() ? [advisor.advisorName.trim()] : []))
    ),
  ];

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <Link
        href="/connections"
        className="rounded-sm text-sm font-medium text-slate-600 underline-offset-4 hover:text-slate-900 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-accent)] focus-visible:ring-offset-2"
      >
        {t("back")}
      </Link>

      {/* -----------------------------------------------------------------
          PHASE 9.4B: EIN GEMEINSAMER ARBEITSRAUM STATT EINER FEATURE-WAND

          Oben das Team selbst (Name, Menschen, Einladung) und eine ruhige
          Statuszeile mit vier getrennten Zustaenden. Darunter drei Ebenen:
          Verstehen, Vertiefen (zu zweit), Vereinbaren. Nachschlagen und
          Rueckblick folgen leise. Daten, Rechte und Vertraege sind dieselben
          wie vorher - nur die Ordnung ist neu.
          ----------------------------------------------------------------- */}
      <header className="mt-6 rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-[0_12px_30px_rgba(15,23,42,0.04)] sm:p-8">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">{t("eyebrow")}</p>
        <h1 className="mt-2 break-words text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">{title}</h1>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">{context}</p>
        {linkedAdvisors.length > 0 ? (
          <p className="mt-1 text-sm leading-6 text-slate-600">
            {t("header.advisors", { names: linkedAdvisors.join(", ") })}
          </p>
        ) : null}

        <section className="mt-6" aria-labelledby="team-founders-title">
          <h2 id="team-founders-title" className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            {t("founders.count", { count: team.members.length })}
          </h2>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-3">
            <ul className="flex flex-wrap gap-2">
              {founderNames.map((name, index) => (
                <li
                  key={team.members[index]?.userId ?? name}
                  className="inline-flex min-h-11 max-w-full items-center gap-2 rounded-full border border-slate-200 bg-slate-50/80 py-1 pl-1 pr-4 text-sm font-medium text-slate-900"
                >
                  <ProfileAvatar
                    displayName={name}
                    avatarId={team.members[index]?.avatarId}
                    imageUrl={team.members[index]?.avatarUrl}
                    alt={t("founders.avatarAlt", { name })}
                    className="h-9 w-9 shrink-0 rounded-full object-cover"
                    fallbackClassName="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-xs font-semibold text-slate-700"
                  />
                  <span className="min-w-0 truncate">{name}</span>
                </li>
              ))}
            </ul>
            {team.members.length < 4 ? (
              <Link className={CARD_LINK_CLASS} href={`/invite/new?team=${team.id}`}>
                {t("membersInvite")}
              </Link>
            ) : (
              <p className="text-xs leading-5 text-slate-500">{t("membersFull")}</p>
            )}
          </div>
        </section>

        <div className="mt-6 border-t border-slate-200 pt-5">
          <TeamJourneyStatus teamId={team.id} state={journey} />
        </div>
      </header>

      <FounderTeamNavigation
        teamId={teamId}
        active="overview"
        labels={{
          ariaLabel: navigationT("ariaLabel"),
          overview: navigationT("overview"),
          workstyle: navigationT("workstyle"),
          roles: navigationT("roles"),
          setup: navigationT("setup"),
          library: navigationT("library"),
          alignment: navigationT("alignment"),
        }}
      />

      <div className="mt-8 grid gap-10">
        {/* VERSTEHEN: drei Einstiege, jeder mit genau einer Aktion. */}
        <section aria-labelledby="team-understand-title">
          <h2 id="team-understand-title" className={GROUP_TITLE_CLASS}>{t("groups.understand.title")}</h2>
          <p className={GROUP_TEXT_CLASS}>{t("groups.understand.text")}</p>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <article className={CARD_CLASS} aria-labelledby="team-understand-workstyle">
              <h3 id="team-understand-workstyle" className="text-base font-semibold text-slate-950">{t("understand.workstyle.title")}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{t("understand.workstyle.text")}</p>
              <div className="mt-auto pt-4">
                <Link className={CARD_LINK_CLASS} href={`/teams/${team.id}/workstyle`}>{t("understand.workstyle.action")}</Link>
              </div>
            </article>
            <article className={CARD_CLASS} aria-labelledby="team-understand-venture">
              <h3 id="team-understand-venture" className="text-base font-semibold text-slate-950">{t("understand.venture.title")}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{t("understand.venture.text")}</p>
              <div className="mt-auto pt-4">
                <Link className={CARD_LINK_CLASS} href={ventureHref(team.id, journey.venture)}>
                  {journey.venture === "present"
                    ? t("understand.venture.view")
                    : journey.venture === "inProgress"
                      ? t("understand.venture.continue")
                      : t("understand.venture.begin")}
                </Link>
              </div>
            </article>
            <article className={CARD_CLASS} aria-labelledby="team-understand-roles">
              <h3 id="team-understand-roles" className="text-base font-semibold text-slate-950">{t("understand.roles.title")}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{t("understand.roles.text")}</p>
              <div className="mt-auto pt-4">
                <Link className={CARD_LINK_CLASS} href={`/teams/${team.id}/roles`}>{t("understand.roles.action")}</Link>
              </div>
            </article>
          </div>
        </section>

        {/* VERTIEFEN: ausdruecklich zu zweit. Nur tatsaechlich vorhandene
            Paare - keine erfundenen Paarungen, keine neuen Relationships. */}
        <section id="team-deep-dives" className="scroll-mt-24" aria-labelledby="team-deepen-title">
          <h2 id="team-deepen-title" className={GROUP_TITLE_CLASS}>{t("groups.discover.title")}</h2>
          <p className={GROUP_TEXT_CLASS}>{t("groups.discover.text")}</p>
          {isNewPair ? (
            <p className="mt-4 rounded-2xl border border-slate-200 bg-slate-50/80 px-5 py-4 text-sm leading-7 text-slate-700">
              {t("groups.whereToStart")}
            </p>
          ) : null}
          {isPairTeam ? (
            <p className="mt-4 text-sm font-semibold text-slate-900">
              {t("deepen.pair", { names: founderNames.join(" & ") })}
            </p>
          ) : (
            <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">{t("deepen.twoOnly")}</p>
          )}

          <div className="mt-4 grid gap-4">
            {team.alignment.length > 0 ? (
              <section className={CARD_CLASS} aria-labelledby="commitment-lab-title">
                <h3 id="commitment-lab-title" className="text-base font-semibold text-slate-950">{commitmentT("title")}</h3>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{commitmentT("description")}</p>
                <ul className="mt-4 grid gap-3">
                  {team.alignment.map((entry) => {
                    const participants = pairName(entry.participantUserIds, names, fallback);
                    const started = startedLabRelationships.has(entry.relationshipId);
                    const completed = completedLabRelationships.has(entry.relationshipId);
                    return (
                      <li
                        key={entry.relationshipId}
                        className={
                          // Im Zweierteam steht das Paar schon oben - dann
                          // keine leere umrandete Zeile, nur Zustand und Aktion.
                          isPairTeam
                            ? "flex flex-wrap items-center gap-3"
                            : "flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4 sm:flex-row sm:items-center sm:justify-between"
                        }
                      >
                        <div>
                          {/* Im Zweierteam ist das Paar oben genannt; ab drei steht es an jeder Zeile. */}
                          {!isPairTeam ? (
                            <p className="text-sm font-semibold text-slate-900">{commitmentT("pair", { names: participants })}</p>
                          ) : null}
                          {completed ? <p className="mt-1 text-xs font-medium text-slate-600">{commitmentT("completed")}</p> : null}
                        </div>
                        <Link
                          href={`/teams/${encodeURIComponent(teamId)}/commitment-lab/${encodeURIComponent(entry.relationshipId)}`}
                          className={CARD_LINK_CLASS}
                        >
                          {commitmentT(completed ? "view" : started ? "continue" : "start")}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ) : null}
            <div className="grid gap-4 lg:grid-cols-2">
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
              <FounderInTheWildHomebaseCard
                currentUserId={user.id}
                team={{
                  id: team.id,
                  name: team.name,
                  members: team.members.map((member) => ({ userId: member.userId, displayName: member.displayName, avatarId: member.avatarId, avatarUrl: member.avatarUrl })),
                }}
              />
            </div>
          </div>
        </section>

        {/* VEREINBAREN: Founder Setup ist der verbindliche Ort. Zahlen nur aus
            dem bestehenden Readmodel; bestaetigt ist, was alle AKTUELLEN
            Mitglieder bestaetigt haben. */}
        <section aria-labelledby="team-agree-title">
          <h2 id="team-agree-title" className={GROUP_TITLE_CLASS}>{t("groups.commit.title")}</h2>
          <p className={GROUP_TEXT_CLASS}>{t("groups.commit.text")}</p>
          <article
            className="mt-4 rounded-2xl border border-violet-200/80 bg-violet-50/40 p-5 sm:p-6"
            aria-labelledby="team-setup-title"
          >
            <h3 id="team-setup-title" className="text-lg font-semibold text-slate-950">{t("setup.title")}</h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{t("setup.description")}</p>
            <p className="mt-4 text-sm font-medium text-slate-800">
              {setupCounts
                ? setupT("summary", {
                    clarified: setupCounts.clarified + setupCounts.documented + setupCounts.not_relevant,
                    discussing: setupCounts.discussing,
                    open: setupCounts.open,
                    pending: setupCounts.confirmation_pending,
                  })
                : setup
                  ? t("setup.notStarted")
                  : t("journey.setup.unavailable")}
            </p>
            {rosterChanged ? (
              <p className="mt-3 rounded-xl border border-slate-200 bg-white/80 p-4 text-sm leading-6 text-slate-700">{setupT("rosterChanged")}</p>
            ) : null}
            {pendingSetupAdvisorTask ? (
              <div className="mt-4 rounded-xl border border-violet-200 bg-white/80 p-4">
                <p className="text-sm font-semibold text-slate-900">{t("setup.advisorTask.title")}</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">{t("setup.advisorTask.description")}</p>
                <Link href={`/teams/${teamId}/setup#advisor-setup-access`} className={`${CARD_LINK_CLASS} mt-3`}>{t("setup.advisorTask.cta")}</Link>
              </div>
            ) : null}
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Link
                href={`/teams/${teamId}/setup`}
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-accent)] focus-visible:ring-offset-2"
              >
                {t("setup.open")}
              </Link>
              {setup?.started ? (
                <Link href={`/teams/${teamId}/setup/document`} className={CARD_LINK_CLASS}>
                  {t("setup.document")}
                </Link>
              ) : null}
            </div>
          </article>
        </section>

        <section aria-labelledby="team-resources-title">
          <h2 id="team-resources-title" className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            {t("groups.resources.title")}
          </h2>
          <div className="mt-3">
            <FounderLibraryHomebaseCard teamId={teamId} />
          </div>
        </section>

        {/* Rueckblick: eingeklappt, am Ende, nicht gleichrangig. */}
        <details id="team-alignment" className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white/70 p-4">
          <summary className="cursor-pointer rounded-lg text-sm font-medium text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-accent)] focus-visible:ring-offset-2">{t("alignment.history")}</summary>
        <section
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
                // All links here are historical and never create new drafts.
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
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        {entry.matchingReport ? (
                          <Link href={entry.matchingReport.href} className={LINK_CLASS}>
                            {t("alignment.matchingReport")}
                          </Link>
                        ) : null}
                        {entry.workbook ? (
                          <Link href={entry.workbook.href} className={LINK_CLASS}>
                            {t("alignment.workbook")}
                          </Link>
                        ) : null}
                        {entry.matchingWorkspace ? (
                          <Link href={entry.matchingWorkspace.href} className={LINK_CLASS}>
                            {t("alignment.workspace")}
                          </Link>
                        ) : null}
                        {entry.classicReport ? (
                          <Link
                            href={entry.classicReport.href}
                            className="inline-flex min-h-11 items-center text-sm text-slate-500 underline underline-offset-2 hover:text-slate-800"
                          >
                            {t("alignment.report")}
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

        </details>

        <FounderRelationshipAdvisorPanel team={team} currentUserId={user.id} names={names} />
      </div>
    </main>
  );
}
