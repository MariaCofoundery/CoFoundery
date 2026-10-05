import { redirect } from "next/navigation";
import { currentPathForLegacyQuestionnaire } from "@/features/instruments/workstyle/current";

/**
 * Phase 10 - Cutover (REDIRECT_TO_CURRENT): Der fruehere Basis-Fragebogen
 * (founder-compatibility-v1) ist kein aktiver Weg mehr. Diese Seite legte beim
 * Oeffnen einen Entwurf und ggf. eine Matching-Bindung an - das passiert nicht
 * mehr. Frueher abgegebene Antworten bleiben unangetastet und datiert unter
 * /me/profile lesbar. Die Fragebogen-Bausteine selbst werden spaeter bereinigt.
 */
export default async function MeBasePage({
  searchParams,
}: {
  searchParams: Promise<{ invitationId?: string }>;
}) {
  const params = await searchParams;
  redirect(currentPathForLegacyQuestionnaire(params.invitationId));
}
