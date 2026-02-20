import { redirect } from "next/navigation";
import {
  saveProfileOnboardingAction,
  signOutAction,
  updateDisplayNameAction,
} from "@/app/(product)/dashboard/actions";
import { createClient } from "@/lib/supabase/server";
import { DashboardComparisonWorkspace } from "@/features/dashboard/DashboardComparisonWorkspace";
import {
  getReportRunSnapshotForSession,
  getSessionAlignmentReport,
} from "@/features/reporting/actions";
import { OnboardingCard } from "@/features/onboarding/OnboardingCard";
import { selectParticipantA, selectParticipantB } from "@/features/participants/selection";
import { type SessionAlignmentReport } from "@/features/reporting/types";

type SessionRow = {
  id: string;
  status: "not_started" | "in_progress" | "waiting" | "ready" | "match_ready" | "completed";
  created_at: string;
  source_session_id?: string | null;
};

type ParticipantRow = {
  id: string;
  session_id: string;
  role: "A" | "B" | "partner";
  user_id: string | null;
  invited_email: string | null;
  invite_consent_by_user_id?: string | null;
  created_at: string;
  display_name?: string | null;
  completed_at: string | null;
};

type ProfileRow = {
  focus_skill: string | null;
  intention: string | null;
};

type ResponseSessionRow = {
  session_id: string;
  question_id: string;
  created_at: string;
  question: { category: string | null } | { category: string | null }[] | null;
};

type OutboundInviteStatus = "offen" | "in_bearbeitung" | "abgeschlossen";

