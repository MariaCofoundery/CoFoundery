import { getReportContent } from "@/features/reporting/content/reportContent";
import { FOUNDER_DIMENSION_ORDER } from "@/features/reporting/founderDimensionMeta";
import { getSelfReportChrome } from "@/features/reporting/selfReportChrome";
import { type SelfAlignmentReport } from "@/features/reporting/selfReportTypes";

export function getDimensionOverviewContent(
  scores: SelfAlignmentReport["scoresA"],
  locale?: string | null
) {
  const reportContent = getReportContent(locale);
  const chrome = getSelfReportChrome(locale);

  return {
    eyebrow: chrome.labels.dimensionOverviewEyebrow,
    title: chrome.labels.dimensionOverviewTitle,
    rows: FOUNDER_DIMENSION_ORDER.map((dimension) => {
      const dimensionContent = reportContent.dimensions[dimension];

      return {
        dimension,
        score: scores[dimension],
        label: dimensionContent.shortLabel,
        leftLabel: dimensionContent.reportLeftPole,
        rightLabel: dimensionContent.reportRightPole,
      };
    }),
  };
}
