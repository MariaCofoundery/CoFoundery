import { createClient } from "@supabase/supabase-js";
import { randomUUID, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { parseDraftObject } from "@/features/newsletter/newsletterDraftImport";
import { issueToPayload } from "@/features/newsletter/newsletterModel";

/**
 * Automatisch vorbereitete Newsletter-Entwuerfe entgegennehmen.
 *
 * Aufgerufen vom zeitgesteuerten Lauf (Claude mit Recherche) mit `Authorization: Bearer $NEWSLETTER_DRAFT_TOKEN`. Ohne gesetzten Schluessel
 * (mindestens 32 Zeichen) antwortet die Route 503. Sie legt ENTWUERFE an, mehr nicht: kein Einplanen, kein Senden, kein Lesen. Der Text geht
 * durch dieselbe Bereinigung wie im Editor; die Antwort nennt nur Zahlen. Pro Tag gelten hoechstens neun automatische Entwuerfe (Datenbank).
 */
export const dynamic = "force-dynamic";

const MAX_BODY = 300_000;

function tokenMatches(header: string | null, secret: string) {
  const given = Buffer.from((header ?? "").replace(/^Bearer\s+/i, ""));
  const wanted = Buffer.from(secret);
  return given.length === wanted.length && timingSafeEqual(given, wanted);
}

export async function POST(request: NextRequest) {
  const secret = process.env.NEWSLETTER_DRAFT_TOKEN?.trim() ?? "";
  if (secret.length < 32) return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  if (!tokenMatches(request.headers.get("authorization"), secret)) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const raw = await request.text();
  if (raw.length > MAX_BODY) return NextResponse.json({ ok: false, error: "too_big" }, { status: 413 });
  let body: unknown;
  try { body = JSON.parse(raw); } catch { return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 }); }
  const list = (body as { drafts?: unknown })?.drafts;
  if (!Array.isArray(list) || list.length < 1 || list.length > 3) return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });

  const prepared = [];
  for (const [index, entry] of list.entries()) {
    const e = (entry ?? {}) as { variant?: unknown; notes?: unknown; draft?: unknown };
    const parsed = parseDraftObject(e.draft, { look: "light" });
    if (!parsed.ok) return NextResponse.json({ ok: false, error: parsed.error, index }, { status: 400 });
    prepared.push({ payload: issueToPayload(parsed.issue), variant: typeof e.variant === "string" ? e.variant.slice(0, 40) : "", notes: typeof e.notes === "string" ? e.notes.slice(0, 4000) : "" });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  const client = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  const batch = randomUUID();
  let created = 0;
  for (const item of prepared) {
    const { error } = await client.rpc("service_create_newsletter_draft", { p: item.payload, p_variant: item.variant, p_batch: batch, p_notes: item.notes });
    if (error) return NextResponse.json({ ok: false, error: error.message.includes("newsletter_auto_limit") ? "limit" : "save", created }, { status: error.message.includes("newsletter_auto_limit") ? 429 : 500 });
    created += 1;
  }
  return NextResponse.json({ ok: true, created });
}
