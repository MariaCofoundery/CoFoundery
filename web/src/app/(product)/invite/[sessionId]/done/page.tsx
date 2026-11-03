import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ sessionId: string }>;
};

/**
 * Frueherer Abschlussbildschirm der v1-Einladung. Seit 03.11.2026 nur noch eine
 * Weiterleitung wie /invite/[sessionId]: /join/start entscheidet, ob Arbeitsprofil
 * oder Teambericht dran ist. Es werden hier keine alten Berichtslaeufe mehr angelegt.
 */
export default async function InviteDonePage({ params }: PageProps) {
  const { sessionId } = await params;
  redirect(`/join/start?invitationId=${encodeURIComponent(sessionId)}`);
}
