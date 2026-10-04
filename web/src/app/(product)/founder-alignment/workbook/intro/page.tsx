import { redirect } from "next/navigation";
import { createClient, getRequestUser } from "@/lib/supabase/server";
import { currentTeamForInvitation } from "@/features/teams/currentJourneyData";
import { buildWorkbookHref } from "@/features/reporting/workbookNavigation";
export default async function WorkbookIntroPage({ searchParams }: { searchParams: Promise<{ invitationId?: string }> }) {
  const { invitationId } = await searchParams;
  if (!invitationId) redirect("/connections");
  const { data: { user } } = await getRequestUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/founder-alignment/workbook/intro?invitationId=${invitationId}`)}`);
  const team = await currentTeamForInvitation(await createClient(), user.id, invitationId);
  redirect(team ? `/teams/${team}/setup` : buildWorkbookHref(invitationId, null));
}
