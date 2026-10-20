import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";

import { alignmentDisplayText } from "@/features/instruments/align/display";
import { HoursChart, ChoiceMatrix, NumberBars, OptionRows, PersonLegend } from "@/features/modules/ui/BetaCharts";
import { answerText, type AnswerTextContext } from "@/features/modules/ventureBeta/answerText";
import type { CompareCell, ItemResult } from "@/features/modules/ventureBeta/compare";
import { setupTopicFor } from "@/features/modules/ventureBeta/handoff";
import { BETA_REPORT_GROUPS, findBetaItem } from "@/features/modules/ventureBeta/registry";
import { classOfResult, summarizeReport, type SignalClass } from "@/features/modules/ventureBeta/reportSummary";
import { answerContextFor } from "@/features/modules/ui/betaFormat";
import type { AppLocale } from "@/i18n/config";

/**
 * Der gemeinsame Teamreport der Beta - ein Bericht mit Grafiken, nicht 19 gleichartige Karten.
 *
 * AUFBAU
 *   1. „Das Wichtigste": welche Themen einig sind, welche ein Gespraech lohnen, welche eine Abstimmung brauchen.
 *   2. „Wo ihr steht": je Themengruppe eine Punktereihe - jeder Punkt eine Frage. Keine Note, kein Prozent.
 *   3. Fuenf Gruppen mit Grafiken (Positionen, Matrix, Stunden-Balken). In jeder Gruppe zuerst, was abzustimmen
 *      ist („Das solltet ihr konkret abstimmen" - KEINE Warnung, kein Risikoindikator), dann Gespraechsimpulse,
 *      Unterschiede, und kompakt das Gemeinsame.
 *   4. „Als Nächstes": der Sprung ins Founder Setup und zu den Uebungen.
 *
 * Kein Score, keine Ampel, kein Match-Prozent, kein Ranking, kein Mittelwert. Namen stehen hier, weil die
 * Datenbank den Bericht erst bei vollstaendiger Bereitschaft liefert. Derselbe Bericht fuer jedes aktuelle
 * Mitglied; nur der eigene Punkt heisst „Du". Antworten werden nie automatisch zu einer Vereinbarung - nur der
 * Verweis „Im Founder Setup vereinbaren".
 */
type Bucket = "clarify" | "impulse" | "differences" | "common";

const bucketOf = (result: Pick<ItemResult, "itemId" | "signal">): Bucket => {
  const cls = classOfResult(result);
  return cls === "clarify" ? "clarify" : cls === "talk" ? "impulse" : cls === "different" ? "differences" : "common";
};

const DOT_TONE: Record<SignalClass, string> = {
  agreed: "bg-teal-600",
  different: "bg-slate-300",
  talk: "bg-amber-400",
  clarify: "bg-amber-400",
};

export type BetaReportLinks = { setup: string; commitment: string; exercises: string };

