import { NextRequest, NextResponse } from "next/server";
import { trackServerResearchEvent, type ServerResearchTrackPayload } from "@/features/research/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  let body: Omit<ServerResearchTrackPayload, "userId">;
  try {
    body = await request.json() as Omit<ServerResearchTrackPayload, "userId">;
  } catch {
    return NextResponse.json({ ok: false, reason: "invalid_json" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id) {
    return NextResponse.json({ ok: false, reason: "not_authenticated" }, { status: 401 });
  }

  const result = await trackServerResearchEvent({ ...body, userId: user.id });
  if (!result.productAnalyticsStored) {
    return NextResponse.json(
      { ok: false, reason: result.reason ?? "tracking_unavailable" },
      { status: result.reason === "invalid_event" ? 400 : 503 }
    );
  }

  return NextResponse.json({ ok: true, researchStored: result.researchStored }, { status: 200 });
}
