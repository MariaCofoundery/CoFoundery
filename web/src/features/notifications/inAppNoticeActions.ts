"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Einen Hinweis erledigen.
 *
 * DAS LESEN GESCHIEHT BEIM HINGEHEN, nicht beim Ansehen der Liste. Wer die
 * Liste oeffnet, hat noch nichts getan - die Uebergabe wartet weiter. Erst der
 * Schritt dorthin (oder das ausdrueckliche "erledigt") nimmt sie weg.
 *
 * DER PFAD KOMMT AUS DER DATENBANK, nicht aus dem Formular. Ein Formularfeld
 * mit dem Ziel waere eine Weiterleitung, die der Absender bestimmt. Hier wird
 * nur die Kennung geschickt; wohin es geht, sagt die eigene Zeile - und die
 * darf laut Tabelle nur einen Pfad in diesem Produkt enthalten.
 *
 * Nur `read_at` ist ueberhaupt aenderbar: Die Spaltenrechte in der Migration
 * 20261033120000 geben angemeldeten Nutzern nichts anderes.
 */

async function markRead(noticeId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(noticeId)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("in_app_notices")
    .update({ read_at: new Date().toISOString() })
    .eq("id", noticeId)
    .is("read_at", null)
    .select("path")
    .maybeSingle();
  if (error) return null;
  // Schon gelesen: Die Zeile gehoert mir, also darf ich trotzdem hingehen.
  if (!data) {
    const { data: existing } = await supabase
      .from("in_app_notices")
      .select("path")
      .eq("id", noticeId)
      .maybeSingle();
    return (existing?.path as string | undefined) ?? null;
  }
  return data.path as string;
}

export async function openInAppNoticeAction(formData: FormData) {
  const path = await markRead(String(formData.get("noticeId") ?? ""));
  revalidatePath("/messages");
  // Kein Ziel gefunden? Dann bleibt man im Postfach - lieber nichts als
  // irgendwohin.
  redirect(path ?? "/messages");
}

export async function dismissInAppNoticeAction(formData: FormData) {
  await markRead(String(formData.get("noticeId") ?? ""));
  revalidatePath("/messages");
}
