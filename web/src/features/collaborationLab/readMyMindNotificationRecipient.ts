import "server-only";

import { createClient } from "@supabase/supabase-js";

export async function getReadMyMindNotificationRecipientEmail(userId: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;

  const privileged = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await privileged.auth.admin.getUserById(userId);
  if (error) return null;
  const email = data.user?.email?.trim().toLowerCase();
  return email && email.includes("@") ? email : null;
}
