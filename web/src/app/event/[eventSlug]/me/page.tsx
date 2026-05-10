import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { EventParticipantCard } from "@/features/events/EventParticipantCard";
import { getCurrentEventParticipantProfile, getLiveEventBySlug, normalizeEventSlug } from "@/features/events/eventData";
import { toPublicAppUrl } from "@/lib/publicAppOrigin";

function buildEventComparePath(eventSlug: string, participantToken: string) {
  return `/event/${encodeURIComponent(eventSlug)}/compare/${encodeURIComponent(participantToken)}`;
}

function getRequestOriginFromHeaders(headerStore: Headers) {
  const forwardedHost = headerStore.get("x-forwarded-host")?.trim() || headerStore.get("host")?.trim() || "";
  if (!forwardedHost) {
    return "";
  }

  const forwardedProto = headerStore.get("x-forwarded-proto")?.trim() || "https";
  return `${forwardedProto}://${forwardedHost}`;
}

export default async function EventParticipantCardPage({
  params,
}: {
  params: Promise<{ eventSlug: string }>;
}) {
  const { eventSlug } = await params;
  const normalizedSlug = normalizeEventSlug(eventSlug);
  const event = await getLiveEventBySlug(normalizedSlug);

  if (!event) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-3xl px-5 py-14 sm:px-8">
        <section className="rounded-[28px] border border-slate-200/80 bg-white/96 p-8 text-center shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Cofoundery Event</p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-950">Event aktuell nicht verfuegbar</h1>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            Diese Event-Karte ist gerade nicht aktiv. Bitte pruefe den Link oder wende dich an das Event-Team.
          </p>
          <div className="mt-6">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Zur Startseite
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const participantProfile = await getCurrentEventParticipantProfile(event.slug);

  if (!participantProfile.ok) {
    redirect(`/event/${encodeURIComponent(event.slug)}`);
  }

  if (!participantProfile.completed) {
    redirect(`/event/${encodeURIComponent(event.slug)}/check`);
  }

  const headerStore = await headers();
  const comparePath = buildEventComparePath(event.slug, participantProfile.participant.participantToken);
  const compareUrl = toPublicAppUrl(comparePath, getRequestOriginFromHeaders(headerStore));

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-5 py-10 sm:px-8 sm:py-12">
      <EventParticipantCard
        event={event}
        participantName={participantProfile.participant.displayName}
        profile={participantProfile.profile}
        compareUrl={compareUrl}
      />
    </main>
  );
}
