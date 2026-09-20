"use server";

import { revalidatePath } from "next/cache";
import { createClient, getRequestUser } from "@/lib/supabase/server";

/**
 * Weggeklickt heisst geloescht.
 *
 * Es gibt keine Spalte "gelesen": Wer den Hinweis nicht mehr braucht, soll
 * nicht eine Markierung zu einer Zeile bekommen, die ueber das Weggehen eines
 * Menschen Buch fuehrt - die Zeile selbst geht weg.
 *
 * Die Zeilensicherheit laesst nur die eigenen zu; der Aufruf kann also keine
 * fremde treffen, auch nicht mit einer geratenen Kennung.
 */
export async function dismissAccountDeletionNoticeAction(noticeId: string): Promise<void> {
  const {
    data: { user },
  } = await getRequestUser();
  if (!user) return;

  const supabase = await createClient();
  // Ohne Rueckgabe: Das hier ist eine Formular-Aktion, und die gibt nichts
  // zurueck. Geht es schief, steht der Hinweis nach dem Neuladen wieder da -
  // das ist die ehrlichste Rueckmeldung, die es fuer "weggeklickt" gibt.
  await supabase.from("account_deletion_notices").delete().eq("id", noticeId);

  revalidatePath("/connections");
  revalidatePath("/advisor/dashboard");
}
