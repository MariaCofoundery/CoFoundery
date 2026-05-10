import Link from "next/link";
import { redirect } from "next/navigation";
import { EventLandingForm } from "@/features/events/EventLandingForm";
import { upsertEventParticipant } from "@/features/events/eventActions";
import { getLiveEventBySlug, normalizeEventSlug } from "@/features/events/eventData";

function eventLandingErrorMessage(error: string | undefined) {
  switch ((error ?? "").trim()) {
    case "invalid_name":
      return "Bitte gib einen Anzeigenamen mit mindestens zwei Zeichen ein.";
    case "invalid_email":
      return "Bitte gib eine gueltige E-Mail-Adresse ein.";
    case "missing_compare_consent":
      return "Bitte stimme der Nutzung deines Event-Profils fuer Vergleiche innerhalb dieses Events zu.";
    case "missing_visibility_consent":
      return "Bitte stimme zu, dass andere Event-Teilnehmende dein Kurzprofil ueber deinen QR-Code vergleichen koennen.";
    case "event_not_found":
      return "Dieses Event ist aktuell nicht verfuegbar.";
    case "participant_prepare_failed":
      return "Dein Event-Zugang konnte gerade nicht vorbereitet werden. Bitte versuche es erneut.";
    default:
      return null;
  }
}

function buildEventLandingErrorHref(eventSlug: string, errorCode: string) {
  return `/event/${encodeURIComponent(eventSlug)}?error=${encodeURIComponent(errorCode)}`;
}

export default async function EventLandingPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventSlug: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { eventSlug } = await params;
  const query = await searchParams;
  const normalizedSlug = normalizeEventSlug(eventSlug);
  const event = await getLiveEventBySlug(normalizedSlug);

  if (!event) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-3xl px-5 py-14 sm:px-8">
        <section className="rounded-[28px] border border-slate-200/80 bg-white/96 p-8 text-center shadow-[0_18px_44px_rgba(15,23,42,0.06)]">
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Cofoundery Event</p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-950">Event aktuell nicht verfuegbar</h1>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            Dieser Event-Link ist gerade nicht aktiv. Bitte pruefe den Link oder wende dich an das Event-Team.
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

  const liveEvent = event;

  async function startEventCheckAction(formData: FormData) {
    "use server";

    const result = await upsertEventParticipant({
      eventSlug: liveEvent.slug,
      displayName: String(formData.get("displayName") ?? ""),
      email: String(formData.get("email") ?? ""),
      consentCompare: String(formData.get("consentCompare") ?? "") === "yes",
      consentVisibility: String(formData.get("consentVisibility") ?? "") === "yes",
    });

    if (!result.ok) {
      redirect(buildEventLandingErrorHref(liveEvent.slug, result.code));
    }

    redirect(result.nextHref);
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-5 py-14 sm:px-8">
      <EventLandingForm
        event={liveEvent}
        errorMessage={eventLandingErrorMessage(query.error)}
        action={startEventCheckAction}
      />
    </main>
  );
}
