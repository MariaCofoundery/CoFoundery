"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SETUP_COOKIE, isSetupStep } from "@/features/advisor/setup/setupModel";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

async function requireClient() {
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) redirect("/login?next=/advisor/los-gehts");
  return client;
}

/** Einen Schritt ueberspringen - er bleibt in der Liste und laesst sich nachholen. */
export async function skipSetupStepAction(formData: FormData) {
  const client = await requireClient();
  const orgId = String(formData.get("orgId") ?? "");
  const step = formData.get("step");
  if (UUID.test(orgId) && isSetupStep(step)) await client.rpc("set_advisor_setup_state", { p_org_id: orgId, p_skip: step, p_hidden: null });
  revalidatePath("/advisor/dashboard");
  redirect(UUID.test(orgId) ? `/advisor/los-gehts?org=${orgId}` : "/advisor/los-gehts");
}

/** Die Liste auf dem Start ausblenden (oder wieder zeigen). "Los geht's" bleibt ueber das Konto-Menue erreichbar. */
export async function setSetupHiddenAction(formData: FormData) {
  const client = await requireClient();
  const orgId = String(formData.get("orgId") ?? "");
  if (UUID.test(orgId)) await client.rpc("set_advisor_setup_state", { p_org_id: orgId, p_skip: null, p_hidden: formData.get("hidden") === "yes" });
  // "Spaeter" beendet auch die Leiste "Schritt x von y" auf jeder Seite - sonst bliebe sie als Sitzungs-Cookie stehen.
  if (formData.get("hidden") === "yes") (await cookies()).delete(SETUP_COOKIE);
  revalidatePath("/advisor/dashboard");
  redirect(formData.get("hidden") === "yes" ? "/advisor/dashboard" : `/advisor/los-gehts?org=${orgId}`);
}
