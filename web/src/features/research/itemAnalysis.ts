/**
 * Itemanalyse - die Rechnung, mit der ein Fragebogen besser wird.
 *
 * GEWÜNSCHT AM 23.09.2026: "Mir ist wichtig, dass das valide, reliabel,
 * objektiv ist - bestmöglich wissenschaftlichen Standards entspricht."
 *
 * WAS HIER GEHT UND WAS NICHT, und das ist der ehrliche Teil:
 *
 *   Reliabilität im Sinne interner Konsistenz lässt sich rechnen, sobald
 *   genug Antworten da sind. Das ist die Frage: Messen die sechs Items einer
 *   Dimension dasselbe?
 *
 *   Validität im Sinne von "misst es, was es soll" lässt sich damit NICHT
 *   beantworten. Dafür braucht es eine Faktorenanalyse (Struktur) und
 *   irgendwann ein Außenkriterium - siehe `docs/
 *   founder-compatibility-validation-plan.md`, Phase 4 und 5.
 *
 *   Objektivität im psychometrischen Sinn ist bei Selbstbericht nicht
 *   erreichbar. Was erreichbar ist - gleiche Reihenfolge, gleiche
 *   Formulierung, regelbasierte Auswertung - ist vorhanden.
 *
 * WOFÜR ES WIRKLICH TAUGT, und das ist mehr wert als eine Kennzahl: Es findet
 * die EINZELNEN Items, die nichts beitragen. Ein Item ohne Varianz (alle
 * kreuzen dasselbe an) misst nichts. Ein Item, das mit dem Rest seiner
 * Dimension nicht zusammenhängt, gehört woanders hin oder ist unverständlich.
 * Beides sieht man schon bei dreißig Antworten, lange vor jeder
 * Faktorenanalyse.
 */

/** Ab hier lohnt sich das Hinsehen überhaupt - darunter ist alles Rauschen. */
export const MIN_RESPONDENTS = 30;
/** Ein Item, das mit seiner Dimension darunter zusammenhängt, trägt kaum bei. */
export const WEAK_ITEM_TOTAL = 0.2;
/** Darüber sind Items oft Umformulierungen voneinander, nicht Messpunkte. */
export const REDUNDANT_ALPHA = 0.95;

export type ItemValues = { id: string; values: number[] };

export type ItemReport = {
  id: string;
  n: number;
  mean: number;
  sd: number;
  /** Wie viele verschiedene Antworten vorkommen - 1 heisst: trennt nicht. */
  distinct: number;
  /** Anteil der niedrigsten bzw. höchsten Stufe. */
  floorShare: number;
  ceilingShare: number;
  /** Korrigierte Trennschärfe: Zusammenhang mit dem Rest der Dimension. */
  itemTotal: number | null;
  notes: string[];
};

export type ScaleReport = {
  n: number;
  itemCount: number;
  alpha: number | null;
  items: ItemReport[];
  notes: string[];
};

