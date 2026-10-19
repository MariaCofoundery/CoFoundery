import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { buildLoginRedirectPath } from "@/features/auth/loginRedirect";
import { AlignNav } from "@/features/instruments/align/AlignNav";
import { getAlignNavState } from "@/features/instruments/align/navState";
import { answerableOf } from "@/features/instruments/align/questionnaireData";
import { findVentures } from "@/features/instruments/align/ventureResolution";
import type { DraftV21 } from "@/features/instruments/v21/AnswerFieldV21";
import { startTradeoffs } from "@/features/modules/tradeoffs/actions";
import { loadTradeoffsPageState } from "@/features/modules/tradeoffs/data";
import { readTradeoffs } from "@/features/modules/tradeoffs/readout";
import { tradeoffItems, tradeoffViews } from "@/features/modules/tradeoffs/registry";
import { TradeoffsFlow } from "@/features/modules/ui/TradeoffsFlow";
import { TradeoffsResult } from "@/features/modules/ui/TradeoffsResult";
import { SubmitButton } from "@/features/ui/SubmitButton";
import { createClient, getRequestUser } from "@/lib/supabase/server";

/**
 * Werte & Zielkonflikte - die freiwillige Vertiefung zu „So willst du gründen".
 *
 * VIER SITUATIONEN, EIGENER LEBENSZYKLUS. Das Modul hat sein eigenes
 * Instrument (`venture-tradeoffs-v1`) und gibt eigenstaendig ab; es beeinflusst
 * den Abschluss des Vorhaben-Fragebogens nie und umgekehrt.
 *
 * DREI ZUSTAENDE, EINE SEITE:
 *   - offener Entwurf: der Flow (ein neuer Durchlauf auch nach einer Abgabe),
 *   - abgegeben:       die eigene Zusammenfassung,
 *   - nichts:          die Einladung - mit einem Angebot, fruehere Antworten
 *                      als Ausgangspunkt zu uebernehmen, falls es welche gibt.
 *
 * PRIVAT. Nur die eigene Person liest die Antworten. Es gibt hier keinen
 * Teamvergleich und keine Freigabe; beides folgt spaeter und ist dann
 * ausdruecklich.
 *
 * KEINE STILLE UEBERNAHME. Die Antworten zu W03-W06 in `venture-alignment-v1`
 * werden nur auf ausdrueckliche Aktion kopiert - und dann als Entwurf, den die
 * Person prueft, aendert und selbst abgibt.
 */
