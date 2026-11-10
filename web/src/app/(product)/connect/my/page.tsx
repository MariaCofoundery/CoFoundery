import Link from "next/link";
import { listOwnDoors } from "@/features/connect/doors/doorsData";
import { getTranslations } from "next-intl/server";
import { requireConnectMember } from "@/features/connect/connectAccess";
import { getOwnConnectListings, getOwnConnectProfile } from "@/features/connect/connectData";
import { getOwnConnectProblems } from "@/features/connect/connectProblemData";
import { CONNECT_EXPIRY_WARNING_DAYS, getConnectListingDaysLeft } from "@/features/connect/connectPresentation";
import { ConnectAvatar } from "@/features/connect/ConnectAvatar";
import { ConnectLifecycleForm } from "@/features/connect/ConnectLifecycleForm";
import { knownKey } from "@/i18n/knownKey";
import { CONNECT_ERROR_KEYS, CONNECT_LIFECYCLE_KEYS } from "@/features/connect/connectFeedbackKeys";

const GROUPS = ["active", "paused", "draft", "completed"] as const;
type Group = (typeof GROUPS)[number];

/**
 * Mein Connect (Entwurf 09.11.2026): links das Profil - was andere von dir sehen und was noch offen ist -, rechts die
 * eigenen Beitraege mit Filter nach Zustand. Leere Zustaende sind ausgegraut statt eine Ueberschrift mit "Keine".
 * Probleme, Ventures und Suchen stehen in der Unterleiste (`ConnectMyNavigation`), jede mit eigener Adresse.
 */
