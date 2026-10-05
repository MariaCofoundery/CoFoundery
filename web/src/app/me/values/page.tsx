import { redirect } from "next/navigation";
import { currentPathForLegacyQuestionnaire } from "@/features/instruments/workstyle/current";

/**
 * Phase 10 - Cutover (REDIRECT_TO_CURRENT): Der fruehere Werte-Fragebogen ist
 * kein aktiver Weg mehr - kein neuer Entwurf beim Oeffnen. Frueher abgegebene
 * Antworten bleiben unangetastet und datiert unter /me/profile lesbar.
 */
export default async function MeValuesPage({
  searchParams,
}: {
  searchParams: Promise<{ invitationId?: string }>;
}) {
  const params = await searchParams;
  redirect(currentPathForLegacyQuestionnaire(params.invitationId));
}
