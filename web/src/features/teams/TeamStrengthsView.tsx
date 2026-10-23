import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { setTeamStrengthsShareAction } from "@/features/teams/teamStrengthsActions";
import type { TeamStrengthsOverview } from "@/features/teams/teamStrengthsData";

/**
 * „Stärken und Antrieb" im Team: ein Schalter für die eigene Freigabe und darunter die Karten der Menschen, die
 * geteilt haben (Gestaltung nach Konzeptboard 31).
 *
 * KEINE WERTUNG, KEIN VERGLEICH IN ZAHLEN: Es steht da, was jede Person bestätigt hat - nebeneinander, nicht
 * gegeneinander. Wer nicht geteilt hat, erscheint nicht; es gibt keine Liste fehlender Personen und keine
 * Zählung. Der Schalter ist ein Klick in beide Richtungen, ohne Zwischenfrage.
 */
export async function TeamStrengthsView({
  teamId,
  overview,
  status,
  hasOwnContent,
}: {
  teamId: string;
  overview: TeamStrengthsOverview;
  status: string | null;
  hasOwnContent: boolean;
}) {
  const t = await getTranslations("teams.strengthsShare");
  const tFacets = await getTranslations("direction.statements.facets");
  const on = overview.ownShared;

  return (
    <div className="mt-6 flex flex-col gap-5">
      <section
        id="freigabe"
        aria-labelledby="strengths-share-title"
        className="ws-no-print flex flex-col gap-3 rounded-3xl border border-[#e4e2f0] bg-white p-5 sm:p-7"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0 flex-[1_1_320px]">
            <h2 id="strengths-share-title" className="text-[21px] font-semibold leading-tight text-[#0b1f3a]">{t("title")}</h2>
            <p className="mt-1.5 text-sm leading-[1.55] text-[#5f5e7a]">{on ? t("onText") : t("offText")}</p>
          </div>
          <form action={setTeamStrengthsShareAction.bind(null, teamId, !on)}>
            <button
              type="submit"
              role="switch"
              aria-checked={on}
              className="inline-flex min-h-11 items-center gap-3 rounded-full border border-[#e4e2f0] bg-white px-4 text-[15px] font-semibold text-[#0b1f3a] transition-colors hover:bg-[#f5f2fe] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6d49e0]"
            >
              <span aria-hidden="true" className={`relative inline-block h-[22px] w-[38px] flex-none rounded-full ${on ? "bg-[#6d49e0]" : "bg-[#d8d5ea]"}`}>
                <span className={`absolute top-[3px] h-4 w-4 rounded-full bg-white transition-all ${on ? "left-[19px]" : "left-[3px]"}`} />
              </span>
              {on ? t("switchOn") : t("switchOff")}
            </button>
          </form>
        </div>
        <p className="text-[13px] leading-5 text-[#5f5e7a]">{t("separate")}</p>
        {status === "fehler" ? (
          <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800">{t("error")}</p>
        ) : status === "an" && on ? (
          <p role="status" className="text-sm font-medium text-[#17794a]">{t("savedOn")}</p>
        ) : status === "aus" && !on ? (
          <p role="status" className="text-sm font-medium text-[#33325e]">{t("savedOff")}</p>
        ) : null}
        {!hasOwnContent ? (
          <p className="text-sm leading-6 text-[#5f5e7a]">
            {t("noContent")}{" "}
            <Link href="/profile/strengths-interview" className="font-semibold text-[#6d49e0] hover:underline">{t("startInterview")}</Link>
          </p>
        ) : null}
      </section>

      {overview.people.length === 0 ? (
        <section className="rounded-3xl border border-dashed border-[#d8d5ea] bg-[#f7f6fb] p-5 sm:p-7">
          <h2 className="text-lg font-semibold text-[#0b1f3a]">{t("emptyTitle")}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#5f5e7a]">{t("emptyText")}</p>
        </section>
      ) : (
        <ul className="grid items-start gap-5 md:grid-cols-2">
          {overview.people.map((person) => (
            <li key={person.personId} className="flex min-w-0 flex-col gap-3 rounded-3xl border border-[#e4e2f0] bg-white p-[26px]">
              <div className="flex items-center gap-3.5">
                <span aria-hidden="true" className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-[linear-gradient(120deg,#6d49e0,#0a80b8)] text-lg font-semibold text-white">
                  {person.name.slice(0, 1).toUpperCase()}
                </span>
                <h2 className="min-w-0 break-words text-[21px] font-semibold leading-tight text-[#0b1f3a]">
                  {person.name}
                  {person.isViewer ? <span className="ml-2 rounded-full bg-[#efeafd] px-2 py-0.5 align-middle text-xs font-semibold text-[#4a2fb8]">{t("you")}</span> : null}
                </h2>
              </div>
              <div className="flex flex-col gap-2.5">
                <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#5f5e7a]">{t("strengths")}</p>
                {person.strengths.length > 0 ? (
                  person.strengths.map((strength) => (
                    <p key={strength.statement} className="rounded-2xl bg-[#f7f6fb] px-3.5 py-3 text-[15.5px] leading-[1.5] text-[#0b1f3a]">
                      {strength.label ? <strong className="mb-0.5 block text-sm text-[#a3195b]">{strength.label}</strong> : null}
                      <span className="break-words">{strength.statement}</span>
                    </p>
                  ))
                ) : (
                  <p className="text-sm text-[#5f5e7a]">{t("noneYet")}</p>
                )}
                <p className="mt-1.5 text-[13px] font-semibold uppercase tracking-[0.08em] text-[#5f5e7a]">{t("direction")}</p>
                {person.direction.length > 0 ? (
                  person.direction.map((item) => (
                    <p key={`${item.facet}:${item.statement}`} className="rounded-2xl bg-[#fff8e6] px-3.5 py-3 text-[15.5px] leading-[1.5] text-[#0b1f3a]">
                      {item.facet ? <strong className="mb-0.5 block text-sm text-[#7a4300]">{tFacets(item.facet as never)}</strong> : null}
                      <span className="break-words">{item.statement}</span>
                    </p>
                  ))
                ) : (
                  <p className="text-sm text-[#5f5e7a]">{t("noneYet")}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
