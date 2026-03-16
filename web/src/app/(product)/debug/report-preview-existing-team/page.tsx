import { notFound, redirect } from "next/navigation";
import { resolveFounderPreviewMode } from "@/features/reporting/debugFounderPreviewData";

type PageSearchParams = {
  mode?: string;
};

export default async function ReportPreviewExistingTeamPage({
  searchParams,
}: {
  searchParams: Promise<PageSearchParams>;
}) {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const params = await searchParams;
  const mode = resolveFounderPreviewMode(params.mode, "existing_team");
  redirect(`/debug/founder-report-preview?mode=${mode}`);
}
