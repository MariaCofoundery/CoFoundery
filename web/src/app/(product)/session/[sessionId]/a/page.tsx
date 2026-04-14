import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ sessionId: string }>;
};

export default async function ParticipantAPage({ params }: PageProps) {
  const { sessionId } = await params;
  redirect(`/join?invitationId=${encodeURIComponent(sessionId)}`);
}
