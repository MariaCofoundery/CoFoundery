import { NextRequest, NextResponse } from "next/server";
import {
  buildInvitationDashboardHref,
  buildInvitationQuestionnaireHref,
} from "@/features/onboarding/invitationFlow";
import { getInvitationJoinDecision } from "@/features/reporting/actions";

type RouteContext = {
  params: Promise<{
    invitationId: string;
  }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const { invitationId: rawInvitationId } = await context.params;
  const invitationId = rawInvitationId?.trim() ?? "";
  if (!invitationId) {
    return NextResponse.json({ ok: false, reason: "invitation_not_found" }, { status: 400 });
  }

  const decision = await getInvitationJoinDecision(invitationId);
  if (!decision.ok) {
    const status =
      decision.reason === "not_authenticated"
        ? 401
        : decision.reason === "not_invitee"
          ? 403
          : decision.reason === "invitation_not_found"
            ? 404
            : 409;
    return NextResponse.json(decision, { status });
  }

  const orderedRequired = decision.required_modules.includes("base")
    ? (["base", ...decision.required_modules.filter((moduleKey) => moduleKey !== "base")] as Array<
        "base" | "values"
      >)
    : (decision.required_modules as Array<"base" | "values">);
  const firstMissing = decision.missing_modules[0] ?? null;
  const firstRefreshModule = orderedRequired[0] ?? "base";

  return NextResponse.json(
    {
      ...decision,
      dashboard_url: buildInvitationDashboardHref(invitationId),
      needs_questionnaire_url: firstMissing
        ? buildInvitationQuestionnaireHref(invitationId, firstMissing)
        : null,
      refresh_start_url: buildInvitationQuestionnaireHref(invitationId, firstRefreshModule, {
        flow: "refresh",
      }),
    },
    { status: 200 }
  );
}
