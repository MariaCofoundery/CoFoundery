import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";

export async function AdminModerationLink() {
  const client = await createClient();
  const { data, error } = await client.rpc("is_platform_admin");
  if (error || data !== true) return null;
  const t = await getTranslations("moderation");
  const radar = await getTranslations("radar");
  return <div className="flex flex-wrap gap-x-5"><Link href="/admin/moderation" className="mt-8 inline-flex min-h-11 items-center text-sm text-slate-600 underline">{t("entry")}</Link><Link href="/admin/problem-radar" className="mt-8 inline-flex min-h-11 items-center text-sm text-slate-600 underline">{radar("title")}</Link></div>;
}
