import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { updateTeamDetailsAction } from "@/features/teams/teamNameActions";

/**
 * Name und Beschreibung des Teams - ruhig, auf der Karte selbst, nur ein
 * Klick weit entfernt.
 *
 * Standard: Name und ein Satz zum Vorhaben stehen als Text da; ein Klick auf
 * diesen Text klappt die Felder auf. Es gibt keinen eigenen "Umbenennen"-Knopf,
 * der die Karte dominiert. Ohne Beschreibung steht ein leiser Hinweis, der
 * selbst der Klick ist.
 *
 * Jedes aktuelle Mitglied darf es (keine Rollen im Team), und beides ist für
 * alle im Team sichtbar - das steht beim Feld. Leer lassen nimmt es zurück.
 */
export async function TeamDetailsEditor({
  teamId,
  displayName,
  name,
  description,
  returnTo,
  summary,
  tone = "light",
}: {
  teamId: string;
  /** Was angezeigt wird (gesetzter Name oder "A + B"). */
  displayName: string;
  /** Der gesetzte Name, nicht der Ersatzname. */
  name: string | null;
  description: string | null;
  returnTo: string;
  /** Eigener Auslöser statt Name + Beschreibung (z. B. auf der Teamseite). */
  summary?: ReactNode;
  tone?: "light" | "brand";
}) {
  const t = await getTranslations("dashboard.teamCard");
  const brand = tone === "brand";
  const field =
    "mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500";
  return (
    <details className="group">
      <summary
        className="cursor-pointer list-none rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 [&::-webkit-details-marker]:hidden"
        aria-label={t("editAria")}
      >
        {summary ?? (
          <>
            <span className="flex items-start justify-between gap-2">
              <span className="text-lg font-semibold text-slate-950">{displayName}</span>
              <svg aria-hidden="true" viewBox="0 0 24 24" className="mt-1 h-4 w-4 shrink-0 text-slate-300 transition group-hover:text-violet-600" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
              </svg>
            </span>
            <span className={`mt-1 block text-sm leading-6 ${description ? "text-slate-600" : "text-slate-400"}`}>
              {description ?? t("descPrompt")}
            </span>
          </>
        )}
      </summary>
      <form action={updateTeamDetailsAction} className="mt-3 flex flex-col gap-2">
        <input type="hidden" name="teamId" value={teamId} />
        <input type="hidden" name="returnTo" value={returnTo} />
        <label className="block text-xs font-semibold text-slate-600" htmlFor={`team-name-${teamId}`}>
          {t("nameLabel")}
          <input id={`team-name-${teamId}`} name="name" type="text" maxLength={60} defaultValue={name ?? ""} placeholder={t("namePlaceholder")} className={`${field} min-h-11`} />
        </label>
        <label className="block text-xs font-semibold text-slate-600" htmlFor={`team-desc-${teamId}`}>
          {t("descLabel")}
          <textarea id={`team-desc-${teamId}`} name="description" maxLength={200} rows={2} defaultValue={description ?? ""} placeholder={t("descPlaceholder")} className={`${field} py-2 leading-6`} />
        </label>
        <p className={`text-xs leading-5 ${brand ? "text-white" : "text-slate-500"}`}>{t("nameHint")}</p>
        <button type="submit" className="inline-flex min-h-11 items-center justify-center self-start rounded-xl bg-violet-700 px-4 text-sm font-semibold text-white">
          {t("nameSave")}
        </button>
      </form>
    </details>
  );
}
