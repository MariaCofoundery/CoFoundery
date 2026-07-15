import Link from "next/link";
import type { EventProfile, EventRecord } from "@/features/events/eventTypes";
import { EventScaleTrack } from "@/features/events/EventScaleTrack";
import { generateEventQrCode } from "@/features/events/eventQrCode";

type EventParticipantCardProps = {
  event: EventRecord;
  participantName: string;
  profile: EventProfile;
  compareUrl: string;
  scanUrl: string;
};

export async function EventParticipantCard({
  event,
  participantName,
  profile,
  compareUrl,
  scanUrl,
}: EventParticipantCardProps) {
  const qrCode = await generateEventQrCode(compareUrl);

  return (
    <section className="rounded-[28px] border border-slate-200/80 bg-white/96 p-6 shadow-[0_18px_44px_rgba(15,23,42,0.06)] sm:p-8">
      <div className="max-w-3xl">
        <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Cofoundery Event Karte</p>
        <h1 className="mt-3 text-3xl font-semibold leading-tight text-slate-950 sm:text-4xl">
          {event.name}
        </h1>
        <p className="mt-4 text-sm font-medium text-slate-900">{participantName}</p>
        <p className="mt-3 text-sm leading-7 text-slate-700 sm:text-[15px]">
          Zeig deinen QR-Code, um dich mit anderen Teilnehmer:innen zu vergleichen.
        </p>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="rounded-[24px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(248,250,252,0.94),rgba(255,255,255,0.99))] p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Mini-Profil</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Dein Kurzprofil fuer gemeinsame Richtung, Tempo und Zusammenarbeit.
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {profile.scales.map((scale) => (
              <article
                key={scale.key}
                className="rounded-2xl border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.94))] px-4 py-3.5 shadow-[0_8px_20px_rgba(15,23,42,0.03)]"
              >
                <h2 className="text-sm font-semibold text-slate-950">{scale.label}</h2>
                <p className="mt-1 text-sm leading-5 text-slate-600">{scale.bandLabel}</p>
                <div className="mt-2.5">
                  <EventScaleTrack score={scale.score} variant="self" />
                </div>
              </article>
            ))}
          </div>
        </section>

        <aside className="rounded-[24px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.95))] p-5 shadow-[0_10px_24px_rgba(15,23,42,0.03)]">
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Dein QR-Code</p>
          <div className="mt-4 flex justify-center rounded-[24px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(248,250,252,0.92),rgba(246,241,234,0.38))] p-4">
            {qrCode.ok ? (
              <img
                src={qrCode.dataUrl}
                alt={`QR-Code fuer ${participantName}`}
                width={260}
                height={260}
                className="h-auto w-full max-w-[260px] rounded-2xl"
              />
            ) : (
              <div
                role="status"
                className="flex min-h-[260px] w-full max-w-[260px] flex-col items-center justify-center rounded-2xl bg-white px-5 text-center"
              >
                <p className="text-sm font-medium text-slate-800">QR-Code gerade nicht verfuegbar</p>
                <p className="mt-2 text-xs leading-6 text-slate-600">
                  Nutze bitte den Vergleichslink unterhalb.
                </p>
              </div>
            )}
          </div>

          <p className="mt-4 text-sm leading-6 text-slate-700">
            Andere Teilnehmende koennen darueber dein Event-Kurzprofil und den Vergleich mit ihrem eigenen Profil aufrufen.
          </p>

          <Link
            href={scanUrl}
            className="mt-4 inline-flex w-full items-center justify-center rounded-xl border border-[color:var(--brand-primary)] bg-[color:var(--brand-primary)] px-4 py-3 text-sm font-semibold text-slate-950 shadow-[0_10px_24px_rgba(103,232,249,0.18)] transition hover:bg-[color:var(--brand-primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-accent)]"
          >
            QR-Code einer anderen Person scannen
          </Link>

          <div className="mt-4 rounded-2xl border border-slate-200/80 bg-[linear-gradient(180deg,rgba(248,250,252,0.92),rgba(255,255,255,1))] p-4">
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Vergleichslink</p>
            <p className="mt-2 break-all text-xs leading-6 text-slate-600">{compareUrl}</p>
          </div>

          <p className="mt-4 text-xs leading-6 text-slate-500">
            Deine E-Mail ist im QR-Code nicht enthalten. Andere sehen nur dein Event-Kurzprofil und den Vergleich mit ihrem eigenen Profil.
            {" "}
            Deine Event-Antworten und dein Kurzprofil werden 24 Stunden nach Eventende geloescht.
          </p>
        </aside>
      </div>
    </section>
  );
}
