import { redirect } from "next/navigation";
import { type TeamContext } from "@/features/reporting/buildExecutiveSummary";

type PageSearchParams = {
  invitationId?: string;
  teamContext?: string;
};

function resolveTeamContext(value: string | undefined): TeamContext {
  return value === "existing_team" ? "existing_team" : "pre_founder";
}

export default async function FounderAlignmentConversationGuidePage({
  searchParams,
}: {
  searchParams: Promise<PageSearchParams>;
}) {
  const params = await searchParams;
  const invitationId = params.invitationId?.trim() || null;
  const requestedTeamContext = resolveTeamContext(params.teamContext);

  if (!invitationId) {
    redirect("/dashboard");
  }

  redirect(
    `/founder-alignment/workbook?invitationId=${encodeURIComponent(invitationId)}&teamContext=${encodeURIComponent(requestedTeamContext)}`
  );
}
