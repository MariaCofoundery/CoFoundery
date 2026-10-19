"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

/**
 * Werte & Zielkonflikte: den eigenen Durchlauf fuer den Teamvergleich freigeben - oder zuruecknehmen.
 *
 * AUSDRUECKLICH, NIE NEBENBEI. Die Abgabe teilt nichts. Diese Aktion laeuft nur,
 * wenn die Person den Knopf auf der Seite drueckt; es gibt keinen Vorgabewert
 * und keinen zweiten Weg.
 *
 * DIE DATENBANK ENTSCHEIDET. `set_tradeoffs_team_share` prueft Eigentum,
 * Abgabe, Instrument und Mitgliedschaft (und lehnt einen Entwurf, einen fremden
 * oder einen aelteren Durchlauf ab). Hier wird nur die Rueckmeldung gebaut. Die
 * Aktion ruft genau diese eine RPC - sonst nichts, auch keine Freigabe von
 * Arbeitsprofil, Faehigkeiten oder Advisors.
 */
const PAGE = "/founder-alignment/vorhaben/zielkonflikte";

function reasonOf(error: { code?: string; message?: string } | null): string {
  switch (error?.code) {
    case "42501":
      return "no_permission";
    case "23514":
      return error?.message?.includes("share_requires_submission") ? "not_submitted" : "share_rejected";
    default:
      return "share_failed";
  }
}

export async function setTradeoffsShare(formData: FormData) {
  const ventureId = String(formData.get("ventureId") ?? "");
  const assessmentId = String(formData.get("assessmentId") ?? "");
  const choice = String(formData.get("shared") ?? "");
  const back = `${PAGE}?venture=${encodeURIComponent(ventureId)}`;

  // Nur eine ausdrueckliche Wahl zaehlt - alles andere aendert nichts.
  if (!ventureId || !assessmentId || (choice !== "true" && choice !== "false")) redirect(back);

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth?.user?.id) redirect(back);

  const { error } = await supabase.rpc("set_tradeoffs_team_share", {
    p_assessment_id: assessmentId,
    p_shared: choice === "true",
  });
  if (error) redirect(`${back}&error=${reasonOf(error)}`);

  revalidatePath(PAGE);
  revalidatePath(`/teams/${ventureId}`);
  revalidatePath(`/teams/${ventureId}/zielkonflikte`);
  redirect(`${back}&share=${choice === "true" ? "on" : "off"}`);
}
