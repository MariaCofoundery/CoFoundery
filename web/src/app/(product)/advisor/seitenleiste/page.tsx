import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { buildLoginRedirectPath } from "@/features/auth/loginRedirect";
import { getDashboardRoleViews } from "@/features/dashboard/dashboardRoleData";
import { NavSettings } from "@/features/navigation/workspace/NavSettings";
import { createClient, getRequestUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Die Seitenleiste anpassen (08.11.2026): ausblenden und sortieren, je Person. */
export default async function NavSettingsPage({ searchParams }: { searchParams?: Promise<{ fehler?: string }> }) {
  const query = (await searchParams) ?? {};
  const {
    data: { user },
  } = await getRequestUser();
  if (!user) redirect(buildLoginRedirectPath("/advisor/seitenleiste"));
  const client = await createClient();
  const [roleViews, { data }, t] = await Promise.all([getDashboardRoleViews(user.id), client.from("advisor_nav_prefs").select("hidden, item_order").maybeSingle(), getTranslations("navigation.settings")]);
  if (!roleViews.hasAdvisor) redirect("/dashboard");
  const prefs = data ? { hidden: (data.hidden as string[]) ?? [], order: (data.item_order as string[]) ?? [] } : null;
  return (
    <main className="work-ui mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <NavSettings hasOrg={(roleViews.advisorOrgNames ?? []).length > 0} prefs={prefs} orgId={null} error={query.fehler === "1"} />
      <Link href="/advisor/dashboard" className="mt-5 inline-flex min-h-11 items-center text-sm font-semibold text-violet-800 underline-offset-4 hover:underline">← {t("back")}</Link>
    </main>
  );
}
