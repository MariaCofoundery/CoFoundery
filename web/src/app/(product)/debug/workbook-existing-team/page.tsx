import { notFound } from "next/navigation";
import { FounderAlignmentWorkbookClient } from "@/features/reporting/FounderAlignmentWorkbookClient";
import { DebugFounderPreviewModeSwitch } from "@/features/reporting/DebugFounderPreviewModeSwitch";
import { DebugWorkbookViewerSwitch } from "@/features/reporting/DebugWorkbookViewerSwitch";
import {
  getWorkbookPreviewState,
  resolveFounderPreviewMode,
  resolveFounderPreviewViewerRole,
  type FounderPreviewMode,
} from "@/features/reporting/debugFounderPreviewData";

type PageSearchParams = {
  mode?: string;
  viewer?: string;
};

export default async function WorkbookExistingTeamPreviewPage({
  searchParams,
}: {
  searchParams: Promise<PageSearchParams>;
}) {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const params = await searchParams;
  const mode = resolveFounderPreviewMode(params.mode, "existing_team");
  const viewer = resolveFounderPreviewViewerRole(params.viewer, mode);
  const preview = getWorkbookPreviewState(mode, viewer);

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_30%,#f8fafc_100%)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <DebugFounderPreviewModeSwitch
          pathname="/debug/workbook-existing-team"
          currentMode={mode as FounderPreviewMode}
        />
        <DebugWorkbookViewerSwitch
          pathname="/debug/workbook-existing-team"
          currentMode={mode as FounderPreviewMode}
          currentViewer={viewer}
        />
      </div>
      <FounderAlignmentWorkbookClient
        invitationId={null}
        teamContext={preview.teamContext}
        founderAName={preview.founderAName}
        founderBName={preview.founderBName}
        currentUserRole={preview.currentUserRole}
        initialWorkbook={preview.initialWorkbook}
        highlights={preview.highlights}
        advisorInvite={preview.advisorInvite}
        advisorToken={null}
        showValuesStep={preview.showValuesStep}
        canSave={false}
        persisted={false}
        updatedAt={null}
        source="mock"
        storedTeamContext={null}
        hasTeamContextMismatch={false}
        reportHeadline={preview.reportHeadline}
      />
    </main>
  );
}
