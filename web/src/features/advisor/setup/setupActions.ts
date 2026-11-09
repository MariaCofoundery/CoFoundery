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
  const failed = UUID.test(orgId) && isSetupStep(step) ? Boolean((await client.rpc("set_advisor_setup_state", { p_org_id: orgId, p_skip: step, p_hidden: null })).error) : false;
  revalidatePath("/advisor/dashboard");
  redirect(UUID.test(orgId) ? `/advisor/los-gehts?org=${orgId}${failed ? "&fehler=1" : ""}` : "/advisor/los-gehts");
}

/** Die Liste auf dem Start ausblenden (oder wieder zeigen). "Los geht's" bleibt ueber das Konto-Menue erreichbar. */
export async function setSetupHiddenAction(formData: FormData) {
  const client = await requireClient();
  const orgId = String(formData.get("orgId") ?? "");
  const failed = UUID.test(orgId) ? Boolean((await client.rpc("set_advisor_setup_state", { p_org_id: orgId, p_skip: null, p_hidden: formData.get("hidden") === "yes" })).error) : false;
  // "Spaeter" beendet auch die Leiste "Schritt x von y" auf jeder Seite - sonst bliebe sie als Sitzungs-Cookie stehen.
  if (formData.get("hidden") === "yes") (await cookies()).delete(SETUP_COOKIE);
  revalidatePath("/advisor/dashboard");
  redirect(formData.get("hidden") === "yes" && !failed ? "/advisor/dashboard" : `/advisor/los-gehts?org=${orgId}${failed ? "&fehler=1" : ""}`);
}
