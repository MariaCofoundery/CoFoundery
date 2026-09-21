"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import { sendTestSuggestionNotificationAction } from "@/features/connect/suggestionNotificationActions";

const BUTTON =
  "inline-flex min-h-11 items-center rounded-full border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 disabled:opacity-60";

/**
 * Der Probelauf fuer die Vorschlags-Benachrichtigung.
 *
 * WARUM EIN EIGENER, obwohl es einen Testknopf fuer Mitteilungen schon gibt:
 * Der prueft den KANAL - kommt ueberhaupt etwas auf diesem Geraet an. Dieser
 * prueft die MELDUNG: beide Wege zusammen, mit den beiden Schaltern davor, die
 * verschiedene Voreinstellungen haben. Dass Mitteilungen ankommen, sagt
 * naemlich nichts darueber, ob die Mail eingeschaltet ist - und das ist genau
 * die Verwechslung, wegen der man sonst einen Tag auf den Zeitplan wartet.
 *
 * DIE ANTWORT SAGT, WAS TATSAECHLICH GESCHAH - je Weg getrennt. "Verschickt"
 * allein waere die Auskunft, die man nicht pruefen kann.
 */
export function SuggestionNotificationTest() {
  const t = useTranslations("dashboard");
  const [result, setResult] = useState<{
    pushed: number;
    mailed: number;
    emailAllowed: boolean;
  } | null>(null);
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();

  const send = () => {
    setResult(null);
    setFailed(false);
    startTransition(async () => {
      try {
        const sent = await sendTestSuggestionNotificationAction();
        setResult({ pushed: sent.pushed, mailed: sent.mailed, emailAllowed: sent.emailAllowed });
      } catch {
        setFailed(true);
      }
    });
  };

  return (
    <div className="mt-6 border-t border-slate-100 pt-5">
      <p className="text-sm font-medium text-slate-900">{t("account.suggestionTest.title")}</p>
      <p className="mt-1 text-xs leading-5 text-slate-500">{t("account.suggestionTest.text")}</p>

      <button type="button" disabled={pending} onClick={send} className={`${BUTTON} mt-3`}>
        {pending ? t("account.suggestionTest.pending") : t("account.suggestionTest.send")}
      </button>

      {failed ? (
        <p role="status" className="mt-3 text-sm leading-6 text-red-800">
          {t("account.suggestionTest.failed")}
        </p>
      ) : null}

      {result ? (
        <div role="status" className="mt-3 text-sm leading-6 text-slate-700">
          <p>
            {result.pushed > 0
              ? t("account.suggestionTest.pushed", { count: result.pushed })
              : t("account.suggestionTest.noDevice")}
          </p>
          {/* DREI ZUSTAENDE, NICHT ZWEI. "Keine Mail" kann heissen: nicht
              zugestimmt (dann ist alles in Ordnung) oder zugestimmt und
              trotzdem nichts (dann fehlt etwas am Versand). Das zu
              unterscheiden ist der Sinn dieses Knopfs. */}
          <p>
            {result.mailed > 0
              ? t("account.suggestionTest.mailed")
              : result.emailAllowed
                ? t("account.suggestionTest.mailFailed")
                : t("account.suggestionTest.mailOff")}
          </p>
        </div>
      ) : null}
    </div>
  );
}
