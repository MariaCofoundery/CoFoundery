import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ sessionId: string }>;
};

export default async function InvitePage({ params }: PageProps) {
  const { sessionId } = await params;
  redirect(`/join?invitationId=${encodeURIComponent(sessionId)}`);
}
