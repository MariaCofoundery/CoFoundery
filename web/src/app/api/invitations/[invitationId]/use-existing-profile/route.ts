import { NextRequest, NextResponse } from "next/server";
import { applyExistingInvitationProfileChoice } from "@/features/reporting/actions";

type RouteContext = {
  params: Promise<{
    invitationId: string;
  }>;
};

export async function POST(_request: NextRequest, context: RouteContext) {
  const { invitationId: rawInvitationId } = await context.params;
  const invitationId = rawInvitationId?.trim() ?? "";
  if (!invitationId) {
    return NextResponse.json({ ok: false, reason: "invitation_not_found" }, { status: 400 });
  }

  const result = await applyExistingInvitationProfileChoice(invitationId);
  if (!result.ok) {
    console.error("use-existing-profile failed", {
      invitationId,
      reason: result.reason,
      detail: result.detail ?? null,
    });
    const status = result.reason === "not_authenticated" ? 401 : 409;
    return NextResponse.json(result, { status });
  }

  return NextResponse.json(
    {
      ...result,
      redirect_to: `/dashboard?invite=accepted&invitationId=${encodeURIComponent(invitationId)}`,
    },
    { status: 200 }
  );
}
