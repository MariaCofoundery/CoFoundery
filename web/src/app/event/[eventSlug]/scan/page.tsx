import Link from "next/link";
import { redirect } from "next/navigation";
import { EventScanView } from "@/features/events/EventScanView";
import { getCurrentEventParticipantProfile, getLiveEventBySlug, normalizeEventSlug } from "@/features/events/eventData";

function buildEventLandingHref(eventSlug: string) {
  return `/event/${encodeURIComponent(eventSlug)}`;
}

function buildEventCheckHref(eventSlug: string) {
  return `/event/${encodeURIComponent(eventSlug)}/check`;
}

function buildEventCardHref(eventSlug: string) {
  return `/event/${encodeURIComponent(eventSlug)}/me`;
}

function EventScanUnavailable() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-5 py-14 sm:px-8">
      <section className="rounded-[28px] border border-slate-200/80 bg-white/96 p-8 text-center shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
        <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Cofoundery Event Scanner</p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-950">Event aktuell nicht verfuegbar</h1>
        <p className="mt-4 text-sm leading-7 text-slate-600">
          Dieser Event-Scanner ist gerade nicht aktiv. Bitte pruefe den Link oder wende dich an das Event-Team.
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

export default async function EventScanPage({
  params,
}: {
  params: Promise<{ eventSlug: string }>;
}) {
  const { eventSlug } = await params;
  const normalizedSlug = normalizeEventSlug(eventSlug);
  const event = await getLiveEventBySlug(normalizedSlug);

  if (!event) {
    return <EventScanUnavailable />;
  }

  const participantProfile = await getCurrentEventParticipantProfile(event.slug);

  if (!participantProfile.ok) {
    redirect(buildEventLandingHref(event.slug));
  }

  if (!participantProfile.completed) {
    redirect(buildEventCheckHref(event.slug));
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-5 py-10 sm:px-8 sm:py-12">
      <EventScanView
        event={event}
        participantName={participantProfile.participant.displayName}
        backToCardHref={buildEventCardHref(event.slug)}
      />
    </main>
  );
}
