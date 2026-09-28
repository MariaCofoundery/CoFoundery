import type { DiscoveryTopicV21 } from "@/features/instruments/v21/discoveryTopicsV21";

/**
 * Was bei einer anderen Person zu deinen Themen passt.
 *
 * ---------------------------------------------------------------------------
 * JE THEMA EINE AUSKUNFT, UND KEINE ZUSAMMENFASSUNG
 * ---------------------------------------------------------------------------
 *
 * Wer vier Themen gewählt hat, sieht vier Antworten und keine fünfte, die sie
 * zusammenfasst. Eine Zahl darüber wäre der Passungswert - und die Begründung
 * gegen ihn ist nicht formal: Ein globaler Wert kann eine ausdrückliche
 * Haftungsgrenze durch mehrere harmlose Gemeinsamkeiten verdecken.
 *
 * ---------------------------------------------------------------------------
 * UNBEKANNT SIEHT NICHT AUS WIE „PASST NICHT“
 * ---------------------------------------------------------------------------
 *
 * Und die Basis steht dabei. Ein „passt“ auf Grundlage einer einzigen
 * gemeinsam beantworteten Frage ist etwas anderes als eines auf Grundlage von
 * vier - der Unterschied gehört dahin, wo das Ergebnis steht, nicht in eine
 * Fußnote.
 */

export type VerdictRow = {
  topic_key: string;
  rank: number;
  wish: string;
  fulfilment: "met" | "unmet" | "unknown";
  basis_comparable: number;
  basis_total: number;
};

export function DiscoveryVerdictsV21({
  verdicts,
  topics,
}: {
  verdicts: VerdictRow[];
  topics: DiscoveryTopicV21[];
}) {
  if (verdicts.length === 0) {
    return (
      <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        Du hast noch keine Themen gewählt. Ohne Themen gibt es nichts zu zeigen — und
        ausdrücklich keine Aussage darüber, wer zu dir passt.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {[...verdicts]
        .sort((a, b) => a.rank - b.rank)
        .map((verdict) => {
          const topic = topics.find((entry) => entry.key === verdict.topic_key);
          return (
            <li
              key={verdict.topic_key}
              className="rounded-xl border border-slate-200 bg-white p-4"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-sm font-medium text-slate-900">
                  {topic?.label ?? verdict.topic_key}
                  <span className="ml-2 text-xs font-normal text-slate-500">
                    du wolltest: {verdict.wish === "similar" ? "ähnlich" : "anders"}
                  </span>
                </p>
                {/* Kein Gruen, kein Rot. „Passt“ ist keine Bewertung der
                    Person, sondern eine Aussage ueber zwei Antworten. */}
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                  {verdict.fulfilment === "met"
                    ? "trifft zu"
                    : verdict.fulfilment === "unmet"
                      ? "trifft nicht zu"
                      : "noch nichts bekannt"}
                </span>
              </div>

              <p className="mt-1 text-xs text-slate-500">
                {verdict.fulfilment === "unknown"
                  ? `Von ${verdict.basis_total} ${
                      verdict.basis_total === 1 ? "Frage" : "Fragen"
                    } habt ihr keine gemeinsam beantwortet.`
                  : `auf Grundlage von ${verdict.basis_comparable} von ${verdict.basis_total} ${
                      verdict.basis_total === 1 ? "Frage" : "Fragen"
                    }`}
                {topic && verdict.fulfilment !== "unknown" && (
                  <> · ähnlich heißt hier: {topic.rule}</>
                )}
              </p>
            </li>
          );
        })}
    </ul>
  );
}
