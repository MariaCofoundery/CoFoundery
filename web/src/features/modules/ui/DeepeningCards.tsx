import type { DeepeningCardModel } from "@/features/modules/deepeningCards";
import { DeepeningCard, type DeepeningCardCopy } from "@/features/modules/ui/DeepeningCard";

export type DeepeningCardEntry = { model: DeepeningCardModel; copy: DeepeningCardCopy };

/**
 * Die Vertiefungen eines Core-Bereichs - hoechstens drei sichtbar, der Rest
 * hinter „Weitere Vertiefungen".
 *
 * Nur im Bildschirm, nicht im Druck (`no-print`): Vertiefungen werden nicht
 * standardmaessig gedruckt. Keine neue Navigation, kein eigener Block mit
 * Fortschritt - nur ein leiser Abschnitt unter dem Core-Bereich, an dem sie
 * haengen.
 */
export function DeepeningCards({
  visible,
  more,
  copy,
}: {
  visible: readonly DeepeningCardEntry[];
  more: readonly DeepeningCardEntry[];
  copy: { heading: string; intro: string; more: string };
}) {
  if (visible.length === 0) return null;

  return (
    <section className="no-print mt-8" aria-label={copy.heading}>
      <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{copy.heading}</h3>
      <p className="mt-1 text-sm text-slate-500">{copy.intro}</p>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map(({ model, copy: cardCopy }) => (
          <DeepeningCard key={model.moduleId} model={model} copy={cardCopy} />
        ))}
      </ul>
      {more.length > 0 ? (
        <details className="mt-3">
          <summary className="inline-flex min-h-11 cursor-pointer items-center text-sm font-medium text-slate-600">
            {copy.more}
          </summary>
          <ul className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {more.map(({ model, copy: cardCopy }) => (
              <DeepeningCard key={model.moduleId} model={model} copy={cardCopy} />
            ))}
          </ul>
        </details>
      ) : null}
    </section>
  );
}
