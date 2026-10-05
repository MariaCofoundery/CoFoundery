import { getTranslations } from "next-intl/server";
import { leaveTeamAction } from "@/features/teams/teamShareActions";

/**
 * Team verlassen (Phase 11.7B) - nur die eigene Person. Vorher stehen die
 * Folgen da; der Austritt braucht einen zweiten, ausdruecklichen Klick.
 * Andere Mitglieder entfernen gibt es bewusst nicht (spaetere Phase).
 */
export async function LeaveTeamSection({ teamId, memberCount, failed = false }: { teamId: string; memberCount: number; failed?: boolean }) {
  const t = await getTranslations("teams.leave");
  return (
    <section id="team-verlassen" aria-labelledby="team-leave-title" className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white/70 p-5">
      <details open={failed}>
        <summary className="cursor-pointer text-sm font-medium text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-accent)] focus-visible:ring-offset-2">
          <span id="team-leave-title">{t("title")}</span>
        </summary>
        <div className="mt-3 max-w-2xl">
          <p className="text-sm leading-6 text-slate-700">{t("intro")}</p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-700">
            <li>{t("consequences.access")}</li>
            <li>{t("consequences.share")}</li>
            <li>{t("consequences.report")}</li>
            <li>{t("consequences.setup")}</li>
            <li>{t("consequences.personal")}</li>
            {memberCount <= 2 ? <li>{t("consequences.pair")}</li> : null}
          </ul>
          {failed ? <p role="alert" className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">{t("error")}</p> : null}
          <form action={leaveTeamAction.bind(null, teamId)} className="mt-4">
            <button
              type="submit"
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-rose-300 bg-white px-5 text-sm font-semibold text-rose-800 transition hover:bg-rose-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2"
            >
              {t("confirm")}
            </button>
          </form>
        </div>
      </details>
    </section>
  );
}
