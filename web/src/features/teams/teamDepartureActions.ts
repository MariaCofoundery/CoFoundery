"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isTeamDepartureChoice } from "@/features/teams/teamDepartureData";

/**
 * Die eigene Wahl zu einem Austritt. Die Entscheidung selbst (alle aktuellen Mitglieder gleich?)
 * trifft die Datenbank in `choose_team_departure`; hier steht keine zweite Fassung der Regel.
 */
export async function chooseTeamDepartureAction(teamId: string, departureId: string, formData: FormData) {
  const choice = String(formData.get("choice") ?? "");
  const base = `/teams/${encodeURIComponent(teamId)}`;
  if (!isTeamDepartureChoice(choice)) redirect(`${base}?austritt=fehler#team-austritt`);
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(base)}`);
  const { data, error } = await client.rpc("choose_team_departure", { p_departure_id: departureId, p_choice: choice });
  if (error) redirect(`${base}?austritt=fehler#team-austritt`);
  revalidatePath(base);
  revalidatePath("/connections");
  redirect(`${base}?austritt=${data === "dissolved" ? "aufgeloest" : data === "continue" ? "weiter" : "gespeichert"}#team-austritt`);
}
