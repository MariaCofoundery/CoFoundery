import Link from "next/link";
import type { NetworkListing, NetworkProfile } from "./networkTypes";

type T = (key: string, values?: Record<string, string | number>) => string;
function owner(listing: NetworkListing) {
  const value = listing.network_profiles;
  return (Array.isArray(value) ? value[0] : value) as NetworkProfile | null | undefined;
}
export function NetworkListingCard({ listing, t }: { listing: NetworkListing; t: T }) {
  const profile = owner(listing);
  const facts = [listing.location_region, listing.remote_mode ? t(`remote.${listing.remote_mode}`) : null, listing.timeframe].filter(Boolean);
  return <article className="flex h-full flex-col rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_14px_36px_rgba(15,23,42,.05)]">
    <div className="flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[.14em]">
      <span className={listing.direction === "seeking" ? "text-violet-700" : "text-emerald-700"}>{t(`directions.${listing.direction}`)}</span>
      <span className="text-slate-400">·</span><span className="text-slate-600">{t(`categories.${listing.category}`)}</span>
    </div>
    <h2 className="mt-3 text-xl font-semibold tracking-tight text-slate-950">{listing.title}</h2>
    <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">{listing.summary}</p>
    {listing.topics.length ? <div className="mt-4 flex flex-wrap gap-2">{listing.topics.slice(0, 4).map((topic) => <span key={topic} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">{topic}</span>)}</div> : null}
    {facts.length ? <p className="mt-4 text-xs text-slate-500">{facts.join(" · ")}</p> : null}
    <div className="mt-auto flex items-end justify-between gap-4 border-t border-slate-100 pt-4">
      <div><p className="text-sm font-semibold text-slate-900">{profile?.display_name}</p><p className="text-xs text-slate-500">{profile?.headline}</p></div>
      <Link href={`/network/listings/${listing.id}`} className="shrink-0 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">{t("actions.details")}</Link>
    </div>
  </article>;
}

