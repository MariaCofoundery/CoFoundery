"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { setCapabilityMatchingPermissionAction } from "@/features/capability/capabilityMatchingPermissionActions";

/**
 * Die Capability-Matching-Freigabe als Abschnitt.
 *
 * Eingebunden seit E3c, NUR wenn FIND in dieser Umgebung mit Matching v0.1 rankt
 * (Server-Flag MATCHING_FIND_V01_RANKING_ENABLED): im FIND-Profil (/discovery/profile)
 * und im Schritt Sichtbarkeit des Profil-Editors (/profile?step=sichtbarkeit). Ein Test
 * hält beide Stellen und die Flag-Prüfung fest.
 *
 * Zwei Zustände:
 *   - Fähigkeiten vorhanden: Umschalter, Standard aus (der Ausgangswert kommt
 *     serverseitig aus getCapabilityMatchingPermission).
 *   - keine Fähigkeiten: kein Umschalter, nur ein neutraler Hinweis mit Link
 *     zum Capability-Editor - es gibt nichts, was verwendet werden könnte.
 */
export function CapabilityMatchingPermissionSection({
  hasCapabilities,
  initialAllowed,
  editHref,
  className = "mt-5 border-t border-slate-200 pt-5",
}: {
  hasCapabilities: boolean;
  initialAllowed: boolean;
  editHref: string;
  /** Rahmen des Abschnitts: Standard als Teil einer Karte, im Editor als eigene Karte. */
  className?: string;
}) {
  const t = useTranslations("capability.matchingPermission");
  const [allowed, setAllowed] = useState(initialAllowed === true);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(false);

  if (!hasCapabilities) {
    return (
      <section className={className} aria-labelledby="capability-matching-title">
        <h3 id="capability-matching-title" className="text-sm font-semibold text-slate-950">{t("title")}</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">{t("emptyNotice")}</p>
        <Link href={editHref} className="mt-3 inline-flex min-h-11 items-center text-sm underline">
          {t("emptyLink")}
        </Link>
      </section>
    );
  }

  const toggle = (next: boolean) => {
    setError(false);
    startTransition(async () => {
      const result = await setCapabilityMatchingPermissionAction(next);
      if (!result.ok) return setError(true);
      setAllowed(result.allowed);
    });
  };

  return (
    <section className={className} aria-labelledby="capability-matching-title">
      <h3 id="capability-matching-title" className="text-sm font-semibold text-slate-950">{t("title")}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{t("body")}</p>
      <label className="mt-3 inline-flex min-h-11 items-center gap-3 text-sm text-slate-800">
        <input
          type="checkbox"
          checked={allowed}
          disabled={pending}
          onChange={(event) => toggle(event.target.checked)}
          className="h-5 w-5 rounded border-slate-300"
        />
        <span>{t("toggleLabel")}</span>
        <span className="text-slate-500">({allowed ? t("statusOn") : t("statusOff")})</span>
      </label>
      <p className="mt-2 text-xs leading-5 text-slate-500">{t("revocable")}</p>
      {error ? <p role="alert" className="mt-3 text-sm text-red-700">{t("error")}</p> : null}
    </section>
  );
}
