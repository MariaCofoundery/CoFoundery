import { redirect } from "next/navigation";
import { NavV21 } from "@/features/instruments/v21/NavV21";
import { DiscoveryTopicsFormV21 } from "@/features/instruments/v21/DiscoveryTopicsFormV21";
import {
  DiscoveryVerdictsV21,
  type VerdictRow,
} from "@/features/instruments/v21/DiscoveryVerdictsV21";
import { getDiscoveryTopicsV21 } from "@/features/instruments/v21/discoveryTopicsV21";
import type { TopicChoiceV21 } from "@/features/instruments/v21/discoveryActionsV21";
import { ALIGNMENT_V21_INSTRUMENT_ID } from "@/features/instruments/instruments";
import { createClient, getRequestUser } from "@/lib/supabase/server";

/**
 * Wonach du suchst - für die Testfassung.
 *
 * Getrennt von der bisherigen Discovery-Suche: Die Themen sind andere, die
 * Antworten sind andere, und eine gemeinsame Seite müsste beides vermischen.
 */
export default async function DiscoveryTopicsPage() {
  const { data: auth } = await getRequestUser();
  if (!auth?.user?.id) {
    redirect(`/login?next=${encodeURIComponent("/founder-alignment/pilot/discovery")}`);
  }

  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("discovery_alignment_topics")
    .select("topic_key, wish, rank")
    .eq("user_id", auth.user.id)
    .eq("instrument_id", ALIGNMENT_V21_INSTRUMENT_ID)
    .order("rank");

  const initial: TopicChoiceV21[] = (rows ?? []).map((row) => ({
    topicKey: row.topic_key,
    wish: row.wish === "different" ? "different" : "similar",
    rank: row.rank,
  }));

  // ---------------------------------------------------------------------------
  // Wie es bei den Menschen aussieht, mit denen du verbunden bist
  // ---------------------------------------------------------------------------
  //
  // DAFUER IST DIE FUNKTION GEBAUT: Sie sieht beide Seiten und gibt nur
  // Urteile heraus. Ohne sie muesste die Seite fremde Antworten laden - und
  // genau das soll die Freigabe verhindern. Eine Freigabe ist hier deshalb
  // ausdruecklich NICHT noetig.
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

  const withVerdicts: { label: string; verdicts: VerdictRow[] }[] = [];
  for (const [userId, label] of partners) {
    const { data, error } = await supabase.rpc("discovery_topic_verdicts_v21", {
      p_candidate_user_id: userId,
    });
    // Ein Fehler bei einer Person darf die Seite nicht kosten - dann fehlt
    // eben diese eine Zeile, und der Rest steht.
    if (error || !data) continue;
    withVerdicts.push({ label, verdicts: data as VerdictRow[] });
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <NavV21 current="/founder-alignment/pilot/discovery" />

      <p className="mb-2 inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-900">
        Testfassung
      </p>
      <h1 className="text-2xl font-semibold text-slate-900">Wonach du suchst</h1>
      <p className="mt-4 text-slate-700">
        Wähle die Themen, bei denen dir etwas wichtig ist — bei manchen möchtest du
        jemanden, der es genauso sieht, bei anderen ausdrücklich jemanden, der es
        anders macht. Du kannst so viele wählen, wie du willst.
      </p>
      <p className="mt-2 text-sm text-slate-500">
        Es entsteht daraus keine Punktzahl und keine Rangliste über alle Themen. Zu
        jedem Thema bekommst du eine eigene Auskunft, und die Reihenfolge, die du
        festlegst, entscheidet — nicht die Menge der Treffer.
      </p>

      <div className="mt-10">
        <DiscoveryTopicsFormV21 topics={getDiscoveryTopicsV21()} initial={initial} />
      </div>

      {initial.length > 0 && withVerdicts.length > 0 && (
        <section className="mt-12 space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Wie es bei euch aussieht
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Je Thema eine Auskunft — und keine Zusammenfassung darüber. Du siehst
              hier nicht die Antworten der anderen Person, nur ob dein Wunsch zutrifft.
            </p>
          </div>

          {withVerdicts.map((entry) => (
            <div key={entry.label}>
              <h3 className="mb-2 text-sm font-medium text-slate-800">{entry.label}</h3>
              <DiscoveryVerdictsV21
                verdicts={entry.verdicts}
                topics={getDiscoveryTopicsV21()}
              />
            </div>
          ))}
        </section>
      )}
    </main>
  );
}
