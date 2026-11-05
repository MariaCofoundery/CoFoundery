import { redirect } from "next/navigation";
import { getLocale } from "next-intl/server";
import { buildLoginRedirectPath } from "@/features/auth/loginRedirect";
import { getDashboardRoleViews } from "@/features/dashboard/dashboardRoleData";
import { getMyAdvisorOrgs } from "@/features/advisor/orgData";
import { getMyProgramEvents, listProgramEvents } from "@/features/advisor/teamProgramData";
import { hasOrgFeature } from "@/features/advisor/orgFeatures";
import { EventsView } from "@/features/events/EventsView";
import { AreaTips } from "@/features/advisor/setup/AreaTips";
import { listMyEventSubmissions, listMySavedEventIds, listUpcomingEcosystemEvents } from "@/features/events/eventsData";
import { eventFilterOf, isRegion, type CalendarEntry } from "@/features/events/eventsModel";
import { getPresentationLocale } from "@/i18n/presentationLocale";
import { createClient, getRequestUser } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { calendarHref } from "@/features/advisor/calendar/calendarModel";

export const dynamic = "force-dynamic";

/**
 * Events (20270323120000): Termine aus dem eigenen Programm und aus dem Startup-Oekosystem, fuer Gruendende und
 * Advisor. Programm-Termine sieht nur, wer im Programm ist (Team) oder es fuehrt (Organisation).
 */
export default async function EventsPage({ searchParams }: { searchParams?: Promise<{ filter?: string; region?: string; submitted?: string }> }) {
  const query = (await searchParams) ?? {};
  const {
    data: { user },
  } = await getRequestUser();
  if (!user) redirect(buildLoginRedirectPath("/events"));

  const client = await createClient();
  const [t, roleViews, locale] = await Promise.all([getTranslations("events"), getDashboardRoleViews(user.id), getLocale().then(getPresentationLocale)]);
  const orgs = roleViews.hasAdvisor ? await getMyAdvisorOrgs(client) : [];
  const now = Date.now();
  const horizon = now + 90 * 86_400_000;
  const upcoming = (iso: string) => new Date(iso).getTime() >= now - 6 * 3_600_000 && new Date(iso).getTime() <= horizon;

  const [ecosystem, saved, submissions, founderProgramEvents, orgPlans] = await Promise.all([
    listUpcomingEcosystemEvents(client, user.id),
    listMySavedEventIds(client),
    listMyEventSubmissions(client, user.id),
    roleViews.hasFounder ? getMyProgramEvents(client) : Promise.resolve([]),
    Promise.all(orgs.filter((org) => hasOrgFeature(org, "plan")).slice(0, 3).map(async (org) => ({ org, events: await listProgramEvents(client, org.id) }))),
  ]);

  const entries: CalendarEntry[] = [
    ...founderProgramEvents.filter((event) => upcoming(event.startsAt)).map((event) => ({
      kind: "program" as const,
      key: `p-${event.programId}-${event.eventId}`,
      title: event.formatLabel ? `${event.formatLabel}: ${event.title}` : event.title,
      startsAt: event.startsAt,
      place: event.location,
      label: t("fromProgram", { org: event.orgName }),
      href: "/programm",
    })),
    ...orgPlans.flatMap(({ org, events }) =>
      events.filter((event) => upcoming(event.startsAt)).map((event) => ({
        kind: "program" as const,
        key: `o-${org.id}-${event.eventId}`,
        title: event.title,
        startsAt: event.startsAt,
        place: event.location,
        label: t("fromPlan", { org: org.name }),
        href: calendarHref(org.id, { termin: event.eventId }),
      })),
    ),
    ...ecosystem.map((event) => ({ kind: "ecosystem" as const, key: `e-${event.id}`, event, saved: saved.has(event.id) })),
  ];

  return (
    <>
    <AreaTips area="events" />
    <EventsView
      entries={entries}
      filter={eventFilterOf(query.filter)}
      region={isRegion(query.region) || query.region === "online" ? query.region : null}
      locale={locale}
      canSubmit={roleViews.hasFounder || orgs.some((org) => org.status === "active")}
      submissions={submissions}
      submitted={query.submitted === "1"}
    />
    </>
  );
}
