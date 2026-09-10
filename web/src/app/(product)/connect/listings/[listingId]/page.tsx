import Link from "next/link"; import { notFound } from "next/navigation"; import { getLocale, getTranslations } from "next-intl/server";
import { requireConnectMember } from "@/features/connect/connectAccess"; import { getConnectBlockState, getConnectListing, getOwnContactRequestForListing } from "@/features/connect/connectData";
import { formatConnectContentTimeframe, normalizeConnectLocations } from "@/features/connect/connectPresentation";
import type { ConnectProfile } from "@/features/connect/connectTypes";
import { ConnectAvatar } from "@/features/connect/ConnectAvatar";
import { DisclosedCapability } from "@/features/capability/DisclosedCapability";
import { getDisclosedCapability } from "@/features/capability/capabilityData";
import { knownKey } from "@/i18n/knownKey";
import { CONNECT_PUBLICATION_KEYS } from "@/features/connect/connectFeedbackKeys";
export default async function ListingDetail({ params, searchParams }: { params: Promise<{listingId:string}>; searchParams: Promise<Record<string,string|undefined>> }) {
  const { listingId } = await params; const [t, locale, query] = await Promise.all([getTranslations("connect"), getLocale(), searchParams]); const { client, user } = await requireConnectMember(`/connect/listings/${listingId}`); const listing = await getConnectListing(client, listingId); if (!listing) notFound();
  const profileValue = listing.network_profiles; const profile = (Array.isArray(profileValue) ? profileValue[0] : profileValue) as ConnectProfile | null;
  const own = listing.owner_user_id === user.id;
  // Bedingungen prueft get_disclosed_capability; nur beim eigenen Eintrag wird gar nicht gefragt.
  const disclosedCapability = own ? [] : await getDisclosedCapability(client, listing.owner_user_id, "connect");
  const capabilityT = await getTranslations("capability");
  const [contactRequest, blockState] = own ? [null, null] : await Promise.all([getOwnContactRequestForListing(client, user.id, listing.id), getConnectBlockState(client, listing.owner_user_id)]);
  const locations = normalizeConnectLocations(listing.locations);
  const timeframe = formatConnectContentTimeframe(listing.starts_on, listing.ends_on, locale, { from: t("timeframe.from"), until: t("timeframe.until") });
  const framework = [locations.length ? locations.join(" & ") : null, listing.geographic_scope ? t(`scopes.${listing.geographic_scope}`) : null, listing.remote_mode ? t(`remote.${listing.remote_mode}`) : null, timeframe, listing.venture_stage ? t(`stages.${listing.venture_stage}`) : null].filter(Boolean);
  return <main className="min-h-screen bg-slate-50 px-5 py-9"><div className="mx-auto max-w-3xl"><Link href="/connect" className="inline-flex min-h-11 items-center text-sm font-semibold text-slate-600">← {t("navigation.overview")}</Link>{knownKey(query.saved, CONNECT_PUBLICATION_KEYS) ? <p role="status" className="mb-4 mt-3 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900">{t(`success.listing.${knownKey(query.saved, CONNECT_PUBLICATION_KEYS)}`)}</p> : null}{query.contact === "sent" ? <p className="mb-4 mt-3 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900">{t("contact.sent")}</p> : null}<article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-9">
    <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs font-semibold uppercase tracking-[.18em] text-violet-700">{t(`directions.${listing.direction}`)} · {t(`categories.${listing.category}`)}</p>{own ? <div className="flex flex-wrap gap-2">{listing.visibility === "public" && listing.status === "active" && Boolean(listing.expires_at && new Date(listing.expires_at) > new Date()) ? <Link href={`/connect/l/${listing.public_slug}`} className="rounded-full border border-violet-200 px-4 py-2 text-sm font-semibold text-violet-800">{t("visibility.openPublicPage")}</Link> : null}<Link href={`/connect/listings/${listing.id}/edit`} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold">{t("actions.edit")}</Link></div> : null}</div>
    <h1 className="mt-4 text-3xl font-semibold tracking-tight">{listing.title}</h1>
    <section className="mt-8"><h2 className="text-lg font-semibold">{t("detail.what")}</h2><p className="mt-2 whitespace-pre-wrap leading-7 text-slate-700">{listing.summary}</p></section>
    {listing.topics.length ? <section className="mt-7"><h2 className="font-semibold">{t("detail.topics")}</h2><div className="mt-3 flex flex-wrap gap-2">{listing.topics.map((v) => <span key={v} className="rounded-full bg-slate-100 px-3 py-1 text-sm">{v}</span>)}</div></section> : null}
    {listing.industries.length ? <section className="mt-7"><h2 className="font-semibold">{t("detail.industries")}</h2><p className="mt-2 text-slate-600">{listing.industries.join(" · ")}</p></section> : null}
    {framework.length ? <section className="mt-7"><h2 className="font-semibold">{t("detail.framework")}</h2><p className="mt-2 text-slate-600">{framework.join(" · ")}</p></section> : null}
    {profile ? <section className="mt-8 rounded-2xl bg-slate-50 p-5"><p className="text-xs font-semibold uppercase tracking-[.16em] text-slate-500">{t("detail.person")}</p><div className="mt-3 flex items-center gap-4"><ConnectAvatar profile={profile} displayName={profile.display_name} className="h-14 w-14 rounded-full object-cover" /><div><h2 className="text-xl font-semibold">{profile.display_name}</h2><p className="mt-1 text-sm text-slate-600">{profile.headline}</p></div></div><p className="mt-3 leading-7 text-slate-700">{profile.bio}</p></section> : null}
    {!own ? <section className="mt-8 border-t border-slate-100 pt-6">{blockState?.interaction_blocked ? <p className="text-sm text-slate-600">{t("safety.blockedState")}</p> : !contactRequest ? <Link href={`/connect/listings/${listing.id}/contact`} className="inline-flex min-h-11 items-center rounded-full bg-[color:var(--brand-primary)] px-5 py-3 text-sm font-semibold">{t("contact.cta")}</Link> : <div><p className="font-semibold text-slate-900">{t(`contact.listingStatus.${contactRequest.status}`)}</p><p className="mt-1 text-sm text-slate-600">{t(`contact.statusText.${contactRequest.status}`)}</p><Link href="/connect/contacts" className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-violet-800 hover:underline">{t("contact.openContacts")}</Link></div>}</section> : null}
  </article>
    <DisclosedCapability
      rows={disclosedCapability}
      copy={{
        title: capabilityT("foreign.title"),
        familyLabel: (familyId) => capabilityT(`families.${familyId}`),
        areaLabel: (areaId) => capabilityT(`areaLabels.${areaId}`),
        levelLabel: (level) => capabilityT(`levels.${level}`),
        ownershipLabel: (wish) => capabilityT(`ownershipWishes.${wish}`),
      }}
    />
  </div></main>;
}