export default async function TradeoffsPage({
  searchParams,
}: {
  searchParams: Promise<{ venture?: string; from?: string; error?: string }>;
}) {
  const query = await searchParams;
  const { data: auth } = await getRequestUser();
  if (!auth?.user?.id) {
    redirect(buildLoginRedirectPath("/founder-alignment/vorhaben/zielkonflikte", { venture: query.venture }));
  }
  const userId = auth.user.id;

  // Das Vorhaben wird nie erraten und nie angelegt: gewaehlt oder das einzige.
  const ventures = await findVentures(userId);
  const venture = query.venture
    ? ventures.find((entry) => entry.id === query.venture)
    : ventures.length === 1
      ? ventures[0]
      : undefined;
  if (!venture) redirect("/me/profile#vorhaben");

  const client = await createClient();
  const [t, state, navState] = await Promise.all([
    getTranslations("ventureTradeoffs"),
    loadTradeoffsPageState(client, userId, venture.id),
    getAlignNavState(userId),
  ]);

  const items = tradeoffItems();
  const known = ["setup_missing", "no_permission", "draft_create_failed", "value_rejected", "unreachable"];
  const error = query.error && known.includes(query.error) ? query.error : null;
  const from = query.from === "legacy" || query.from === "previous" ? query.from : null;

  const toDrafts = (answers: { block_id: string; value: Record<string, unknown> | null; missing_code: string | null }[]) =>
    Object.fromEntries(
      answers.map((row) => [
        row.block_id,
        (row.missing_code ? { missingCode: row.missing_code } : { value: row.value ?? {} }) as DraftV21,
      ])
    );

  const profileHref = `/me/profile?vorhaben=${encodeURIComponent(venture.id)}#vorhaben`;

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <AlignNav current="/founder-alignment/vorhaben" state={navState} teamId={venture.id} />
      <Link
        href={profileHref}
        className="inline-flex min-h-11 items-center text-sm font-medium text-slate-600 underline-offset-4 hover:underline"
      >
        ← {t("backToProfile")}
      </Link>
      <p className="mt-3 text-xs uppercase tracking-[0.18em] text-slate-500">{t("eyebrow")}</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{t("title")}</h1>
      {venture.name ? <p className="mt-1 text-sm text-slate-500">{venture.name}</p> : null}

      {error ? (
        <p role="alert" className="mt-5 rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-800">
          {t(`errors.${error}`)}
        </p>
      ) : null}

      {state.draft ? (
        <>
          {from && state.draft.answers.length > 0 ? (
            <p className="mt-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
              {t(`from.${from}`)}
            </p>
          ) : null}
          {state.submitted ? (
            <p className="mt-5 text-sm leading-6 text-slate-600">{t("result.draftText")}</p>
          ) : null}
          <TradeoffsFlow
            ventureId={venture.id}
            items={tradeoffViews()}
            answerables={items.map(answerableOf)}
            initial={toDrafts(state.draft.answers)}
            earlier={
              from === "legacy" && state.legacy
                ? Object.fromEntries(state.legacy.answers.map((row) => [row.block_id, { value: row.value, missingCode: row.missing_code }]))
                : from === "previous" && state.submitted
                  ? Object.fromEntries(state.submitted.answers.map((row) => [row.block_id, { value: row.value, missingCode: row.missing_code }]))
                  : null
            }
            earlierSource={from}
          />
        </>
      ) : state.submitted ? (
        <>
          <TradeoffsResult readouts={readTradeoffs(items, state.submitted.answers)} submittedAt={state.submitted.submittedAt} />
          <form action={startTradeoffs} className="mt-8 border-t border-slate-200 pt-6">
            <input type="hidden" name="ventureId" value={venture.id} />
            <input type="hidden" name="source" value="previous" />
            <p className="text-sm leading-6 text-slate-600">{t("result.updateHint")}</p>
            <SubmitButton
              label={t("result.update")}
              pendingLabel={t("startPending")}
              className="mt-3 inline-flex min-h-11 items-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
            />
          </form>
        </>
      ) : (
        <>
          <p className="mt-4 max-w-2xl leading-7 text-slate-700">{t("intro")}</p>
          <ul className="mt-4 space-y-1.5 text-sm leading-6 text-slate-700">
            <li>{t("points.noRight")}</li>
            <li>{t("points.thisVenture")}</li>
            <li>{t("points.optional")}</li>
            <li>{t("points.private")}</li>
          </ul>

          {state.legacy ? (
            <section className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
              <h2 className="text-base font-semibold text-slate-900">{t("legacy.title")}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{t("legacy.text")}</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <form action={startTradeoffs}>
                  <input type="hidden" name="ventureId" value={venture.id} />
                  <input type="hidden" name="source" value="legacy" />
                  <SubmitButton
                    label={t("legacy.take")}
                    pendingLabel={t("startPending")}
                    className="inline-flex min-h-11 items-center rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white"
                  />
                </form>
                <form action={startTradeoffs}>
                  <input type="hidden" name="ventureId" value={venture.id} />
                  <input type="hidden" name="source" value="empty" />
                  <SubmitButton
                    label={t("legacy.fresh")}
                    pendingLabel={t("startPending")}
                    className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 px-5 text-sm font-medium text-slate-700"
                  />
                </form>
              </div>
            </section>
          ) : (
            <form action={startTradeoffs} className="mt-6">
              <input type="hidden" name="ventureId" value={venture.id} />
              <input type="hidden" name="source" value="empty" />
              <SubmitButton
                label={t("start")}
                pendingLabel={t("startPending")}
                className="inline-flex min-h-11 items-center rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white"
              />
            </form>
          )}
        </>
      )}
    </main>
  );
}
