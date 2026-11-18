"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isDeliveryMode } from "@/features/notifications/deliveryRhythm";
import { createClient } from "@/lib/supabase/server";

/**
 * Den Rhythmus der Benachrichtigungen speichern (20270510120000). Der Rueckweg
 * ist fest: das Konto, nie eine uebergebene Adresse.
 */
export async function saveDeliveryRhythmAction(formData: FormData) {
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) redirect("/login?next=/account");

  const mode = formData.get("mode");
  if (!isDeliveryMode(mode)) redirect("/account?delivery=invalid#rhythmus");

  const { error } = await client.rpc("save_my_notification_delivery", {
    p_mode: mode,
    p_badge: formData.get("badge") === "yes",
  });
  revalidatePath("/account");
  revalidatePath("/", "layout");
  redirect(`/account?delivery=${error ? "invalid" : "saved"}#rhythmus`);
}
