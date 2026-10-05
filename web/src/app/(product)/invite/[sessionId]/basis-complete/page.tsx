import { redirect } from "next/navigation";
import { currentPathForLegacyQuestionnaire } from "@/features/instruments/workstyle/current";

/**
 * Phase 10 - Cutover (REDIRECT_TO_CURRENT): Zwischenseite zwischen Basis- und
 * Werte-Fragebogen der frueheren Fassung. Weiter in den aktuellen
 * Einladungsweg ueber /join/start.
 */
export default async function InvitationBasisCompletePage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  redirect(sessionId.trim() ? currentPathForLegacyQuestionnaire(sessionId) : "/dashboard");
}
