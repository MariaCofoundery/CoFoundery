import { NextRequest, NextResponse } from "next/server";

import { handlePrivacyRetentionCron, privilegedRetentionClient } from "@/features/privacy/retentionCleanup";
import { sendCronFailureAlert } from "@/features/privacy/sendCronFailureAlert";

/**
 * Der tägliche Löschlauf (siehe `features/privacy/retentionCleanup.ts`).
 *
 * AUFGERUFEN VON VERCEL CRON (siehe `vercel.json`), das dabei
 * `Authorization: Bearer $CRON_SECRET` mitschickt - dasselbe Muster wie
 * `connect-suggestions`. Ohne gesetztes `CRON_SECRET` antwortet die Route 503
 * und löscht nichts; mit falschem Geheimnis 401.
 *
 * WARUM GET: Vercel Cron ruft per GET auf. Ein zweiter Aufruf ist harmlos -
 * die SQL-Funktionen löschen nur, was die Zeitbedingung erfüllt.
 *
 * DIE ANTWORT NENNT NUR ZAHLEN, nie IDs oder Inhalte.
 *
 * BEI FEHLSCHLAG GEHT EINE MAIL RAUS (`sendCronFailureAlert`), nur bei echtem Aufruf.
 */
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const outcome = await handlePrivacyRetentionCron({
    authorization: request.headers.get("authorization"),
    secret: process.env.CRON_SECRET,
    createClient: privilegedRetentionClient,
  });
  await sendCronFailureAlert("privacy-retention", outcome.status, outcome.body);
  return NextResponse.json(outcome.body, { status: outcome.status });
}
