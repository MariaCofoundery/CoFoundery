import Link from "next/link";
import { redirect } from "next/navigation";
import { EventCheckForm } from "@/features/events/EventCheckForm";
import { EVENT_QUESTIONS } from "@/features/events/eventQuestions";
import { saveEventAnswers } from "@/features/events/eventActions";
import { getCurrentEventParticipantProfile, getLiveEventBySlug, normalizeEventSlug } from "@/features/events/eventData";

function eventCheckErrorMessage(error: string | undefined) {
  switch ((error ?? "").trim()) {
    case "missing_answers":
      return "Bitte beantworte alle Fragen, bevor du dein Event-Profil erstellst.";
    case "saving_failed":
      return "Deine Antworten konnten gerade nicht gespeichert werden. Bitte versuche es erneut.";
    case "session_missing":
      return "Deine Event-Session ist nicht mehr aktiv. Bitte starte den Event-Check erneut.";
    default:
      return null;
  }
}

function buildEventCheckErrorHref(eventSlug: string, errorCode: string) {
  return `/event/${encodeURIComponent(eventSlug)}/check?error=${encodeURIComponent(errorCode)}`;
}

export default async function EventCheckPage({
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
            Dieser Event-Check ist gerade nicht aktiv. Bitte pruefe den Link oder wende dich an das Event-Team.
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
  const participantProfile = await getCurrentEventParticipantProfile(liveEvent.slug);

  if (!participantProfile.ok) {
    redirect(`/event/${encodeURIComponent(liveEvent.slug)}`);
  }

  if (participantProfile.completed) {
    redirect(`/event/${encodeURIComponent(liveEvent.slug)}/me`);
  }

  async function saveEventCheckAction(formData: FormData) {
    "use server";

    const answers = EVENT_QUESTIONS.map((question) => {
      const rawValue = String(formData.get(question.key) ?? "").trim();
      return {
        questionKey: question.key,
        answerValue: rawValue === "" ? Number.NaN : Number(rawValue),
      };
    });

    if (answers.some((answer) => !Number.isFinite(answer.answerValue))) {
      redirect(buildEventCheckErrorHref(liveEvent.slug, "missing_answers"));
    }

    const result = await saveEventAnswers({
      eventSlug: liveEvent.slug,
      answers,
    });

    if (!result.ok) {
      const errorCode =
        result.error.includes("Session")
          ? "session_missing"
          : "saving_failed";
      redirect(buildEventCheckErrorHref(liveEvent.slug, errorCode));
    }

    redirect(result.nextHref);
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-5 py-10 sm:px-8 sm:py-12">
      <EventCheckForm
        event={liveEvent}
        participantName={participantProfile.participant.displayName}
        existingAnswers={participantProfile.answers}
        errorMessage={eventCheckErrorMessage(query.error)}
        action={saveEventCheckAction}
      />
    </main>
  );
}
