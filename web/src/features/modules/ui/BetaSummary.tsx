import { getLocale, getTranslations } from "next-intl/server";

import { answerText } from "@/features/modules/ventureBeta/answerText";
import { parseAnswer } from "@/features/modules/ventureBeta/compare";
import { BETA_BLOCKS, findBetaItem, isBetaPrivateBlock } from "@/features/modules/ventureBeta/registry";
import { answerContextFor } from "@/features/modules/ui/betaFormat";
import type { AppLocale } from "@/i18n/config";

/**
 * Die eigene Zusammenfassung nach der Abgabe - in den acht Bloecken der Beta.
 *
 * DETERMINISTISCH, OHNE KI: Jede Zeile ist eine feste Satzvorlage (`ventureBeta.summary.<ID>`) mit der
 * Antwort der Person darin. Es gibt keine Charakterisierung, keinen Typ und keine Wertung. Die privaten
 * Betragsfelder stehen unter ihrer Hauptfrage, als „Nur fuer dich" gekennzeichnet - sie sind in der
 * eigenen Sicht und nur dort.
 */
type Row = { block_id: string; value: Record<string, unknown> | null; missing_code: string | null };

export async function BetaSummary({ rows, submittedAt }: { rows: readonly Row[]; submittedAt: string }) {
  const [t, localeRaw] = await Promise.all([getTranslations("ventureBeta"), getLocale()]);
  const locale = localeRaw as AppLocale;
  const ctx = answerContextFor(locale);
  const date = new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(new Date(submittedAt));

  const lineOf = (itemId: string) => {
    const item = findBetaItem(itemId);
    const row = rows.find((candidate) => candidate.block_id === itemId);
    if (!item || !row) return null;
    const text = answerText(item, parseAnswer({ value: row.value, missing_reason: row.missing_code }), ctx);
    return text ? t(`summary.${itemId}` as never, { answer: text }) : null;
  };

  return (
    <section className="mt-6">
      <h2 className="text-xl font-semibold text-slate-950">{t("result.title")}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">{t("result.intro")}</p>
      <p className="mt-1 text-xs text-slate-500">
        {t("result.submittedOn", { date })} · {t("result.private")}
      </p>

      <div className="mt-6 space-y-5">
        {BETA_BLOCKS.map((block) => (
          <article key={block.key} className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="text-base font-semibold text-slate-950">{t(`blocks.${block.key}.title`)}</h3>
            <p className="mt-1 text-sm text-slate-500">{t(`blocks.${block.key}.lead`)}</p>
            <ul className="mt-3 space-y-2">
              {block.itemIds.flatMap((itemId) => {
                const main = lineOf(itemId);
                // Die privaten Betraege hinter ihrer Hauptfrage.
                const privateIds = [`${itemId}p`].filter(isBetaPrivateBlock);
                const lines = [
                  main ? { id: itemId, text: main, isPrivate: false } : null,
                  ...privateIds.map((id) => {
                    const text = lineOf(id);
                    return text ? { id, text, isPrivate: true } : null;
                  }),
                ].filter((line): line is { id: string; text: string; isPrivate: boolean } => line !== null);
                return lines.map((line) => (
                  <li key={line.id} className="text-sm leading-6 text-slate-900">
                    {line.text}
                    {line.isPrivate ? (
                      <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{t("result.privateAmount")}</span>
                    ) : null}
                  </li>
                ));
              })}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
