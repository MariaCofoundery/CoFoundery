import { redirect } from "next/navigation";
import { getRequestUser } from "@/lib/supabase/server";

/**
 * "Wonach du suchst" zur archivierten Fassung v2.1.
 *
 * Phase 10 - Cutover (REDIRECT_TO_CURRENT): Die Suchthemen pflegt man im
 * aktuellen Weg unter /founder-alignment/suche. Bereits gespeicherte Themen
 * bleiben unangetastet. Kein Formular der Testfassung mehr, das schreibt.
 */
export default async function DiscoveryTopicsPage() {
  const { data: auth } = await getRequestUser();
  if (!auth?.user?.id) {
    redirect(`/login?next=${encodeURIComponent("/founder-alignment/suche")}`);
  }
  redirect("/founder-alignment/suche");
}
