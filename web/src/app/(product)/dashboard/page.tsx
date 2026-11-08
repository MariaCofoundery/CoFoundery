import { getLocale, getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { currentTeamForInvitation } from "@/features/teams/currentJourneyData";
import { buildLoginRedirectPath } from "@/features/auth/loginRedirect";
import { ProductNavigationOverride } from "@/features/navigation/ProductShell";
import { DashboardDevSection } from "@/features/dashboard/DashboardDevSection";
import { DashboardNextStep } from "@/features/dashboard/DashboardNextStep";
import { DashboardWaiting, type RunningEntry, type WaitingCard } from "@/features/dashboard/DashboardWaiting";
import { DashboardAside } from "@/features/dashboard/DashboardAside";
import type { DashboardTaskPresentation } from "@/features/dashboard/DashboardTaskList";
import { getFounderDashboardTasks } from "@/features/dashboard/founderDashboardTaskData";
import type { FounderDashboardTask } from "@/features/dashboard/founderDashboardTasks";
import {
  duplicatesNextStep,
  isShownOnStart,
  resolveFounderStart,
  type StartInput,
} from "@/features/dashboard/founderStart";
import { getStartConversationPrompt, getStartTeamState } from "@/features/dashboard/founderStartData";
import { berlinDayNumber } from "@/features/dashboard/quoteDayIndex";
import { getDashboardRoleViews } from "@/features/dashboard/dashboardRoleData";
import { getProfileBasicsRow } from "@/features/profile/profileData";
import { ProfileBasicsForm } from "@/features/profile/ProfileBasicsForm";
import { isCoreProfileComplete } from "@/features/profile/profileCompletion";
import {
  debug_invitation_readiness,
  finalizeInvitationIfReady,
  getInvitationDashboardRows,
  getLatestSelfAlignmentReport,
  type InvitationReadinessDebug,
} from "@/features/reporting/actions";
import { buildInvitationDashboardHref } from "@/features/onboarding/invitationFlow";
import { MyProgramTasks } from "@/features/advisor/MyProgramTasks";
import { listMyProgramTasks } from "@/features/advisor/programTasksData";
import { getMyTeamPrograms } from "@/features/advisor/teamProgramData";
import { createClient, getRequestUser } from "@/lib/supabase/server";
import { getFounderTeamDashboardSummaries } from "@/features/teams/founderTeamHomebaseData";
import { alignWorkProfileState } from "@/features/instruments/align/AlignCard";
import { getAlignDashboardState } from "@/features/instruments/align/dashboardData";
import type { AppLocale } from "@/i18n/config";

const INVITATION_ERROR_KEYS = new Set(["expired", "revoked", "invitation_not_found"]);

type DashboardSearchParams = {
  error?: string;
  valuesStatus?: string;
  invite?: string;
  invitationId?: string;
  team?: string;
};

type DashboardT = Awaited<ReturnType<typeof getTranslations>>;

/**
 * Die Founder-Startseite (seit 04.11.2026, Entwurf "Startseite Founder").
 *
 *   1. Begruessung - eine Zeile, keine Ueberschrift, kein Zitat.
 *   2. Dein naechster Schritt - die Marken-Flaeche mit genau EINEM Schritt und
 *      dem Weg (Grundlagen, danach "Im Alltag"). `founderStart.ts`.
 *   3. Wartet auf dich - kleine Karten zum Wischen, darunter "Laeuft gerade".
 *   4. Daneben leise: Dein Stand, eine Frage fuer euer naechstes Gespraech,
 *      ohne Team: einladen und Find.
 *   5. Unten nur der Weg zum Datenschutz.
 *
 * Was frueher hier stand, steht jetzt dort, wo es hingehoert: Teams und
 * Verbindungen (mit verschickten Einladungen) unter /connections, Support und
 * "alle Sitzungen abmelden" unter /account, fruehere Auswertungen im Archiv von
 * /me/profile. Read My Mind, Founder in the Wild und das Commitment Lab sind
 * Uebungen zu zweit und stehen auf der Teamseite - nur eine Einladung zu Read
 * My Mind erscheint hier, weil dort jemand wartet.
 */
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<DashboardSearchParams>;
}) {
  const supabase = await createClient();
  const [t, setupT, locale] = await Promise.all([
    getTranslations("dashboard"),
    getTranslations("teams.setup"),
    getLocale(),
  ]);
  const {
    data: { user },
  } = await getRequestUser();

  const params = await searchParams;
  if (!user) {
    // Phase 12C.1C: mit Kontext (z. B. invitationId) zurueck zum Dashboard.
    redirect(buildLoginRedirectPath("/dashboard", params as Record<string, string | undefined>));
  }
  if (params.invitationId) {
    await finalizeInvitationIfReady(params.invitationId);
  }

  const [profileData, initialInvitationRows, roleViews, founderTeams] = await Promise.all([
    getProfileBasicsRow(supabase, user.id).catch(() => null),
    getInvitationDashboardRows(),
    getDashboardRoleViews(user.id),
    getFounderTeamDashboardSummaries(user.id, supabase).catch((error) => {
      console.error("dashboard founder teams load failed", error);
      return [];
    }),
  ]);

  if (!roleViews.hasFounder) {
    if (roleViews.hasAdvisor) redirect("/advisor/dashboard");
    const { data: hasConnect } = await supabase.rpc("is_network_member");
    redirect(hasConnect === true ? "/connect" : "/start");
  }
  const alignState = await getAlignDashboardState(user.id);

  let invitationRows = initialInvitationRows;
  const currentTeamEntries = await Promise.all(invitationRows.filter(i => i.status === "accepted").map(async i => [i.id, await currentTeamForInvitation(supabase, user.id, i.id)] as const));
  const currentTeamByInvitation = new Map(currentTeamEntries);
  const pendingFinalizeIds = invitationRows
    .filter((invitation) => !currentTeamByInvitation.get(invitation.id) && invitation.isReadyForMatching && !invitation.isReportReady)
    .map((invitation) => invitation.id);
  if (pendingFinalizeIds.length > 0) {
    const finalizeResults = await Promise.all(
      pendingFinalizeIds.map((invitationId) => finalizeInvitationIfReady(invitationId))
    );
    finalizeResults.forEach((result, index) => {
      if (!result.ok && result.reason !== "waiting_for_answers") {
        console.error("dashboard finalizeInvitationIfReady failed", {
          invitationId: pendingFinalizeIds[index],
          reason: result.reason,
          detail: result.detail ?? null,
        });
      }
    });
    invitationRows = await getInvitationDashboardRows();
  }

  const needsOnboarding = !isCoreProfileComplete(profileData);
  const isDev = process.env.NODE_ENV !== "production";
  const displayName =
    profileData?.display_name?.trim() || user.email?.split("@")[0]?.trim() || "Founder";
  const invitationById = new Map(invitationRows.map((invitation) => [invitation.id, invitation]));
  const actionableIncomingInvites = invitationRows
    .filter((row) => row.direction === "incoming" && !row.isReportReady)
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
  const prioritizedIncomingInvite =
    actionableIncomingInvites.find((invite) => invite.status === "accepted") ??
    actionableIncomingInvites[0] ??
    null;
  const contextualInvitationId = params.invitationId?.trim() || prioritizedIncomingInvite?.id || null;
  const contextualInvitation = contextualInvitationId
    ? invitationById.get(contextualInvitationId) ?? null
    : null;
  const contextualDashboardHref = contextualInvitationId
    ? buildInvitationDashboardHref(contextualInvitationId)
    : "/dashboard";
  const contextualTeam = contextualInvitation ? currentTeamByInvitation.get(contextualInvitation.id) : null;
  const contextualMatchingHref = contextualTeam ? `/teams/${contextualTeam}/workstyle` : contextualInvitation
    ? contextualInvitation.isReportReady
      ? `/report/${encodeURIComponent(contextualInvitation.id)}`
      : `/dashboard?invitationId=${encodeURIComponent(contextualInvitation.id)}`
    : null;

  // Ein Team sind zwei bis vier Founder. Ein Vorhaben, an dem jemand allein
  // arbeitet, ist ein `founder_teams`-Eintrag mit einer Person - fuer den Weg
  // zaehlt es als Vorhaben, nicht als Team.
  const teamName = (team: (typeof founderTeams)[number]) =>
    team.name?.trim() || team.members.map((member) => member.displayName ?? "Founder").join(" + ");
  const realTeams = founderTeams.filter((team) => team.members.length >= 2);
  const selectedTeam = realTeams.find((team) => team.id === params.team) ?? realTeams[0] ?? null;
  const ventureOf = (venture: { started: boolean; submitted: boolean } | undefined) =>
    venture?.submitted ? ("present" as const) : venture?.started ? ("inProgress" as const) : ("open" as const);
  const ventureWithoutTeam = alignState.ventures.some((venture) => venture.submitted)
    ? ("present" as const)
    : alignState.ventures.some((venture) => venture.started)
      ? ("inProgress" as const)
      : ("open" as const);

  const [teamState, capabilityCount, strengthCount, directionCount, dashboardTasks] = await Promise.all([
    selectedTeam
      ? getStartTeamState({
          client: supabase,
          userId: user.id,
          teamId: selectedTeam.id,
          venture: ventureOf(alignState.ventures.find((venture) => venture.id === selectedTeam.id)),
        })
      : Promise.resolve(null),
    countOwn(supabase, "person_capability_entries", user.id),
    countOwn(supabase, "person_strengths", user.id),
    countOwn(supabase, "direction_statements", user.id),
    getFounderDashboardTasks({
      currentUserId: user.id,
      invitations: invitationRows,
      founderAlignmentStarted: alignState.profile.started,
      founderAlignmentSubmitted: alignState.profile.submitted,
      // Die fruehere Werte-Reflexion ist kein Schritt mehr (`isShownOnStart`).
      valuesStarted: false,
      valuesSubmitted: false,
      teams: founderTeams,
      client: supabase,
    }).catch((error) => {
      console.error("dashboard tasks load failed", error);
      return [] as FounderDashboardTask[];
    }),
  ]);

  // Ist das Arbeitsprofil nicht lesbar, gilt es als fertig - lieber kein
  // Schritt als einer, der auf eine falsche Annahme baut.
  const workProfileState = alignState.show ? alignWorkProfileState(alignState) : "completed";
  const startInput: StartInput = {
    needsOnboarding,
    work: workProfileState,
    capabilityAreas: capabilityCount,
    ventureWithoutTeam,
    team: teamState,
  };
  const start = resolveFounderStart(startInput);
  const conversation = selectedTeam
    ? await getStartConversationPrompt({
        client: supabase,
        teamId: selectedTeam.id,
        locale: locale as AppLocale,
        dayIndex: berlinDayNumber(new Date()),
      })
    : null;

  const shownTasks = dashboardTasks
    .filter(isShownOnStart)
    .filter((task) => !duplicatesNextStep(task, start.next))
    .map((task) => presentDashboardTask(task, t, setupT));
  const waitingCards: WaitingCard[] = [
    ...shownTasks
      .filter((task) => task.kind === "NEEDS_YOU")
      .map((task) => ({ id: task.id, label: task.title, title: task.text, href: task.href, action: task.action })),
    // Jemand ist neu im Team, seit die Person ihre Vorhaben-Antworten bestaetigt hat.
    ...alignState.ventures
      .filter((venture) => venture.confirm)
      .map((venture) => ({
        id: `venture-confirm:${venture.id}`,
        label: t("start.waiting.ventureConfirm.label"),
        title: t("start.waiting.ventureConfirm.text", { team: venture.name ?? t("workProfile.unnamed") }),
        href: `/founder-alignment/vorhaben/bestaetigen?venture=${encodeURIComponent(venture.id)}`,
        action: t("start.waiting.ventureConfirm.action"),
      })),
  ];
  const running: RunningEntry[] = shownTasks
    .filter((task) => task.kind !== "NEEDS_YOU")
    .map((task) => ({ id: task.id, title: task.title, href: task.href }));

  const selfReport = isDev ? await getLatestSelfAlignmentReport() : null;
  const debugByInvitationId = isDev
    ? new Map<string, InvitationReadinessDebug>(
        await Promise.all(
          invitationRows.map(async (invitation) => [
            invitation.id,
            await debug_invitation_readiness(invitation.id, { attemptFinalize: true }),
          ] as const)
        )
      )
    : new Map<string, InvitationReadinessDebug>();

  // Aufgaben im Programm (20270329120000): meine offenen, ueber meine aktiven Programme.
  const myPrograms = (await getMyTeamPrograms(supabase).catch(() => [])).filter((program) => program.isActive);
  const myProgramTasks = myPrograms.length > 0 ? await listMyProgramTasks(supabase, user.id) : [];

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10 md:px-10 xl:px-12">
      {contextualInvitation ? (
        <ProductNavigationOverride
          matchingHref={contextualMatchingHref}
          activeView="founder"
          contextLabel={t("hero.contextLabel")}
        />
      ) : null}

      {params.error ? (
        <p role="alert" className="mb-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {/* Phase 12C.1C: Einladungsgruende aus /join/start benennen statt
              "bitte erneut versuchen" - ein neuer Versuch hilft dort nicht. */}
          {INVITATION_ERROR_KEYS.has(params.error)
            ? t(`hero.invitationErrors.${params.error}`)
            : t("hero.error")}
        </p>
      ) : null}

      <p className="mb-5 text-lg text-[#5f5e7a]">{t("hero.greeting", { name: displayName })}</p>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex min-w-0 flex-col gap-6">
          <MyProgramTasks
            tasks={myProgramTasks}
            labelOf={(programId) => myPrograms.find((program) => program.programId === programId)?.orgName ?? null}
            hrefOf={() => "/programm#aufgaben"}
            today={new Date().toISOString().slice(0, 10)}
          />
          <DashboardNextStep
            start={start}
            teamName={selectedTeam ? teamName(selectedTeam) : null}
            setupTotal={teamState?.setup?.total ?? 0}
            locale={locale}
          />

          {needsOnboarding ? (
            <section id="dashboard-block-profile" className="scroll-mt-28 rounded-[24px] border border-[#e4e2f0] bg-white p-5 sm:p-6">
              <details id="dashboard-block-profile-data" className="scroll-mt-28 rounded-2xl border border-slate-200/80 bg-white/88 p-4" open>
                <summary className="cursor-pointer rounded-lg text-sm font-semibold text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-accent)] focus-visible:ring-offset-2">
                  {t("utilities.profileCreate")}
                </summary>
                <p className="mt-2 text-xs leading-5 text-slate-500">{t("utilities.profileHelp")}</p>
                <div className="mt-4 border-t border-slate-200 pt-4">
                  {/* Der Erststart bleibt hier: ein Einstieg ist etwas anderes als
                      ein Editor. Wer das Basisprofil ausgefuellt hat, geht auf
                      /profile. */}
                  {needsOnboarding ? (
                    <ProfileBasicsForm
                      mode="onboarding"
                      initialValues={{
                        display_name: profileData?.display_name ?? null,
                        focus_skill: profileData?.focus_skill ?? null,
                        intention: profileData?.intention ?? null,
                        roles: profileData?.roles ?? null,
                        avatar_id: profileData?.avatar_id ?? null,
                        avatar_url: profileData?.avatar_url ?? null,
                      }}
                      submitLabel={t("actions.saveProfile")}
                      onSuccessRedirectTo={contextualDashboardHref}
                      variant="accent"
                      fallbackAvatarUrl={profileData?.avatar_id?.trim() ? null : profileData?.avatar_url?.trim() || null}
                    />
                  ) : null}
                </div>
              </details>
            </section>
          ) : null}

          <DashboardWaiting
            cards={waitingCards}
            running={running}
            labels={{
              title: t("start.waiting.title"),
              count: t("start.waiting.count", { count: waitingCards.length }),
              previous: t("start.waiting.previous"),
              next: t("start.waiting.next"),
              running: t("start.waiting.running"),
            }}
          />
        </div>

        <DashboardAside
          parts={{
            work: workProfileState === "completed",
            can: capabilityCount > 0,
            strengths: strengthCount > 0,
            direction: directionCount > 0,
          }}
          team={
            selectedTeam && teamState
              ? {
                  id: selectedTeam.id,
                  name: teamName(selectedTeam),
                  setup: teamState.setup,
                  everyday: start.phase === "everyday",
                  testProjectClosed: teamState.testProject === "closed",
                }
              : null
          }
          otherTeams={realTeams.filter((team) => team.id !== selectedTeam?.id).map((team) => ({ id: team.id, name: teamName(team) }))}
          conversation={conversation}
          showInvite={start.next.kind !== "invite"}
        />
      </div>

      <footer className="mt-12 text-sm">
        <Link href="/datenschutz" className="text-[#5f5e7a] underline underline-offset-4 hover:text-[#0b1f3a]">
          {t("start.privacy")}
        </Link>
      </footer>

      <DashboardDevSection
        enabled={isDev}
        selfReportDebug={
          selfReport
            ? {
                baseAssessmentId: selfReport.selfAssessmentMeta?.baseAssessmentId ?? selfReport.sessionId,
                valuesAssessmentId: selfReport.selfAssessmentMeta?.valuesAssessmentId ?? null,
                valuesAnsweredA: selfReport.valuesAnsweredA,
                valuesTotal: selfReport.valuesTotal,
                scoresA: selfReport.scoresA,
              }
            : null
        }
        invitationDebugEntries={invitationRows.map((invitation) => ({
          id: invitation.id,
          debug: debugByInvitationId.get(invitation.id) ?? null,
        }))}
        reportRuns={[]}
      />
    </main>
  );
}