function mean(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/** Stichprobenvarianz (n-1) - wir schätzen, wir zählen nicht aus. */
export function variance(values: number[]) {
  if (values.length < 2) return 0;
  const m = mean(values);
  return values.reduce((sum, value) => sum + (value - m) ** 2, 0) / (values.length - 1);
}

export function pearson(a: number[], b: number[]) {
  if (a.length !== b.length || a.length < 2) return null;
  const ma = mean(a);
  const mb = mean(b);
  let cov = 0;
  let va = 0;
  let vb = 0;
  for (let i = 0; i < a.length; i += 1) {
    const da = a[i]! - ma;
    const db = b[i]! - mb;
    cov += da * db;
    va += da * da;
    vb += db * db;
  }
  // Ohne Streuung gibt es keinen Zusammenhang - und auch keinen, der null
  // wäre. Null zurückzugeben hiesse "kein Zusammenhang gefunden", und das
  // wäre eine andere Aussage als "nicht berechenbar".
  if (va === 0 || vb === 0) return null;
  return cov / Math.sqrt(va * vb);
}

/**
 * Cronbachs Alpha.
 *
 * WAS ES IST: ein Maß dafür, wie einheitlich die Items einer Dimension
 * antworten. Kein Gütesiegel - ein hohes Alpha kann auch bedeuten, dass
 * dieselbe Frage sechsmal gestellt wurde.
 *
 * WAS ES NICHT IST: ein Beleg dafür, dass die Dimension misst, was ihr Name
 * sagt. Das ist eine andere Frage und braucht eine andere Rechnung.
 */
export function cronbachAlpha(items: ItemValues[]): number | null {
  const k = items.length;
  if (k < 2) return null;
  const n = items[0]!.values.length;
  if (n < 2 || items.some((item) => item.values.length !== n)) return null;

  const itemVariance = items.reduce((sum, item) => sum + variance(item.values), 0);
  const totals = Array.from({ length: n }, (_, index) =>
    items.reduce((sum, item) => sum + item.values[index]!, 0)
  );
  const totalVariance = variance(totals);
  if (totalVariance === 0) return null;

  return (k / (k - 1)) * (1 - itemVariance / totalVariance);
}

/** Der Zusammenhang eines Items mit dem REST seiner Dimension, nicht mit sich selbst. */
export function correctedItemTotal(items: ItemValues[], index: number) {
  if (items.length < 2) return null;
  const n = items[0]!.values.length;
  const rest = Array.from({ length: n }, (_, row) =>
    items.reduce((sum, item, i) => (i === index ? sum : sum + item.values[row]!), 0)
  );
  return pearson(items[index]!.values, rest);
}

export function describeItem(item: ItemValues): Omit<ItemReport, "itemTotal" | "notes"> {
  const values = item.values;
  const sorted = [...values].sort((a, b) => a - b);
  const lowest = sorted[0]!;
  const highest = sorted[sorted.length - 1]!;
  return {
    id: item.id,
    n: values.length,
    mean: mean(values),
    sd: Math.sqrt(variance(values)),
    distinct: new Set(values).size,
    floorShare: values.filter((value) => value === lowest).length / values.length,
    ceilingShare: values.filter((value) => value === highest).length / values.length,
  };
}

/**
 * Die ganze Auswertung einer Dimension - mit den Hinweisen, die wirklich
 * zählen.
 *
 * DIE HINWEISE SIND DER ERTRAG, nicht das Alpha. "Dieses Item trennt nicht"
 * ist eine Handlungsanweisung; "Alpha = 0,68" ist eine Zahl, über die man
 * diskutiert.
 */
export function analyseScale(items: ItemValues[]): ScaleReport {
  const n = items[0]?.values.length ?? 0;
  const alpha = cronbachAlpha(items);
  const notes: string[] = [];

  if (n < MIN_RESPONDENTS) notes.push("too_few_respondents");
  // Kein Alpha, obwohl genug Items da sind: Die Summe der Dimension streut
  // nicht. Das passiert, wenn sich Items gegenseitig exakt aufheben - und es
  // ist ein Befund, kein fehlender Wert.
  if (alpha === null && items.length >= 2 && n >= 2) notes.push("no_scale_variance");
  if (alpha !== null && alpha > REDUNDANT_ALPHA) notes.push("possibly_redundant_items");
  if (alpha !== null && alpha < 0) notes.push("negative_alpha_check_polarity");

  return {
    n,
    itemCount: items.length,
    alpha,
    notes,
    items: items.map((item, index) => {
      const described = describeItem(item);
      const itemTotal = correctedItemTotal(items, index);
      const itemNotes: string[] = [];

      // Ein Item, das alle gleich beantworten, misst nichts - egal wie gut
      // es formuliert ist.
      if (described.distinct <= 1) itemNotes.push("no_variance");
      if (described.floorShare > 0.9 || described.ceilingShare > 0.9) itemNotes.push("skewed");
      if (itemTotal === null && described.distinct > 1) itemNotes.push("not_computable");
      if (itemTotal !== null && itemTotal < 0) itemNotes.push("negative_check_polarity");
      else if (itemTotal !== null && itemTotal < WEAK_ITEM_TOTAL) itemNotes.push("weak");

      return { ...described, itemTotal, notes: itemNotes };
    }),
  };
}
