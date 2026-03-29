"use client";

import { ReportActionButton } from "@/features/reporting/ReportActionButton";

export function MatchingStartBlock() {
  return (
    <section className="rounded-[32px] border border-slate-200/80 bg-white/96 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:p-8">
      <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
        Aktuell in der Testphase kostenlos.
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-[-0.02em] text-slate-950 sm:text-4xl">
        Starte euer Matching
      </h1>
      <div className="mt-4 space-y-2 text-sm leading-7 text-slate-700">
        <p>Du lädst deinen Co-Founder ein.</p>
        <p>Danach bekommt ihr euren Matching-Report und arbeitet gemeinsam im Workbook.</p>
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <ReportActionButton href="#cofounder-invite-form" className="w-full justify-center sm:w-auto">
          Co-Founder einladen
        </ReportActionButton>
        <a
          href="https://www.paypal.com/ncp/payment/ENC94PBCF5H7G"
          target="_blank"
          rel="noreferrer"
          className="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 transition duration-200 ease-out hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 hover:shadow-[0_10px_24px_rgba(15,23,42,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-accent)] sm:w-auto"
        >
          Testphase unterstützen (39 €)
        </a>
      </div>

      <p className="mt-3 text-sm leading-6 text-slate-500">
        Die Zahlung öffnet ein neues Fenster. Danach könnt ihr hier einfach weitermachen.
      </p>
      <p className="mt-2 text-sm leading-6 text-slate-500">
        Wenn ihr eine Rechnung braucht, schickt uns eure Rechnungsdaten nach der Zahlung per E-Mail.
      </p>
      <p className="mt-4 text-xs leading-6 text-slate-400">
        Regulärer Preis später: 99 € pro Founder-Team
      </p>
    </section>
  );
}
