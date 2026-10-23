import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { connectPage, CONNECT_PAGE_SIZE } from "@/features/connect/connectBrowsePage";
import { getActiveConnectListings, getConnectProfilesByUserIds } from "@/features/connect/connectData";
import { getConnectPeople, type ConnectPerson } from "@/features/connect/connectPeopleData";
import { getActiveConnectProblems } from "@/features/connect/connectProblemData";
import { getActiveConnectVentures } from "@/features/connect/connectVentureData";
import {
  FEED_MAX_PAGES,
  parseFeedKinds,
  parseFeedWork,
  pickFeedPage,
  topValues,
  workToRemoteModes,
} from "@/features/connect/connectFeedModel";
import type { ConnectListing, ConnectProblem, ConnectProfile, ConnectVenture } from "@/features/connect/connectTypes";

type Client = SupabaseClient;

export type ConnectFeedEntry =
  | { key: string; at: string; kind: "listing"; listing: ConnectListing }
  | { key: string; at: string; kind: "problem"; problem: ConnectProblem; author: ConnectProfile | null }
  | { key: string; at: string; kind: "person"; person: ConnectPerson }
  | { key: string; at: string; kind: "venture"; venture: ConnectVenture; owner: ConnectProfile | null };

/**
 * Die gemeinsame Liste.
 *
 * Jede Art kommt aus ihrer eigenen Abfrage - die Sichtbarkeit (Entwuerfe,
 * gesperrte Konten, Blockaden) bleibt damit dort, wo sie schon geprueft wird.
 * Hier wird nur zusammengefuehrt und nach Aktualitaet sortiert.
 *
 * WER EIN ATTRIBUT NICHT HAT, FAELLT BEI DEM FILTER RAUS: Thema und Ort gibt es
 * bei Gesuchen, Angeboten und Problemen (bei Menschen als Fachgebiet und
 * Region), Arbeitsort nur bei Gesuchen und Angeboten. Wer danach filtert, sieht
 * nur, was dazu eine Angabe hat - ein Unternehmen ohne Ort steht nicht
 * "irgendwo".
 */
export async function getConnectFeed(client: Client, filters: Record<string, string | undefined>) {
  const kinds = parseFeedKinds(filters.art);
  const work = parseFeedWork(filters.work);
  const remoteModes = workToRemoteModes(work);
  const q = (filters.q ?? "").trim();
  const topic = (filters.topic ?? "").trim();
  const location = (filters.location ?? "").trim();
  const page = Math.min(connectPage(filters.page), FEED_MAX_PAGES);
  const pages = Array.from({ length: page }, (_, index) => String(index + 1));

  const wantSeeking = kinds.includes("seeking");
  const wantOffering = kinds.includes("offering");
  const direction = wantSeeking && !wantOffering ? "seeking" : wantOffering && !wantSeeking ? "offering" : undefined;
  const workFiltered = work.length > 0;

  const [listingPages, problemPages, peoplePages, venturePages] = await Promise.all([
    wantSeeking || wantOffering
      ? Promise.all(pages.map((p) => getActiveConnectListings(client, {
          q, topic, location, direction, page: p, remote_modes: remoteModes?.join(",") ?? undefined,
        })))
      : [],
    kinds.includes("problem") && !workFiltered
      ? Promise.all(pages.map((p) => getActiveConnectProblems(client, { q, topic, location, page: p })))
      : [],
    kinds.includes("person") && !workFiltered
      ? Promise.all(pages.map((p) => getConnectPeople(client, "", { q, expertise: topic, region: location, page: p })))
      : [],
    kinds.includes("venture") && !workFiltered && !topic && !location
      ? Promise.all(pages.map((p) => getActiveConnectVentures(client, q, p)))
      : [],
  ]);

  const listings = listingPages.flat();
  const problems = problemPages.flat();
  const people = peoplePages.flat();
  const ventures = venturePages.flat();

  const merged = pickFeedPage(
    [
      ...listings.map((listing) => ({ key: `listing:${listing.id}`, at: listing.published_at ?? listing.created_at, kind: "listing" as const, listing })),
      ...problems.map((problem) => ({ key: `problem:${problem.id}`, at: problem.published_at ?? "", kind: "problem" as const, problem })),
      ...people.map((person) => ({ key: `person:${person.user_id}`, at: person.published_at ?? person.updated_at, kind: "person" as const, person })),
      ...ventures.map((venture) => ({ key: `venture:${venture.id}`, at: venture.created_at, kind: "venture" as const, venture })),
    ],
    page,
    CONNECT_PAGE_SIZE,
  );

  // Namen holen wir nur fuer die Seite, die man wirklich sieht.
  const ownerIds = merged.entries.flatMap((entry) =>
    entry.kind === "problem" ? [entry.problem.author_user_id ?? ""] : entry.kind === "venture" ? [entry.venture.owner_user_id] : [],
  );
  const owners = await getConnectProfilesByUserIds(client, ownerIds);

  const entries: ConnectFeedEntry[] = merged.entries.map((entry) => {
    if (entry.kind === "problem") return { ...entry, author: owners.get(entry.problem.author_user_id ?? "") ?? null };
    if (entry.kind === "venture") return { ...entry, owner: owners.get(entry.venture.owner_user_id) ?? null };
    return entry;
  });
  return { entries, hasMore: merged.hasMore, page };
}

/** Die haeufigsten Themen und Orte der laufenden Eintraege - fuer die beiden Auswahlfelder. */
export async function getConnectFilterOptions(client: Client) {
  const [listings, problems] = await Promise.all([
    client.from("connect_discovery_listings").select("topics, locations").eq("status", "active").gt("expires_at", new Date().toISOString()).limit(400),
    client.from("connect_discovery_problems").select("topics, locations").eq("status", "active").limit(400),
  ]);
  const rows = [...(listings.data ?? []), ...(problems.data ?? [])] as Array<{ topics: string[] | null; locations: string[] | null }>;
  return {
    topics: topValues(rows.map((row) => row.topics), 40),
    locations: topValues(rows.map((row) => row.locations), 40),
  };
}
