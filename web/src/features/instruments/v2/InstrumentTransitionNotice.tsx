"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { decideInstrumentTransition } from "@/features/instruments/v2/instrumentTransitionActions";
import { TRANSITION_CONSEQUENCES } from "@/features/instruments/v2/instrumentTransition";

/**
 * „Es gibt eine neue Fassung des Fragebogens."
 *
 * BEIDE WEGE STEHEN GLEICHWERTIG NEBENEINANDER. Kein hervorgehobener Knopf
 * für „neu machen" und kein grauer Link für „behalten". Wer seinen Report
 * behalten möchte, trifft damit keine schlechtere Wahl - und ein Hinweis, der
 * eine Antwort optisch bevorzugt, fragt nicht, sondern drängt.
 *
 * UND ES GIBT KEIN WEGKLICKEN OHNE ANTWORT. Ein „später" wäre bequem und
 * würde dazu führen, dass der Hinweis bei jedem Besuch wieder auftaucht -
 * bis er nicht mehr gelesen wird. Wer sich nicht entscheiden will, behält
 * einfach seinen Report; das ist die ehrliche Vorbelegung.
 */
export function InstrumentTransitionNotice({ onDone }: { onDone?: () => void }) {
  const t = useTranslations("alignment");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<"keep_previous" | "retake" | null>(null);

  if (done) {
    return (
      <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
        {t(`transition.confirmed.${done}`)}
      </p>
    );
  }

  const choose = async (decision: "keep_previous" | "retake") => {
    setBusy(true);
    const result = await decideInstrumentTransition(decision);
    setBusy(false);
    if (result.ok) {
      setDone(decision);
      onDone?.();
    }
  };

  return (
    <section className="rounded-xl border border-slate-300 bg-white p-5">
      <h2 className="text-lg font-semibold text-slate-900">{t("transition.title")}</h2>
      <p className="mt-2 text-slate-700">{t("transition.intro")}</p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {(["keep_previous", "retake"] as const).map((decision) => (
          <div key={decision} className="rounded-lg border border-slate-200 p-4">
            <p className="font-medium text-slate-900">{t(`transition.${decision}.title`)}</p>
            <p className="mt-2 text-sm text-slate-700">{TRANSITION_CONSEQUENCES[decision].keeps}</p>
            {/* DIE FOLGE STEHT DANEBEN, NICHT IM KLEINGEDRUCKTEN. Dass ein
                Vergleich über zwei Fassungen hinweg nicht geht, wäre eine böse
                Überraschung, wenn es erst beim Vergleich aufträte. */}
            <p className="mt-2 text-sm text-slate-500">{TRANSITION_CONSEQUENCES[decision].costs}</p>
            <button
              type="button"
              disabled={busy}
              onClick={() => choose(decision)}
              className="mt-4 w-full rounded-lg border border-slate-900 px-3 py-2 text-sm font-medium text-slate-900 disabled:opacity-50"
            >
              {t(`transition.${decision}.action`)}
            </button>
          </div>
        ))}
      </div>

      <p className="mt-4 text-xs text-slate-500">{t("transition.reversible")}</p>
    </section>
  );
}
