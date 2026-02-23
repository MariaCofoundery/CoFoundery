import { NextRequest, NextResponse } from "next/server";
import { finalizeInvitationIfReady } from "@/features/reporting/actions";

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

  const result = await finalizeInvitationIfReady(invitationId);
  if (result.ok) {
    return NextResponse.json(result, { status: 200 });
  }

  console.error("ensure-report-run finalize failed", {
    invitationId,
    reason: result.reason,
    detail: result.detail ?? null,
  });

  return NextResponse.json(result, { status: 202 });
}
