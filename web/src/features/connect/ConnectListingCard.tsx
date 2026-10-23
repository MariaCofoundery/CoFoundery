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
  // Art als farbiges Etikett (Gesuch violett, Angebot gruen), Kategorie als
  // ruhiger grauer Chip - so liest man die Liste, ohne Beschriftungen zu lesen.
  const isSeeking = listing.direction === "seeking";
  return <article className="flex min-w-0 flex-col gap-3 break-words px-5 py-4 transition hover:bg-[#faf9fe] md:flex-row md:items-center md:gap-5">
    <div className="flex shrink-0 flex-wrap items-start gap-2 md:w-32 md:flex-col md:gap-1.5">
      <span className={`inline-block rounded-full px-2.5 py-0.5 text-[13px] font-semibold ${isSeeking ? "bg-[#efeafd] text-[#4a2fb8]" : "bg-[#dcf3ef] text-[#0b5d56]"}`}>{t(`directions.${listing.direction}`)}</span>
      <span className="inline-block rounded-2xl bg-[#f1f0f7] px-2.5 py-0.5 text-[13px] font-medium leading-snug text-[#33325e]">{t(`categories.${listing.category}`)}</span>
    </div>
    <div className="min-w-0 flex-1">
      <h2 className="text-base font-semibold leading-snug tracking-tight text-slate-950 md:text-[1.0625rem]">{listing.title}</h2>
      <p className="mt-1 line-clamp-2 text-sm leading-6 text-[#5f5e7a]">{listing.summary}</p>
      {listing.topics.length ? <div className="mt-2 flex flex-wrap gap-1.5">{listing.topics.slice(0, 4).map((topic) => <span key={topic} className="max-w-full break-words rounded-full bg-[#f1f0f7] px-2.5 py-0.5 text-[13px] font-medium text-[#33325e]">{topic}</span>)}</div> : null}
      {facts.length ? <p className="mt-2 text-[13px] text-[#5f5e7a]">{facts.join(" · ")}</p> : null}
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
    <Link href={`/connect/listings/${listing.id}`} className="shrink-0 self-start text-sm font-semibold text-[#6d49e0] hover:underline md:self-center">{t("actions.details")} →</Link>
  </article>;
}
