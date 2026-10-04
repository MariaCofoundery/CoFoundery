import { redirect } from "next/navigation";
import { createClient, getRequestUser } from "@/lib/supabase/server";
import { CURRENT_WORKSTYLE_HREF } from "@/features/instruments/workstyle/current";
/** Historical URLs stay readable, but never start a new legacy assessment. */
export default async function FounderProfilePage() {
  const { data: { user } } = await getRequestUser();
  if (!user) redirect("/login?next=%2Fme%2Fprofile%2Fworkstyle");
  const { data } = await (await createClient()).from("assessments").select("id").eq("user_id", user.id).eq("instrument_id", "founder-profile-v1").limit(1).maybeSingle();
  redirect(data ? "/founder-alignment/profil/antworten" : CURRENT_WORKSTYLE_HREF);
}
