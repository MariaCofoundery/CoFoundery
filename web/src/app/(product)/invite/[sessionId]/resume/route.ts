import { NextRequest, NextResponse } from "next/server";
import { buildInvitationStartHref } from "@/features/onboarding/invitationFlow";

type RouteContext = {
  params: Promise<{ sessionId: string }>;
};

/**
 * "Fortsetzen" auf Dashboard und Verbindungen.
 *
 * NUR WEITERLEITEN, NIE ANNEHMEN (Phase 12C.0). Hier stand eine Annahme der
 * Einladung mit dem Service-Role-Key: Ein gewoehnlicher Link-Klick - oder ein
 * Prefetch, eine Link-Vorschau, ein Crawler - machte die Person ohne
 * Entscheidung zum Teammitglied. Ein GET veraendert jetzt nichts mehr.
 *
 * /join/start fuehrt eine offene Einladung in den Beitrittsdialog aus Phase
 * 11.7B ("Team beitreten und teilen" / "Erst beitreten, spaeter entscheiden");
 * eine angenommene in den aktuellen Weg. Die Annahme selbst ist eine
 * ausdrueckliche Schreibaktion (accept_invitation_by_id_with_team_share).
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const { sessionId } = await context.params;
  const invitationId = sessionId.trim();

  if (!invitationId) {
    return NextResponse.redirect(new URL("/dashboard?error=missing_invitation_id", request.url));
  }

  return NextResponse.redirect(new URL(buildInvitationStartHref(invitationId), request.url));
}
