import Link from "next/link";
import { redirect } from "next/navigation";
import { buildEventCompareResult } from "@/features/events/eventCompare";
import { EventCompareView } from "@/features/events/EventCompareView";
import {
  getCurrentEventParticipantProfile,
  getEventParticipantByToken,
  getLiveEventBySlug,
  listEventAnswersForParticipant,
  normalizeEventSlug,
} from "@/features/events/eventData";
import { deriveEventProfile } from "@/features/events/eventProfile";

function buildEventLandingHref(eventSlug: string) {
  return `/event/${encodeURIComponent(eventSlug)}`;
}

function buildEventCheckHref(eventSlug: string) {
  return `/event/${encodeURIComponent(eventSlug)}/check`;
}

function buildEventCardHref(eventSlug: string) {
  return `/event/${encodeURIComponent(eventSlug)}/me`;
}

function EventCompareMessage({
  title,
  text,
  href,
  ctaLabel,
}: {
  title: string;
  text: string;
  href: string;
  ctaLabel: string;
}) {
  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-5 py-14 sm:px-8">
      <section className="rounded-[28px] border border-slate-200/80 bg-white/96 p-8 text-center shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
        <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Cofoundery Event Compare</p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-950">{title}</h1>
        <p className="mt-4 text-sm leading-7 text-slate-600">{text}</p>
        <div className="mt-6">
          <Link
            href={href}
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            {ctaLabel}
          </Link>
        </div>
      </section>
    </main>
  );
}

export default async function EventComparePage({
  params,
}: {
  params: Promise<{ eventSlug: string; participantToken: string }>;
}) {
  const { eventSlug, participantToken } = await params;
  const normalizedSlug = normalizeEventSlug(eventSlug);
  const event = await getLiveEventBySlug(normalizedSlug);

  if (!event) {
    return (
      <EventCompareMessage
        title="Event aktuell nicht verfuegbar"
        text="Dieser Vergleich ist gerade nicht aktiv. Bitte pruefe den Link oder wende dich an das Event-Team."
        href="/"
        ctaLabel="Zur Startseite"
      />
    );
  }

  const viewerProfileResult = await getCurrentEventParticipantProfile(event.slug);
  if (!viewerProfileResult.ok) {
    redirect(buildEventLandingHref(event.slug));
  }

  if (!viewerProfileResult.completed) {
    redirect(buildEventCheckHref(event.slug));
  }

  const targetParticipant = await getEventParticipantByToken({
    eventId: event.id,
    participantToken: participantToken.trim(),
  });

  if (!targetParticipant || targetParticipant.eventId !== event.id) {
    return (
      <EventCompareMessage
        title="Profil aktuell nicht verfuegbar"
        text="Dieses Event-Kurzprofil kann gerade nicht fuer einen Vergleich geladen werden."
        href={buildEventCardHref(event.slug)}
        ctaLabel="Zurueck zu meiner Event-Karte"
      />
    );
  }

  if (targetParticipant.id === viewerProfileResult.participant.id) {
    return (
      <EventCompareMessage
        title="Das ist dein eigener QR-Code"
        text="Scanne fuer einen Vergleich den QR-Code einer anderen teilnehmenden Person."
        href={buildEventCardHref(event.slug)}
        ctaLabel="Zurueck zu meiner Event-Karte"
      />
    );
  }

  if (!targetParticipant.consentCompare || !targetParticipant.consentVisibility) {
    return (
      <EventCompareMessage
        title="Vergleich aktuell nicht moeglich"
        text="Dieses Profil ist innerhalb des Events derzeit nicht fuer Vergleiche freigegeben."
        href={buildEventCardHref(event.slug)}
        ctaLabel="Zurueck zu meiner Event-Karte"
      />
    );
  }

  const targetAnswers = await listEventAnswersForParticipant({ participantId: targetParticipant.id });
  const targetCompleted =
    targetParticipant.assessmentCompletedAt != null && targetAnswers.length > 0;

  if (!targetCompleted) {
    return (
      <EventCompareMessage
        title="Vergleich noch nicht bereit"
        text="Das andere Event-Profil ist noch nicht vollstaendig und kann deshalb noch nicht verglichen werden."
        href={buildEventCardHref(event.slug)}
        ctaLabel="Zurueck zu meiner Event-Karte"
      />
    );
  }

  const targetProfile = deriveEventProfile({
    participant: targetParticipant,
    answers: targetAnswers,
  });

  const compareResult = buildEventCompareResult({
    participantAName: viewerProfileResult.participant.displayName,
    participantBName: targetParticipant.displayName,
    profileA: viewerProfileResult.profile,
    profileB: targetProfile,
    answersA: viewerProfileResult.answers,
    answersB: targetAnswers,
  });

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-5 py-10 sm:px-8 sm:py-12">
      <EventCompareView
        event={event}
        result={compareResult}
        backToCardHref={buildEventCardHref(event.slug)}
      />
    </main>
  );
}
