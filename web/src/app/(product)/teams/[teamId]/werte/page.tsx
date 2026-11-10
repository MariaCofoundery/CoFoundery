import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { TeamUnavailable } from "@/features/access/TeamUnavailable";
import { TeamPageHeader, getTeamLabel } from "@/features/teams/TeamPageHeader";
import { getFounderSetup } from "@/features/teams/founderSetupData";
import { getTeamValues } from "@/features/values/valuesData";
import { conversationNames, groupByUser, sharedGroups, valueName, type ValueKey } from "@/features/values/valuesModel";
import { createClient, getRequestUser } from "@/lib/supabase/server";

const CARD = "rounded-3xl border border-[#e4e2f0] bg-white p-5 shadow-[0_10px_25px_rgba(15,23,42,0.035)] sm:p-6";

/**
 * Eure Werte nebeneinander (Entwurf 10.11.2026): was die Personen mit DIESEM Team geteilt haben - gemeinsam, nur bei einer Person,
 * Gespraechsfragen. Keine Punktzahl, keine Passung; die Plaetze sind die eigene Reihenfolge jeder Person und werden nie verglichen.
 */
export default async function TeamValuesPage({ params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await getRequestUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/teams/${teamId}/werte`)}`);
  const setup = await getFounderSetup(teamId, user.id, supabase);
  if (!setup) return <TeamUnavailable teamId={teamId} />;
  const [t, tv, teamLabel, data] = await Promise.all([getTranslations("teams.values"), getTranslations("profile.values"), getTeamLabel(supabase, teamId), getTeamValues(supabase, teamId)]);
  const catalog = (key: ValueKey) => tv(`names.${key}`);
  const nameOf = (userId: string) => data.sharing.find((entry) => entry.userId === userId)?.name || t("someone");
  const byUser = groupByUser(data.rows);
  const sharedList = sharedGroups(data.rows, catalog);
  const { shared: sharedNames, single } = conversationNames(data.rows, catalog);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6 sm:py-6">
      <TeamPageHeader teamId={teamId} active="overview" title={t("title")} teamLabel={teamLabel} hideTitle />
      <section className="brand-panel mt-5 rounded-[28px] p-6 sm:p-8" aria-labelledby="team-values-title">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white">{t("eyebrow")}</p>
        <h1 id="team-values-title" className="mt-2 text-3xl font-semibold leading-tight">{t("title")}</h1>
        <p className="mt-3 max-w-2xl text-base leading-7 text-white">{t("intro")}</p>
      </section>

      <ul className="mt-5 flex flex-wrap gap-2.5 text-[13.5px]">
        {data.sharing.map((entry) => (
          <li key={entry.userId} className={`rounded-full px-3.5 py-2 font-semibold ${entry.shared ? "bg-emerald-100 text-emerald-900" : "bg-slate-200 text-slate-700"}`}>
            {entry.shared ? t("shared", { name: entry.isSelf ? t("you") : entry.name || t("someone") }) : t("notShared", { name: entry.isSelf ? t("you") : entry.name || t("someone") })}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-sm"><Link href="/me/profile/werte#teilen" className="font-semibold text-violet-800 underline-offset-4 hover:underline">{t("manage")}</Link></p>

      {data.rows.length === 0 ? (
        <p className={`${CARD} mt-5 text-sm leading-6 text-slate-700`}>{t("empty")}</p>
      ) : (
        <div className="mt-5 grid gap-4">
          {sharedList.length > 0 ? (
            <section aria-labelledby="shared-values" className={`${CARD} grid gap-4`}>
              <h2 id="shared-values" className="text-xl font-semibold text-[#0b1f3a]">{t("bothTitle")}</h2>
              {sharedList.map((group) => (
                <div key={group.name} className="grid gap-2 border-t border-slate-100 pt-3 sm:grid-cols-[10rem_minmax(0,1fr)]">
                  <b className="text-[16px]">{group.name}</b>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {group.rows.map((row) => (
                      <div key={`${row.userId}-${row.slot}`} className="rounded-xl bg-[#f7f6fb] px-3.5 py-3">
                        <b className="text-xs uppercase tracking-wide text-slate-600">{t("place", { name: nameOf(row.userId), place: row.slot })}</b>
                        <p className="mt-1 text-[14px] leading-5">{row.meaning || t("noMeaning")}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <p className="text-[13px] text-slate-600">{t("bothNote")}</p>
            </section>
          ) : null}

          <section aria-labelledby="own-order" className={`${CARD} grid gap-3`}>
            <h2 id="own-order" className="text-xl font-semibold text-[#0b1f3a]">{t("singleTitle")}</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {[...byUser.entries()].map(([userId, rows]) => (
                <article key={userId} className="rounded-2xl border border-slate-200 p-4">
                  <h3 className="text-[15px] font-bold">{nameOf(userId)}</h3>
                  <ol className="mt-2 grid gap-2">
                    {rows.map((row) => (
                      <li key={row.slot} className="grid grid-cols-[1.75rem_minmax(0,1fr)] gap-2">
                        <span aria-hidden="true" className="grid h-6 w-6 place-items-center rounded-full bg-violet-50 text-[12.5px] font-bold text-violet-900">{row.slot}</span>
                        <span><b className="text-[14.5px]">{valueName(row, catalog)}</b>{row.meaning ? <span className="block text-[13.5px] leading-5 text-slate-700">{row.meaning}</span> : null}</span>
                      </li>
                    ))}
                  </ol>
                </article>
              ))}
            </div>
            <p className="text-[13px] text-slate-600">{byUser.size >= 2 ? t("singleNote") : t("onlyOne")}</p>
          </section>

          <section aria-labelledby="values-questions" className="rounded-3xl border border-amber-200 bg-amber-50 p-5 sm:p-6">
            <h2 id="values-questions" className="text-xl font-semibold text-amber-950">{t("questionsTitle")}</h2>
            <ul className="mt-3 grid gap-2 pl-5 text-[14.5px] leading-6 text-amber-950 [list-style:disc]">
              {sharedNames.map((name) => <li key={`s-${name}`}>{t("questionShared", { value: name })}</li>)}
              {byUser.size >= 2 ? single.map((name) => <li key={`o-${name}`}>{t("questionSingle", { value: name })}</li>) : null}
              <li>{t("questionGeneral")}</li>
            </ul>
            <Link href={`/teams/${teamId}/setup`} className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-violet-800 underline-offset-4 hover:underline">{t("toSetup")}</Link>
          </section>
        </div>
      )}
      <p className="mt-5 rounded-2xl border border-[#e4e2f0] bg-[#f7f6fb] px-4 py-3 text-sm leading-6 text-[#5f5e7a]">{t("privacy")}</p>
    </main>
  );
}
