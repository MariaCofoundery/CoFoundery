import { redirect } from "next/navigation";
import { AlignNav } from "@/features/instruments/align/AlignNav";
import { getAlignNavState } from "@/features/instruments/align/navState";
import { DiscoveryTopicsForm } from "@/features/instruments/align/DiscoveryTopicsForm";
import { DiscoveryVerdicts, type VerdictRow } from "@/features/instruments/align/DiscoveryVerdicts";
import { getDiscoveryTopics } from "@/features/instruments/align/discoveryTopics";
import type { TopicChoice } from "@/features/instruments/align/discoveryActions";
import { FOUNDER_PROFILE_INSTRUMENT_ID } from "@/features/instruments/instruments";
import { createClient, getRequestUser } from "@/lib/supabase/server";

/**
 * Wonach du suchst.
 *
 * DIE THEMEN KOMMEN AUS DEM ARBEITSPROFIL. Discovery zeigt Menschen, die man
 * noch nicht kennt - mit ihnen gibt es kein gemeinsames Vorhaben, also auch
 * keine gemeinsamen Zusagen, Teamregeln oder Risikogrenzen für etwas, das es
 * nicht gibt.
 */
export default async function AlignSearchPage() {
  const { data: auth } = await getRequestUser();
  if (!auth?.user?.id) {
    redirect(`/login?next=${encodeURIComponent("/founder-alignment/suche")}`);
  }

  const navState = await getAlignNavState(auth.user.id);

  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("discovery_alignment_topics")
    .select("topic_key, wish, rank")
    .eq("user_id", auth.user.id)
    .eq("instrument_id", FOUNDER_PROFILE_INSTRUMENT_ID)
    .order("rank");

  const initial: TopicChoice[] = (rows ?? []).map((row) => ({
    topicKey: row.topic_key,
    wish: row.wish === "different" ? "different" : "similar",
    rank: row.rank,
  }));

  // Wie es bei den Menschen aussieht, mit denen man verbunden ist. Dafuer ist
  // die Datenbankfunktion gebaut: Sie sieht beide Seiten und gibt nur Urteile
  // heraus - ohne sie muesste die Seite fremde Antworten laden.
  const { data: invitations } = await supabase
    .from("invitations")
    .select("inviter_user_id, invitee_user_id, inviter_display_name, label")
    .eq("status", "accepted")
    .is("revoked_at", null)
    .or(`inviter_user_id.eq.${auth.user.id},invitee_user_id.eq.${auth.user.id}`);

  const partners = new Map<string, string>();
  for (const row of invitations ?? []) {
    const other =
      row.inviter_user_id === auth.user.id ? row.invitee_user_id : row.inviter_user_id;
    if (!other || other === auth.user.id) continue;
    const label =
      (row.inviter_user_id === auth.user.id ? row.label : row.inviter_display_name) ??
      row.label ??
      "Mitgründer:in";
    if (!partners.has(other)) partners.set(other, label);
  }

  const mitUrteilen: { label: string; verdicts: VerdictRow[] }[] = [];
  for (const [userId, label] of partners) {
    const { data, error } = await supabase.rpc("discovery_topic_verdicts_profile", {
      p_candidate_user_id: userId,
    });
    // Ein Fehler bei einer Person darf die Seite nicht kosten.
    if (error || !data) continue;
    mitUrteilen.push({ label, verdicts: data as VerdictRow[] });
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <AlignNav current="/founder-alignment/suche" state={navState} />
      <p className="mb-2 inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-900">
        Testfassung
      </p>
      <h1 className="text-2xl font-semibold text-slate-900">Wonach du suchst</h1>
      <p className="mt-4 text-slate-700">
        Wähle die Themen, bei denen dir etwas wichtig ist — bei manchen möchtest du
        jemanden, der es genauso sieht, bei anderen ausdrücklich jemanden, der es
        anders macht.
      </p>
      <p className="mt-2 text-sm text-slate-500">
        Es geht um die Arbeitsweise, nicht um ein gemeinsames Vorhaben: Mit Menschen,
        die du noch nicht kennst, gibt es noch keine gemeinsamen Zusagen. Es entsteht
        daraus keine Punktzahl — zu jedem Thema bekommst du eine eigene Auskunft.
      </p>

      <div className="mt-10">
        <DiscoveryTopicsForm topics={getDiscoveryTopics()} initial={initial} />
      </div>

      {initial.length > 0 && mitUrteilen.length > 0 && (
        <section className="mt-12 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Wie es bei euch aussieht</h2>
            <p className="mt-1 text-sm text-slate-600">
              Je Thema eine Auskunft — und keine Zusammenfassung darüber. Du siehst hier
              nicht die Antworten der anderen Person, nur ob dein Wunsch zutrifft.
            </p>
          </div>

          {mitUrteilen.map((entry) => (
            <div key={entry.label}>
              <h3 className="mb-2 text-sm font-medium text-slate-800">{entry.label}</h3>
              <DiscoveryVerdicts verdicts={entry.verdicts} topics={getDiscoveryTopics()} />
            </div>
          ))}
        </section>
      )}
    </main>
  );
}
