import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { buildLoginRedirectPath } from "@/features/auth/loginRedirect";
import { getDashboardRoleViews } from "@/features/dashboard/dashboardRoleData";
import { FounderNavSettings } from "@/features/navigation/founder/FounderNavSettings";
import { createClient, getRequestUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Die Founder-Leiste anpassen (08.11.2026): ausblenden und sortieren, je Person. */
export default async function FounderNavSettingsPage() {
  const {
    data: { user },
  } = await getRequestUser();
  if (!user) redirect(buildLoginRedirectPath("/me/seitenleiste"));
  const client = await createClient();
  const [roleViews, { data }, { data: isMember }, t] = await Promise.all([
    getDashboardRoleViews(user.id),
    client.from("founder_nav_prefs").select("hidden, item_order").maybeSingle(),
    client.rpc("is_network_member"),
    getTranslations("navigation.settings"),
  ]);
  if (!roleViews.hasFounder) redirect(roleViews.hasAdvisor ? "/advisor/seitenleiste" : "/dashboard");
  const prefs = data ? { hidden: (data.hidden as string[]) ?? [], order: (data.item_order as string[]) ?? [] } : null;
  return (
    <main className="work-ui mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <FounderNavSettings hasConnect={isMember === true} prefs={prefs} />
      <Link href="/dashboard" className="mt-5 inline-flex min-h-11 items-center text-sm font-semibold text-violet-800 underline-offset-4 hover:underline">← {t("backFounder")}</Link>
    </main>
  );
}
