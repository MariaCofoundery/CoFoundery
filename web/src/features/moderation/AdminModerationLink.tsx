import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";

export async function AdminModerationLink() {
  const client = await createClient();
  const { data, error } = await client.rpc("is_platform_admin");
  if (error || data !== true) return null;
  const t = await getTranslations("moderation");
  return <Link href="/admin/moderation" className="mt-8 inline-flex min-h-11 items-center text-sm text-slate-600 underline">{t("entry")}</Link>;
}
