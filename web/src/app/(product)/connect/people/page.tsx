import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { requireConnectMember } from "@/features/connect/connectAccess";
import { ConnectAvatar } from "@/features/connect/ConnectAvatar";
import { ConnectMineNav } from "@/features/connect/ConnectMineNav";
import { ConnectTabs } from "@/features/connect/ConnectTabs";
import { getConnectPeople, getConnectTabCounts } from "@/features/connect/connectPeopleData";
import {
  CONNECT_OPEN_TO_FORMATS,
  CONNECT_REMOTE_MODES,
  CONNECT_ROLES,
} from "@/features/connect/connectTypes";

const card = "rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-[0_16px_40px_rgba(15,23,42,.05)]";
const field = "min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm";
const FILTER_KEYS = ["role", "expertise", "industry", "region", "remote_mode", "open_to"] as const;

/**
 * Menschen im Netzwerk.
 *
 * Die Ergebnisse dominieren: ein Suchfeld, die Filter eingeklappt. Vorher
 * standen auf der Connect-Seite drei volle Karten vor dem ersten Eintrag -
 * ein Fuenf-Feld-Formular ueber den Treffern fuehlt sich an wie Ausfuellen,
 * nicht wie Anfassen.
 *
 * Sortiert wird nach Aktualitaet, nie nach Passung. Sobald Menschen sortiert
 * werden, ist es eine Rangliste.
 */
