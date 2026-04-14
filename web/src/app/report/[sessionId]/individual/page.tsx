import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ sessionId: string }>;
};

export default async function IndividualReportPage({ params }: PageProps) {
  const { sessionId } = await params;
  redirect(`/report/${encodeURIComponent(sessionId)}`);
}
