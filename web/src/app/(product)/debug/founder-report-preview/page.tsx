import { notFound } from "next/navigation";
import { FounderAlignmentReportView } from "@/features/reporting/FounderAlignmentReportView";
import { buildFounderAlignmentReport } from "@/features/reporting/buildFounderAlignmentReport";
import { type TeamContext } from "@/features/reporting/buildExecutiveSummary";
import { getFounderAlignmentReportPreviewState, resolveFounderPreviewMode } from "@/features/reporting/debugFounderPreviewData";
import { createClient } from "@/lib/supabase/server";
import { getFounderScoringDebug } from "@/features/scoring/founderScoringDebug";
import { scoreFounderAlignment, type Answer } from "@/features/scoring/founderScoring";

type PageSearchParams = {
  invitationId?: string;
  teamContext?: string;
  mode?: string;
};

type FounderNames = {
  founderAName: string | null;
  founderBName: string | null;
  teamContext: TeamContext | null;
};

function resolveTeamContext(value: string | undefined): TeamContext {
  return value === "existing_team" ? "existing_team" : "pre_founder";
}

function parseStoredTeamContext(value: string | null | undefined): TeamContext | null {
  if (value === "existing_team") return "existing_team";
  if (value === "pre_founder") return "pre_founder";
  return null;
}

function buildMockAnswers() {
  const personA: Answer[] = [
    { question_id: "vision-1", dimension: "Vision & Unternehmenshorizont", value: 100 },
    { question_id: "vision-2", dimension: "Vision & Unternehmenshorizont", value: 75 },
    { question_id: "decision-1", dimension: "Entscheidungslogik", value: 75 },
    { question_id: "decision-2", dimension: "Entscheidungslogik", value: 50 },
    { question_id: "risk-1", dimension: "Risikoorientierung", value: 100 },
    { question_id: "risk-2", dimension: "Risikoorientierung", value: 75 },
    { question_id: "work-1", dimension: "Arbeitsstruktur & Zusammenarbeit", value: 75 },
    { question_id: "work-2", dimension: "Arbeitsstruktur & Zusammenarbeit", value: 50 },
    { question_id: "commitment-1", dimension: "Commitment", value: 100 },
    { question_id: "commitment-2", dimension: "Commitment", value: 75 },
    { question_id: "conflict-1", dimension: "Konfliktstil", value: 50 },
    { question_id: "conflict-2", dimension: "Konfliktstil", value: 25 },
  ];

  const personB: Answer[] = [
    { question_id: "vision-1-b", dimension: "Vision & Unternehmenshorizont", value: 75 },
    { question_id: "vision-2-b", dimension: "Vision & Unternehmenshorizont", value: 75 },
    { question_id: "decision-1-b", dimension: "Entscheidungslogik", value: 25 },
    { question_id: "decision-2-b", dimension: "Entscheidungslogik", value: 50 },
    { question_id: "risk-1-b", dimension: "Risikoorientierung", value: 25 },
    { question_id: "risk-2-b", dimension: "Risikoorientierung", value: 50 },
    { question_id: "work-1-b", dimension: "Arbeitsstruktur & Zusammenarbeit", value: 50 },
    { question_id: "work-2-b", dimension: "Arbeitsstruktur & Zusammenarbeit", value: 75 },
    { question_id: "commitment-1-b", dimension: "Commitment", value: 50 },
    { question_id: "commitment-2-b", dimension: "Commitment", value: 50 },
    { question_id: "conflict-1-b", dimension: "Konfliktstil", value: 100 },
    { question_id: "conflict-2-b", dimension: "Konfliktstil", value: 75 },
  ];

  return { personA, personB };
}

async function loadFounderNames(invitationId: string | null): Promise<FounderNames> {
  if (!invitationId) {
    return {
      founderAName: "Maria Keller",
      founderBName: "Lukas Brandt",
      teamContext: null,
    };
  }

  const supabase = await createClient();
  const { data: invitation } = await supabase
    .from("invitations")
    .select("inviter_user_id, invitee_user_id, team_context")
    .eq("id", invitationId)
    .maybeSingle();

  const inviterUserId =
    typeof invitation?.inviter_user_id === "string" ? invitation.inviter_user_id : null;
  const inviteeUserId =
    typeof invitation?.invitee_user_id === "string" ? invitation.invitee_user_id : null;

  if (!inviterUserId || !inviteeUserId) {
    return {
      founderAName: null,
      founderBName: null,
      teamContext: parseStoredTeamContext(invitation?.team_context),
    };
  }

  const { data: profileRows } = await supabase
    .from("profiles")
    .select("user_id, display_name")
    .in("user_id", [inviterUserId, inviteeUserId]);

  const profileByUserId = new Map(
    ((profileRows ?? []) as Array<{ user_id: string; display_name: string | null }>).map((row) => [
      row.user_id,
      row.display_name?.trim() ?? "",
    ])
  );

  return {
    founderAName: profileByUserId.get(inviterUserId)?.trim() || null,
    founderBName: profileByUserId.get(inviteeUserId)?.trim() || null,
    teamContext: parseStoredTeamContext(invitation?.team_context),
  };
}

export default async function FounderReportPreviewPage({
  searchParams,
}: {
  searchParams: Promise<PageSearchParams>;
}) {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const params = await searchParams;
  const invitationId = params.invitationId?.trim() || null;
  const previewMode = params.mode ? resolveFounderPreviewMode(params.mode, "pre_founder") : null;
  const previewState = previewMode ? getFounderAlignmentReportPreviewState(previewMode) : null;
  const [debugResult, founderNames] = previewState
    ? [
        null,
        {
          founderAName: previewState.founderAName,
          founderBName: previewState.founderBName,
          teamContext: previewState.teamContext,
        },
      ]
    : await Promise.all([
        invitationId ? getFounderScoringDebug(invitationId) : Promise.resolve(null),
        loadFounderNames(invitationId),
      ]);

  const teamContext =
    previewState?.teamContext ??
    founderNames.teamContext ??
    resolveTeamContext(params.teamContext);
  const scoringResult =
    previewState?.scoringResult ??
    debugResult?.scoring ??
    scoreFounderAlignment(buildMockAnswers());
  const report =
    previewState?.report ??
    buildFounderAlignmentReport({
      scoringResult,
      teamContext,
    });
  const workbookHref = previewMode
    ? `/debug/workbook-advisor-preview?mode=${previewMode}`
    : invitationId
      ? `/founder-alignment/workbook?invitationId=${invitationId}&teamContext=${teamContext}`
      : `/founder-alignment/workbook?teamContext=${teamContext}`;

  return (
    <FounderAlignmentReportView
      report={report}
      scoringResult={scoringResult}
      founderAName={founderNames.founderAName}
      founderBName={founderNames.founderBName}
      workbookHref={workbookHref}
    />
  );
}
