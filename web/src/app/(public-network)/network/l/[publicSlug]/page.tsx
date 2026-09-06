import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { PublicNetworkAvatar, PublicNetworkShell } from "@/features/network/PublicNetworkShell";
import { getPublicNetworkListing, publicNetworkPhotoUrl } from "@/features/network/publicNetworkData";
import { getNetworkBlockState } from "@/features/network/networkData";
import { formatNetworkContentTimeframe, normalizeNetworkLocations } from "@/features/network/networkPresentation";
import { createClient } from "@/lib/supabase/server";
import { getPublicAppOrigin } from "@/lib/publicAppOrigin";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({ params }: { params: Promise<{ publicSlug: string }> }): Promise<Metadata> {
  const { publicSlug } = await params;
  const listing = await getPublicNetworkListing(await createClient(), publicSlug).catch(() => null);
  if (!listing) return { title: "Network | CoFoundery", robots: { index: false, follow: false } };
  const canonical = `${getPublicAppOrigin()}/network/l/${listing.public_slug}`;
  return { title: `${listing.title} | CoFoundery Network`, description: listing.summary.slice(0, 155), alternates: { canonical }, robots: { index: true, follow: true } };
}

export default async function PublicNetworkListingPage({ params }: { params: Promise<{ publicSlug: string }> }) {
  const { publicSlug } = await params;
  const client = await createClient();
  const [t, locale, listing, auth] = await Promise.all([
    getTranslations("network"), getLocale(), getPublicNetworkListing(client, publicSlug).catch(() => null), client.auth.getUser(),
  ]);
  if (!listing) notFound();
  const membershipResult = auth.data.user ? await client.rpc("is_network_member") : null;
  const member = membershipResult?.data === true;
  const internalResult = member ? await client.from("network_listings").select("id,owner_user_id").eq("public_slug", listing.public_slug).maybeSingle() : null;
  const internal = internalResult?.data ?? null;
  const own = Boolean(auth.data.user && internal?.owner_user_id === auth.data.user.id);
  const blocked = member && internal && !own ? (await getNetworkBlockState(client, internal.owner_user_id)).interaction_blocked : false;
  const locations = normalizeNetworkLocations(listing.locations);
  const timeframe = formatNetworkContentTimeframe(listing.starts_on, listing.ends_on, locale, { from: t("timeframe.from"), until: t("timeframe.until") });
  const facts = [locations.length ? locations.join(" & ") : null, listing.geographic_scope ? t(`scopes.${listing.geographic_scope}`) : null, listing.remote_mode ? t(`remote.${listing.remote_mode}`) : null, timeframe, listing.venture_stage ? t(`stages.${listing.venture_stage}`) : null].filter(Boolean);
  const photo = listing.owner_photo_available ? publicNetworkPhotoUrl("listing", listing.public_slug, listing.updated_at) : null;
  const returnPath = `/network/l/${listing.public_slug}`;

  return <PublicNetworkShell><main className="mx-auto max-w-3xl px-5 py-10 md:px-8 md:py-14"><article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-9">
    <p className="text-xs font-semibold uppercase tracking-[.18em] text-violet-700">{t(`directions.${listing.direction}`)} · {t(`categories.${listing.category}`)}</p>
    <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-4xl">{listing.title}</h1>
    <section className="mt-8"><h2 className="text-lg font-semibold">{t("detail.what")}</h2><p className="mt-2 whitespace-pre-wrap leading-7 text-slate-700">{listing.summary}</p></section>
    {listing.topics.length ? <section className="mt-7"><h2 className="font-semibold">{t("detail.topics")}</h2><div className="mt-3 flex flex-wrap gap-2">{listing.topics.map((topic) => <span key={topic} className="rounded-full bg-slate-100 px-3 py-1 text-sm">{topic}</span>)}</div></section> : null}
    {listing.industries.length ? <section className="mt-7"><h2 className="font-semibold">{t("detail.industries")}</h2><p className="mt-2 text-slate-600">{listing.industries.join(" · ")}</p></section> : null}
    {facts.length ? <section className="mt-7"><h2 className="font-semibold">{t("detail.framework")}</h2><p className="mt-2 text-slate-600">{facts.join(" · ")}</p></section> : null}
    <section className="mt-8 rounded-2xl bg-slate-50 p-5"><p className="text-xs font-semibold uppercase tracking-[.16em] text-slate-500">{t("detail.person")}</p><div className="mt-3 flex items-center gap-4"><PublicNetworkAvatar src={photo} displayName={listing.owner_display_name} className="h-14 w-14" /><div><h2 className="text-xl font-semibold">{listing.owner_display_name}</h2><p className="mt-1 text-sm text-slate-600">{listing.owner_headline}</p>{listing.owner_profile_slug ? <Link href={`/network/p/${listing.owner_profile_slug}`} className="mt-2 inline-flex font-semibold text-violet-800 hover:underline">{t("public.viewProfile")}</Link> : null}</div></div></section>
    <section className="mt-8 border-t border-slate-100 pt-6">{own ? <p className="text-sm text-slate-600">{t("public.ownListing")}</p> : blocked ? <p className="text-sm text-slate-600">{t("safety.blockedState")}</p> : member && internal ? <Link href={`/network/listings/${internal.id}/contact`} className="inline-flex min-h-11 items-center rounded-full bg-[color:var(--brand-primary)] px-5 py-3 text-sm font-semibold">{t("contact.cta")}</Link> : <div><p className="text-sm leading-6 text-slate-600">{t("public.contactRequiresAccess")}</p><div className="mt-4 flex flex-wrap gap-3"><Link href={`/login?next=${encodeURIComponent(returnPath)}`} className="inline-flex min-h-11 items-center rounded-full bg-slate-900 px-5 text-sm font-semibold text-white">{t("public.login")}</Link><Link href={`/start?intent=network&next=${encodeURIComponent(returnPath)}`} className="inline-flex min-h-11 items-center rounded-full border border-slate-300 px-5 text-sm font-semibold">{t("public.requestAccess")}</Link></div></div>}</section>
  </article></main></PublicNetworkShell>;
}
