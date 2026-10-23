"use client";

import { useTranslations } from "next-intl";

/**
 * Der Hinweis zur Testphase, unter dem Einladungsformular.
 *
 * Stand bis 23.10.2026 als eigene grosse Karte ueber dem Formular, mit
 * Ueberschrift "Starte euer Matching" und drei Erklaerabsaetzen - und das
 * Formular darunter hatte noch einmal eine Ueberschrift. Jetzt eine ruhige
 * Fussnote: Wer unterstuetzen will, findet es, wer nicht, wird nicht gedraengt.
 * Zahlung und Preis bleiben unveraendert.
 */
export function MatchingStartBlock() {
  const t = useTranslations("dashboard.inviteStart");

  return (
    <aside className="mt-6 rounded-2xl border border-slate-200 bg-white/70 px-5 py-4 text-sm leading-6 text-slate-600">
      <p>
        {t("eyebrow")}{" "}
        <a
          href="https://www.paypal.com/ncp/payment/ENC94PBCF5H7G"
          target="_blank"
          rel="noreferrer"
          className="font-semibold text-violet-700 underline underline-offset-2"
        >
          {t("supportCta")}
        </a>
      </p>
      <details className="mt-2">
        <summary className="cursor-pointer text-xs font-medium text-slate-500">{t("moreInfo")}</summary>
        <div className="mt-2 space-y-1 text-xs leading-5 text-slate-500">
          <p>{t("paymentWindowHint")}</p>
          <p>{t("invoiceHint")}</p>
          <p>{t("regularPrice")}</p>
        </div>
      </details>
    </aside>
  );
}