type OutboundInvite = {
  sessionId: string;
  invitedEmail: string;
  invitedAt: string | null;
  status: OutboundInviteStatus;
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; valuesStatus?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("focus_skill, intention")
    .eq("user_id", user.id)
    .maybeSingle();
  const profileData = profile as ProfileRow | null;
  const needsOnboarding = !profileData?.focus_skill || !profileData?.intention;

  const { data: myParticipants, error: myParticipantsError } = await supabase
    .from("participants")
    .select("id, session_id, role, user_id, invited_email, display_name, completed_at")
    .eq("user_id", user.id);

  if (myParticipantsError) {
    return <main className="p-8">Fehler beim Laden der Sessions: {myParticipantsError.message}</main>;
  }

  const sessionIds = [...new Set((myParticipants ?? []).map((row) => row.session_id))];

  let sessions: SessionRow[] = [];
  let participantsInMySessions: ParticipantRow[] = [];
  const responseCountBySession = new Map<string, number>();
  const basisProgressBySession = new Map<string, number>();
  const lastResponseAtBySession = new Map<string, string>();
  const outboundInvitesBySourceSession = new Map<string, OutboundInvite[]>();

  if (sessionIds.length > 0) {
    const [
      { data: sessionsData, error: sessionsError },
      { data: participantsData, error: participantsError },
      { data: responsesData, error: responsesError },
    ] =
      await Promise.all([
        supabase
          .from("sessions")
          .select("id, status, created_at, source_session_id")
          .in("id", sessionIds)
          .order("created_at", { ascending: false }),
        supabase
          .from("participants")
          .select("id, session_id, role, user_id, invited_email, invite_consent_by_user_id, created_at, completed_at")
          .in("session_id", sessionIds),
        supabase
          .from("responses")
          .select("session_id, question_id, created_at, question:questions(category)")
          .in("session_id", sessionIds),
      ]);

    if (participantsError) {
      return <main className="p-8">Fehler beim Laden der Teilnehmer: {participantsError.message}</main>;
    }

    if (sessionsError) {
      return <main className="p-8">Fehler beim Laden der Session-Details: {sessionsError.message}</main>;
    }

    if (responsesError) {
      return <main className="p-8">Fehler beim Laden der Antworten: {responsesError.message}</main>;
    }

    const seenBasisQuestionBySession = new Map<string, Set<string>>();
    for (const row of (responsesData ?? []) as ResponseSessionRow[]) {
      const current = responseCountBySession.get(row.session_id) ?? 0;
      responseCountBySession.set(row.session_id, current + 1);
      const prevLatest = lastResponseAtBySession.get(row.session_id);
      if (!prevLatest || new Date(row.created_at).getTime() > new Date(prevLatest).getTime()) {
        lastResponseAtBySession.set(row.session_id, row.created_at);
      }

      const question = Array.isArray(row.question) ? row.question[0] : row.question;
      const category = question?.category?.trim().toLowerCase() ?? "basis";
      if (category !== "basis") continue;
      const bucket = seenBasisQuestionBySession.get(row.session_id) ?? new Set<string>();
      bucket.add(row.question_id);
      seenBasisQuestionBySession.set(row.session_id, bucket);
    }

    for (const [sid, ids] of seenBasisQuestionBySession) {
      basisProgressBySession.set(sid, ids.size);
    }

    participantsInMySessions = (participantsData ?? []) as ParticipantRow[];
    sessions = ((sessionsData ?? []) as SessionRow[]).filter((session) => {
      const responseCount = responseCountBySession.get(session.id) ?? 0;
      if (responseCount > 0) {
        return true;
      }
      return isWithinHours(session.created_at, 24);
    });

    const sourceSessionIds = [...new Set(sessions.map((row) => row.id))];
    if (sourceSessionIds.length > 0) {
      const { data: comparisonSessions } = await supabase
        .from("sessions")
        .select("id, status, source_session_id")
        .in("source_session_id", sourceSessionIds);

      const comparisonSessionRows = (comparisonSessions ?? []) as Array<{
        id: string;
        status: SessionRow["status"];
        source_session_id: string | null;
      }>;
      const comparisonSessionIds = comparisonSessionRows.map((row) => row.id);

      if (comparisonSessionIds.length > 0) {
        const { data: comparisonParticipants } = await supabase
          .from("participants")
          .select("session_id, role, invited_email, invite_consent_by_user_id, created_at, completed_at")
          .in("session_id", comparisonSessionIds);

        const comparisonParticipantRows = (comparisonParticipants ?? []) as Array<{
          session_id: string;
          role: "A" | "B" | "partner";
          invited_email: string | null;
          invite_consent_by_user_id?: string | null;
          created_at: string | null;
          completed_at: string | null;
        }>;

        const comparisonParticipantsBySession = new Map<string, typeof comparisonParticipantRows>();
        for (const row of comparisonParticipantRows) {
          const list = comparisonParticipantsBySession.get(row.session_id) ?? [];
          list.push(row);
          comparisonParticipantsBySession.set(row.session_id, list);
        }

        for (const comparison of comparisonSessionRows) {
          const sourceId = comparison.source_session_id;
          if (!sourceId) continue;
          const participants = comparisonParticipantsBySession.get(comparison.id) ?? [];
          const participantB = participants.find(
            (row) =>
              (row.role === "B" || row.role === "partner") &&
              row.invite_consent_by_user_id === user.id
          );
          if (!participantB?.invited_email) continue;
          const status: OutboundInviteStatus =
            comparison.status === "match_ready" || Boolean(participantB.completed_at)
              ? "abgeschlossen"
              : comparison.status === "in_progress"
              ? "in_bearbeitung"
              : "offen";
          const list = outboundInvitesBySourceSession.get(sourceId) ?? [];
          list.push({
            sessionId: comparison.id,
            invitedEmail: participantB.invited_email,
            invitedAt: participantB.created_at ?? null,
            status,
          });
          outboundInvitesBySourceSession.set(sourceId, list);
        }
      }
    }
  }

  const bySession = new Map<string, ParticipantRow[]>();
  participantsInMySessions.forEach((participant) => {
    const list = bySession.get(participant.session_id) ?? [];
    list.push(participant);
    bySession.set(participant.session_id, list);
  });

  const currentDisplayName =
    (myParticipants ?? [])
      .map((row) => row.display_name?.trim() ?? "")
      .find((value) => value.length > 0) ?? "";

  const participantABySession = new Map<string, ParticipantRow | undefined>();
  const sessionCreatedAtById = new Map<string, string>();
  for (const session of sessions) {
    const participants = bySession.get(session.id) ?? [];
    participantABySession.set(session.id, selectParticipantA(participants));
    sessionCreatedAtById.set(session.id, session.created_at);
  }

  const ownAnalysisTimestamp = (sessionId: string) => {
    const participantA = participantABySession.get(sessionId);
    return (
      participantA?.completed_at ??
      lastResponseAtBySession.get(sessionId) ??
      sessionCreatedAtById.get(sessionId) ??
      new Date(0).toISOString()
    );
  };

  const analysisTimestamp = (session: SessionRow) => {
    if (session.source_session_id) {
      return ownAnalysisTimestamp(session.source_session_id);
    }
    return ownAnalysisTimestamp(session.id);
  };

  const orderedSessions = [...sessions].sort(
    (a, b) => new Date(analysisTimestamp(b)).getTime() - new Date(analysisTimestamp(a)).getTime()
  );
  const sessionsByRecency = [...sessions].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const hasBothBasisProfilesCompleted = (session: SessionRow) => {
    const participants = bySession.get(session.id) ?? [];
    const participantA = selectParticipantA(participants);
    const participantB = selectParticipantB(participants, { primary: participantA });
    return Boolean(participantA?.completed_at && participantB?.completed_at);
  };

  const completedLike = (session: SessionRow) => {
    const progress = basisProgressBySession.get(session.id) ?? 0;
    return hasBothBasisProfilesCompleted(session) || session.status === "completed" || progress >= 36;
  };

  const latestCompletedMatchSession = sessionsByRecency.find((session) =>
    hasBothBasisProfilesCompleted(session)
  );
  const latestCompletedAnySession =
    latestCompletedMatchSession ??
    sessionsByRecency.find((session) => completedLike(session));
  const latestCompletedSession = latestCompletedAnySession ?? null;

  const activeAnySession = sessionsByRecency.find((session) => {
    const progress = basisProgressBySession.get(session.id) ?? 0;
    return progress < 36;
  });
  const activeSession = !latestCompletedSession
    ? activeAnySession ?? null
    : null;

  const latestComparisonSession = sessionsByRecency.find((session) => Boolean(session.source_session_id));
  const primarySession =
    latestComparisonSession ??
    latestCompletedAnySession ??
    sessionsByRecency[0] ??
    null;
  const archivedSessions = sessionsByRecency.filter(
    (session) => session.id !== activeSession?.id && session.id !== primarySession?.id
  );

  const primarySnapshot = primarySession
    ? await getReportRunSnapshotForSession(primarySession.id)
    : null;
  const primaryReport = primarySnapshot?.report ??
    (primarySession ? await getSessionAlignmentReport(primarySession.id) : null);

  const reportItems = orderedSessions.map((session) => {
    const participants = bySession.get(session.id) ?? [];
    const myMembership = participants.find((row) => row.user_id === user.id);
    const participantA = selectParticipantA(participants);
    const participantB = selectParticipantB(participants, { primary: participantA });
    const ownInviteParticipant = participants.find(
      (row) =>
        (row.role === "B" || row.role === "partner") &&
        Boolean(row.invited_email) &&
        row.invite_consent_by_user_id === user.id
    );
    const ownInviteStatus: OutboundInviteStatus =
      session.status === "match_ready" || Boolean(ownInviteParticipant?.completed_at)
        ? "abgeschlossen"
        : session.status === "in_progress"
        ? "in_bearbeitung"
        : "offen";
    const outboundInvites = [...(outboundInvitesBySourceSession.get(session.id) ?? [])];
    if (ownInviteParticipant?.invited_email) {
      const alreadyPresent = outboundInvites.some((invite) => invite.sessionId === session.id);
      if (!alreadyPresent) {
        outboundInvites.unshift({
          sessionId: session.id,
          invitedEmail: ownInviteParticipant.invited_email,
          invitedAt: ownInviteParticipant.created_at ?? null,
          status: ownInviteStatus,
        });
      }
    }

    return {
      sessionId: session.id,
      status: session.status,
      createdAt: session.created_at,
      analysisAt: analysisTimestamp(session),
      myRole: myMembership?.role ?? null,
      canInvite: Boolean(myMembership?.completed_at),
      participantAUser: Boolean(participantA?.user_id),
      participantBUser: Boolean(participantB?.user_id),
      outboundInvites: outboundInvites.sort(
        (a, b) => new Date(b.invitedAt ?? "").getTime() - new Date(a.invitedAt ?? "").getTime()
      ),
      report:
        session.id === primarySession?.id
          ? (primaryReport as SessionAlignmentReport | null)
          : null,
    };
  });
  const currentItem = primarySession ? reportItems.find((item) => item.sessionId === primarySession.id) ?? null : null;
  const pastItems = archivedSessions
    .map((session) => reportItems.find((item) => item.sessionId === session.id))
    .filter((item): item is NonNullable<typeof item> => item != null);
  const activeItem = activeSession
    ? reportItems.find((item) => item.sessionId === activeSession.id) ?? null
    : null;
  const staleInvite = currentItem
    && primarySession?.source_session_id
    ? findStaleInvite({
        sessions: archivedSessions,
        bySession,
        currentSessionId: currentItem.sessionId,
        currentSourceSessionId: primarySession.source_session_id,
      })
    : null;

  const params = await searchParams;

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-8 py-16 md:px-12">
      <header className="mb-16 flex flex-wrap items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-[0.11em] text-slate-900 md:text-4xl">DASHBOARD</h1>
          <p className="mt-2 text-sm tracking-[0.04em] text-slate-500">{user.email}</p>
          {profileData?.focus_skill && profileData?.intention ? (
            <p className="mt-2 text-xs tracking-[0.08em] text-slate-500">
              Fokus: {profileData.focus_skill} · Intention: {profileData.intention}
            </p>
          ) : null}
          <form action={updateDisplayNameAction} className="mt-3 inline-flex items-center gap-2">
            <label htmlFor="display-name" className="text-xs tracking-[0.08em] text-slate-500">
              Anzeigename
            </label>
            <input
              id="display-name"
              name="displayName"
              defaultValue={currentDisplayName}
              placeholder="Dein Name"
              className="h-9 rounded-lg border border-slate-200 px-3 text-sm text-slate-700"
            />
            <button
              type="submit"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700"
              aria-label="Anzeigename speichern"
              title="Anzeigename speichern"
            >
              ✎
            </button>
          </form>
        </div>
        <form action={signOutAction}>
          <button
            type="submit"
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700"
          >
            Abmelden
          </button>
        </form>
      </header>

      {needsOnboarding ? <OnboardingCard action={saveProfileOnboardingAction} /> : null}

      <DashboardComparisonWorkspace
        activeItem={
          activeItem
            ? {
                ...activeItem,
                progressBasis: Math.min(36, basisProgressBySession.get(activeItem.sessionId) ?? 0),
              }
            : null
        }
        currentItem={currentItem ?? null}
        pastItems={pastItems}
        staleInvite={staleInvite}
        error={params.error}
      />
    </main>
  );
}

function isWithinHours(timestamp: string | null | undefined, hours: number) {
  if (!timestamp) return false;
  const parsed = new Date(timestamp).getTime();
  if (!Number.isFinite(parsed)) return false;
  const cutoff = Date.now() - hours * 60 * 60 * 1000;
  return parsed >= cutoff;
}

function findStaleInvite({
  sessions,
  bySession,
  currentSessionId,
  currentSourceSessionId,
}: {
  sessions: SessionRow[];
  bySession: Map<string, ParticipantRow[]>;
  currentSessionId: string;
  currentSourceSessionId: string;
}) {
  const sorted = [...sessions].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  for (const session of sorted) {
    if (session.id === currentSessionId) continue;
    if (session.source_session_id !== currentSourceSessionId) continue;
    const participants = bySession.get(session.id) ?? [];
    const participantB = selectParticipantB(participants);
    if (!participantB?.invited_email) continue;
    return {
      fromSessionId: session.id,
      invitedEmail: participantB.invited_email,
      invitedAt: participantB.created_at ?? session.created_at,
    };
  }

  return null;
}
