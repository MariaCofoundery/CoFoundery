"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NAV_ITEM_KEYS, buildWorkspaceNav, orderedGroups, FIXED_NAV_KEYS, type NavPrefs } from "@/features/navigation/workspace/workspaceNav";

/**
 * Die eigene Seitenleiste einrichten (20270331120000): Station ausblenden oder zeigen, nach oben oder unten schieben,
 * zuruecksetzen. Jede Handlung liest den Stand, rechnet neu und speichert ihn ueber die Datenbank (die Stationen und
 * "Heute"/"Einrichten" prueft sie). Rueckweg: die Einstellungsseite oder der Schritt im Onboarding.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

async function context(formData: FormData) {
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  const orgId = String(formData.get("orgId") ?? "");
  const back = formData.get("back") === "setup" && UUID.test(orgId) ? `/advisor/los-gehts?org=${orgId}&schritt=sidebar` : "/advisor/seitenleiste";
  if (!user?.id) redirect(`/login?next=${encodeURIComponent(back)}`);
  const { data } = await client.from("advisor_nav_prefs").select("hidden, item_order").maybeSingle();
  const prefs: NavPrefs = { hidden: (data?.hidden as string[] | undefined) ?? [], order: (data?.item_order as string[] | undefined) ?? [] };
  return { client, prefs, back, hasOrg: formData.get("hasOrg") === "1" };
}

async function save(client: Awaited<ReturnType<typeof createClient>>, prefs: NavPrefs, back: string) {
  const { error } = await client.rpc("save_advisor_nav_prefs", { p_hidden: prefs.hidden, p_order: prefs.order });
  revalidatePath("/", "layout");
  // Ein Fehler wird gesagt (fehler=1), nicht verschluckt: sonst sieht es aus, als waere die Einstellung gespeichert.
  redirect(error ? `${back}${back.includes("?") ? "&" : "?"}fehler=1` : back);
}

const keyOf = (formData: FormData) => {
  const key = String(formData.get("key") ?? "");
  return (NAV_ITEM_KEYS as string[]).includes(key) ? key : null;
};

export async function toggleNavItemAction(formData: FormData) {
  const { client, prefs, back } = await context(formData);
  const key = keyOf(formData);
  if (!key || (FIXED_NAV_KEYS as string[]).includes(key)) redirect(back);
  const hidden = prefs.hidden.includes(key) ? prefs.hidden.filter((entry) => entry !== key) : [...prefs.hidden, key];
  await save(client, { ...prefs, hidden }, back);
}

export async function moveNavItemAction(formData: FormData) {
  const { client, prefs, back, hasOrg } = await context(formData);
  const key = keyOf(formData);
  if (!key) redirect(back);
  const groups = orderedGroups(buildWorkspaceNav({ hasOrg }), prefs);
  const group = groups.find((entry) => entry.items.some((item) => item.key === key));
  if (!group) redirect(back);
  const keys = group.items.map((item) => item.key as string);
  const index = keys.indexOf(key);
  const target = formData.get("dir") === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= keys.length) redirect(back);
  [keys[index], keys[target]] = [keys[target], keys[index]];
  const order = groups.flatMap((entry) => (entry === group ? keys : entry.items.map((item) => item.key as string)));
  await save(client, { ...prefs, order }, back);
}

export async function resetNavPrefsAction(formData: FormData) {
  const { client, back } = await context(formData);
  await save(client, { hidden: [], order: [] }, back);
}
