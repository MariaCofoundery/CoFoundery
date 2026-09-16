import { getTranslations } from "next-intl/server";
import {
  confirmConnectProblemAction,
  withdrawConnectProblemConfirmationAction,
} from "@/features/connect/connectProblemActions";
import {
  CONNECT_PROBLEM_PERSPECTIVES,
  type ConnectProblemConfirmation,
  type ConnectProblemConfirmationCounts,
} from "@/features/connect/connectTypes";
import { SubmitButton } from "@/features/ui/SubmitButton";

/**
 * Kenne ich auch.
 *
 * Das billigste Signal auf dem Brett - und es muss billig bleiben, sonst kommt
 * es nie zustande. Ein Klick und eine Auswahl, keine Begruendung, keine
 * Benachrichtigung, kein Name.
 *
 * Genau das unterscheidet es vom Interesse daneben: Wer sich als moeglicher
 * Mitgruender meldet, gibt sich zu erkennen. Wer nur bestaetigt, dass es das
 * Problem gibt, soll das ohne sozialen Einsatz tun koennen.
 *
 * Die Aufteilung nach Perspektive steht ueber der Gesamtzahl, weil sie mehr
 * sagt: Drei Menschen, die beruflich damit zu tun haben, sind ein anderes
 * Signal als dreissig, die es mal gehoert haben.
 */
export async function ProblemConfirmations({
  problemId,
  counts,
  ownConfirmation,
  canConfirm,
  className,
}: {
  problemId: string;
  counts: ConnectProblemConfirmationCounts;
  ownConfirmation: ConnectProblemConfirmation | null;
  /** Falsch bei eigenen Problemen und bei allem, was nicht veroeffentlicht ist. */
  canConfirm: boolean;
  className: string;
}) {
  const t = await getTranslations("connect");

  const total = CONNECT_PROBLEM_PERSPECTIVES.reduce(
    (sum, perspective) => sum + counts[perspective],
    0
  );
  const lines = CONNECT_PROBLEM_PERSPECTIVES.filter((perspective) => counts[perspective] > 0);

  return (
    <section className={className}>
      <h2 className="text-lg font-semibold">{t("problems.confirmationsTitle")}</h2>

      {total > 0 ? (
        <>
          <p className="mt-2 text-sm font-medium text-slate-900">
            {t("problems.confirmationsCount", { count: total })}
          </p>
          <ul className="mt-3 space-y-1 text-sm text-slate-600">
            {lines.map((perspective) => (
              <li key={perspective}>
                ·{" "}
                {t("problems.confirmationsLine", {
                  count: counts[perspective],
                  perspective: t(`problems.perspectives.${perspective}`),
                })}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="mt-2 text-sm leading-6 text-slate-600">{t("problems.confirmationsEmpty")}</p>
      )}

      {canConfirm ? (
        <div className="mt-5 border-t border-slate-100 pt-5">
          {ownConfirmation ? (
            <>
              <p className="text-sm font-semibold">{t("problems.confirmedTitle")}</p>
              <p className="mt-1 text-sm text-slate-600">
                {t("problems.confirmedAs", {
                  perspective: t(`problems.perspectives.${ownConfirmation.perspective}`),
                })}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                {/* Wechseln statt erst zuruecknehmen: Wer sich vertan hat,
                    soll die Angabe direkt korrigieren koennen. */}
                <details>
                  <summary className="cursor-pointer text-sm font-semibold text-violet-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-200">
                    {t("problems.changePerspective")}
                  </summary>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {CONNECT_PROBLEM_PERSPECTIVES.filter(
                      (perspective) => perspective !== ownConfirmation.perspective
                    ).map((perspective) => (
                      <form key={perspective} action={confirmConnectProblemAction}>
                        <input type="hidden" name="problem_id" value={problemId} />
                        <input type="hidden" name="perspective" value={perspective} />
                        <SubmitButton
                          label={t(`problems.perspectives.${perspective}`)}
                          pendingLabel={t("pending.save")}
                          className="min-h-11 rounded-full border border-slate-200 px-4 text-sm font-semibold"
                        />
                      </form>
                    ))}
                  </div>
                </details>
                <form action={withdrawConnectProblemConfirmationAction}>
                  <input type="hidden" name="problem_id" value={problemId} />
                  <SubmitButton
                    label={t("problems.withdrawConfirmation")}
                    pendingLabel={t("pending.save")}
                    className="text-sm font-semibold text-slate-500 underline underline-offset-2"
                  />
                </form>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold">{t("problems.confirmTitle")}</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">{t("problems.confirmText")}</p>
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                {CONNECT_PROBLEM_PERSPECTIVES.map((perspective) => (
                  <form key={perspective} action={confirmConnectProblemAction}>
                    <input type="hidden" name="problem_id" value={problemId} />
                    <input type="hidden" name="perspective" value={perspective} />
                    <SubmitButton
                      label={t(`problems.perspectives.${perspective}`)}
                      pendingLabel={t("pending.save")}
                      className="min-h-11 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold"
                    />
                  </form>
                ))}
              </div>
              <p className="mt-3 text-xs leading-5 text-slate-500">{t("problems.confirmPrivacy")}</p>
            </>
          )}
        </div>
      ) : null}
    </section>
  );
}
