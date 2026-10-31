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
// Drei Wege stehen zur Wahl. "team" (zwei Gruendende als Paar) bleibt als alte Ansicht ueber ?art=team
// erreichbar, steht aber nicht mehr in der Auswahl: Wer ein Team begleitet, laedt dessen Mitglieder einzeln ein.
const WAYS = ["person", "round", "program"] as const;
type Way = (typeof WAYS)[number] | "team";
const ART: Record<string, Way> = { person: "person", team: "team", runde: "round" };

export default async function AdvisorInvitePage({
  searchParams,
}: {
  searchParams?: Promise<{ art?: string; error?: string; notice?: string; count?: string; failed?: string }>;
}) {
  const query = (await searchParams) ?? {};
  // Rueckmeldungen der Personen-Einladung (?error=, ?notice=) fuehren zurueck in diese Ansicht.
  const art: Way | null = ART[query.art ?? ""] ?? (query.error || query.notice ? "person" : null);
  const t = await getTranslations("advisor.area");
  const tIntake = await getTranslations("intake");
  const tInvites = await getTranslations("advisor.personInvites");
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

  const isOwner = orgs.some((org) => org.role === "owner" && org.status === "active");
  const WAY_ICON: Record<Way, React.ReactNode> = {
    person: (
      <>
        <circle cx="12" cy="8" r="3.4" />
        <path d="M5 19.5c.7-3.6 3.6-5.5 7-5.5s6.3 1.9 7 5.5" />
      </>
    ),
    team: (
      <>
        <circle cx="9" cy="8" r="3.2" />
        <path d="M3 19c.6-3.2 3-5 6-5s5.4 1.8 6 5" />
        <circle cx="17" cy="9" r="2.4" />
        <path d="M16.5 14.2c2.4.2 4 1.7 4.5 4.3" />
      </>
    ),
    round: (
      <>
        <rect x="4" y="5.5" width="16" height="14" rx="3" />
        <path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" />
      </>
    ),
    program: <path d="M6 20V4.5M6 5h11l-2.2 3.5L17 12H6" />,
  };
  const wayHref: Record<Way, string> = {
    person: "/advisor/einladen?art=person",
    team: "/advisor/einladen?art=team",
    round: "/advisor/einladen?art=runde",
    program: "/advisor/organisation?tab=enroll",
  };

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <AdvisorPageHeader eyebrow={t("eyebrow")} title={t("invite.title")} text={art ? t(`invite.ways.${art}.title`) : t("invite.text")} />

      {art === null ? (
        <ul className="mt-7 grid gap-4 sm:grid-cols-2">
          {WAYS.map((way) => {
            const blocked = way === "program" && !isOwner;
            return (
              <li key={way} className="flex flex-col rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
                <span aria-hidden="true" className="grid h-11 w-11 place-items-center rounded-2xl bg-violet-100 text-violet-700">
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    {WAY_ICON[way]}
                  </svg>
                </span>
                <h2 className="mt-4 text-lg font-semibold text-slate-950">{t(`invite.ways.${way}.title`)}</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">{t(`invite.ways.${way}.text`)}</p>
                <p className="mt-2 text-xs leading-5 text-slate-500">{t(`invite.ways.${way}.sees`)}</p>
                <div className="mt-auto pt-4">
                  {blocked ? (
                    <p className="text-xs leading-5 text-slate-500">{t("invite.programOwnerOnly")}</p>
                  ) : (
                    <Link href={wayHref[way]} className="brand-cta inline-flex min-h-11 items-center rounded-xl px-5 text-sm font-semibold">
                      {t(`invite.ways.${way}.cta`)}
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="mt-6 grid gap-6">
          <Link href="/advisor/einladen" className="inline-flex min-h-11 w-fit items-center text-sm font-semibold text-violet-800 underline-offset-4 hover:underline">
            ← {t("invite.back")}
          </Link>
          {art === "person" && query.notice === "invited" ? (
            <p role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-900">
              {tInvites("noticeInvited", { count: Math.max(1, Number(query.count) || 1) })}
              {Number(query.failed) > 0 ? ` ${tInvites("noticeFailed", { failed: Number(query.failed) })}` : ""}
            </p>
          ) : null}
          {art === "person" && query.error ? (
            <p role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-800">
              {query.error === "email" ? tInvites("errorEmail") : query.error === "scopes" ? tInvites("errorScopes") : tInvites("errorCreate")}
            </p>
          ) : null}
          {art === "person" ? <PersonInviteSection invites={personInvites} orgs={orgs} /> : null}
          {art === "team" ? (
            <section id="team-invite">
              <AdvisorTeamInviteForm />
            </section>
          ) : null}
          {art === "round" ? (
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
          ) : null}
        </div>
      )}
    </main>
  );
}
