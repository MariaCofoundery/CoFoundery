import Link from "next/link";
import type { ConnectFeedEntry } from "./connectFeedData";
import { formatConnectContentTimeframe, normalizeConnectLocations } from "./connectPresentation";
import { ConnectAvatar } from "./ConnectAvatar";
import type { ConnectProfile } from "./connectTypes";

type T = (key: string, values?: Record<string, string | number>) => string;

const TAG: Record<string, string> = {
  seeking: "bg-[#efeafd] text-[#4a2fb8]",
  offering: "bg-[#dcf3ef] text-[#0b5d56]",
  problem: "bg-[#fdecc8] text-[#7a4300]",
  person: "bg-[#e3eefb] text-[#0a4a7a]",
  venture: "bg-[#fbe4ef] text-[#8a1f55]",
};

function firstProfile(value: ConnectProfile | ConnectProfile[] | null | undefined) {
  return (Array.isArray(value) ? value[0] : value) ?? null;
}

/**
 * Eine Zeile der gemeinsamen Liste: Etikett, Titel mit einer Zeile Stichworte,
 * wer dahinter steht, ein Link. Die Beschreibung steht auf der Detailseite -
 * die Zeile soll man ueberfliegen koennen.
 */
export function ConnectFeedRow({ entry, t, locale }: { entry: ConnectFeedEntry; t: T; locale: string }) {
  let kind: string = entry.kind;
  let title = "";
  let facts: Array<string | null | undefined> = [];
  let href = "";
  let by: ConnectProfile | null = null;

  if (entry.kind === "listing") {
    const { listing } = entry;
    kind = listing.direction;
    title = listing.title;
    const locations = normalizeConnectLocations(listing.locations);
    const geography = locations.length ? locations.join(" & ") : listing.geographic_scope ? t(`scopes.${listing.geographic_scope}`) : null;
    facts = [
      listing.topics.slice(0, 2).join(" · "),
      geography,
      listing.remote_mode ? t(`remote.${listing.remote_mode}`) : null,
      formatConnectContentTimeframe(listing.starts_on, listing.ends_on, locale, { from: t("timeframe.from"), until: t("timeframe.until") }),
    ];
    href = `/connect/listings/${listing.id}`;
    by = firstProfile(listing.network_profiles);
  } else if (entry.kind === "problem") {
    const { problem } = entry;
    title = problem.title;
    const locations = normalizeConnectLocations(problem.locations);
    facts = [problem.topics.slice(0, 2).join(" · "), locations.length ? locations.join(" & ") : t(`scopes.${problem.geographic_scope}`)];
    href = `/connect/problems/${problem.id}`;
    by = entry.author;
  } else if (entry.kind === "person") {
    const { person } = entry;
    title = person.display_name;
    facts = [person.headline, person.expertise.slice(0, 2).join(" · "), person.location_region];
    href = `/connect/people/${person.user_id}`;
  } else {
    const { venture } = entry;
    title = venture.name;
    facts = [venture.role_label, venture.audience];
    href = `/connect/ventures/${venture.id}`;
    by = entry.owner;
  }

  return (
    <article className="flex min-w-0 flex-col gap-2 break-words px-5 py-4 transition hover:bg-[#faf9fe] md:flex-row md:items-center md:gap-5">
      <div className="shrink-0 md:w-28">
        <span className={`inline-block rounded-full px-2.5 py-0.5 text-[13px] font-semibold ${TAG[kind]}`}>{t(`feed.kinds.${kind}`)}</span>
      </div>
      <div className="min-w-0 flex-1">
        <h2 className="text-base font-semibold leading-snug tracking-tight text-slate-950 md:text-[1.0625rem]">{title}</h2>
        {facts.filter(Boolean).length ? <p className="mt-0.5 truncate text-[13px] text-[#5f5e7a]">{facts.filter(Boolean).join(" · ")}</p> : null}
      </div>
      {by ? (
        <Link href={`/connect/people/${by.user_id}`} className="flex min-w-0 shrink-0 items-center gap-2 text-sm text-slate-800 hover:underline md:w-40">
          <ConnectAvatar profile={by} displayName={by.display_name || "Connect"} className="h-7 w-7 shrink-0 rounded-full object-cover" />
          <span className="truncate">{by.display_name}</span>
        </Link>
      ) : <span className="hidden md:block md:w-40" />}
      <Link href={href} className="shrink-0 self-start text-sm font-semibold text-[#6d49e0] hover:underline md:self-center">{t("feed.view")} →</Link>
    </article>
  );
}
