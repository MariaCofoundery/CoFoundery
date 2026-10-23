import Link from "next/link";
import type { ConnectListing, ConnectProfile } from "./connectTypes";
import { formatConnectContentTimeframe, normalizeConnectLocations } from "./connectPresentation";
import { ConnectAvatar } from "./ConnectAvatar";

type T = (key: string, values?: Record<string, string | number>) => string;
function owner(listing: ConnectListing) {
  const value = listing.network_profiles;
  return (Array.isArray(value) ? value[0] : value) as ConnectProfile | null | undefined;
}
export function ConnectListingCard({ listing, t, locale }: { listing: ConnectListing; t: T; locale: string }) {
  const profile = owner(listing);
  const locations = normalizeConnectLocations(listing.locations);
  const timeframe = formatConnectContentTimeframe(listing.starts_on, listing.ends_on, locale, { from: t("timeframe.from"), until: t("timeframe.until") });
  const geography = locations.length ? locations.join(" & ") : listing.geographic_scope ? t(`scopes.${listing.geographic_scope}`) : null;
  const facts = [geography, listing.remote_mode ? t(`remote.${listing.remote_mode}`) : null, timeframe].filter(Boolean);
  // Eine Zeile in der Liste, keine Karte im Raster: Gesuche und Angebote liest man
  // untereinander, und die Zeile traegt dasselbe wie vorher die Karte.
  return <article className="flex min-w-0 flex-col gap-3 break-words px-5 py-4 transition hover:bg-violet-50/40 md:flex-row md:items-center md:gap-5">
    <div className="flex shrink-0 flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[.14em] md:w-28 md:flex-col md:gap-1">
      <span className={listing.direction === "seeking" ? "text-violet-700" : "text-emerald-700"}>{t(`directions.${listing.direction}`)}</span>
      <span className="text-slate-400 md:hidden">·</span><span className="text-slate-600">{t(`categories.${listing.category}`)}</span>
    </div>
    <div className="min-w-0 flex-1">
      <h2 className="text-base font-semibold tracking-tight text-slate-950 md:text-lg">{listing.title}</h2>
      <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-600">{listing.summary}</p>
      {listing.topics.length ? <div className="mt-2 flex flex-wrap gap-2">{listing.topics.slice(0, 4).map((topic) => <span key={topic} className="max-w-full break-words rounded-full bg-violet-50 px-3 py-1 text-xs text-violet-900">{topic}</span>)}</div> : null}
      {facts.length ? <p className="mt-2 text-xs text-slate-500">{facts.join(" · ")}</p> : null}
    </div>
    {/* Der Mensch hinter der Anzeige ist ein Link. Bis zum 21.09.2026 stand
        hier nur sein Name - man sah, wer es ist, und kam nicht hin. */}
    {profile?.user_id ? (
      <Link href={`/connect/people/${profile.user_id}`} className="flex min-w-0 shrink-0 items-center gap-3 rounded-xl hover:bg-slate-50 md:w-48">
        <ConnectAvatar profile={profile} displayName={profile.display_name || "Connect"} />
        <div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900">{profile.display_name}</p><p className="truncate text-xs text-slate-500">{profile.headline}</p></div>
      </Link>
    ) : (
      <div className="flex min-w-0 shrink-0 items-center gap-3 md:w-48"><ConnectAvatar profile={profile} displayName={profile?.display_name || "Connect"} /><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900">{profile?.display_name}</p><p className="truncate text-xs text-slate-500">{profile?.headline}</p></div></div>
    )}
    <Link href={`/connect/listings/${listing.id}`} className="brand-cta shrink-0 self-start rounded-full px-4 py-2 text-sm font-semibold md:self-center">{t("actions.details")}</Link>
  </article>;
}
