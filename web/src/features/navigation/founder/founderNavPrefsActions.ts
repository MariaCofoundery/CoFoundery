"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { FIXED_FOUNDER_KEYS, FOUNDER_AREA_KEYS, orderedFounderKeys, type FounderAreaKey, type FounderNavPrefs } from "@/features/navigation/founder/founderNav";
import { createClient } from "@/lib/supabase/server";

/**
 * Die eigene Founder-Leiste einrichten (20270402120000): Bereich ausblenden oder zeigen, nach oben oder unten
 * schieben, zuruecksetzen. Jede Handlung liest den Stand, rechnet neu und speichert ihn ueber die Datenbank (die
 * Bereiche und "Start" prueft sie). Rueckweg ist immer die Einstellungsseite.
 */
const BACK = "/me/seitenleiste";

async function context() {
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user?.id) redirect(`/login?next=${encodeURIComponent(BACK)}`);
  const [{ data }, { data: isMember }] = await Promise.all([client.from("founder_nav_prefs").select("hidden, item_order").maybeSingle(), client.rpc("is_network_member")]);
  const prefs: FounderNavPrefs = { hidden: (data?.hidden as string[] | undefined) ?? [], order: (data?.item_order as string[] | undefined) ?? [] };
  // Was es in der Leiste dieser Person gibt - Connect nur mit Connect.
  const available = FOUNDER_AREA_KEYS.filter((key) => key !== "connect" || isMember === true);
  return { client, prefs, available: available as FounderAreaKey[] };
}

async function save(client: Awaited<ReturnType<typeof createClient>>, prefs: FounderNavPrefs) {
  await client.rpc("save_founder_nav_prefs", { p_hidden: prefs.hidden, p_order: prefs.order });
  revalidatePath("/", "layout");
  redirect(BACK);
}

const keyOf = (formData: FormData, available: FounderAreaKey[]) => {
  const key = String(formData.get("key") ?? "");
  return (available as string[]).includes(key) ? (key as FounderAreaKey) : null;
};

export async function toggleFounderNavItemAction(formData: FormData) {
  const { client, prefs, available } = await context();
  const key = keyOf(formData, available);
  if (!key || FIXED_FOUNDER_KEYS.includes(key)) redirect(BACK);
  const hidden = prefs.hidden.includes(key) ? prefs.hidden.filter((entry) => entry !== key) : [...prefs.hidden, key];
  await save(client, { ...prefs, hidden });
}

export async function moveFounderNavItemAction(formData: FormData) {
  const { client, prefs, available } = await context();
  const key = keyOf(formData, available);
  if (!key || FIXED_FOUNDER_KEYS.includes(key)) redirect(BACK);
  const keys = orderedFounderKeys(prefs, available).filter((entry) => !FIXED_FOUNDER_KEYS.includes(entry)) as string[];
  const index = keys.indexOf(key);
  const target = formData.get("dir") === "up" ? index - 1 : index + 1;
  if (index === -1 || target < 0 || target >= keys.length) redirect(BACK);
  [keys[index], keys[target]] = [keys[target], keys[index]];
  await save(client, { ...prefs, order: keys });
}

export async function resetFounderNavPrefsAction() {
  const { client } = await context();
  await save(client, { hidden: [], order: [] });
}
