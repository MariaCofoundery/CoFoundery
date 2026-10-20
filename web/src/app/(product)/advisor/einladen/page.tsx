import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { buildLoginRedirectPath } from "@/features/auth/loginRedirect";
import { AdvisorPageHeader } from "@/features/advisor/AdvisorPageHeader";
import { getDashboardRoleViews } from "@/features/dashboard/dashboardRoleData";
import { createClient, getRequestUser } from "@/lib/supabase/server";
import { PersonInviteSection, type PersonInvite } from "@/features/advisor/PersonInviteSection";
import { getMyAdvisorOrgs } from "@/features/advisor/orgData";
import { AdvisorTeamInviteForm } from "@/features/dashboard/AdvisorTeamInviteForm";

/**
 * Einladen - ein Ort fuer die drei Wege: Person, Team, Team-Runde.
 * Zu jedem steht, was die eingeladene Seite sieht (in den Bloecken selbst).
 */
export default async function AdvisorInvitePage() {
  const t = await getTranslations("advisor.area");
  const tIntake = await getTranslations("intake");
  const {
    data: { user },
  } = await getRequestUser();
  if (!user) redirect(buildLoginRedirectPath("/advisor/einladen"));

  const client = await createClient();
  const [roleViews, orgs, inviteRows] = await Promise.all([
    getDashboardRoleViews(user.id),
    getMyAdvisorOrgs(client),
    client
      .from("advisor_person_invites")
      .select("id, invitee_email, status, scopes")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);
  if (!roleViews.hasAdvisor) redirect("/dashboard");

  const personInvites: PersonInvite[] = (
    (inviteRows.data ?? []) as { id: string; invitee_email: string; status: string; scopes: string[] }[]
  ).map((row) => ({ id: row.id, inviteeEmail: row.invitee_email, status: row.status, scopes: row.scopes ?? [] }));

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <AdvisorPageHeader eyebrow={t("eyebrow")} title={t("invite.title")} text={t("invite.text")} />
      <div className="mt-7 grid gap-6">
        <PersonInviteSection invites={personInvites} orgs={orgs} />
        <section id="team-invite">
          <AdvisorTeamInviteForm />
        </section>
        <section
          id="team-round"
          aria-labelledby="team-round-title"
          className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-7"
        >
          <h2 id="team-round-title" className="text-xl font-semibold text-slate-950">{t("invite.roundTitle")}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">{tIntake("intro")}</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/advisor/intake/new" className="brand-cta inline-flex min-h-11 items-center rounded-xl px-5 text-sm font-semibold">
              {t("invite.roundCta")}
            </Link>
            <Link href="/team-intake" className="inline-flex min-h-11 items-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              {t("invite.roundList")}
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