/** Wie viele eigene Zeilen eine Tabelle hat; bei einem Fehler 0 - die Startseite faellt nicht deshalb aus. */
async function countOwn(client: Awaited<ReturnType<typeof createClient>>, table: string, userId: string) {
  const { count, error } = await client.from(table).select("user_id", { count: "exact", head: true }).eq("user_id", userId);
  return error ? 0 : count ?? 0;
}

function presentDashboardTask(
  task: FounderDashboardTask,
  t: DashboardT,
  setupT: DashboardT
): DashboardTaskPresentation {
  const context = task.contextLabel ?? t("tasks.context.connection");
  const eyebrow = t(`tasks.kinds.${task.kind}`);
  switch (task.type) {
    case "network_contact":
      return {
        ...task,
        eyebrow,
        title: t("tasks.items.connectContact.title"),
        text: t("tasks.items.connectContact.text", {
          name: task.personLabel ?? t("tasks.items.connectContact.someone"),
          listing: task.contextLabel ?? t("tasks.items.connectContact.listing"),
        }),
        action: t("tasks.items.connectContact.action"),
      };
    case "incoming_invitation":
      return {
        ...task,
        eyebrow,
        title: task.personLabel
          ? t("tasks.items.incomingInvitation.titleWithName", { name: task.personLabel })
          : t("tasks.items.incomingInvitation.title"),
        text: t("tasks.items.incomingInvitation.text"),
        action: t("tasks.items.incomingInvitation.action"),
      };
    case "discovery_intro":
      if (task.discoveryStage === "joint_check_consent") {
        return {
          ...task,
          eyebrow,
          title: t("tasks.items.discoveryJointCheck.title"),
          text: task.personLabel
            ? t("tasks.items.discoveryJointCheck.textWithName", {
                name: task.personLabel,
              })
            : t("tasks.items.discoveryJointCheck.text"),
          action: t("tasks.items.discoveryJointCheck.action"),
        };
      }
      if (task.discoveryStage === "own_inputs_missing") {
        return {
          ...task,
          eyebrow,
          title: t("tasks.items.discoveryOwnInputs.title"),
          text: t("tasks.items.discoveryOwnInputs.text"),
          action: t("tasks.items.discoveryOwnInputs.action"),
        };
      }
      if (task.discoveryStage === "alignment_ready") {
        return {
          ...task,
          eyebrow,
          title: t("tasks.items.discoveryAlignmentReady.title"),
          text: t("tasks.items.discoveryAlignmentReady.text"),
          action: t("tasks.items.discoveryAlignmentReady.action"),
        };
      }
      return {
        ...task,
        eyebrow,
        title: t("tasks.items.discoveryIntro.title"),
        text: task.personLabel
          ? t("tasks.items.discoveryIntro.textWithName", { name: task.personLabel })
          : t("tasks.items.discoveryIntro.text"),
        action: t("tasks.items.discoveryIntro.action"),
      };
    case "relationship_advisor_consent":
      return {
        ...task,
        eyebrow,
        title: t("tasks.items.relationshipAdvisor.title"),
        text: t("tasks.items.relationshipAdvisor.text", { context }),
        action: t("tasks.items.relationshipAdvisor.action"),
      };
    case "setup_advisor_consent":
      return {
        ...task,
        eyebrow,
        title: t("tasks.items.setupAdvisor.title", { context }),
        text: t("tasks.items.setupAdvisor.text"),
        action: t("tasks.items.setupAdvisor.action"),
      };
    case "setup_confirmation": {
      const topic = task.itemKey
        ? setupT(`items.${task.itemKey}.title`)
        : t("tasks.context.setupTopic");
      return {
        ...task,
        eyebrow,
        title: t("tasks.items.setupConfirmation.title", { context }),
        text: t("tasks.items.setupConfirmation.text", { topic }),
        action: t("tasks.items.setupConfirmation.action"),
      };
    }
    case "founder_alignment_continue":
      return {
        ...task,
        eyebrow,
        title: t("tasks.items.founderAlignment.title"),
        text: t("tasks.items.founderAlignment.text"),
        action: t("tasks.items.founderAlignment.action"),
      };
    case "values_continue":
      return {
        ...task,
        eyebrow,
        title: t("tasks.items.values.title"),
        text: t("tasks.items.values.text"),
        action: t("tasks.items.values.action"),
      };
    case "read_my_mind_invitation":
      return {
        ...task,
        eyebrow,
        title: (task.packCount ?? 1) > 1 ? t("tasks.items.readMyMindInvitation.multipleTitle") : t("tasks.items.readMyMindInvitation.title"),
        text: (task.packCount ?? 1) > 1
          ? t("tasks.items.readMyMindInvitation.multipleText", { name: task.personLabel ?? t("tasks.context.connection"), count: task.packCount ?? 1 })
          : task.personLabel
            ? t("tasks.items.readMyMindInvitation.textWithName", { name: task.personLabel })
            : t("tasks.items.readMyMindInvitation.text"),
        action: t("tasks.items.readMyMindInvitation.action"),
      };
    case "read_my_mind_continue":
      return {
        ...task,
        eyebrow,
        title: t("tasks.items.readMyMindContinue.title"),
        text: t("tasks.items.readMyMindContinue.text", { context }),
        action: t("tasks.items.readMyMindContinue.action"),
      };
    case "read_my_mind_reveal":
      return {
        ...task,
        eyebrow,
        title: t("tasks.items.readMyMindReveal.title"),
        text: t("tasks.items.readMyMindReveal.text"),
        action: t("tasks.items.readMyMindReveal.action"),
      };
    case "founder_in_the_wild_handoff":
      return {
        ...task,
        eyebrow,
        title: t("tasks.items.founderInTheWildHandoff.title"),
        text: task.started
          ? t("tasks.items.founderInTheWildHandoff.continueText")
          : task.personLabel
            ? t("tasks.items.founderInTheWildHandoff.textWithName", { name: task.personLabel })
            : t("tasks.items.founderInTheWildHandoff.text"),
        action: task.started
          ? t("tasks.items.founderInTheWildHandoff.continueAction")
          : t("tasks.items.founderInTheWildHandoff.action"),
      };
    case "founder_in_the_wild_reveal":
      return {
        ...task,
        eyebrow,
        title: t("tasks.items.founderInTheWildReveal.title"),
        text: t("tasks.items.founderInTheWildReveal.text"),
        action: t("tasks.items.founderInTheWildReveal.action"),
      };
    case "commitment_lab_continue":
      return {
        ...task,
        eyebrow,
        title: task.personLabel
          ? t("tasks.items.commitmentLab.titleWithName", { name: task.personLabel })
          : t("tasks.items.commitmentLab.title"),
        text: t("tasks.items.commitmentLab.text", { context }),
        action: t("tasks.items.commitmentLab.action"),
      };
    case "check_in_open":
      return {
        ...task,
        eyebrow,
        title: t("tasks.items.checkInOpen.title", { context }),
        text: t("tasks.items.checkInOpen.text"),
        action: t("tasks.items.checkInOpen.action"),
      };
    case "check_in_due":
      return {
        ...task,
        eyebrow,
        title: t("tasks.items.checkInDue.title", { context }),
        text: t("tasks.items.checkInDue.text"),
        action: t("tasks.items.checkInDue.action"),
      };
    case "founder_setup_continue": {
      const topic = task.itemKey
        ? setupT(`items.${task.itemKey}.title`)
        : t("tasks.context.setupTopic");
      return {
        ...task,
        eyebrow,
        title: t("tasks.items.founderSetup.title", { context }),
        text: t("tasks.items.founderSetup.text", { topic }),
        action: t("tasks.items.founderSetup.action"),
      };
    }
  }
}
