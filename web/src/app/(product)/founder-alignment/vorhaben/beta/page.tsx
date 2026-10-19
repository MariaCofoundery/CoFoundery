import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { buildLoginRedirectPath } from "@/features/auth/loginRedirect";
import { AlignNav } from "@/features/instruments/align/AlignNav";
import { getAlignNavState } from "@/features/instruments/align/navState";
import { answerableOf } from "@/features/instruments/align/questionnaireData";
import { findVentures } from "@/features/instruments/align/ventureResolution";
import type { DraftV21 } from "@/features/instruments/v21/AnswerFieldV21";
import { BetaFlow } from "@/features/modules/ui/BetaFlow";
import { BetaSharePanel } from "@/features/modules/ui/BetaSharePanel";
import { BetaSummary } from "@/features/modules/ui/BetaSummary";
import { startBeta } from "@/features/modules/ventureBeta/actions";
import { loadBetaPageState } from "@/features/modules/ventureBeta/data";
import { isVentureBetaEnabled } from "@/features/modules/ventureBeta/gate";
import {
  BETA_BLOCKS,
  BETA_CORE_ITEM_IDS,
  BETA_PRIVATE_BLOCK_IDS,
  betaItems,
  betaViews,
} from "@/features/modules/ventureBeta/registry";
import { loadBetaReadiness } from "@/features/modules/ventureBeta/teamData";
import { SubmitButton } from "@/features/ui/SubmitButton";
import { createClient, getRequestUser } from "@/lib/supabase/server";

/**
 * Venture Alignment (Beta) - die erprobbare Beta des Venture-Core.
 *
 * EIN ECHTES ASSESSMENT, KEINE SIMULATION: eigenes Instrument (`venture-alignment-v2-beta1`), eigener
 * Entwurf mit Autospeichern, eigene Abgabe, Neubeginn, Freigabe, Widerruf. `venture-alignment-v1` bleibt
 * unveraendert und ist von hier aus nicht erreichbar.
 *
 * NUR FUER FREIGESCHALTETE KONTEN (`gate.ts`): fuer alle anderen gibt es diese Seite nicht (404).
 * Es gibt keinen stillen Wechsel von v1 auf die Beta.
 *
 * DREI ZUSTAENDE, EINE SEITE:
 *   - offener Entwurf: der Flow (ein neuer Durchlauf auch nach einer Abgabe),
 *   - abgegeben:       die eigene Zusammenfassung + die Freigabe,
 *   - nichts:          die Einladung - mit einem Angebot, identische Antworten aus v1 als Ausgangspunkt
 *                      zu uebernehmen, falls es welche gibt.
 *
 * SUBMISSION != SHARING. Nach dem Abgeben ist der Durchlauf privat; geteilt wird nur durch den
 * ausdruecklichen Knopf im Freigabe-Panel.
 */
