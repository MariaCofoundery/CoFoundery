import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { buildLoginRedirectPath } from "@/features/auth/loginRedirect";
import { AdvisorPageHeader } from "@/features/advisor/AdvisorPageHeader";
import { getDashboardRoleViews } from "@/features/dashboard/dashboardRoleData";
import { createClient, getRequestUser } from "@/lib/supabase/server";
import { AccountDeletionNoticeList } from "@/features/account/AccountDeletionNoticeList";
import { getAccountDeletionNotices } from "@/features/account/accountDeletionNotices";
import { AccompaniedPeopleList } from "@/features/advisor/AccompaniedPeopleList";
import { PendingInviteSection, TeamSection } from "@/features/advisor/AdvisorTeamsList";
import { getAccompaniedPeople, withAccompaniedNames } from "@/features/advisor/orgData";
import { getAdvisorTeamReviews } from "@/features/advisor/teamReviewData";
import { getAdvisorDashboardTeams } from "@/features/dashboard/dashboardRoleData";
import { getAdvisorPendingTeamInvites } from "@/features/dashboard/advisorTeamInviteData";
import { ProductNavigationOverride } from "@/features/navigation/ProductShell";
import { getRequestLocale } from "@/i18n/getLocale";

const FILTERS = ["all", "people", "teams", "groups"] as const;
type Filter = (typeof FILTERS)[number];
const PARAM_OF: Record<Filter, string | null> = { all: null, people: "personen", teams: "teams", groups: "gruppen" };
const FILTER_OF = (value: string | undefined): Filter =>
  (FILTERS.find((filter) => PARAM_OF[filter] === value) ?? "all") as Filter;

/**
 * Begleitung: eine Liste von allem, was ein Advisor begleitet.
 *
 * Teams, Personen und Gruppenauswertungen bleiben getrennt benannt - jede hat
 * ihre eigene Zustimmung. Die Liste fuehrt sie zusammen, vermischt sie nicht.
 */
