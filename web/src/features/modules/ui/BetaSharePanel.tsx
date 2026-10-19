import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { setBetaShare } from "@/features/modules/ventureBeta/shareActions";
import { SubmitButton } from "@/features/ui/SubmitButton";

/**
 * Venture Alignment (Beta): die Freigabe des eigenen Durchlaufs fuer den Teamvergleich.
 *
 * ZUERST „Nur fuer dich". Die Abgabe teilt nichts; erst ein ausdruecklicher
 * Klick auf diese Seite gibt den Durchlauf frei - ohne Vorauswahl, ohne
 * Haekchen, ohne zweiten Weg. Vorher steht, was die Freigabe bedeutet.
 *
 * Das Zuruecknehmen verlangt eine Bestaetigung (aufklappbar, ohne Skript), weil
 * es den gemeinsamen Vergleich fuer das ganze Team unverfuegbar machen kann.
 *
 * UEBER DIE ANDEREN steht hier nichts ausser dem Gesamtergebnis der
 * Datenbank: „bereit" oder „es fehlen noch Voraussetzungen" - keine Namen,
 * keine Zaehler, keine Liste.
 */
export async function BetaSharePanel({
  ventureId,
  assessmentId,
  shared,
  ready,
  olderSharedId = null,
}: {
  ventureId: string;
  assessmentId: string;
  shared: boolean;
  ready: boolean;
  /** Ein frueherer Durchlauf ist weiter aktiv geteilt, waehrend der neueste noch privat ist. */
  olderSharedId?: string | null;
}) {
  const t = await getTranslations("ventureBeta");

  return (
    <section id="teilen" className="mt-8 scroll-mt-24 rounded-2xl border border-slate-200 bg-slate-50/70 p-5" aria-labelledby="beta-share-title">
      <h2 id="beta-share-title" className="text-base font-semibold text-slate-900">
        {t("share.title")}
      </h2>
      <p className="mt-1 text-sm font-medium text-slate-800">{shared ? t("share.shared") : t("share.private")}</p>

      {shared ? (
        <>
          <p className="mt-2 text-sm leading-6 text-slate-600">{ready ? t("share.ready") : t("share.missing")}</p>
          {ready ? (
            <Link
              href={`/teams/${encodeURIComponent(ventureId)}/vorhaben-beta`}
              className="mt-3 inline-flex min-h-11 items-center rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white"
            >
              {t("share.openCompare")}
            </Link>
          ) : null}
          <details className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
            <summary className="cursor-pointer text-sm font-medium text-slate-700">{t("share.revokeSummary")}</summary>
            <p className="mt-3 text-sm leading-6 text-slate-600">{t("share.revokeConfirm")}</p>
            <form action={setBetaShare} className="mt-3">
              <input type="hidden" name="ventureId" value={ventureId} />
              <input type="hidden" name="assessmentId" value={assessmentId} />
              <input type="hidden" name="shared" value="false" />
              <SubmitButton
                label={t("share.revokeAction")}
                pendingLabel={t("share.revokePending")}
                className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
              />
            </form>
          </details>
        </>
      ) : (
        <>
          <p className="mt-3 text-sm font-semibold text-slate-900">{t("share.explainTitle")}</p>
          <ul className="mt-1 list-disc space-y-1.5 pl-5 text-sm leading-6 text-slate-700">
            <li>{t("share.explain.p1")}</li>
            <li>{t("share.explain.p2")}</li>
            <li>{t("share.explain.p3")}</li>
            <li>{t("share.explain.p4")}</li>
          </ul>
          <form action={setBetaShare} className="mt-4">
            <input type="hidden" name="ventureId" value={ventureId} />
            <input type="hidden" name="assessmentId" value={assessmentId} />
            <input type="hidden" name="shared" value="true" />
            <SubmitButton
              label={t("share.action")}
              pendingLabel={t("share.actionPending")}
              className="inline-flex min-h-11 items-center rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white"
            />
          </form>
        </>
      )}

      {olderSharedId ? (
        <div className="mt-5 border-t border-slate-200 pt-4">
          <p className="text-sm leading-6 text-slate-600">{t("share.olderActive")}</p>
          <details className="mt-3 rounded-xl border border-slate-200 bg-white p-4">
            <summary className="cursor-pointer text-sm font-medium text-slate-700">{t("share.revokeSummary")}</summary>
            <p className="mt-3 text-sm leading-6 text-slate-600">{t("share.revokeConfirm")}</p>
            <form action={setBetaShare} className="mt-3">
              <input type="hidden" name="ventureId" value={ventureId} />
              <input type="hidden" name="assessmentId" value={olderSharedId} />
              <input type="hidden" name="shared" value="false" />
              <SubmitButton
                label={t("share.revokeAction")}
                pendingLabel={t("share.revokePending")}
                className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
              />
            </form>
          </details>
        </div>
      ) : null}
    </section>
  );
}
