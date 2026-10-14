"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import {
  RESEARCH_CONSENT_COPY_REVISION,
  RESEARCH_CONSENT_SURFACES,
  type ResearchConsentSurface,
} from "@/features/research/consentVersion";
import { getRequestLocale } from "@/i18n/getLocale";
import { createClient } from "@/lib/supabase/server";

/**
 * Speichert eine Entscheidung zur Research-Einwilligung samt Nachweis.
 *
 * Textrevision und Sprache bestimmt der Server, nicht der Aufrufer: Die Sprache
 * ist dieselbe, mit der die Seite gerendert wurde (getRequestLocale, wie in
 * i18n/request.ts), die Revision ist die der ausgelieferten Texte. Den Hash des
 * Wortlauts setzt die Datenbank aus ihrer Referenztabelle.
 */
export async function setResearchConsentAction(state: "accepted" | "declined", surface: ResearchConsentSurface) {
  if (!(RESEARCH_CONSENT_SURFACES as readonly string[]).includes(surface)) {
    return { ok: false as const, error: "update_failed" as const };
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "not_authenticated" as const };
  const locale = await getRequestLocale();
  const { error } = await (supabase as unknown as SupabaseClient).rpc("set_my_research_consent", {
    p_state: state,
    p_copy_revision: RESEARCH_CONSENT_COPY_REVISION,
    p_locale: locale,
    p_surface: surface,
  });
  if (error) return { ok: false as const, error: "update_failed" as const };
  revalidatePath("/", "layout");
  revalidatePath("/dashboard");
  return { ok: true as const, state };
}
