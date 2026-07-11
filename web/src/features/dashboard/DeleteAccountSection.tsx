"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { deleteCurrentUserAccountAction } from "@/app/(product)/dashboard/actions";

function errorMessage(error: string | null, t: ReturnType<typeof useTranslations<"dashboard">>) {
  if (error === "missing_service_role") {
    return t("account.delete.errors.missingServiceRole");
  }

  if (error === "cleanup_failed") {
    return t("account.delete.errors.cleanupFailed");
  }

  if (error === "not_authenticated") {
    return t("account.delete.errors.notAuthenticated");
  }

  return null;
}

export function DeleteAccountSection() {
  const t = useTranslations("dashboard");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmationText, setConfirmationText] = useState("");
  const confirmToken = t("account.delete.confirmToken");

  const onDelete = () => {
    if (isPending || confirmationText.trim() !== confirmToken) {
      return;
    }

    setError(null);

    startTransition(async () => {
      const result = await deleteCurrentUserAccountAction();
      if (!result.ok) {
        setError(result.error);
      }
    });
  };

  return (
    <details className="mt-5 rounded-2xl border border-red-200/80 bg-red-50/40 p-4">
      <summary className="cursor-pointer text-sm font-medium text-slate-900">
        {t("account.delete.summary")}
      </summary>

      <div className="mt-4 rounded-2xl border border-red-200/80 bg-white/70 p-4">
        <p className="text-sm font-medium text-slate-900">{t("account.delete.title")}</p>
        <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">
          {t("account.delete.confirmText")}
        </p>

        <label className="mt-4 grid gap-2 text-sm text-slate-700">
          {t("account.delete.inputHelp")}{" "}
          <span className="font-semibold text-slate-900">{confirmToken}</span>,{" "}
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
          className="mt-4 inline-flex rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
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