export default async function ConnectPeoplePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const [t, filters] = await Promise.all([getTranslations("connect"), searchParams]);
  const { client, user } = await requireConnectMember("/connect/people");

  const [people, counts] = await Promise.all([
    getConnectPeople(client, user.id, filters),
    getConnectTabCounts(client, user.id),
  ]);

  const activeFilters = FILTER_KEYS.filter((key) => (filters[key] ?? "").trim().length > 0);
  const isFiltered = activeFilters.length > 0 || (filters.q ?? "").trim().length > 0;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(103,232,249,.13),transparent_30%),linear-gradient(180deg,#fff,#f8fafc)] px-5 py-8 text-slate-950 md:px-8">
      <div className="mx-auto max-w-6xl space-y-5">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-[-.03em]">{t("people.title")}</h1>
            <p className="mt-2 max-w-2xl leading-7 text-slate-600">{t("people.text")}</p>
          </div>
          <ConnectMineNav />
        </header>

        <ConnectTabs active="people" counts={counts} />

        <form className={card}>
          <input
            name="q"
            type="search"
            defaultValue={filters.q ?? ""}
            className={`${field} text-base`}
            placeholder={t("people.searchPlaceholder")}
            aria-label={t("people.searchPlaceholder")}
          />

          {/* Eingeklappt: Wer nur suchen will, soll nicht an sechs Feldern
              vorbei. Wer schon gefiltert hat, sieht es offen. */}
          <details className="mt-3" open={activeFilters.length > 0}>
            <summary className="inline-flex min-h-11 cursor-pointer items-center text-sm font-semibold text-slate-700">
              {t("people.filters")}
              {activeFilters.length ? ` (${activeFilters.length})` : ""}
            </summary>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <label className="text-xs font-semibold uppercase tracking-[.12em] text-slate-500">
                {t("people.openTo")}
                <select name="open_to" defaultValue={filters.open_to ?? ""} className={`${field} mt-1`}>
                  <option value="">{t("people.allOpenTo")}</option>
                  {CONNECT_OPEN_TO_FORMATS.map((value) => (
                    <option key={value} value={value}>
                      {t(`profile.openTo.${value}`)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-semibold uppercase tracking-[.12em] text-slate-500">
                {t("people.role")}
                <select name="role" defaultValue={filters.role ?? ""} className={`${field} mt-1`}>
                  <option value="">{t("people.allRoles")}</option>
                  {CONNECT_ROLES.map((value) => (
                    <option key={value} value={value}>
                      {t(`roles.${value}`)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-semibold uppercase tracking-[.12em] text-slate-500">
                {t("people.remote")}
                <select
                  name="remote_mode"
                  defaultValue={filters.remote_mode ?? ""}
                  className={`${field} mt-1`}
                >
                  <option value="">{t("people.allRemote")}</option>
                  {CONNECT_REMOTE_MODES.map((value) => (
                    <option key={value} value={value}>
                      {t(`remote.${value}`)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-semibold uppercase tracking-[.12em] text-slate-500">
                {t("people.expertise")}
                <input
                  name="expertise"
                  defaultValue={filters.expertise ?? ""}
                  className={`${field} mt-1`}
                  placeholder={t("people.expertisePlaceholder")}
                />
              </label>
              <label className="text-xs font-semibold uppercase tracking-[.12em] text-slate-500">
                {t("people.industry")}
                <input
                  name="industry"
                  defaultValue={filters.industry ?? ""}
                  className={`${field} mt-1`}
                  placeholder={t("people.industryPlaceholder")}
                />
              </label>
              <label className="text-xs font-semibold uppercase tracking-[.12em] text-slate-500">
                {t("people.region")}
                <input
                  name="region"
                  defaultValue={filters.region ?? ""}
                  className={`${field} mt-1`}
                  placeholder={t("people.regionPlaceholder")}
                />
              </label>
            </div>
          </details>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button className="min-h-11 rounded-full bg-slate-900 px-5 text-sm font-semibold text-white">
              {t("people.apply")}
            </button>
            {isFiltered ? (
              <Link
                href="/connect/people"
                className="inline-flex min-h-11 items-center text-sm font-semibold text-slate-500 underline underline-offset-2"
              >
                {t("people.reset")}
              </Link>
            ) : null}
            <span className="ml-auto text-sm text-slate-500">
              {t("people.count", { count: people.length })}
            </span>
          </div>
        </form>

        {people.length ? (
          <section aria-label={t("people.title")} className="grid gap-4 md:grid-cols-2">
            {people.map((person) => (
              <article key={person.user_id} className={card}>
                <div className="flex items-start gap-4">
                  <ConnectAvatar
                    profile={person}
                    displayName={person.display_name}
                    className="h-14 w-14 shrink-0 rounded-full object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <h2 className="text-xl font-semibold">{person.display_name}</h2>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{person.headline}</p>
                  </div>
                </div>

                {/* Der Unterschied zu jedem anderen Verzeichnis: Man sieht,
                    in welcher Form jemand ansprechbar ist, bevor man schreibt. */}
                {person.open_to_formats?.length ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {person.open_to_formats.map((format) => (
                      <span
                        key={format}
                        className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-medium text-violet-900"
                      >
                        {t(`profile.openTo.${format}`)}
                      </span>
                    ))}
                  </div>
                ) : null}

                {person.expertise.length || person.industries.length ? (
                  <p className="mt-3 text-sm text-slate-500">
                    {[...person.expertise, ...person.industries].slice(0, 6).join(" · ")}
                  </p>
                ) : null}

                <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4 text-sm">
                  {person.location_region ? (
                    <span className="text-slate-500">{person.location_region}</span>
                  ) : null}
                  {person.ventureCount > 0 ? (
                    <span className="text-slate-500">
                      {t("people.ventureCount", { count: person.ventureCount })}
                    </span>
                  ) : null}
                  {/* Bis zum 21.09.2026 stand hier bei allen, die ihr Profil
                      NICHT oeffentlich gestellt hatten, ein grauer Hinweis
                      anstelle eines Links - "nur im Netzwerk" hiess faktisch
                      "gar nicht". Jetzt fuehrt jede Karte auf die Seite im
                      Netzwerk; die oeffentliche Adresse steht daneben, weil sie
                      das ist, was man teilen kann. */}
                  <Link
                    href={`/connect/people/${person.user_id}`}
                    className="ml-auto inline-flex min-h-11 items-center font-semibold text-violet-800 hover:underline"
                  >
                    {t("people.openProfile")}
                  </Link>
                  {person.visibility === "public" ? (
                    <Link
                      href={`/connect/p/${person.public_slug}`}
                      className="inline-flex min-h-11 items-center text-xs text-slate-500 hover:text-slate-800"
                    >
                      {t("people.openPublicProfile")}
                    </Link>
                  ) : null}
                </div>
              </article>
            ))}
          </section>
        ) : (
          <section className={`${card} text-center`}>
            <h2 className="text-xl font-semibold">
              {t(isFiltered ? "people.emptyTitle" : "people.emptyFirstTitle")}
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              {t(isFiltered ? "people.emptyText" : "people.emptyFirstText")}
            </p>
            {isFiltered ? (
              <Link
                href="/connect/people"
                className="mt-5 inline-flex min-h-11 items-center rounded-full border border-slate-200 px-5 text-sm font-semibold"
              >
                {t("people.reset")}
              </Link>
            ) : (
              <Link
                href="/connect/profile"
                className="mt-5 inline-flex min-h-11 items-center rounded-full bg-[color:var(--brand-primary)] px-5 text-sm font-semibold"
              >
                {t("people.ownProfileCta")}
              </Link>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
