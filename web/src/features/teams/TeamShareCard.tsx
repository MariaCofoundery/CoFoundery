import { getTranslations } from "next-intl/server";
import { setTeamShareAction } from "@/features/teams/teamShareActions";

const PRIMARY =
  "inline-flex min-h-11 items-center justify-center rounded-xl bg-[linear-gradient(120deg,#6d49e0,#0a80b8)] px-[18px] text-[15px] font-semibold text-white transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6d49e0] focus-visible:ring-offset-2";
const SECONDARY =
  "inline-flex min-h-11 items-center justify-center rounded-xl bg-[#f1f0f7] px-[18px] text-[15px] font-semibold text-[#0b1f3a] transition hover:bg-[#e9e7f4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6d49e0] focus-visible:ring-offset-2";

/**
 * "Mit diesem Team teilen" (Phase 11.7B).
 *
 * Eine Entscheidung je Person und Team - keine Empfaengerliste, keine
 * Haekchen je Frage. Der Text sagt ausdruecklich, dass die Freigabe auch fuer
 * spaeter hinzukommende Mitglieder gilt und Forschung, FIND und Advisors nicht
 * betrifft. Zuruecknehmen braucht einen zweiten, ausdruecklichen Schritt mit
 * Erklaerung der Folgen (ohne Client-JavaScript: <details>).
 */
export async function TeamShareCard({
  teamId,
  active,
  legacyShared = false,
  returnTo,
  status = null,
  compact = false,
}: {
  teamId: string;
  active: boolean;
  /** Bisher einzeln mit allen geteilt (gerichtete Freigaben, Bestand). */
  legacyShared?: boolean;
  returnTo: string;
  status?: string | null;
  compact?: boolean;
}) {
  const t = await getTranslations("teams.teamShare");
  return (
    <section
      id="teamfreigabe"
      aria-labelledby="team-share-title"
      className={`ws-no-print scroll-mt-24 rounded-[24px] border ${active ? "border-[#bfe8d1] bg-[#f3fbf7]" : "border-[#e4e2f0] bg-white"} ${compact ? "p-4" : "p-5 sm:p-7"}`}
    >
      <h2 id="team-share-title" className="flex items-center gap-2 text-lg font-semibold text-slate-950">
        <span aria-hidden="true" className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-sm ${active ? "bg-emerald-600 text-white" : "border border-slate-300 bg-white text-slate-500"}`}>
          {active ? "✓" : "○"}
        </span>
        {active ? t("activeTitle") : t("title")}
      </h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-700">{active ? t("activeBody") : t("body")}</p>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{t("ventureNote")}</p>
      {!active && legacyShared ? <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{t("legacy")}</p> : null}
      {status === "fehler" ? (
        <p role="alert" className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">{t("error")}</p>
      ) : status === "an" && active ? (
        <p role="status" className="mt-3 text-sm font-medium text-emerald-800">{t("savedOn")}</p>
      ) : status === "aus" && !active ? (
        <p role="status" className="mt-3 text-sm font-medium text-slate-700">{t("savedOff")}</p>
      ) : null}
      {active ? (
        <details className="mt-4">
          <summary className={`${SECONDARY} cursor-pointer list-none [&::-webkit-details-marker]:hidden`}>{t("revoke")}</summary>
          <div className="mt-3 max-w-2xl rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm leading-6 text-slate-700">{t("revokeExplain")}</p>
            <form action={setTeamShareAction.bind(null, teamId, false, returnTo)} className="mt-3">
              <button type="submit" className={SECONDARY}>{t("revokeConfirm")}</button>
            </form>
          </div>
        </details>
      ) : (
        <form action={setTeamShareAction.bind(null, teamId, true, returnTo)} className="mt-4">
          <button type="submit" className={PRIMARY}>{t("action")}</button>
        </form>
      )}
    </section>
  );
}
