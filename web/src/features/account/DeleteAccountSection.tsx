"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { deleteCurrentUserAccountAction } from "@/features/account/actions";

function errorMessage(error: string | null, t: ReturnType<typeof useTranslations<"dashboard">>) {
  if (error === "missing_service_role") return t("account.delete.errors.missingServiceRole");
  if (error === "cleanup_failed") return t("account.delete.errors.cleanupFailed");
  if (error === "not_authenticated") return t("account.delete.errors.notAuthenticated");
  return null;
}

export function DeleteAccountSection({
  outlivable,
}: {
  /**
   * Was eine Loeschung ueberdauern koennte. Fehlt es, wird auch nicht danach
   * gefragt - wer nie etwas geschildert hat, soll darueber nicht nachdenken
   * muessen.
   */
  outlivable: {
    problems: number;
    approaches: number;
    problemsPreferKeeping: boolean;
    approachesPreferKeeping: boolean;
  };
}) {
  const t = useTranslations("dashboard");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmationText, setConfirmationText] = useState("");
  // Vorbelegt mit dem, was beim Einstellen gewaehlt wurde - aber hier noch
  // einmal zu bestaetigen, denn erst hier ist die Frage wirklich echt.
  const [keepProblems, setKeepProblems] = useState(outlivable.problemsPreferKeeping);
  const [keepApproaches, setKeepApproaches] = useState(outlivable.approachesPreferKeeping);
  const confirmToken = t("account.delete.confirmToken");
  const hasOutlivable = outlivable.problems > 0 || outlivable.approaches > 0;

  const onDelete = () => {
    if (isPending || confirmationText.trim() !== confirmToken) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteCurrentUserAccountAction({
        problems: outlivable.problems > 0 && keepProblems,
        approaches: outlivable.approaches > 0 && keepApproaches,
      });
      if (!result.ok) setError(result.error);
    });
  };

  return (
    <details className="rounded-2xl border border-red-200/80 bg-red-50/40 p-4">
      <summary className="cursor-pointer text-sm font-medium text-slate-900">
        {t("account.delete.summary")}
      </summary>
      <div className="mt-4 rounded-2xl border border-red-200/80 bg-white/70 p-4">
        <p className="text-sm font-medium text-slate-900">{t("account.delete.title")}</p>
        <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">
          {t("account.delete.confirmText")}
        </p>
        {hasOutlivable ? (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">
              {t("account.delete.outlivesTitle")}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              {t("account.delete.outlivesText")}
            </p>

            {outlivable.problems > 0 ? (
              <label className="mt-4 flex min-h-11 cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={keepProblems}
                  onChange={(event) => setKeepProblems(event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-slate-300"
                />
                <span>
                  <span className="block text-sm font-medium text-slate-900">
                    {t("account.delete.outlivesProblems", { count: outlivable.problems })}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-slate-600">
                    {t("account.delete.outlivesProblemsHint")}
                  </span>
                </span>
              </label>
            ) : null}

            {outlivable.approaches > 0 ? (
              <label className="mt-3 flex min-h-11 cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={keepApproaches}
                  onChange={(event) => setKeepApproaches(event.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-slate-300"
                />
                <span>
                  <span className="block text-sm font-medium text-slate-900">
                    {t("account.delete.outlivesApproaches", { count: outlivable.approaches })}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-slate-600">
                    {t("account.delete.outlivesApproachesHint")}
                  </span>
                </span>
              </label>
            ) : null}

            {/* Beides gehoert vor die Entscheidung, nicht hinter sie: Das
                Trennen des Namens laesst sich nicht ruecknehmen, und es
                saeubert den Text nicht. */}
            {keepProblems || keepApproaches ? (
              <div className="mt-4 rounded-xl bg-amber-50 p-3">
                <p className="text-xs leading-5 text-amber-900">
                  {t("account.delete.outlivesIrreversible")}
                </p>
                <p className="mt-2 text-xs leading-5 text-amber-900">
                  {t("account.delete.outlivesCheckText")}
                </p>
                <a
                  href="/connect/my"
                  className="mt-2 inline-flex min-h-11 items-center text-xs font-semibold text-amber-900 underline underline-offset-2"
                >
                  {t("account.delete.outlivesReview")}
                </a>
              </div>
            ) : null}
          </div>
        ) : null}

        <label className="mt-4 grid gap-2 text-sm text-slate-700">
          {t("account.delete.inputHelp")} <span className="font-semibold text-slate-900">{confirmToken}</span>,{" "}
          {t("account.delete.inputHelpSuffix")}
          <input
            value={confirmationText}
            onChange={(event) => setConfirmationText(event.target.value)}
            placeholder={confirmToken}
            className="h-11 rounded-lg border border-red-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100"
          />
        </label>
        <button
          type="button"
          onClick={onDelete}
          disabled={isPending || confirmationText.trim() !== confirmToken}
          className="mt-4 inline-flex min-h-11 items-center rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? t("account.delete.pending") : t("account.delete.button")}
        </button>
        {errorMessage(error, t) ? (
          <p className="mt-3 text-sm text-red-700">{errorMessage(error, t)}</p>
        ) : null}
      </div>
    </details>
  );
}
