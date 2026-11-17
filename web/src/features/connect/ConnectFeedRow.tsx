import Link from "next/link";
import type { ConnectFeedEntry } from "./connectFeedData";
import { formatConnectContentTimeframe, normalizeConnectLocations } from "./connectPresentation";
import { ConnectPersonLink } from "./ConnectPersonLink";
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
        <h2 className="text-base font-semibold leading-snug tracking-tight text-slate-950 md:text-[1.0625rem]"><Link href={href} className="hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500">{title}</Link></h2>
        {facts.filter(Boolean).length ? <p className="mt-0.5 truncate text-[13px] text-[#5f5e7a]">{facts.filter(Boolean).join(" · ")}</p> : null}
      </div>
      {by ? (
        <ConnectPersonLink userId={by.user_id} name={by.display_name || "Connect"} profile={by} avatarClassName="h-7 w-7 rounded-full object-cover" className="shrink-0 gap-2 md:w-40" nameClassName="text-sm font-normal text-slate-800" />
      ) : entry.kind === "problem" && entry.problem.origin === "public_source" ? (
        // Aus einer oeffentlichen Quelle: kein Verfasser, die Zeile sagt woher.
        <span className="min-w-0 shrink-0 truncate text-[13px] text-[#5f5e7a] md:w-40">{t("problems.source.tag")}</span>
      ) : <span className="hidden md:block md:w-40" />}
      <Link href={href} className="shrink-0 self-start text-sm font-semibold text-[#6d49e0] hover:underline md:self-center">{t("feed.view")} →</Link>
    </article>
  );
}
