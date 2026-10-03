"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
export async function setConnectParticipationAction(form: FormData) {
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) redirect("/login?next=/account");
  const active = form.get("active") === "true";
  if (form.get("confirm") !== "on") redirect("/account?connectError=1");
  const { error } = await client.rpc("set_connect_participation", {
    p_active: active,
    p_confirm: true,
  });
  if (error) redirect("/account?connectError=1");
  revalidatePath("/", "layout");
  revalidatePath("/sitemap.xml");
  redirect(active ? "/connect/profile?returned=1" : "/account");
}