export default async function BetaPage({
  searchParams,
}: {
  searchParams: Promise<{ venture?: string; from?: string; error?: string; share?: string }>;
}) {
  const query = await searchParams;
  const { data: auth } = await getRequestUser();
  if (!auth?.user?.id) {
    redirect(buildLoginRedirectPath("/founder-alignment/vorhaben/beta", { venture: query.venture }));
  }
  if (!isVentureBetaEnabled(auth.user)) notFound();
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
  const [t, state, navState, readiness] = await Promise.all([
    getTranslations("ventureBeta"),
    loadBetaPageState(client, userId, venture.id),
    getAlignNavState(userId),
    loadBetaReadiness(client, venture.id),
  ]);

  // Der aktive Share bestimmt den Team-Stand; der neueste Durchlauf kann neuer und noch privat sein.
  const activeId = readiness?.own.sharedAssessmentId ?? null;
  const shared = Boolean(state.submitted && activeId === state.submitted.id);
  const sharePanel = state.submitted ? (
    <BetaSharePanel
      ventureId={venture.id}
      assessmentId={state.submitted.id}
      shared={shared}
      ready={shared && readiness?.status === "ready"}
      olderSharedId={activeId && activeId !== state.submitted.id ? activeId : null}
    />
  ) : null;
  const shareNote = query.share === "on" || query.share === "off" ? query.share : null;

  const known = ["setup_missing", "no_permission", "draft_create_failed", "value_rejected", "unreachable", "not_submitted", "share_rejected", "share_failed"];
  const error = query.error && known.includes(query.error) ? query.error : null;
  const from = query.from === "takeover" || query.from === "previous" ? query.from : null;

  const toDrafts = (answers: { block_id: string; value: Record<string, unknown> | null; missing_code: string | null }[]) =>
    Object.fromEntries(
      answers.map((row) => [row.block_id, (row.missing_code ? { missingCode: row.missing_code } : { value: row.value ?? {} }) as DraftV21])
    );
  const toEarlier = (answers: { block_id: string; value: Record<string, unknown> | null; missing_code: string | null }[]) =>
    Object.fromEntries(answers.map((row) => [row.block_id, { value: row.value, missingCode: row.missing_code }]));

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
      <p className="mt-3 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-500">
        {t("eyebrow")}
        <span className="rounded-full border border-slate-300 px-2 py-0.5 text-[10px] tracking-normal text-slate-600">{t("badge")}</span>
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">{t("title")}</h1>
      {venture.name ? <p className="mt-1 text-sm text-slate-500">{venture.name}</p> : null}

      {error ? (
        <p role="alert" className="mt-5 rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-800">
          {t(`errors.${error}` as never)}
        </p>
      ) : null}
      {shareNote ? (
        <p role="status" className="mt-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800">
          {t(`share.${shareNote}`)}
        </p>
      ) : null}

      {state.draft ? (
        <>
          {from && state.draft.answers.length > 0 ? (
            <p className="mt-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
              {t(`from.${from}`)}
            </p>
          ) : null}
          {state.submitted ? <p className="mt-5 text-sm leading-6 text-slate-600">{t("result.draftText")}</p> : null}
          <BetaFlow
            ventureId={venture.id}
            blocks={BETA_BLOCKS}
            items={betaViews()}
            answerables={betaItems().map(answerableOf)}
            initial={toDrafts(state.draft.answers)}
            earlier={
              from === "takeover"
                ? toEarlier(state.takeover)
                : from === "previous" && state.submitted
                  ? toEarlier(state.submitted.answers)
                  : null
            }
            earlierSource={from}
            coreIds={BETA_CORE_ITEM_IDS}
            privateIds={BETA_PRIVATE_BLOCK_IDS}
          />
          {sharePanel}
        </>
      ) : state.submitted ? (
        <>
          <BetaSummary rows={state.submitted.answers} submittedAt={state.submitted.submittedAt} />
          {sharePanel}
          <form action={startBeta} className="mt-8 border-t border-slate-200 pt-6">
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
            <li>{t("points.privateFirst")}</li>
            <li>{t("points.beta")}</li>
          </ul>

          {state.takeover.length > 0 ? (
            <section className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
              <h2 className="text-base font-semibold text-slate-900">{t("takeover.title")}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{t("takeover.text")}</p>
              <div className="mt-4 flex flex-wrap gap-3">
                <form action={startBeta}>
                  <input type="hidden" name="ventureId" value={venture.id} />
                  <input type="hidden" name="source" value="takeover" />
                  <SubmitButton
                    label={t("takeover.take")}
                    pendingLabel={t("startPending")}
                    className="inline-flex min-h-11 items-center rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white"
                  />
                </form>
                <form action={startBeta}>
                  <input type="hidden" name="ventureId" value={venture.id} />
                  <input type="hidden" name="source" value="empty" />
                  <SubmitButton
                    label={t("takeover.fresh")}
                    pendingLabel={t("startPending")}
                    className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 px-5 text-sm font-medium text-slate-700"
                  />
                </form>
              </div>
            </section>
          ) : (
            <form action={startBeta} className="mt-6">
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
