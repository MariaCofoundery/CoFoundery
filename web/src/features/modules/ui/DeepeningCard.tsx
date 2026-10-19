import Link from "next/link";

import type { DeepeningCardModel } from "@/features/modules/deepeningCards";

export type DeepeningCardCopy = {
  title: string;
  summary: string;
  stateLabel: string;
  cta: string;
};

/**
 * Eine Vertiefungskarte - kompakt und sekundaer zum Core.
 *
 * DREI ZUSTAENDE, KEINER IST EINE LUECKE:
 *
 *   available    gestrichelt und leise: ein Angebot. Keine Warnfarbe, kein
 *                „fehlt" - eine nicht begonnene Vertiefung ist nichts, was
 *                dem Profil fehlt.
 *   in_progress  durchgezogener Rand, „Begonnen".
 *   completed    etwas praesenter: ein bis zwei kurze Saetze, Details hinter dem Klick.
 *
 * Keine Prozentzahl, kein „x von y", kein Balken. Die Texte kommen von aussen
 * (Registry-Titel und Sprachbundle); hier steht kein Modulname.
 */
const SHELL: Record<DeepeningCardModel["state"], string> = {
  available: "border border-dashed border-slate-300 bg-white/40",
  in_progress: "border border-slate-300 bg-white/70",
  completed: "border border-slate-200 bg-white shadow-sm",
};

const LABEL: Record<DeepeningCardModel["state"], string> = {
  available: "text-slate-500",
  in_progress: "text-slate-600",
  completed: "text-emerald-800",
};

export function DeepeningCard({ model, copy }: { model: DeepeningCardModel; copy: DeepeningCardCopy }) {
  return (
    <li className={`rounded-2xl p-4 ${SHELL[model.state]}`} data-deepening-state={model.state}>
      <p className={`text-xs font-semibold uppercase tracking-[0.12em] ${LABEL[model.state]}`}>{copy.stateLabel}</p>
      <h4 className="mt-1.5 text-sm font-semibold text-slate-900">{copy.title}</h4>
      {model.state === "completed" && model.teaser.length > 0 ? (
        <ul className="mt-1.5 space-y-1">
          {model.teaser.map((line) => (
            <li key={line} className="text-sm leading-6 text-slate-700">
              {line}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1.5 text-sm leading-6 text-slate-600">{copy.summary}</p>
      )}
      <Link
        href={model.href}
        className="mt-2 inline-flex min-h-11 items-center text-sm font-medium text-slate-700 underline underline-offset-2"
      >
        {copy.cta}
      </Link>
    </li>
  );
}
