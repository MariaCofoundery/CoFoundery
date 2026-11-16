import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { daysSince } from "@/features/connect/newestEntriesModel";

type Row = { id: string; title: string; direction: "seeking" | "offering"; locations: string[] | null; published_at: string | null };

/**
 * "Das passiert gerade im Netzwerk" (Entwurf 16.11.2026): die drei neuesten veroeffentlichten Eintraege, die nicht von mir sind. Das sind
 * dieselben Eintraege, die jedes Mitglied ohnehin sieht - die Sichtbarkeit entscheidet die Datenbank, nicht diese Karte. Ohne Namen, ohne Zaehler.
 * Gibt es noch keinen, steht eine Einladung statt einer leeren Flaeche.
 */
export async function NewestEntries({ client, userId }: { client: SupabaseClient; userId: string }) {
  const t = await getTranslations("connect");
  const { data } = await client
    .from("network_listings")
    .select("id,title,direction,locations,published_at")
    .eq("status", "active")
    .neq("owner_user_id", userId)
    .gt("expires_at", new Date().toISOString())
    .order("published_at", { ascending: false })
    .limit(3);
  const rows = (data ?? []) as Row[];
  return (
    <section data-connect-newest className="mt-6" aria-labelledby="connect-newest-title">
      <h2 id="connect-newest-title" className="text-xl font-semibold text-[#0b1f3a]">{t("newest.title")}</h2>
      {rows.length === 0 ? (
        <p className="mt-2 rounded-2xl border border-slate-200 bg-white p-4 text-[15px] leading-6 text-slate-700">{t("newest.empty")}</p>
      ) : (
        <>
          <p className="mt-1 text-[15px] text-slate-700">{t("newest.lead")}</p>
          <ul className="mt-3 grid gap-3 lg:grid-cols-3">
            {rows.map((row) => {
              const seeking = row.direction === "seeking";
              const place = row.locations?.[0];
              return (
                <li key={row.id}>
                  <Link href={`/connect/listings/${row.id}`} className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-4 hover:bg-[#faf9fe]">
                    <span className={`w-fit rounded-full px-2.5 py-0.5 text-xs font-bold ${seeking ? "bg-[#efeafd] text-[#4a2fb8]" : "bg-[#dcf3ef] text-[#0b5d56]"}`}>{t(seeking ? "newest.seeking" : "newest.offering")}</span>
                    <span className="mt-2 text-[17px] font-semibold leading-6 text-slate-950">{row.title}</span>
                    <span className="mt-1 text-[13px] text-slate-600">{t("newest.since", { days: daysSince(row.published_at) })}{place ? ` · ${place}` : ""}</span>
                    <span className="mt-auto pt-2 text-sm font-bold text-violet-800">{t(seeking ? "newest.ideaCta" : "newest.viewCta")} →</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}
      <p className="mt-3 text-[13px] leading-5 text-slate-600">{t("newest.note")}</p>
    </section>
  );
}
