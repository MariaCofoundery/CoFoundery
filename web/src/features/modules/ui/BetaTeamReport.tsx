import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";

import { alignmentDisplayText } from "@/features/instruments/align/display";
import { answerText, type AnswerTextContext } from "@/features/modules/ventureBeta/answerText";
import type { CompareCell, ItemResult } from "@/features/modules/ventureBeta/compare";
import { setupTopicFor } from "@/features/modules/ventureBeta/handoff";
import { BETA_REPORT_GROUPS, findBetaItem } from "@/features/modules/ventureBeta/registry";
import { answerContextFor } from "@/features/modules/ui/betaFormat";
import type { AppLocale } from "@/i18n/config";

/**
 * Der gemeinsame Teamreport der Beta - nach Gespraechsthemen, nicht 19 gleichartige Karten.
 *
 * Fuenf Gruppen („Wohin wollt ihr?", Rolle und Einsatz, Geld und Risiko, Tempo und Qualitaet,
 * Entscheiden und Informieren). In jeder Gruppe stehen die Gespraechsanlaesse vorn:
 *
 *   needs_clarification  „Das solltet ihr konkret abstimmen" - KEINE Warnung, kein Risikoindikator,
 *   conversation_only    „Gespraechsimpulse" - ein Gespraech lohnt, ohne dass etwas zu klaeren waere,
 *   neutral_difference   „Unterschiede" - neutral aufgefuehrt,
 *   same / none          „Gemeinsame Antworten" - kompakt.
 *
 * Kein Score, keine Ampel, kein Match-Prozent, kein Ranking, kein Mittelwert. Namen stehen hier, weil
 * die Datenbank den Bericht erst bei vollstaendiger Bereitschaft liefert. Derselbe Bericht fuer jedes
 * aktuelle Mitglied; nur die eigene Spalte heisst „Du". Antworten werden nie automatisch zu einer
 * Vereinbarung - nur der Verweis „Im Founder Setup vereinbaren".
 */
type Bucket = "clarify" | "impulse" | "differences" | "common";

const bucketOf = (signal: ItemResult["signal"]): Bucket =>
  signal === "needs_clarification"
    ? "clarify"
    : signal === "conversation_only"
      ? "impulse"
      : signal === "neutral_difference"
        ? "differences"
        : "common";