export default async function AdvisorFollowPage({ searchParams }: { searchParams?: Promise<{ art?: string }> }) {
  const query = (await searchParams) ?? {};
  const filter = FILTER_OF(query.art);
  const [t, tAdvisor, locale] = await Promise.all([
    getTranslations("advisor.area"),
    getTranslations("advisor"),
    getRequestLocale(),
  ]);
  const {
    data: { user },
  } = await getRequestUser();
  if (!user) redirect(buildLoginRedirectPath("/advisor/begleitung"));

  const client = await createClient();
  const [roleViews, teams, pendingInvites, accompanied, reviews, deletionNotices] = await Promise.all([
    getDashboardRoleViews(user.id),
    getAdvisorDashboardTeams(user.id),
    getAdvisorPendingTeamInvites(user.id),
    withAccompaniedNames(client, await getAccompaniedPeople(client)),
    getAdvisorTeamReviews(client),
    // Ein Team, das aus der Liste verschwindet, ist von einem Team, das es nie
    // gab, nicht zu unterscheiden. Der Hinweis steht deshalb ueber der Liste.
    getAccountDeletionNotices(client, ["advisor_team"]),
  ]);
  if (!roleViews.hasAdvisor) redirect("/dashboard");

  const readyTeams = teams.filter((team) => team.accessStatus === "ready");
  const waitingTeams = teams.filter((team) => team.accessStatus === "waiting_for_approval");
  const pausedTeams = teams.filter((team) => team.accessStatus === "paused" || team.accessStatus === "revoked");
  const preferred = readyTeams.find((team) => team.reportAvailable) ?? readyTeams[0] ?? null;
  const nameOf = (userId: string) => accompanied.find((person) => person.subjectUserId === userId)?.name ?? t("kinds.unnamed");

  const show = (kind: Exclude<Filter, "all">) => filter === "all" || filter === kind;
  const nothing = teams.length === 0 && pendingInvites.length === 0 && accompanied.length === 0 && reviews.length === 0;

  return (
    <>
      <ProductNavigationOverride activeView="advisor" matchingHref={preferred?.reportHref ?? "/advisor/begleitung"} />
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <AdvisorPageHeader eyebrow={t("eyebrow")} title={t("follow.title")} text={t("follow.text")} />

        <nav aria-label={t("follow.filterLabel")} className="mt-6 flex flex-wrap gap-2">
          {FILTERS.map((entry) => (
            <Link
              key={entry}
              href={PARAM_OF[entry] ? `/advisor/begleitung?art=${PARAM_OF[entry]}` : "/advisor/begleitung"}
              aria-current={filter === entry ? "page" : undefined}
              className={`inline-flex min-h-11 items-center rounded-full border px-4 text-sm ${
                filter === entry ? "brand-here font-semibold" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {t(`follow.filters.${entry}`)}
            </Link>
          ))}
        </nav>

        <div className="mt-6 grid gap-8">
          <AccountDeletionNoticeList notices={deletionNotices} />

          {nothing ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white/80 p-8">
              <p className="text-lg font-semibold text-slate-900">{tAdvisor("dashboard.emptyTitle")}</p>
              <p className="mt-3 text-sm leading-7 text-slate-600">{t("follow.empty")}</p>
              <Link href="/advisor/einladen" className="brand-cta mt-4 inline-flex min-h-11 items-center rounded-xl px-5 text-sm font-semibold">
                {t("start.invite")}
              </Link>
            </div>
          ) : null}

          {show("teams") && (teams.length > 0 || pendingInvites.length > 0) ? (
            <section aria-labelledby="follow-teams-title" id="advisor-teams" className="scroll-mt-24">
              <h2 id="follow-teams-title" className="text-xl font-semibold text-slate-950">{t("follow.teamsTitle")}</h2>
              <PendingInviteSection invites={pendingInvites} t={tAdvisor} locale={locale} />
              <TeamSection title={tAdvisor("dashboard.readySectionTitle")} description={tAdvisor("dashboard.readySectionDescription")} teams={readyTeams} t={tAdvisor} locale={locale} />
              <TeamSection title={tAdvisor("dashboard.waitingSectionTitle")} description={tAdvisor("dashboard.waitingSectionDescription")} teams={waitingTeams} t={tAdvisor} locale={locale} />
              <TeamSection title={tAdvisor("dashboard.pausedSectionTitle")} description={tAdvisor("dashboard.pausedSectionDescription")} teams={pausedTeams} t={tAdvisor} locale={locale} />
            </section>
          ) : null}

          {show("people") && accompanied.length > 0 ? (
            <section aria-labelledby="follow-people-title">
              <h2 id="follow-people-title" className="text-xl font-semibold text-slate-950">{t("follow.peopleTitle")}</h2>
              <AccompaniedPeopleList people={accompanied} />
            </section>
          ) : null}

          {show("groups") ? (
            <section aria-labelledby="follow-groups-title">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <h2 id="follow-groups-title" className="text-xl font-semibold text-slate-950">{t("follow.groupsTitle")}</h2>
                {accompanied.filter((person) => person.scopes.includes("capability")).length >= 2 ? (
                  <Link href="/advisor/group" className="inline-flex min-h-11 items-center text-sm font-semibold text-violet-800 underline-offset-4 hover:underline">
                    {t("follow.groupsRequest")}
                  </Link>
                ) : null}
              </div>
              {reviews.length === 0 ? (
                <p className="mt-2 text-sm leading-6 text-slate-600">{t("follow.groupsEmpty")}</p>
              ) : (
                <ul className="mt-3 grid gap-3">
                  {reviews.map((review) => (
                    <li key={review.reviewId} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm">
                      <span className="font-semibold text-slate-900">{review.subjectUserIds.map((id) => nameOf(id)).join(", ")}</span>
                      {review.status === "active" ? (
                        <Link href={`/advisor/review/${review.reviewId}`} className="inline-flex min-h-11 items-center rounded-xl border border-slate-200 px-4 font-semibold text-slate-700 hover:bg-slate-50">
                          {tAdvisor("group.reviewOpen")}
                        </Link>
                      ) : (
                        <span className="text-slate-500">{tAdvisor("group.reviewWaiting", { count: review.pendingCount })}</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : null}
        </div>
      </main>
    </>
  );
}
