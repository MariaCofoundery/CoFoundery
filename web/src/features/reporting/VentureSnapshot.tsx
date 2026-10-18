import type { SnapshotCard, SnapshotCardKey, SnapshotFact } from "@/features/reporting/ventureSnapshotModel";

/**
 * Die kompakte Sicht auf ein Vorhaben - thematische Karten (Phase 1.1).
 *
 * ZAHLEN STEHEN GROSS, SAETZE KURZ, STUFEN ALS MARKIERUNG. Bei einer Frage mit
 * geordneten Antworten ist EIN Segment markiert - das gewaehlte -, nicht alle
 * bis dorthin: Ein bis zur Antwort gefuellter Balken laese sich wie ein
 * Fuellstand, also wie ein Wert. Die Beschriftung der Antwort steht immer
 * darunter; die Segmente sind Schmuck (`aria-hidden`).
 */
export function VentureSnapshot({
  cards,
  copy,
}: {
  cards: SnapshotCard[];
  copy: {
    cardTitle: (key: SnapshotCardKey) => string;
    factLabel: (itemId: string) => string;
    number: (value: number) => string;
    money: (amount: number, currency: string) => string;
    unit: (unit: string) => string;
    detail: (detail: string) => string;
  };
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {cards.map((card) => (
        <section
          key={card.key}
          aria-labelledby={`venture-card-${card.key}`}
          className="rounded-2xl border border-slate-200/80 bg-white/95 p-5"
        >
          <h3 id={`venture-card-${card.key}`} className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            {copy.cardTitle(card.key)}
          </h3>
          <ul className="mt-3 space-y-4">
            {card.facts.map((fact) => (
              <li key={fact.itemId}>
                <p className="text-xs text-slate-500">{copy.factLabel(fact.itemId)}</p>
                <Fact fact={fact} copy={copy} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function Fact({
  fact,
  copy,
}: {
  fact: SnapshotFact;
  copy: Parameters<typeof VentureSnapshot>[0]["copy"];
}) {
  switch (fact.kind) {
    case "figure":
      return (
        <p className="mt-0.5 text-slate-900">
          <span className="text-2xl font-semibold tracking-tight">{copy.number(fact.number)}</span>{" "}
          <span className="text-sm text-slate-600">{copy.unit(fact.unit)}</span>
        </p>
      );
    case "money":
      return <p className="mt-0.5 text-2xl font-semibold tracking-tight text-slate-900">{copy.money(fact.amount, fact.currency)}</p>;
    case "scale":
      return (
        <div className="mt-1.5">
          <div className="flex gap-1" aria-hidden="true">
            {Array.from({ length: fact.of }, (_, index) => (
              <span
                key={index}
                className={`h-1.5 flex-1 rounded-full ${index + 1 === fact.position ? "bg-slate-800" : "bg-slate-200"}`}
              />
            ))}
          </div>
          <p className="mt-1.5 text-sm leading-6 text-slate-800">{fact.label}</p>
        </div>
      );
    case "statement":
      return (
        <p className="mt-0.5 text-sm leading-6 text-slate-800">
          {fact.text}
          {fact.detail ? <span className="text-slate-600"> · {copy.detail(fact.detail)}</span> : null}
        </p>
      );
    case "chips":
      return (
        <ul className="mt-1.5 flex flex-wrap gap-2">
          {fact.chips.map((chip) => (
            <li key={chip} className="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-800">
              {chip}
            </li>
          ))}
        </ul>
      );
    case "quote":
      return <p className="mt-0.5 text-sm italic leading-6 text-slate-800">{fact.text}</p>;
  }
}
