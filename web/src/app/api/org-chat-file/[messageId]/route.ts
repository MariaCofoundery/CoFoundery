import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ORG_CHAT_BUCKET, orgChatStorageClient } from "@/features/advisor/orgChatStorage";

export const dynamic = "force-dynamic";

/**
 * Ein Anhang aus dem Teamraum-Chat. Wer die Nachricht lesen darf, entscheidet die Zeilensicherheit: Gibt
 * die normale Abfrage sie nicht heraus, gibt es 404. Dann eine Minute gueltige Weiterleitung auf die Datei.
 * Bilder werden angezeigt, alles andere heruntergeladen.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ messageId: string }> }) {
  const { messageId } = await params;
  if (!/^[0-9a-f-]{36}$/.test(messageId)) return new NextResponse("Not found", { status: 404 });
  const client = await createClient();
  // Diese Route laeuft nicht durch die Middleware (src/middleware.ts) - sie prueft Anmeldung und Freigabe selbst.
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401, headers: { "Cache-Control": "no-store" } });
  const { data } = await client
    .from("advisor_org_chat_messages")
    .select("attachment_path, attachment_name, attachment_type")
    .eq("id", messageId)
    .is("retracted_at", null)
    .maybeSingle();
  const row = data as { attachment_path: string | null; attachment_name: string | null; attachment_type: string | null } | null;
  if (!row?.attachment_path) return new NextResponse("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
  // Doppelt haelt besser: die Zeilensicherheit hat die Nachricht herausgegeben, die Freigabe fragt den Chat.
  const chatId = row.attachment_path.split("/")[2] ?? "";
  const { data: allowed } = await client.rpc("can_read_org_chat", { p_chat_id: chatId });
  if (allowed !== true) return new NextResponse("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
  const storage = orgChatStorageClient();
  if (!storage) return new NextResponse("Unavailable", { status: 503 });
  const isImage = (row.attachment_type ?? "").startsWith("image/");
  const { data: signed } = await storage.storage
    .from(ORG_CHAT_BUCKET)
    .createSignedUrl(row.attachment_path, 60, isImage ? undefined : { download: row.attachment_name ?? true });
  if (!signed?.signedUrl) return new NextResponse("Not found", { status: 404 });
  return NextResponse.redirect(signed.signedUrl, { status: 302, headers: { "Cache-Control": "private, no-store" } });
}
