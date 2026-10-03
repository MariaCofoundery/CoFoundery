import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";

export async function AdminModerationLink() {
  const client = await createClient();
  const { data, error } = await client.rpc("is_platform_admin");
  if (error || data !== true) return null;
  const t = await getTranslations("moderation");
  const radar = await getTranslations("radar");
  return (
    <section aria-labelledby="administration-title" className="mt-8 rounded-3xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
      <h2 id="administration-title" className="text-xl font-semibold text-slate-950">{t("administration")}</h2>
      <nav aria-label={t("administration")} className="mt-3 flex flex-wrap gap-3">
        <Link href="/admin/moderation" className="inline-flex min-h-11 items-center rounded-xl border border-slate-200 bg-white px-4 font-semibold text-slate-700 hover:bg-slate-100">{t("entry")}</Link>
        <Link href="/admin/problem-radar" className="inline-flex min-h-11 items-center rounded-xl border border-slate-200 bg-white px-4 font-semibold text-slate-700 hover:bg-slate-100">{radar("title")}</Link>
        <Link href="/admin/research/workstyle-pretest" className="inline-flex min-h-11 items-center rounded-xl border border-slate-200 bg-white px-4 font-semibold text-slate-700 hover:bg-slate-100">Workstyle Research-Pretest</Link>
      </nav>
    </section>
  );
}
