import { redirect } from "next/navigation";

/**
 * Die alte Adresse bleibt erreichbar.
 *
 * Das Gespraech ist am 19.09.2026 nach /messages/[id] gezogen. Diese Adresse
 * steht in verschickten Benachrichtigungen, in Lesezeichen und in
 * Gespraechsverlaeufen - sie einfach fallen zu lassen haette aus jeder alten
 * Mail einen Fehler gemacht. Eine Weiterleitung kostet nichts und darf hier
 * dauerhaft stehen.
 */
export default async function LegacyConnectConversationRedirect({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  redirect(`/messages/${encodeURIComponent(conversationId)}`);
}
