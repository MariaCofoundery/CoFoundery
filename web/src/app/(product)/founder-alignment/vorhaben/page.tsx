import { redirect } from "next/navigation";

/**
 * Das fruehere Venture-Alignment (v1, 42 Fragen) wird nicht mehr angeboten (Entscheidung vom 12.11.2026):
 * Die Beta ist die einzige Fassung. Gespeicherte Links und alte Wege landen deshalb dort.
 *
 * DIE ANTWORTEN BLEIBEN LESBAR: `/founder-alignment/vorhaben/antworten` und `/bestaetigen` sind unveraendert,
 * ebenso die Daten und das Instrument `venture-alignment-v1`. Es gibt keinen stillen Wechsel - die Beta fragt
 * selbst, ob identische Antworten aus v1 als Ausgangspunkt uebernommen werden sollen.
 */
export default async function VentureAlignmentRedirect({ searchParams }: { searchParams: Promise<{ venture?: string }> }) {
  const { venture } = await searchParams;
  redirect(`/founder-alignment/vorhaben/beta${venture ? `?venture=${encodeURIComponent(venture)}` : ""}`);
}
