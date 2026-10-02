import "server-only";
import { notFound, redirect } from "next/navigation";
import { createClient, getRequestUser } from "@/lib/supabase/server";
import { validId, type IntakeRound } from "@/features/team-intake/model";

export async function intakeSession(path = "/team-intake") {
  const {
    data: { user },
  } = await getRequestUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(path)}`);
  return { client: await createClient(), user };
}
export async function readIntake(id: string) {
  if (!validId(id)) notFound();
  const session = await intakeSession(`/team-intake/${id}`);
  const { data, error } = await session.client.rpc("get_team_intake", {
    p_round: id,
  });
  if (error || !data) notFound();
  return { ...session, round: data as IntakeRound };
}
