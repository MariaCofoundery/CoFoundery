import Link from "next/link";
import type { EventRecord } from "@/features/events/eventTypes";
import { EventQrScanner } from "@/features/events/EventQrScanner";

type EventScanViewProps = {
  event: EventRecord;
  participantName: string;
  backToCardHref: string;
};

export function EventScanView({ event, participantName, backToCardHref }: EventScanViewProps) {
  return (
    <section className="rounded-[28px] border border-slate-200/80 bg-white/96 p-6 shadow-[0_18px_44px_rgba(15,23,42,0.06)] sm:p-8">
      <div className="max-w-3xl">
        <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Cofoundery Event Scanner</p>
        <h1 className="mt-3 text-3xl font-semibold leading-tight text-slate-950 sm:text-4xl">
          QR-Code scannen
        </h1>
        <p className="mt-4 text-sm font-medium text-slate-900">{participantName}</p>
        <p className="mt-3 text-sm leading-7 text-slate-700 sm:text-[15px]">
          Scanne den Event-QR-Code einer anderen teilnehmenden Person, um direkt den Vergleich zu oeffnen.
        </p>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
        <EventQrScanner eventSlug={event.slug} />

        <aside className="rounded-[24px] border border-slate-200/80 bg-slate-50/70 p-5">
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Hinweis</p>
          <p className="mt-3 text-sm leading-6 text-slate-700">
            Akzeptiert werden nur QR-Codes aus diesem Event. Andere Links oder QR-Codes werden nicht geoeffnet.
          </p>
          <Link
            href={backToCardHref}
            className="mt-5 inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Zurueck zu meiner Event-Karte
          </Link>
        </aside>
      </div>
    </section>
  );
}
