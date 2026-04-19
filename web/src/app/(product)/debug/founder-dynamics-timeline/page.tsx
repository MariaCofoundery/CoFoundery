import { notFound } from "next/navigation";
import { FounderDynamicsTimelinePreview } from "@/features/reporting/FounderDynamicsTimelinePreview";
import {
  getFounderDynamicsPreviewCase,
  resolveFounderDynamicsPreviewCase,
} from "@/features/reporting/founderDynamicsTimelinePreviewData";

type SearchParams = {
  case?: string;
  debug?: string;
};

export default async function FounderDynamicsTimelinePreviewPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const params = await searchParams;
  const selectedCase = resolveFounderDynamicsPreviewCase(params.case);
  const preview = getFounderDynamicsPreviewCase(selectedCase);
  const debugTimeline = params.debug === "1";

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl bg-[radial-gradient(circle_at_top,rgba(15,23,42,0.06),transparent_34%),linear-gradient(180deg,#f8fafc_0%,#f5efe6_100%)] px-6 py-10 sm:px-8 sm:py-12">
      <div className="mx-auto max-w-6xl">
        <FounderDynamicsTimelinePreview
          preview={preview}
          debugTimeline={debugTimeline}
        />
      </div>
    </main>
  );
}
