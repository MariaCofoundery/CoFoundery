import type { ReadoutEntry, ReadoutValue } from "@/features/instruments/v21/readoutV21";

/**
 * Erwartungsdifferenzen: was jemand zusagt gegen das, was von ihm erwartet wird.
 *
 * ---------------------------------------------------------------------------
 * DER KONKRETESTE BEFUND IM GANZEN REPORT
 * ---------------------------------------------------------------------------
 *
 * „Maria kann 12 Stunden pro Woche einplanen. Alex erwartet von ihr 25." Das
 * ist etwas anderes als „ihr habt unterschiedliche Arbeitsstile" - es ist eine
 * Zahl, über die sich am Dienstag reden lässt.
 *
 * Und es ist eine Rechnung über ANGABEN, kein Befund über Menschen. Nicht
 * „geringes Commitment": Eine Vereinbarung kann die Erwartung ändern, und sie
 * kann auch die Zusage ändern. Was hier steht, ist der heutige Abstand
 * zwischen zwei Sätzen.
 *
 * ---------------------------------------------------------------------------
 * ERWARTUNGEN SIND GERICHTET
 * ---------------------------------------------------------------------------
 *
 * Was A von B erwartet, ist etwas anderes als das, was B von A erwartet.
 * Beides zu einer Zahl zu machen hieße, zwei Beziehungen zu einer zu
 * verschmelzen - und die Person, die zu viel erwartet, wäre dann von der
 * entlastet, die zu wenig erwartet.
 *
 * ---------------------------------------------------------------------------
 * DAS PROBLEM MIT DEM NAMEN
 * ---------------------------------------------------------------------------
 *
 * R02 erfasst je Person eine Erwartung, und die Person wird FREI GETIPPT -
 * „Jule", „meine Mitgründerin", „Rolle Tech". Es gibt keine Kennung, die auf
 * ein Konto zeigt.
 *
 * Deshalb wird hier nicht geraten. Eine Erwartung wird nur dann einer Person
 * zugeordnet, wenn es dabei nichts zu raten gibt: genau ein Eintrag in einem
 * Vergleich zwischen genau zwei Menschen. Alles andere kommt als „nicht
 * zuzuordnen" heraus und wird gezeigt, ohne behauptet zu werden.
 *
 * Eine falsch zugeordnete Erwartung wäre schlimmer als keine: Sie stellt einer
 * Person eine Forderung vor, die jemand anderem galt.
 */

export type Side = "a" | "b";

export type ExpectationGapV21 = {
  /** Wer erwartet. */
  from: Side;
  /** Wie die erwartende Person den Empfänger benannt hat. */
  recipientLabel: string;
  unit: string;
  expected: number;
  offered: number;
  /** `expected − offered`, nie negativ. Eine Beschreibung, kein Urteil. */
  shortfall: number;
};

export type UnmatchedExpectation = {
  from: Side;
  recipientLabel: string;
  expected: number | null;
  unit: string;
  /** Warum die Zuordnung offen bleibt. */
  why: "several_entries" | "no_offer" | "different_unit";
};

export type ExpectationResult = {
  gaps: ExpectationGapV21[];
  /** Erwartungen, die sich nicht zuordnen lassen - gezeigt, nicht behauptet. */
  unmatched: UnmatchedExpectation[];
};

type Offer = { number: number; unit: string } | null;

function offerOf(entry: ReadoutEntry | null | undefined): Offer {
  const value = entry?.value;
  if (!value || value.kind !== "number") return null;
  return { number: value.number, unit: value.unit };
}

type PerPerson = { person: string; number: number | null; unit: string };

function expectationsOf(entry: ReadoutEntry | null | undefined): PerPerson[] {
  const value = entry?.value as ReadoutValue | null | undefined;
  if (!value || value.kind !== "perPerson") return [];
  return value.per;
}

/**
 * Was jemand zusagt (R01) gegen das, was die andere Person von ihm erwartet (R02).
 */
export function expectationGapsV21(input: {
  a: { offer: ReadoutEntry | null; expectations: ReadoutEntry | null };
  b: { offer: ReadoutEntry | null; expectations: ReadoutEntry | null };
}): ExpectationResult {
  const gaps: ExpectationGapV21[] = [];
  const unmatched: UnmatchedExpectation[] = [];

  const sides: { side: Side; own: (typeof input)["a"]; other: (typeof input)["a"] }[] = [
    { side: "a", own: input.a, other: input.b },
    { side: "b", own: input.b, other: input.a },
  ];

  for (const { side, own, other } of sides) {
    const rows = expectationsOf(own.expectations);
    if (rows.length === 0) continue;

    // Die Erwartung trifft das Angebot der ANDEREN Seite.
    const offer = offerOf(other.offer);

    for (const row of rows) {
      // „Keine feste Stundenerwartung“ ist eine Erwartung und kein Fehlen -
      // aber sie erzeugt keinen Abstand.
      if (row.number === null) continue;

      if (!offer) {
        unmatched.push({
          from: side, recipientLabel: row.person, expected: row.number,
          unit: row.unit, why: "no_offer",
        });
        continue;
      }

      // NUR BEI GLEICHER EINHEIT. Stunden gegen Monate zu halten waere eine
      // erfundene Zahl.
      if (row.unit !== offer.unit) {
        unmatched.push({
          from: side, recipientLabel: row.person, expected: row.number,
          unit: row.unit, why: "different_unit",
        });
        continue;
      }

      // HIER WIRD NICHT GERATEN. Mehrere Eintraege heissen: Wir wissen nicht,
      // welcher die andere Person meint. Eine falsch zugeordnete Erwartung
      // stellt jemandem eine Forderung vor, die einem Dritten galt.
      if (rows.filter((entry) => entry.number !== null).length > 1) {
        unmatched.push({
          from: side, recipientLabel: row.person, expected: row.number,
          unit: row.unit, why: "several_entries",
        });
        continue;
      }

      const shortfall = row.number - offer.number;
      // Wer weniger erwartet als zugesagt wird, hat keine Differenz zu
      // besprechen - jedenfalls keine in diese Richtung.
      if (shortfall <= 0) continue;

      gaps.push({
        from: side,
        recipientLabel: row.person,
        unit: row.unit,
        expected: row.number,
        offered: offer.number,
        shortfall,
      });
    }
  }

  return { gaps, unmatched };
}
