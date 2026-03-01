import { NextRequest, NextResponse } from "next/server";
import { backfillReportRunsForAcceptedInvitations } from "@/features/reporting/actions";

type BackfillRequestBody = {
  limit?: unknown;
  maxDurationMs?: unknown;
};

function parseLimit(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 50;
  return Math.max(1, Math.min(Math.trunc(parsed), 500));
}

function parseMaxDurationMs(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 20_000;
  return Math.max(5_000, Math.min(Math.trunc(parsed), 120_000));
}

function getMaintenanceKeyFromRequest(request: NextRequest) {
  const headerValue = request.headers.get("x-maintenance-key");
  if (!headerValue) return "";
  return headerValue.trim();
}

export async function POST(request: NextRequest) {
  const configuredKey = process.env.MAINTENANCE_API_KEY?.trim() ?? "";
  if (!configuredKey) {
    return NextResponse.json(
      { ok: false, reason: "maintenance_key_not_configured" },
      { status: 503 }
    );
  }

  const providedKey = getMaintenanceKeyFromRequest(request);
  if (!providedKey || providedKey !== configuredKey) {
    return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
  }

  let limit = 50;
  let maxDurationMs = 20_000;
  try {
    const body = (await request.json()) as BackfillRequestBody;
    limit = parseLimit(body?.limit);
    maxDurationMs = parseMaxDurationMs(body?.maxDurationMs);
  } catch {
    // Allow empty body and use default limit.
  }

  const result = await backfillReportRunsForAcceptedInvitations({ limit, maxDurationMs });
  const status = result.ok ? 200 : result.reason === "missing_service_role" ? 503 : 500;
  return NextResponse.json(
    {
      ...result,
      requestedLimit: limit,
      requestedMaxDurationMs: maxDurationMs,
      executedAt: new Date().toISOString(),
    },
    { status }
  );
}
