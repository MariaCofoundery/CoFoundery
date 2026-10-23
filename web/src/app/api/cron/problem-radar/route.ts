import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";

import { withCollectorDb } from "@/features/problem-radar/collector/pgCollectorDb";
import { runRadarCollection } from "@/features/problem-radar/collector/runCollection";
import { sendCronFailureAlert } from "@/features/privacy/sendCronFailureAlert";

/**
 * Der Wochenlauf des Problem-Radars.
 *
 * Aufgerufen von Vercel Cron mit `Authorization: Bearer $CRON_SECRET`, dasselbe
 * Muster wie `connect-suggestions`. Ohne Geheimnis 503, mit falschem 401.
 *
 * Der Lauf sammelt nur Kandidaten (Adresse, Titel, Datum eines oeffentlichen
 * Beitrags) fuer die Quellen, die im Adminbereich freigegeben UND eingeschaltet
 * sind. Er laeuft unter der Datenbankrolle `radar_collector`, nicht unter dem
 * Service-Role-Schluessel. Die Antwort nennt nur Zahlen.
 *
 * Eine Quelle laeuft hoechstens alle sechs Tage erfolgreich; ein zweiter
 * Aufruf in derselben Woche macht nichts.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const WEEK_GAP_SECONDS = 6 * 24 * 3600;

function authorized(header: string | null, secret: string) {
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(header?.trim() ?? "");
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim() ?? "";
  if (!secret) return NextResponse.json({ ok: false, reason: "cron_secret_not_configured" }, { status: 503 });
  if (!authorized(request.headers.get("authorization"), secret)) {
    return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
  }
  try {
    const result = await withCollectorDb((db) => runRadarCollection({ db, minGapSeconds: WEEK_GAP_SECONDS }));
    if (result === "not_configured") {
      return NextResponse.json({ ok: false, reason: "collector_database_not_configured" }, { status: 503 });
    }
    return NextResponse.json({ ok: true, ...result });
  } catch {
    const body = { ok: false, reason: "collection_failed" };
    await sendCronFailureAlert("problem-radar", 500, body);
    return NextResponse.json(body, { status: 500 });
  }
}