export default async function MyConnectPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const t = await getTranslations("connect"); const { client, user } = await requireConnectMember("/connect/my");
  const [listings, problems, profile, params, ownDoors] = await Promise.all([getOwnConnectListings(client, user.id), getOwnConnectProblems(client, user.id), getOwnConnectProfile(client, user.id), searchParams, listOwnDoors(client, user.id)]);
  const now = new Date();
  const expired = (listing: (typeof listings)[number]) => listing.status === "active" && Boolean(listing.expires_at && new Date(listing.expires_at) <= now);
  const groupOf = (listing: (typeof listings)[number]): Group => (listing.status === "completed" || expired(listing) ? "completed" : (listing.status as Group));
  const counts = Object.fromEntries(GROUPS.map((group) => [group, listings.filter((listing) => groupOf(listing) === group).length])) as Record<Group, number>;
  // Voreingestellt: "Aktiv"; hat man nichts Aktives, der erste Zustand mit Eintraegen.
  const requested = GROUPS.find((group) => group === params.status);
  const current: Group = requested ?? (counts.active > 0 ? "active" : GROUPS.find((group) => counts[group] > 0) ?? "active");
  const rows = listings.filter((listing) => groupOf(listing) === current);
  const open = profile ? [
    ownDoors.length === 0 ? t("my.todo.reach") : null,
    !profile.open_to_formats?.length ? t("my.todo.open") : null,
  ].filter(Boolean) as string[] : [];
  const here = (status: Group) => `/connect/my?status=${status}`;
  return <main className="mx-auto max-w-6xl px-5 py-8">
    <Link href="/connect" className="mb-3 inline-flex min-h-11 items-center text-sm font-semibold text-slate-600 hover:text-slate-950">← {t("navigation.overview")}</Link>
    <header className="flex flex-wrap items-center justify-between gap-4">
      <h1 className="font-brand text-3xl font-semibold leading-tight text-slate-950 sm:text-4xl">{t("my.home")}</h1>
      <Link href="/connect/listings/new" className="inline-flex min-h-11 items-center rounded-xl bg-[#6D49E0] px-5 py-3 text-sm font-semibold text-white">{t("my.createShort")}</Link>
    </header>
    {knownKey(params.changed, CONNECT_LIFECYCLE_KEYS) ? <p role="status" className="mt-5 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900">{t(`success.lifecycle.${knownKey(params.changed, CONNECT_LIFECYCLE_KEYS)}`)}</p> : null}
    {knownKey(params.error, CONNECT_ERROR_KEYS) ? <p role="alert" className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">{t(`errors.${knownKey(params.error, CONNECT_ERROR_KEYS)}`)}</p> : null}
    {params.error === "publish_profile" ? <Link href="/connect/profile" className="inline-flex min-h-11 items-center underline">{t("actions.profile")}</Link> : null}

    <div className="mt-6 grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start">
      <aside aria-labelledby="my-profile-title" className="grid gap-4">
        <section className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-5">
          <h2 id="my-profile-title" className="sr-only">{t("my.profileTitle")}</h2>
          {profile ? <>
            <div className="flex items-center gap-3">
              <ConnectAvatar profile={profile} displayName={profile.display_name} className="h-14 w-14 rounded-full object-cover" />
              <div className="min-w-0"><p className="font-semibold text-slate-950">{profile.display_name}</p><p className="text-[13.5px] leading-5 text-slate-600">{profile.headline}</p></div>
            </div>
            {profile.network_roles.length > 0 ? <ul className="flex flex-wrap gap-1.5">{profile.network_roles.map((role) => <li key={role} className="rounded-full bg-violet-50 px-2.5 py-1 text-[12.5px] font-semibold text-violet-900">{t(`roles.${role}`)}</li>)}</ul> : null}
            <p className="flex items-center gap-2 text-[13.5px]"><span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ${profile.status === "active" ? "bg-emerald-600" : "bg-slate-400"}`} /><span className="font-semibold">{t(`my.profileStatus.${profile.status}`)}</span></p>
          </> : <p className="text-sm leading-6 text-slate-700">{t("my.profileEmpty")}</p>}
          <Link href="/connect/profile" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white">{profile ? t("my.profileEdit") : t("my.profileCreate")}</Link>
        </section>
        {open.length > 0 ? (
          <section aria-labelledby="my-open-title" className="grid gap-2 rounded-3xl border border-amber-200 bg-amber-50 p-5">
            <h2 id="my-open-title" className="text-sm font-semibold text-amber-950">{t("my.todo.title")}</h2>
            <ul className="grid gap-1.5 text-[13.5px] leading-5 text-amber-950">{open.map((item) => <li key={item} className="flex gap-2"><span aria-hidden="true">○</span>{item}</li>)}</ul>
            <p className="text-[12.5px] text-amber-900">{t("my.todo.note")}</p>
          </section>
        ) : null}
      </aside>

      <section aria-labelledby="my-listings-title" className="grid min-w-0 gap-4">
        <h2 id="my-listings-title" className="sr-only">{t("my.listingsTitle")}</h2>
        <nav aria-label={t("my.listingsTitle")} className="flex flex-wrap items-center gap-2">
          {GROUPS.map((group) => (
            <Link key={group} href={here(group)} aria-current={group === current ? "true" : undefined} className={`inline-flex min-h-11 items-center rounded-full border-[1.5px] px-4 text-sm font-semibold ${group === current ? "border-violet-600 bg-violet-50 text-slate-950" : "border-slate-300 bg-white"} ${counts[group] === 0 && group !== current ? "text-slate-500" : "text-slate-900"}`}>
              {t(`statuses.${group}`)} · {counts[group]}
            </Link>
          ))}
        </nav>
        {rows.length === 0 ? <p className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600">{t("my.empty")}</p> : (
          <div className="grid gap-3">
            {rows.map((listing) => {
              const isExpired = expired(listing);
              const daysLeft = !isExpired && listing.status === "active" ? getConnectListingDaysLeft(listing.expires_at) : null;
              const urgent = daysLeft !== null && daysLeft <= CONNECT_EXPIRY_WARNING_DAYS;
              return (
                <article key={listing.id} className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold uppercase tracking-[.14em] text-slate-600">{t(`directions.${listing.direction}`)} · {t(`categories.${listing.category}`)}</p>
                      <h3 className="mt-1 font-semibold text-slate-950">{listing.title || t("my.untitled")}</h3>
                      {/* Wann laeuft sie aus? Ohne diese Angabe kann niemand rechtzeitig verlaengern. */}
                      {daysLeft !== null ? <p className={`mt-1 text-xs ${urgent ? "font-semibold text-amber-800" : "text-slate-600"}`}>{t("my.expiresIn", { days: daysLeft })}</p> : null}
                    </div>
                    <Link href={`/connect/listings/${listing.id}`} className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 px-4 text-sm font-semibold">{t("actions.details")}</Link>
                    <Link href={`/connect/listings/${listing.id}/edit`} className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 px-4 text-sm font-semibold">{t("actions.edit")}</Link>
                  </div>
                  <details className="mt-2">
                    <summary className="inline-flex min-h-11 cursor-pointer items-center text-sm font-semibold text-slate-700 underline-offset-4 hover:underline">{t("my.more")}</summary>
                    <div className="mt-2"><ConnectLifecycleForm id={listing.id} status={isExpired ? "expired" : listing.status} /></div>
                  </details>
                </article>
              );
            })}
          </div>
        )}
        {/* Die eigenen Probleme stehen im Bereich "Probleme"; hier bleibt ein Verweis. */}
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5">
          <div>
            <h2 className="text-base font-semibold">{t("my.problemsTitle")}</h2>
            <p className="mt-1 text-sm text-slate-600">{problems.length ? t("problemsArea.mineCount", { count: problems.length }) : t("my.problemsEmpty")}</p>
          </div>
          <Link href="/connect/problems/mine" className="inline-flex min-h-11 items-center rounded-full border border-slate-300 px-4 text-sm font-semibold text-violet-800">{t("problemsArea.mineLink")} →</Link>
        </section>
      </section>
    </div>
  </main>;
}
