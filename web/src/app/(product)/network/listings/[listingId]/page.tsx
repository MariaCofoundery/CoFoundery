import Link from "next/link"; import { notFound } from "next/navigation"; import { getLocale, getTranslations } from "next-intl/server";
import { requireNetworkMember } from "@/features/network/networkAccess"; import { getNetworkListing } from "@/features/network/networkData";
import { formatNetworkContentTimeframe, normalizeNetworkLocations } from "@/features/network/networkPresentation";
import type { NetworkProfile } from "@/features/network/networkTypes";
export default async function ListingDetail({ params, searchParams }: { params: Promise<{listingId:string}>; searchParams: Promise<Record<string,string|undefined>> }) {
  const { listingId } = await params; const [t, locale, query] = await Promise.all([getTranslations("network"), getLocale(), searchParams]); const { client, user } = await requireNetworkMember(`/network/listings/${listingId}`); const listing = await getNetworkListing(client, listingId); if (!listing) notFound();
  const profileValue = listing.network_profiles; const profile = (Array.isArray(profileValue) ? profileValue[0] : profileValue) as NetworkProfile | null;
  const own = listing.owner_user_id === user.id;
  const locations = normalizeNetworkLocations(listing.locations);
  const timeframe = formatNetworkContentTimeframe(listing.starts_on, listing.ends_on, locale, { from: t("timeframe.from"), until: t("timeframe.until") });
  const framework = [locations.length ? locations.join(" & ") : null, listing.geographic_scope ? t(`scopes.${listing.geographic_scope}`) : null, listing.remote_mode ? t(`remote.${listing.remote_mode}`) : null, timeframe, listing.venture_stage ? t(`stages.${listing.venture_stage}`) : null].filter(Boolean);
  return <main className="min-h-screen bg-slate-50 px-5 py-9"><div className="mx-auto max-w-3xl"><Link href="/network" className="inline-flex min-h-11 items-center text-sm font-semibold text-slate-600">← {t("navigation.overview")}</Link>{query.saved ? <p className="mb-4 mt-3 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900">{t(`success.listing.${query.saved}`)}</p> : null}<article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-9">
    <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs font-semibold uppercase tracking-[.18em] text-violet-700">{t(`directions.${listing.direction}`)} · {t(`categories.${listing.category}`)}</p>{own ? <Link href={`/network/listings/${listing.id}/edit`} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold">{t("actions.edit")}</Link> : null}</div>
    <h1 className="mt-4 text-3xl font-semibold tracking-tight">{listing.title}</h1>
    <section className="mt-8"><h2 className="text-lg font-semibold">{t("detail.what")}</h2><p className="mt-2 whitespace-pre-wrap leading-7 text-slate-700">{listing.summary}</p></section>
    {listing.topics.length ? <section className="mt-7"><h2 className="font-semibold">{t("detail.topics")}</h2><div className="mt-3 flex flex-wrap gap-2">{listing.topics.map((v) => <span key={v} className="rounded-full bg-slate-100 px-3 py-1 text-sm">{v}</span>)}</div></section> : null}
    {listing.industries.length ? <section className="mt-7"><h2 className="font-semibold">{t("detail.industries")}</h2><p className="mt-2 text-slate-600">{listing.industries.join(" · ")}</p></section> : null}
    {framework.length ? <section className="mt-7"><h2 className="font-semibold">{t("detail.framework")}</h2><p className="mt-2 text-slate-600">{framework.join(" · ")}</p></section> : null}
    {profile ? <section className="mt-8 rounded-2xl bg-slate-50 p-5"><p className="text-xs font-semibold uppercase tracking-[.16em] text-slate-500">{t("detail.person")}</p><h2 className="mt-2 text-xl font-semibold">{profile.display_name}</h2><p className="mt-1 text-sm text-slate-600">{profile.headline}</p><p className="mt-3 leading-7 text-slate-700">{profile.bio}</p></section> : null}
  </article></div></main>;
}
