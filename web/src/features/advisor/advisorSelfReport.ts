import { FOUNDER_DIMENSION_ORDER } from "@/features/reporting/founderDimensionMeta";
import type { SelfAlignmentReport, SelfRadarSeries } from "@/features/reporting/selfReportTypes";
import type { AppLocale } from "@/i18n/config";
import type { AdvisorPersonAlignment } from "@/features/advisor/personViewData";

/**
 * Aus dem abgelegten Abbild wird wieder ein Bericht.
 *
 * WARUM NICHT DER BERICHT SELBST ABGELEGT WIRD, steht in der Migration
 * 20261047120000: Ein abgelegter Text veraltet still. Abgelegt sind Zahlen;
 * die Saetze entstehen hier aus dem aktuellen Code - dieselben Bausteine, die
 * die Person auf ihrer eigenen Seite sieht.
 *
 * WAS BEWUSST LEER BLEIBT:
 *
 *   `debugA` - die Rechenwege je Dimension. Sie gehoeren der Person und
 *   niemandem sonst; ein Advisor braucht sie nicht, um ein Gespraech zu
 *   fuehren, und mit ihnen liesse sich auf einzelne Antworten zurueckrechnen.
 *
 *   `selfAssessmentMeta` - die Kennungen der Fragebogen. Sie sind ein Griff
 *   auf Zeilen, die niemand ausser der Person lesen darf; sie hier
 *   mitzugeben waere eine Einladung, es zu versuchen.
 *
 *   `participantAId` - die Nutzerkennung. Der Advisor kennt sie ohnehin aus
 *   der Adresse; in den Bericht gehoert sie nicht.
 *
 * FEHLENDE DIMENSIONEN WERDEN `null`, NICHT 0. Eine Null waere ein Messwert
 * an einem Ende der Skala - "diese Person ist maximal auf der einen Seite" -,
 * und das steht da, wo in Wahrheit nichts steht.
 */
export function buildAdvisorSelfReport({
  alignment,
  locale,
  name,
}: {
  alignment: AdvisorPersonAlignment;
  locale: AppLocale;
  name: string;
}): SelfAlignmentReport {
  const scores = FOUNDER_DIMENSION_ORDER.reduce((series, dimension) => {
    const value = alignment.scores[dimension];
    series[dimension] = typeof value === "number" ? value : null;
    return series;
  }, {} as SelfRadarSeries);

  return {
    sessionId: "advisor-view",
    locale,
    // Der Stand des Abbilds, nicht "jetzt": Ohne ihn saehe ein halbes Jahr
    // altes Bild aus wie ein heutiges.
    createdAt: alignment.updatedAt,
    participantAId: null,
    participantAName: name,
    scoresA: scores,
    keyInsights: [],
    conversationGuideQuestions: [],
    valuesModulePreview: "",
    valuesModuleStatus: alignment.valuesStatus,
    valuesAnsweredA: alignment.valuesAnswered,
    valuesTotal: alignment.valuesTotal,
    basisAnsweredA: alignment.basisAnswered,
    basisTotal: alignment.basisTotal,
    valuesIdentityCategoryA: null,
    valuesScoreA: null,
    requestedScope: alignment.valuesStatus === "completed" ? "basis_plus_values" : "basis",
    selfValuesProfile: (alignment.valuesProfile ?? null) as SelfAlignmentReport["selfValuesProfile"],
    debugA: { participantName: name, dimensions: [] },
  };
}

/**
 * Hat das Abbild ueberhaupt genug, um etwas zu zeigen?
 *
 * Ein Bericht ohne einen einzigen Dimensionswert waere eine Seite voller
 * Ueberschriften - und schlimmer: Die Textbausteine wuerden aus lauter
 * Nullen ein Muster erzeugen, das es nicht gibt.
 */
export function hasUsableAlignment(alignment: AdvisorPersonAlignment | null): boolean {
  if (!alignment) return false;
  return FOUNDER_DIMENSION_ORDER.some(
    (dimension) => typeof alignment.scores[dimension] === "number"
  );
}
