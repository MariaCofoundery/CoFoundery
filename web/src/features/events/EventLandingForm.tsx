import type { EventRecord } from "@/features/events/eventTypes";

type EventLandingFormProps = {
  event: EventRecord;
  errorMessage: string | null;
  action: (formData: FormData) => Promise<void>;
};

export function EventLandingForm({ event, errorMessage, action }: EventLandingFormProps) {
  return (
    <section className="rounded-[28px] border border-slate-200/80 bg-white/96 p-6 shadow-[0_18px_44px_rgba(15,23,42,0.06)] sm:p-8">
      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Cofoundery Event</p>
      <h1 className="mt-3 text-3xl font-semibold leading-tight text-slate-950 sm:text-4xl">
        {event.name}
      </h1>
      <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-700 sm:text-[15px]">
        Mach den kurzen Cofoundery Event-Check und vergleiche dich danach per QR-Code mit anderen Teilnehmenden.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4">
          <p className="text-sm font-medium text-slate-900">Eigene Dynamik</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Mache deine Gruender-Dynamik in wenigen Minuten sichtbar.
          </p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4">
          <p className="text-sm font-medium text-slate-900">QR fuer Vergleiche</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Erhalte einen persoenlichen QR-Code fuer schnelle Vergleiche auf dem Event.
          </p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-4">
          <p className="text-sm font-medium text-slate-900">Bessere Gespraeche</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Bekomme Gespraechsimpulse fuer klarere, spannendere Founder-Matches.
          </p>
        </article>
      </div>

      {errorMessage ? (
        <p className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMessage}
        </p>
      ) : null}

      <form action={action} className="mt-6 grid gap-4">
        <div className="grid gap-2">
          <label htmlFor="displayName" className="text-sm font-medium text-slate-900">
            Anzeigename oder Vorname
          </label>
          <input
            id="displayName"
            name="displayName"
            type="text"
            required
            placeholder="Zum Beispiel Alex"
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
          />
        </div>

        <div className="grid gap-2">
          <label htmlFor="email" className="text-sm font-medium text-slate-900">
            E-Mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="name@firma.de"
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
          />
        </div>

        <div className="mt-1 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50/65 p-4">
          <label className="flex items-start gap-3 text-sm leading-6 text-slate-700">
            <input
              name="consentCompare"
              type="checkbox"
              value="yes"
              required
              className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
            />
            <span>
              Ich bin einverstanden, dass mein Event-Profil fuer Vergleiche innerhalb dieses Events genutzt wird.
            </span>
          </label>

          <label className="flex items-start gap-3 text-sm leading-6 text-slate-700">
            <input
              name="consentVisibility"
              type="checkbox"
              value="yes"
              required
              className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
            />
            <span>
              Ich bin einverstanden, dass andere Event-Teilnehmende mein Kurzprofil ueber meinen QR-Code vergleichen koennen.
            </span>
          </label>
        </div>

        <p className="text-xs leading-6 text-slate-500">
          Deine E-Mail wird nicht in deinem QR-Profil angezeigt. Dein QR-Code zeigt nur dein Event-Kurzprofil und Vergleichshinweise innerhalb dieses Events.
          {" "}
          Event-Daten sind temporaer und werden 24 Stunden nach Eventende entfernt.
        </p>

        <div className="pt-2">
          <button
            type="submit"
            className="inline-flex w-full items-center justify-center rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 sm:w-auto"
          >
            Event-Check starten
          </button>
        </div>
      </form>
    </section>
  );
}
