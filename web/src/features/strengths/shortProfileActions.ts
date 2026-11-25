"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const PATH = "/profile/kurzprofil";
const TAGLINE_MAX = 140;
const FREE_TEXT_MAX = 200;
const QUOTE_MAX = 200;
const STRENGTHS_MAX = 5;

const clean = (value: FormDataEntryValue | null, max: number) => {
  const text = String(value ?? "").replace(/\s+/g, " ").trim().slice(0, max);
  return text || null;
};

/**
 * Das Ich-Kurzprofil speichern.
 *
 * DIE STÄRKEN KOMMEN AUS DER EIGENEN TABELLE, nicht aus dem Formular: Es werden nur die Ids der eigenen Stärken
 * entgegengenommen (die Zeilensicherheit zeigt nur eigene), Bezeichnung und Thema liest der Server selbst nach. Ein Zitat
 * ist freiwillig und wird von der Person selbst eingetragen.
 *
 * TEILEN IST EINE EIGENE ZUSTIMMUNG: `shared_in_network` kommt ausschließlich vom Schalter dieses Formulars - nie aus
 * einer anderen Freigabe, und keine andere Freigabe wird hier berührt.
 */
export async function saveShortProfileAction(formData: FormData) {
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user?.id) redirect(`/login?next=${encodeURIComponent(PATH)}`);

  const ids = [...new Set(formData.getAll("strength").map(String))].slice(0, STRENGTHS_MAX);
  const { data: own } = ids.length
    ? await client.from("person_strengths").select("id, label, statement, theme").in("id", ids)
    : { data: [] as { id: string; label: string | null; statement: string; theme: string | null }[] };
  const byId = new Map((own ?? []).map((row) => [row.id as string, row]));
  const strengths = ids.flatMap((id) => {
    const row = byId.get(id);
    if (!row) return [];
    return [{ theme: row.theme ?? null, label: (row.label ?? row.statement).slice(0, 60), quote: clean(formData.get(`quote_${id}`), QUOTE_MAX) }];
  });

  const { error } = await client.from("person_short_profiles").upsert(
    {
      user_id: user.id,
      tagline: clean(formData.get("tagline"), TAGLINE_MAX),
      strengths,
      seeks: clean(formData.get("seeks"), FREE_TEXT_MAX),
      offers: clean(formData.get("offers"), FREE_TEXT_MAX),
      shared_in_network: formData.get("shared") === "yes",
    },
    { onConflict: "user_id" },
  );
  revalidatePath(PATH);
  revalidatePath(`/connect/people/${user.id}`);
  redirect(error ? `${PATH}?error=save` : `${PATH}?saved=1`);
}
