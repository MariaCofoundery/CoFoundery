import { redirect } from "next/navigation";

/**
 * „Wonach du suchst" — umgezogen nach FIND.
 *
 * ---------------------------------------------------------------------------
 * ZWEI ORTE FÜR DIESELBE FRAGE WAREN ZWEI SUCHEN
 * ---------------------------------------------------------------------------
 *
 * Hier stand bis zum 30.09.2026 eine eigene Themenwahl: fünf Abschnitte, zwei
 * Wünsche („ähnlich" / „anders") und eine Rangfolge. In FIND gibt es seit
 * heute dieselbe Frage mit einem anderen Modell — sechs Themen, drei
 * Richtungen, ein Gewicht — und dazu den praktischen Rahmen und die
 * Fähigkeiten.
 *
 * Wer beide ausgefüllt hätte, hätte zwei Suchen gehabt, die nichts
 * voneinander wissen. Die FIND-Spec ordnet die Frage in Abschnitt 1 fachlich
 * dorthin: ALIGN klärt, wie jemand arbeitet und was er aufbauen will; wen er
 * dafür sucht, gehört zur Suche.
 *
 * ---------------------------------------------------------------------------
 * DIE ALTEN ANGABEN BLEIBEN STEHEN
 * ---------------------------------------------------------------------------
 *
 * `discovery_alignment_topics` wird nicht geleert. Die Zeilen sind
 * Auskünfte von Menschen; sie werden nur nicht mehr vorgelegt und nirgends
 * mehr ausgewertet.
 *
 * Und keine Fehlerseite: Wer hier landet — über ein Lesezeichen oder einen
 * alten Link —, hat nichts falsch gemacht. Er will seine Suche sehen, und die
 * gibt es, nur woanders.
 */
export default async function AlignSearchPage() {
  redirect("/discovery/suche");
}
