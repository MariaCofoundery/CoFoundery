import { notFound } from "next/navigation";
import { DebugConversationGuidePreview } from "@/features/reporting/DebugConversationGuidePreview";
import { DebugFounderPreviewModeSwitch } from "@/features/reporting/DebugFounderPreviewModeSwitch";
import {
  getConversationGuidePreviewState,
  resolveFounderPreviewMode,
  type FounderPreviewMode,
} from "@/features/reporting/debugFounderPreviewData";

type PageSearchParams = {
  mode?: string;
};

export default async function ConversationGuidePreviewPage({
  searchParams,
}: {
  searchParams: Promise<PageSearchParams>;
}) {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const params = await searchParams;
  const mode = resolveFounderPreviewMode(params.mode, "pre_founder");
  const preview = getConversationGuidePreviewState(mode);

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#f5fbff_0%,#fbf8ff_28%,#ffffff_100%)] px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <DebugFounderPreviewModeSwitch
          pathname="/debug/conversation-guide-preview"
          currentMode={mode as FounderPreviewMode}
        />
        <DebugConversationGuidePreview
          preview={preview}
          workbookHref={`/debug/workbook-advisor-preview?mode=${mode}`}
        />
      </div>
    </main>
  );
}
