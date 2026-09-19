"use server";

import { redirect } from "next/navigation";
import { createClient, getRequestUser } from "@/lib/supabase/server";

/**
 * Aus einem angenommenen Intro ein Gespraech machen.
 *
 * In Find gab es genau ZWEI Nachrichten - die Anfrage und die Antwort. Wer sich
 * danach unterhalten wollte, musste die Plattform verlassen. Diese Aktion
 * eroeffnet das Gespraech und schickt direkt hinein.
 *
 * Die Pruefung liegt vollstaendig in `ensure_discovery_intro_conversation`:
 * Sie verlangt ein Intro im Status "accepted" und dass die aufrufende Person
 * eine der beiden Seiten ist. Beide duerfen eroeffnen - wer zuerst schreibt,
 * faengt an. Hier wird nichts davon nachgebaut; eine zweite Kopie derselben
 * Regel liefe irgendwann auseinander.
 */
export async function openDiscoveryIntroConversationAction(introRequestId: string) {
  const {
    data: { user },
  } = await getRequestUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent("/discovery/intros")}`);
  }

  const client = await createClient();
  const { data, error } = await client.rpc("ensure_discovery_intro_conversation", {
    p_intro_request_id: introRequestId,
  });

  if (error || typeof data !== "string" || !data) {
    redirect("/discovery/intros?error=conversation");
  }

  redirect(`/messages/${data}`);
}
