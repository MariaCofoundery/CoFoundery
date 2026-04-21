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

export default async function WorkbookAdvisorPreviewPage({
  searchParams,
}: {
  searchParams: Promise<PageSearchParams>;
}) {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const params = await searchParams;
  const mode = resolveFounderPreviewMode(params.mode, "advisor");
  const viewer = resolveFounderPreviewViewerRole(params.viewer, mode);
  const preview = getWorkbookPreviewState(mode, viewer);

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_30%,#f8fafc_100%)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <DebugFounderPreviewModeSwitch
          pathname="/debug/workbook-advisor-preview"
          currentMode={mode as FounderPreviewMode}
        />
        <DebugWorkbookViewerSwitch
          pathname="/debug/workbook-advisor-preview"
          currentMode={mode as FounderPreviewMode}
          currentViewer={viewer}
        />
      </div>
      <FounderAlignmentWorkbookClient
        invitationId={null}
        relationshipId={null}
        teamContext={preview.teamContext}
        founderAName={preview.founderAName}
        founderBName={preview.founderBName}
        founderAAvatarId="avatar-04"
        founderBAvatarId="avatar-17"
        founderAAvatarUrl={null}
        founderBAvatarUrl={null}
        currentUserRole={preview.currentUserRole}
        initialWorkbook={preview.initialWorkbook}
        highlights={preview.highlights}
        advisorInvite={preview.advisorInvite}
        advisorEntries={preview.advisorEntries}
        advisorImpulses={[]}
        showValuesStep={preview.showValuesStep}
        canSave={false}
        persisted={false}
        updatedAt={null}
        source="mock"
        storedTeamContext={null}
        hasTeamContextMismatch={false}
      />
    </main>
  );
}
