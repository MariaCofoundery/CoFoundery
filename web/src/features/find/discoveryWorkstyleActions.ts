"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, getRequestUser } from "@/lib/supabase/server";
export async function saveDiscoveryWorkstyleConsent(form: FormData) {
  const { data: { user } } = await getRequestUser();
  if (!user) redirect("/login?next=%2Fdiscovery%2Fsuche");
  if (!['enable', 'disable'].includes(String(form.get('decision')))) redirect('/discovery/suche?workstyle=error#workstyle');
  const { error } = await (await createClient()).rpc("set_discovery_workstyle_consent", { p_enabled: form.get("decision") === "enable" });
  revalidatePath("/discovery", "layout");
  redirect(`/discovery/suche?workstyle=${error ? "error" : "saved"}#workstyle`);
}
