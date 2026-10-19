import { getLocale, getTranslations } from "next-intl/server";

import { alignmentDisplayText } from "@/features/instruments/align/display";
import type { TradeoffReadout, TradeoffStatement } from "@/features/modules/tradeoffs/readout";
import type { AppLocale } from "@/i18n/config";

/**
 * Das eigene Ergebnis nach der Abgabe.
 *
 * NUR AUS GEWAEHLTEN WEGEN UND GEWICHTEN (`readTradeoffs`) - keine
 * Charakterisierung, keine KI, keine Zuschreibung, keine Wertung. Jeder Satz sagt,
 * was angekreuzt wurde. Die Texte kommen aus dem Sprachbundle, die Anliegen und
 * Wege aus der Registry (auf Englisch ueber die Anzeigeschicht).
 */
export async function TradeoffsResult({
  readouts,
  submittedAt,
}: {
  readouts: readonly TradeoffReadout[];
  submittedAt: string;
}) {
  const [t, localeRaw] = await Promise.all([getTranslations("ventureTradeoffs"), getLocale()]);
  const locale = localeRaw as AppLocale;
  const show = (text: string) => alignmentDisplayText(text, locale);
  // Mitten im Satz: „ziemlich wichtig" / “quite important”.
  const level = (text: string) => {
    const shown = show(text);
    return locale === "en" ? shown.charAt(0).toLowerCase() + shown.slice(1) : shown;
  };

  const sentence = (statement: TradeoffStatement): string => {
    switch (statement.kind) {
      case "weights_equal":
        return t("result.statement.weights_equal", { level: level(statement.level) });
      case "weights_more":
        return statement.lessIsHigh
          ? t("result.statement.weights_more_high", {
              more: show(statement.more),
              less: show(statement.less),
              lessLevel: level(statement.lessLevel),
            })
          : t("result.statement.weights_more", { more: show(statement.more), less: show(statement.less) });
      case "path":
        return t("result.statement.path", { path: show(statement.path) });
      case "path_other":
        return t("result.statement.path_other");
      case "path_unknown":
        return t("result.statement.path_unknown");
      case "path_against_weight":
        return t("result.statement.path_against_weight", {
          pathConcern: show(statement.pathConcern),
          more: show(statement.more),
        });
      case "not_decided":
        return t("result.statement.not_decided", { label: show(statement.label) });
    }
  };

  const date = new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(new Date(submittedAt));

  return (
    <section className="mt-6">
      <h2 className="text-xl font-semibold text-slate-950">{t("result.title")}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">{t("result.intro")}</p>
      <p className="mt-1 text-xs text-slate-500">
        {t("result.submittedOn", { date })} · {t("result.private")}
      </p>

      <ul className="mt-5 space-y-4">
        {readouts.map((readout) => (
          <li key={readout.itemId} className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              {t(`situations.${readout.itemId}`)}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600">{show(readout.prompt)}</p>
            {readout.statements.length > 0 ? (
              <ul className="mt-3 space-y-1.5">
                {readout.statements.map((statement, index) => (
                  <li key={`${statement.kind}-${index}`} className="text-sm leading-6 text-slate-900">
                    {sentence(statement)}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-slate-500">{t("result.noAnswer")}</p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
