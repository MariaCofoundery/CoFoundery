import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { requireNetworkMember } from "@/features/network/networkAccess";
import { getActiveNetworkListings } from "@/features/network/networkData";
import { NetworkListingCard } from "@/features/network/NetworkListingCard";
import { NETWORK_CATEGORIES, NETWORK_DIRECTIONS, NETWORK_GEOGRAPHIC_SCOPES, NETWORK_REMOTE_MODES } from "@/features/network/networkTypes";
import { coFounderBridgeHref } from "@/features/network/networkTypes";
import { getProfileBasicsRow } from "@/features/profile/profileData";
import { hasProfileRole } from "@/features/profile/profileRoles";

const card = "rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-[0_16px_40px_rgba(15,23,42,.05)]";
const action = "inline-flex min-h-11 items-center justify-center rounded-full px-5 py-3 text-sm font-semibold focus-visible:ring-4 focus-visible:ring-amber-200";
const field = "min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm";
export default async function NetworkPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const [t, locale, filters] = await Promise.all([getTranslations("network"), getLocale(), searchParams]);
  const { client, user } = await requireNetworkMember(); const [listings, baseProfile] = await Promise.all([getActiveNetworkListings(client, filters), getProfileBasicsRow(client, user.id).catch(() => null)]);
  const cofounderHref = coFounderBridgeHref(hasProfileRole(baseProfile?.roles, "founder"));
  return <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(103,232,249,.13),transparent_30%),linear-gradient(180deg,#fff,#f8fafc)] px-5 py-8 text-slate-950 md:px-8">
    <div className="mx-auto max-w-6xl space-y-6">
      <header className={card}><p className="text-xs font-semibold uppercase tracking-[.2em] text-slate-500">{t("eyebrow")}</p><h1 className="mt-3 text-4xl font-semibold tracking-[-.04em]">{t("title")}</h1><p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">{t("subtitle")}</p>
        <div className="mt-6 flex flex-wrap gap-3"><Link href="/network/listings/new?direction=seeking" className={`${action} bg-[color:var(--brand-primary)] text-slate-950`}>{t("actions.seek")}</Link><Link href="/network/listings/new?direction=offering" className={`${action} border border-slate-200 bg-white text-slate-800`}>{t("actions.offer")}</Link><Link href={cofounderHref} className={`${action} border border-violet-200 bg-violet-50 text-violet-800`}>{t("actions.cofounder")}</Link></div>
        <nav className="mt-5 flex flex-wrap gap-4 text-sm"><Link href="/network/my" className="font-semibold text-slate-700 underline-offset-4 hover:underline">{t("actions.my")}</Link><Link href="/network/profile" className="font-semibold text-slate-700 underline-offset-4 hover:underline">{t("actions.profile")}</Link></nav>
      </header>
      <section className={card}><h2 className="text-lg font-semibold">{t("filters.title")}</h2><form className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <select name="direction" defaultValue={filters.direction || ""} className={field} aria-label={t("filters.direction")}><option value="">{t("filters.allDirections")}</option>{NETWORK_DIRECTIONS.map((v) => <option key={v} value={v}>{t(`directions.${v}`)}</option>)}</select>
        <select name="category" defaultValue={filters.category || ""} className={field} aria-label={t("filters.category")}><option value="">{t("filters.allCategories")}</option>{NETWORK_CATEGORIES.map((v) => <option key={v} value={v}>{t(`categories.${v}`)}</option>)}</select>
        <input name="topic" defaultValue={filters.topic} className={field} placeholder={t("filters.topic")} />
        <input name="industry" defaultValue={filters.industry} className={field} placeholder={t("filters.industry")} />
        <select name="geographic_scope" defaultValue={filters.geographic_scope || ""} className={field} aria-label={t("filters.scope")}><option value="">{t("filters.allScopes")}</option>{NETWORK_GEOGRAPHIC_SCOPES.map((v) => <option key={v} value={v}>{t(`scopes.${v}`)}</option>)}</select>
        <select name="remote_mode" defaultValue={filters.remote_mode || ""} className={field} aria-label={t("filters.remote")}><option value="">{t("filters.allRemote")}</option>{NETWORK_REMOTE_MODES.map((v) => <option key={v} value={v}>{t(`remote.${v}`)}</option>)}</select>
        <button className="min-h-11 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white">{t("filters.apply")}</button>
      </form></section>
      {listings.length ? <section aria-label={t("browseTitle")} className="grid gap-4 md:grid-cols-2">{listings.map((listing) => <NetworkListingCard key={listing.id} listing={listing} t={t} locale={locale} />)}</section> : <section className={`${card} text-center`}><h2 className="text-xl font-semibold">{t("empty.title")}</h2><p className="mt-2 text-sm text-slate-600">{t("empty.text")}</p><div className="mt-5 flex flex-wrap justify-center gap-3"><Link href="/network" className={`${action} border border-slate-200`}>{t("empty.reset")}</Link><Link href="/network/listings/new?direction=seeking" className={`${action} bg-[color:var(--brand-primary)]`}>{t("empty.createSeeking")}</Link><Link href="/network/listings/new?direction=offering" className={`${action} border border-slate-200`}>{t("empty.createOffering")}</Link></div></section>}
    </div>
  </main>;
}
