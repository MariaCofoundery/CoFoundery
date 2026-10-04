"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
export async function saveProductSnapshot(teamId: string | null) {
  const client = await createClient();
  const { data: auth } = await client.auth.getUser();
  if (!auth.user) redirect("/login");
  const path = teamId
    ? `/teams/${encodeURIComponent(teamId)}/workstyle`
    : "/me/profile/workstyle";
  const { data, error } = await client.rpc(
    "create_workstyle_product_snapshot",
    { p_team_id: teamId, p_subject_id: teamId ? null : auth.user.id },
  );
  redirect(error ? `${path}?error=snapshot` : `${path}?snapshot=${data}`);
}
export async function shareProductWorkstyle(
  recipient: string,
  hidden: string[],
  revoke = false,
) {
  const client = await createClient();
  const { error } = await client.rpc("share_workstyle_product", {
    p_recipient: recipient,
    p_hidden: hidden,
    p_revoke: revoke,
  });
  revalidatePath("/me/profile/workstyle");
  return { ok: !error };
}