export async function BetaTeamReport({ results, teamId }: { results: readonly ItemResult[]; teamId: string }) {
  const [t, localeRaw] = await Promise.all([getTranslations("ventureBeta"), getLocale()]);
  const locale = localeRaw as AppLocale;
  const ctx = answerContextFor(locale);
  const byId = new Map(results.map((result) => [result.itemId, result]));

  const who = (cell: { isViewer: boolean; name: string }) => (cell.isViewer ? t("report.you") : cell.name);
  const answerOf = (itemId: string, cell: CompareCell, c: AnswerTextContext) => {
    const item = findBetaItem(itemId);
    const text = item ? answerText(item, cell.answer, c) : "";
    return text || t("report.noAnswer");
  };

  const topicLink = (itemId: string, differs: boolean) => {
    const topic = setupTopicFor(itemId, differs);
    return topic ? (
      <Link
        href={`/teams/${encodeURIComponent(teamId)}/setup/${topic}`}
        className="mt-3 inline-flex min-h-10 items-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        {t("report.setupCta")}
      </Link>
    ) : null;
  };

  const card = (result: ItemResult, differs: boolean) => {
    const item = findBetaItem(result.itemId);
    return (
      <li key={result.itemId} data-item-id={result.itemId} data-signal={result.signal} className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-sm font-semibold text-slate-900">{t(`report.itemShort.${result.itemId}` as never)}</p>
        <ul className="mt-2 space-y-1">
          {result.cells.map((cell) => (
            <li key={cell.personId} className="text-sm leading-6 text-slate-800">
              <span className="font-medium">{who(cell)}:</span> {answerOf(result.itemId, cell, ctx)}
            </li>
          ))}
        </ul>
        {result.pairGaps.length > 0 ? (
          <ul className="mt-2 space-y-1">
            {result.pairGaps.map((gap) => (
              <li key={`${gap.expectedBy.personId}-${gap.offeredBy.personId}`} className="text-sm leading-6 text-slate-900">
                {t(
                  gap.expectedBy.isViewer ? "report.pairGapYouExpect" : gap.offeredBy.isViewer ? "report.pairGapYouOffer" : "report.pairGap",
                  {
                    expectedBy: who(gap.expectedBy),
                    offeredBy: who(gap.offeredBy),
                    expected: gap.expected,
                    offered: gap.offered,
                  }
                )}
              </li>
            ))}
          </ul>
        ) : null}
        {item ? (
          <details className="mt-2">
            <summary className="cursor-pointer text-xs text-slate-500">{t("report.showQuestion")}</summary>
            <p className="mt-1 text-xs leading-5 text-slate-500">{alignmentDisplayText(item.prompt, locale)}</p>
          </details>
        ) : null}
        {differs ? topicLink(result.itemId, true) : null}
      </li>
    );
  };

  const compactLine = (result: ItemResult) => {
    const first = result.cells[0];
    const identical = result.signal === "same" && first;
    return (
      <li key={result.itemId} data-item-id={result.itemId} data-signal={result.signal} className="text-sm leading-6 text-slate-800">
        <span className="font-medium">{t(`report.itemShort.${result.itemId}` as never)}:</span>{" "}
        {identical
          ? answerOf(result.itemId, first, ctx)
          : result.cells.map((cell) => `${who(cell)}: ${answerOf(result.itemId, cell, ctx)}`).join(" · ")}
      </li>
    );
  };

  return (
    <div className="mt-6">
      <p className="max-w-2xl text-sm leading-7 text-slate-700">{t("report.intro")}</p>

      <div className="mt-6 space-y-9">
        {BETA_REPORT_GROUPS.map((group) => {
          const items = group.itemIds.map((id) => byId.get(id)).filter((r): r is ItemResult => Boolean(r));
          const buckets: Record<Bucket, ItemResult[]> = { clarify: [], impulse: [], differences: [], common: [] };
          for (const result of items) buckets[bucketOf(result.signal)].push(result);
          return (
            <section key={group.key} aria-labelledby={`report-${group.key}`} data-group={group.key}>
              <h2 id={`report-${group.key}`} className="text-lg font-semibold text-slate-950">
                {t(`report.groups.${group.key}.title`)}
              </h2>
              <p className="mt-1 text-sm text-slate-500">{t(`report.groups.${group.key}.lead`)}</p>

              {buckets.clarify.length > 0 ? (
                <div className="mt-4" data-bucket="clarify">
                  <h3 className="text-sm font-semibold text-slate-900">{t("report.clarify.title")}</h3>
                  <p className="mt-1 text-sm text-slate-600">{t("report.clarify.lead")}</p>
                  <ul className="mt-3 space-y-3">{buckets.clarify.map((result) => card(result, true))}</ul>
                </div>
              ) : null}

              {buckets.impulse.length > 0 ? (
                <div className="mt-5" data-bucket="impulse">
                  <h3 className="text-sm font-semibold text-slate-900">{t("report.impulse.title")}</h3>
                  <p className="mt-1 text-sm text-slate-600">{t("report.impulse.lead")}</p>
                  <ul className="mt-3 space-y-3">{buckets.impulse.map((result) => card(result, true))}</ul>
                </div>
              ) : null}

              {buckets.differences.length > 0 ? (
                <div className="mt-5" data-bucket="differences">
                  <h3 className="text-sm font-semibold text-slate-900">{t("report.differences.title")}</h3>
                  <ul className="mt-3 space-y-3">{buckets.differences.map((result) => card(result, true))}</ul>
                </div>
              ) : null}

              {buckets.common.length > 0 ? (
                <div className="mt-5 rounded-xl bg-slate-50 p-4" data-bucket="common">
                  <h3 className="text-sm font-semibold text-slate-900">{t("report.common.title")}</h3>
                  <ul className="mt-2 space-y-1.5">{buckets.common.map((result) => compactLine(result))}</ul>
                </div>
              ) : null}
            </section>
          );
        })}
      </div>

      <p className="mt-8 max-w-2xl text-xs leading-6 text-slate-500">{t("report.closing")}</p>
    </div>
  );
}
