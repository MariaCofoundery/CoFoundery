import type { ConversationCardV21 } from "@/features/instruments/v21/conversationCardsV21";

/**
 * Die Gesprächskarten.
 *
 * ---------------------------------------------------------------------------
 * DER VIERSCHRITT IST SICHTBAR, NICHT NUR EINGEHALTEN
 * ---------------------------------------------------------------------------
 *
 * Beobachtung, mögliche Bedeutung, Frage, Vereinbarung stehen als vier
 * getrennte Zeilen da. Sie zu einem Absatz zu verschmelzen läse sich flüssiger
 * und wäre falsch: Dann sieht man der Bedeutung nicht mehr an, dass sie eine
 * Möglichkeit ist und keine Beobachtung.
 *
 * Und die Quelle steht dabei. Wer wissen will, woher ein Satz kommt, soll es
 * nachlesen können - ohne das ist „aus einer geprüften Bibliothek“ eine
 * Behauptung.
 */
export function ConversationCardsView({ cards }: { cards: ConversationCardV21[] }) {
  if (cards.length === 0) {
    return (
      <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        Noch keine Karten. Sie entstehen aus euren Antworten — je mehr ihr beide
        beantwortet habt, desto mehr gibt es zu besprechen.
      </p>
    );
  }

  return (
    <ol className="space-y-4">
      {cards.map((card) => (
        <li key={card.id} className="rounded-xl border border-slate-200 bg-white p-5">
          {card.section && (
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
              {card.section}
            </p>
          )}

          <p className="mt-2 text-base text-slate-900">{card.observed}</p>

          {/* MOEGLICHE BEDEUTUNG - und das Wort steht dran. Ohne die
              Ueberschrift liest sich der Satz wie eine Feststellung. */}
          <div className="mt-3">
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
              mögliche Bedeutung
            </p>
            <p className="mt-0.5 text-sm text-slate-700">{card.meaning}</p>
          </div>

          <p className="mt-3 text-base font-medium text-slate-900">{card.question}</p>

          <div className="mt-3">
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">
              woraus eine Vereinbarung bestehen sollte
            </p>
            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-slate-700">
              {card.agreement.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>

          <p className="mt-3 text-xs text-slate-400">{card.source}</p>
        </li>
      ))}
    </ol>
  );
}
