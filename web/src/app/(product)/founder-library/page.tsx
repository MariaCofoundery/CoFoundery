import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getDashboardRoleViews } from "@/features/dashboard/dashboardRoleData";
import { FounderLibraryView } from "@/features/founderLibrary/FounderLibraryView";
import { createClient } from "@/lib/supabase/server";

type Props = {
  searchParams?: Promise<{ view?: string }>;
};

export default async function GlobalFounderLibraryPage({ searchParams }: Props) {
  const pathname = "/founder-library";
  const view = (await searchParams)?.view === "updates" ? "updates" : "glossary";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(pathname)}`);

  const roles = await getDashboardRoleViews(user.id);
  if (!roles.hasFounder) redirect(roles.hasAdvisor ? "/advisor/dashboard" : "/start");

  const t = await getTranslations("founderLibrary");
  return (
    <FounderLibraryView
      view={view}
      pathname={pathname}
      backHref="/dashboard"
      backLabel={t("backToDashboard")}
    />
  );
}
