"use client";

import { useMemo, useState } from "react";
import { ReportActionButton } from "@/features/reporting/ReportActionButton";

type Props = {
  invitationId: string;
  children: React.ReactNode;
};

const STATIC_ACCESS_CODE = "ALIGN99";

function normalizeCode(value: string) {
  return value.trim().toUpperCase();
}

function storageKey(invitationId: string) {
  return `founder_alignment_access:${invitationId}`;
}

export function FounderAlignmentPaywallGate({ invitationId, children }: Props) {
  const [isUnlocked, setIsUnlocked] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    try {
      return window.sessionStorage.getItem(storageKey(invitationId)) === "granted";
    } catch {
      return false;
    }
  });
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);
  const validAccessCode = useMemo(
    () =>
      normalizeCode(process.env.NEXT_PUBLIC_FOUNDER_ALIGNMENT_ACCESS_CODE?.trim() || STATIC_ACCESS_CODE),
    []
  );

  function unlockAccess() {
    try {
      window.sessionStorage.setItem(storageKey(invitationId), "granted");
    } catch {
      // Ignore storage issues and keep the unlock local to the page state.
    }
    setIsUnlocked(true);
    setCodeError(null);
  }

  function applyCode() {
    if (normalizeCode(code) === validAccessCode) {
      unlockAccess();
      return;
    }

    setCodeError("Der Code ist nicht gültig.");
  }

  if (isUnlocked) {
    return <>{children}</>;
  }

  return (
    <section className="mx-auto w-full max-w-[680px] px-4 py-8 sm:px-6 sm:py-12">
      <div className="rounded-[32px] border border-slate-200/80 bg-white/96 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:p-8">
        <div className="space-y-6">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">Founder Alignment</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.02em] text-slate-950 sm:text-4xl">
              Klaert eure Zusammenarbeit, bevor sie schwierig wird.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-700">
              Ihr bekommt euren Matching-Report und arbeitet danach gemeinsam im Workbook an
              klaren Regeln fuer eure Zusammenarbeit.
            </p>
          </div>

          <div className="rounded-[24px] border border-slate-200/70 bg-slate-50/65 px-5 py-5">
            <p className="text-sm font-medium text-slate-900">
              Du bist jetzt im Start eurer Founder-Session.
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              Im naechsten Schritt startest du das Matching und laedst deinen Co-Founder ein.
            </p>
          </div>

          <div className="rounded-[24px] border border-[color:var(--brand-primary)]/18 bg-[color:var(--brand-primary)]/7 px-5 py-5">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
              Aktuell in der Testphase
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-700">
              Ihr koennt das Produkt derzeit kostenlos starten und direkt nutzen.
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              Der regulaere Preis liegt bei 99 € pro Founder-Team.
            </p>
          </div>

          <div className="rounded-[24px] border border-slate-200/80 bg-white px-5 py-5">
            <div>
              <ReportActionButton onClick={unlockAccess} className="w-full justify-center py-3 text-base">
                In Testphase starten
              </ReportActionButton>
            </div>
            <div className="mt-4 rounded-[18px] border border-slate-200/70 bg-slate-50/55 px-4 py-4">
              <p className="text-sm leading-6 text-slate-700">
                Du startest den Prozess und laedst deinen Co-Founder ein.
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                Ihr arbeitet danach gemeinsam weiter.
              </p>
            </div>
          </div>

          <div className="space-y-3 rounded-[24px] border border-slate-200/80 bg-slate-50/70 p-5">
            <div className="rounded-2xl bg-white/82 px-4 py-3">
              <p className="text-sm font-semibold text-slate-900">Matching-Report</p>
              <p className="mt-1 text-sm leading-6 text-slate-700">
                zeigt, was euch traegt, wo ihr unterschiedlich denkt und wo ihr klare
                Entscheidungen braucht.
              </p>
            </div>
            <div className="rounded-2xl bg-white/82 px-4 py-3">
              <p className="text-sm font-semibold text-slate-900">Workbook</p>
              <p className="mt-1 text-sm leading-6 text-slate-700">
                fuehrt euch Schritt fuer Schritt zu konkreten Vereinbarungen.
              </p>
            </div>
            <div className="rounded-2xl bg-white/82 px-4 py-3">
              <p className="text-sm font-semibold text-slate-900">Ergebnis</p>
              <p className="mt-1 text-sm leading-6 text-slate-700">
                klare Regeln fuer Entscheidungen, Rollen und Zusammenarbeit.
              </p>
            </div>
          </div>

          <div className="rounded-[24px] border border-slate-200/70 bg-slate-50/55 px-5 py-5">
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">
              Regulärer Preis
            </p>
            <p className="mt-2 text-base font-semibold text-slate-900">Einmalig 99 € pro Founder-Team</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Kein Abo. Ihr arbeitet in eurem Tempo.
            </p>
          </div>

          <div className="rounded-[24px] border border-slate-200/70 bg-slate-50/60 px-5 py-5">
            <p className="text-sm leading-6 text-slate-700">
              Ihr könnt das Produkt aktuell in der Testphase kostenlos nutzen.
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              Wenn es euch hilft, könnt ihr die Testphase gern mit 39 € unterstützen.
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              So können wir das Produkt weiter verbessern und ausbauen.
            </p>
            <div className="mt-4">
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
          </div>

          <div className="rounded-[22px] border border-slate-200/80 bg-slate-50/70 px-4 py-4">
            <p className="text-sm font-medium text-slate-900">Wenn ihr eine Rechnung braucht:</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Schickt uns nach der Zahlung bitte eure Rechnungsdaten per E-Mail an:
            </p>
            <p className="mt-2 text-sm font-medium text-slate-900">
              business.mariaschulz@gmail.com
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Ihr bekommt die Rechnung dann direkt von uns zugeschickt.
            </p>
          </div>

          <div className="rounded-[22px] border border-slate-200/70 bg-slate-50/55 px-4 py-4">
            <p className="text-sm font-medium text-slate-700">Du hast einen Zugangscode?</p>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                value={code}
                onChange={(event) => {
                  setCode(event.target.value);
                  if (codeError) setCodeError(null);
                }}
                placeholder="Code eingeben"
                className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
              />
              <ReportActionButton onClick={applyCode} variant="utility" className="shrink-0 justify-center">
                Code anwenden
              </ReportActionButton>
            </div>
            {codeError ? <p className="mt-2 text-sm text-rose-700">{codeError}</p> : null}
          </div>
        </div>
      </div>
    </section>
  );
}
