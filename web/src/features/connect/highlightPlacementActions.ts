"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requirePlatformAdmin } from "@/features/moderation/access";
import {
  isPlacementSource,
  parsePlacementTarget,
  placementEndFromDate,
} from "@/features/connect/highlightPlacementModel";

const PAGE = "/admin/highlights";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function saveHighlightPlacementAction(formData: FormData) {
  const client = await requirePlatformAdmin();
  const source = formData.get("source");
  const target = parsePlacementTarget(formData.get("link"));
  const end = placementEndFromDate(formData.get("ends_on"));
  const rawNote = formData.get("note");
  const note = typeof rawNote === "string" ? rawNote.trim() : "";
  if (!isPlacementSource(source) || !target || !end || note.length > 240) redirect(`${PAGE}?result=invalid`);

  const { error } = await client.rpc("admin_save_connect_highlight_placement", {
    p_source: source,
    p_kind: target.kind,
    p_target_id: target.id,
    // Der Satz "Warum wir es empfehlen" gehoert nur zu einer Empfehlung. Bei
    // einer Anzeige waere er Werbetext in unserem Namen.
    p_note: source === "editorial" ? note || null : null,
    p_starts_at: null,
    p_ends_at: end.toISOString(),
    // Anpinnen gilt nur fuer eine Empfehlung, nie fuer eine Anzeige (Reihenfolge ist keine Rangfolge).
    p_pinned: source === "editorial" && formData.get("pinned") === "yes",
  });
  if (error) redirect(`${PAGE}?result=${error.code === "P0002" ? "notfound" : "error"}`);
  revalidatePath(PAGE);
  revalidatePath("/connect");
  redirect(`${PAGE}?result=saved`);
}

export async function deleteHighlightPlacementAction(formData: FormData) {
  const client = await requirePlatformAdmin();
  const id = formData.get("id");
  if (typeof id !== "string" || !UUID.test(id)) redirect(`${PAGE}?result=invalid`);
  const { error } = await client.rpc("admin_delete_connect_highlight_placement", { p_id: id });
  if (error) redirect(`${PAGE}?result=error`);
  revalidatePath(PAGE);
  revalidatePath("/connect");
  redirect(`${PAGE}?result=deleted`);
}
