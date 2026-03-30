"use client";

import { useState, useTransition } from "react";
import { deleteCurrentUserAccountAction } from "@/app/(product)/dashboard/actions";

const DELETE_CONFIRM_TEXT = [
  "Dein Account wird gelöscht.",
  "Deine personenbezogenen Daten werden entfernt.",
  "Gemeinsame Reports und Workbooks aus dieser Founder-Konstellation werden ebenfalls gelöscht.",
  "Dieser Schritt kann nicht rückgängig gemacht werden.",
  "",
  "Möchtest du deinen Account wirklich löschen?",
].join("\n");

function errorMessage(error: string | null) {
  if (error === "missing_service_role") {
    return "Die Löschung ist gerade technisch nicht verfügbar. Bitte versuche es später erneut.";
  }

  if (error === "cleanup_failed" || error === "auth_delete_failed") {
    return "Dein Account konnte gerade nicht vollständig gelöscht werden. Bitte versuche es erneut.";
  }

  if (error === "not_authenticated") {
    return "Deine Sitzung ist nicht mehr aktiv. Bitte melde dich erneut an.";
  }

  return null;
}

export function DeleteAccountSection() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onDelete = () => {
    if (isPending) {
      return;
    }

    const confirmed = window.confirm(DELETE_CONFIRM_TEXT);
    if (!confirmed) {
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
    <div className="mt-4 rounded-2xl border border-red-200/80 bg-red-50/50 p-4">
      <p className="text-sm font-medium text-slate-900">Account löschen</p>
      <p className="mt-2 text-sm leading-6 text-slate-700">
        Dein Account wird gelöscht. Deine personenbezogenen Daten werden entfernt. Gemeinsame
        Reports und Workbooks aus dieser Founder-Konstellation werden ebenfalls gelöscht.
      </p>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Dieser Schritt kann nicht rückgängig gemacht werden.
      </p>

      <button
        type="button"
        onClick={onDelete}
        disabled={isPending}
        className="mt-4 inline-flex rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Account wird gelöscht..." : "Account löschen"}
      </button>

      {errorMessage(error) ? (
        <p className="mt-3 text-sm text-red-700">{errorMessage(error)}</p>
      ) : null}
    </div>
  );
}
