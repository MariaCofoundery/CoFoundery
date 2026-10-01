"use server";

import { revalidatePath } from "next/cache";

import { isMarkableStep } from "@/features/profile/aboutYou";
import { createClient, getRequestUser } from "@/lib/supabase/server";

/**
 * „Damit bin ich für jetzt durch." — setzen und zurücknehmen.
 *
 * ZWEI AKTIONEN UND KEIN UMSCHALTER. Ein Umschalter, der aus dem aktuellen
 * Zustand den nächsten errechnet, trifft bei zwei schnellen Klicks oder
 * einem erneut abgeschickten Formular die falsche Entscheidung. Hier sagt
 * jedes Formular, was es will.
 *
 * NUR DIE DREI BEKANNTEN BEREICHE. `section` ist in der Datenbank freier
 * Text, damit die Kennungen dort stehen können, wo die Oberfläche steht - das
 * heißt aber nicht, dass ein abgeschicktes Formular bestimmen darf, was eine
 * gültige Kennung ist. Was `isMarkableStep` nicht kennt, wird verworfen.
 *
 * KEIN FEHLER NACH AUSSEN. Eine Markierung ist eine Notiz an sich selbst;
 * scheitert sie, steht der Bereich eben weiter auf „begonnen". Dafür eine
 * Fehlermeldung über die halbe Seite zu legen, wäre unverhältnismäßig.
 */

async function kontext() {
  const {
    data: { user },
  } = await getRequestUser();
  if (!user) return null;
  return { user, client: await createClient() };
}

export async function markSectionDoneAction(formData: FormData): Promise<void> {
  const section = String(formData.get("section") ?? "");
  if (!isMarkableStep(section)) return;

  const ctx = await kontext();
  if (!ctx) return;

  // `do nothing` statt `do update`: Eine vorhandene Zeile sagt bereits, was
  // eine zweite sagen würde - und die Zeilensicherheit kennt bewusst kein
  // UPDATE (siehe Migration 20261094120000).
  await ctx.client
    .from("person_section_marks")
    .upsert({ user_id: ctx.user.id, section }, { onConflict: "user_id,section", ignoreDuplicates: true });

  revalidatePath("/profile");
}

export async function unmarkSectionAction(formData: FormData): Promise<void> {
  const section = String(formData.get("section") ?? "");
  if (!isMarkableStep(section)) return;

  const ctx = await kontext();
  if (!ctx) return;

  await ctx.client
    .from("person_section_marks")
    .delete()
    .eq("user_id", ctx.user.id)
    .eq("section", section);

  revalidatePath("/profile");
}
