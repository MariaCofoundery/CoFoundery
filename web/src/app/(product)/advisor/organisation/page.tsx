import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { buildLoginRedirectPath } from "@/features/auth/loginRedirect";
import { AdvisorPageHeader } from "@/features/advisor/AdvisorPageHeader";
import { getDashboardRoleViews } from "@/features/dashboard/dashboardRoleData";
import { createClient, getRequestUser } from "@/lib/supabase/server";
import { readOrgErrorCode } from "@/features/advisor/orgErrors";
import { AdvisorOrgSection } from "@/features/advisor/AdvisorOrgSection";
import { getMyAdvisorOrgs, getOrgMembers } from "@/features/advisor/orgData";

/**
 * Organisation - ein Programm oder eine Beratung mit mehreren Advisorinnen.
 * Sie haelt die Zugaenge, damit sie nicht mit einer einzelnen Person
 * verschwinden. Eigene Seite statt Abschnitt auf der Startseite.
 */
export default async function AdvisorOrganisationPage({ searchParams }: { searchParams?: Promise<{ orgError?: string }> }) {
  const orgError = readOrgErrorCode(((await searchParams) ?? {}).orgError);
  const t = await getTranslations("advisor.area");
  const {
    data: { user },
  } = await getRequestUser();
  if (!user) redirect(buildLoginRedirectPath("/advisor/organisation"));

  const client = await createClient();
  const [roleViews, orgs] = await Promise.all([getDashboardRoleViews(user.id), getMyAdvisorOrgs(client)]);
  if (!roleViews.hasAdvisor) redirect("/dashboard");
  const members = orgs[0] ? await getOrgMembers(client, orgs[0].id) : [];

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <AdvisorPageHeader eyebrow={t("eyebrow")} title={t("org.title")} text={t("org.text")} />
      <div className="mt-7">
        <AdvisorOrgSection orgs={orgs} members={members} error={orgError} />
      </div>
    </main>
  );
}