export async function BetaTeamReport({
  results,
  teamId,
  links,
}: {
  results: readonly ItemResult[];
  teamId: string;
  /** Wohin „Als Nächstes" fuehrt - vom Aufrufer aufgeloest (z. B. das einzige Paar), nie geraten. */
  links: BetaReportLinks;
}) {
  const [t, localeRaw] = await Promise.all([getTranslations("ventureBeta"), getLocale()]);
  const locale = localeRaw as AppLocale;
  const ctx = answerContextFor(locale);
  const byId = new Map(results.map((result) => [result.itemId, result]));
  const summary = summarizeReport(results);
  const viewer = t("report.you");

  const who = (cell: { isViewer: boolean; name: string }) => (cell.isViewer ? viewer : cell.name);
  const answerOf = (itemId: string, cell: CompareCell, c: AnswerTextContext) => {
    const item = findBetaItem(itemId);
    const text = item ? answerText(item, cell.answer, c) : "";
    return text || t("report.noAnswer");
  };
  const label = (itemId: string) => t(`report.itemShort.${itemId}` as never);
  const names = (ids: readonly string[]) => ids.map(label).join(" · ");

  const topicLink = (itemId: string) => {
    const topic = setupTopicFor(itemId, true);
    return topic ? (
      <Link
        href={`/teams/${encodeURIComponent(teamId)}/setup/${topic}`}
        className="mt-3 inline-flex min-h-10 items-center rounded-lg border border-violet-200 bg-white px-3 text-sm font-semibold text-violet-800 hover:bg-violet-50"
      >
        {t("report.setupCta")}
      </Link>
    ) : null;
  };

  /** Die Grafik zu einem Item - je nach Form der Frage. */
  const chart = (result: ItemResult) => {
    const item = findBetaItem(result.itemId);
    if (!item) return null;
    if (result.itemId === "C02") {
      const offered = byId.get("C01")?.cells ?? [];
      return <HoursChart offered={offered} expected={result.cells} gaps={result.pairGaps} viewerLabel={viewer} />;
    }
    if (result.itemId === "C01") return null; // steht im Stundendiagramm von „Erwartete Stunden"
    if (item.answerFormat === "multi_choice") return <ChoiceMatrix item={item} cells={result.cells} ctx={ctx} viewerLabel={viewer} />;
    if (item.answerFormat === "number_range") {
      return <NumberBars cells={result.cells} unit={ctx.formatUnit(item.unit ?? "")} viewerLabel={viewer} />;
    }
    if (item.answerFormat === "single_choice" || item.answerFormat === "ordinal_choice") {
      return <OptionRows item={item} cells={result.cells} ctx={ctx} viewerLabel={viewer} />;
    }
    return null;
  };

  const missingNote = (result: ItemResult) => {
    const without = result.cells.filter((cell) => cell.answer.kind === "missing" || cell.answer.kind === "none");
    if (without.length === 0) return null;
    return (
      <ul className="mt-2 space-y-0.5">
        {without.map((cell) => (
          <li key={cell.personId} className="text-xs text-slate-500">
            {who(cell)}: {answerOf(result.itemId, cell, ctx)}
          </li>
        ))}
      </ul>
    );
  };

  const card = (result: ItemResult, differs: boolean) => {
    const item = findBetaItem(result.itemId);
    const drawing = chart(result);
    return (
      <li key={result.itemId} data-item-id={result.itemId} data-signal={result.signal} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-sm font-semibold text-slate-900">{label(result.itemId)}</p>
        {drawing ? (
          drawing
        ) : (
          <ul className="mt-2 space-y-1">
            {result.cells.map((cell) => (
              <li key={cell.personId} className="text-sm leading-6 text-slate-800">
                <span className="font-medium">{who(cell)}:</span> {answerOf(result.itemId, cell, ctx)}
              </li>
            ))}
          </ul>
        )}
        {missingNote(result)}
        {result.pairGaps.length > 0 ? (
          <ul className="mt-3 space-y-1">
            {result.pairGaps.map((gap) => (
              <li key={`${gap.expectedBy.personId}-${gap.offeredBy.personId}`} className="rounded-lg bg-amber-50 px-3 py-2 text-sm leading-6 text-slate-900">
                {t(
                  gap.expectedBy.isViewer ? "report.pairGapYouExpect" : gap.offeredBy.isViewer ? "report.pairGapYouOffer" : "report.pairGap",
                  { expectedBy: who(gap.expectedBy), offeredBy: who(gap.offeredBy), expected: gap.expected, offered: gap.offered }
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
        {differs ? topicLink(result.itemId) : null}
      </li>
    );
  };

  const compactLine = (result: ItemResult) => {
    const first = result.cells[0];
    const identical = result.signal === "same" && first;
    return (
      <li key={result.itemId} data-item-id={result.itemId} data-signal={result.signal} className="text-sm leading-6 text-slate-800">
        <span className="font-medium">{label(result.itemId)}:</span>{" "}
        {identical
          ? answerOf(result.itemId, first, ctx)
          : result.cells.map((cell) => `${who(cell)}: ${answerOf(result.itemId, cell, ctx)}`).join(" · ")}
      </li>
    );
  };

  const firstCells = results.find((result) => result.cells.length > 0)?.cells ?? [];
  const summaryColumns: { key: "agreed" | "different" | "talk" | "clarify"; tone: string }[] = [
    { key: "agreed", tone: "bg-teal-50 text-teal-900" },
    { key: "different", tone: "bg-slate-100 text-slate-700" },
    { key: "talk", tone: "bg-violet-50 text-violet-900" },
    { key: "clarify", tone: "bg-amber-50 text-amber-900" },
  ];

  return (
    <div className="mt-6">
      <p className="max-w-2xl text-sm leading-7 text-slate-700">{t("report.intro")}</p>
      <div className="mt-4">
        <PersonLegend cells={firstCells} viewerLabel={viewer} />
      </div>

      <section className="mt-8 rounded-3xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-6" aria-labelledby="report-summary-title" data-report-summary>
        <h2 id="report-summary-title" className="text-xl font-semibold text-slate-950">{t("report.summary.title")}</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {summaryColumns.map(({ key, tone }) => (
            <div key={key} data-summary={key} className="flex flex-col gap-2">
              <span className={`self-start rounded-full px-2.5 py-0.5 text-xs font-semibold ${tone}`}>{t(`report.summary.${key}.label`)}</span>
              <p className="text-sm leading-6 text-slate-800">
                {summary[key].length > 0 ? names(summary[key]) : t("report.summary.none")}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8" aria-labelledby="report-map-title" data-report-map>
        <h2 id="report-map-title" className="text-lg font-semibold text-slate-950">{t("report.map.title")}</h2>
        <p className="mt-1 text-sm text-slate-500">{t("report.map.lead")}</p>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {summary.tiles.map((tile) => (
            <li key={tile.key} className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-semibold text-slate-900">{t(`report.groups.${tile.key}.title`)}</p>
              <p className="mt-3 flex flex-wrap gap-1.5" aria-hidden="true">
                {tile.classes.map((cls, index) => (
                  <i key={index} className={`block h-3.5 w-3.5 rounded-full ${DOT_TONE[cls]}`} />
                ))}
              </p>
            </li>
          ))}
        </ul>
        <p className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-600">
          <span><i className="mr-1.5 inline-block h-3 w-3 rounded-full bg-teal-600 align-[-1px]" />{t("report.map.agreed")}</span>
          <span><i className="mr-1.5 inline-block h-3 w-3 rounded-full bg-slate-300 align-[-1px]" />{t("report.map.different")}</span>
          <span><i className="mr-1.5 inline-block h-3 w-3 rounded-full bg-amber-400 align-[-1px]" />{t("report.map.talk")}</span>
        </p>
      </section>

      <div className="mt-10 space-y-12">
        {BETA_REPORT_GROUPS.map((group) => {
          const items = group.itemIds.map((id) => byId.get(id)).filter((r): r is ItemResult => Boolean(r));
          const buckets: Record<Bucket, ItemResult[]> = { clarify: [], impulse: [], differences: [], common: [] };
          for (const result of items) buckets[bucketOf(result)].push(result);
          return (
            <section key={group.key} aria-labelledby={`report-${group.key}`} data-group={group.key}>
              <h2 id={`report-${group.key}`} className="text-2xl font-semibold tracking-tight text-slate-950">
                {t(`report.groups.${group.key}.title`)}
              </h2>
              <p className="mt-1 text-sm text-slate-500">{t(`report.groups.${group.key}.lead`)}</p>

              {buckets.clarify.length > 0 ? (
                <div className="mt-5 rounded-3xl bg-amber-50/60 p-4 sm:p-5" data-bucket="clarify">
                  <h3 className="text-sm font-semibold text-amber-900">{t("report.clarify.title")}</h3>
                  <p className="mt-1 text-sm text-slate-600">{t("report.clarify.lead")}</p>
                  <ul className="mt-3 grid gap-3 lg:grid-cols-2">{buckets.clarify.map((result) => card(result, true))}</ul>
                </div>
              ) : null}

              {buckets.impulse.length > 0 ? (
                <div className="mt-6" data-bucket="impulse">
                  <h3 className="text-sm font-semibold text-slate-900">{t("report.impulse.title")}</h3>
                  <p className="mt-1 text-sm text-slate-600">{t("report.impulse.lead")}</p>
                  <ul className="mt-3 grid gap-3 lg:grid-cols-2">{buckets.impulse.map((result) => card(result, true))}</ul>
                </div>
              ) : null}

              {buckets.differences.length > 0 ? (
                <div className="mt-6" data-bucket="differences">
                  <h3 className="text-sm font-semibold text-slate-900">{t("report.differences.title")}</h3>
                  <ul className="mt-3 grid gap-3 lg:grid-cols-2">{buckets.differences.map((result) => card(result, true))}</ul>
                </div>
              ) : null}

              {buckets.common.length > 0 ? (
                <div className="mt-6 rounded-2xl bg-slate-50 p-4" data-bucket="common">
                  <h3 className="text-sm font-semibold text-slate-900">{t("report.common.title")}</h3>
                  <ul className="mt-2 space-y-1.5">{buckets.common.map((result) => compactLine(result))}</ul>
                </div>
              ) : null}
            </section>
          );
        })}
      </div>

      <section className="brand-panel mt-12 rounded-[28px] p-6 sm:p-8" aria-labelledby="report-next-title" data-report-next>
        <h2 id="report-next-title" className="text-2xl font-semibold">{t("report.next.title")}</h2>
        <p className="mt-2 max-w-xl text-sm leading-7 text-white">{t("report.next.lead")}</p>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {([
            { key: "setup", href: links.setup, primary: true },
            { key: "commitment", href: links.commitment, primary: false },
            { key: "exercises", href: links.exercises, primary: false },
          ] as const).map((entry) => (
            <div key={entry.key} className="flex flex-col gap-2 rounded-2xl bg-white/15 p-4">
              <p className="text-base font-semibold">{t(`report.next.${entry.key}.title`)}</p>
              <p className="text-sm leading-6 text-white">{t(`report.next.${entry.key}.text`)}</p>
              <Link
                href={entry.href}
                className={`mt-auto inline-flex min-h-11 items-center self-start rounded-xl px-4 text-sm font-semibold ${entry.primary ? "bg-white text-violet-800" : "border border-white/60 text-white"}`}
              >
                {t(`report.next.${entry.key}.cta`)}
              </Link>
            </div>
          ))}
        </div>
      </section>

      <p className="mt-8 max-w-2xl text-xs leading-6 text-slate-500">{t("report.closing")}</p>
    </div>
  );
}
