import { getTranslations } from "next-intl/server";
import { renameTeamAction } from "@/features/teams/teamNameActions";

/**
 * "Team benennen / umbenennen" - klein, eingeklappt, auf der Karte selbst.
 *
 * Jedes aktuelle Mitglied darf es (es gibt keine Rollen im Team), und der Name
 * ist für alle im Team sichtbar - das steht dabei. Leer lassen nimmt den Namen
 * zurück; dann steht wieder "A + B".
 */
export async function TeamNameForm({
  teamId,
  currentName,
  returnTo,
  tone = "light",
}: {
  teamId: string;
  /** Der gesetzte Name, nicht der Ersatzname aus den Mitgliedern. */
  currentName: string | null;
  returnTo: string;
  tone?: "light" | "brand";
}) {
  const t = await getTranslations("dashboard.teamCard");
  const summary = tone === "brand" ? "text-white underline underline-offset-4" : "text-violet-700 hover:underline";
  return (
    <details className="text-sm">
      <summary className={`inline-flex min-h-10 cursor-pointer items-center font-medium ${summary}`}>
        {currentName ? t("rename") : t("nameIt")}
      </summary>
      <form action={renameTeamAction} className="mt-2 flex flex-col gap-2">
        <input type="hidden" name="teamId" value={teamId} />
        <input type="hidden" name="returnTo" value={returnTo} />
        <label className="sr-only" htmlFor={`team-name-${teamId}`}>{t("nameLabel")}</label>
        <input
          id={`team-name-${teamId}`}
          name="name"
          type="text"
          maxLength={60}
          defaultValue={currentName ?? ""}
          placeholder={t("namePlaceholder")}
          className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
        />
        <p className={`text-xs leading-5 ${tone === "brand" ? "text-white" : "text-slate-500"}`}>{t("nameHint")}</p>
        <button type="submit" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-violet-700 px-4 text-sm font-semibold text-white">
          {t("nameSave")}
        </button>
      </form>
    </details>
  );
}
