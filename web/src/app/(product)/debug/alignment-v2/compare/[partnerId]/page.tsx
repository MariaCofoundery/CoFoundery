import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AlignmentNav } from "@/features/instruments/v2/AlignmentNav";
import { DiscoveryVerdicts, type TopicVerdictRow } from "@/features/instruments/v2/DiscoveryVerdicts";
import { AlignmentComparisonView } from "@/features/instruments/v2/AlignmentComparisonView";
import { buildAlignmentComparison } from "@/features/instruments/v2/alignmentComparisonData";
import { ALIGNMENT_V2_INSTRUMENT_ID } from "@/features/instruments/instruments";
import { createClient, getRequestUser } from "@/lib/supabase/server";

/**
 * Der Vergleich - sichtbar, nicht ausgeliefert.
 *
 * WAS HIER NICHT PASSIERT: Die Seite umgeht keine Freigabe. Sie liest die
 * Antworten der anderen Person ueber dieselben Policies wie jeder andere -
 * ohne Freigabe kommt schlicht nichts zurueck. Eine Debug-Seite, die mehr
 * sieht als das Produkt, prueft das Produkt nicht.
 */
export default async function AlignmentV2ComparePage({
  params,
}: {
  params: Promise<{ partnerId: string }>;
}) {
  if (process.env.NODE_ENV === "production") notFound();

  const { partnerId } = await params;
  const { data: auth } = await getRequestUser();
  if (!auth?.user?.id) notFound();

  const t = await getTranslations("alignment");
  const supabase = await createClient();

  const load = async (userId: string) => {
    const { data: assessments } = await supabase
      .from("assessments")
      .select("id")
      .eq("user_id", userId)
      .eq("instrument_id", ALIGNMENT_V2_INSTRUMENT_ID)
      .not("submitted_at", "is", null);

    const ids = (assessments ?? []).map((row) => row.id);
    if (ids.length === 0) return { rows: [], marked: [], notShared: [] };

    const { data: rows } = await supabase
      .from("alignment_answers")
      .select("block_id, answer_format, value, missing_code, marked_for_discussion")
      .in("assessment_id", ids);

    // Was ausgeblendet wurde, steht an der Freigabe - nicht an den Antworten.
    const { data: shares } = await supabase
      .from("alignment_shares")
      .select("id")
      .in("assessment_id", ids)
      .is("revoked_at", null);

    const shareIds = (shares ?? []).map((row) => row.id);
    const { data: hidden } = shareIds.length
      ? await supabase
          .from("alignment_share_hidden_blocks")
          .select("block_id")
          .in("share_id", shareIds)
      : { data: [] };

    return {
      rows: rows ?? [],
      marked: (rows ?? []).filter((row) => row.marked_for_discussion).map((row) => row.block_id),
      notShared: (hidden ?? []).map((row) => row.block_id),
    };
  };

  const [mine, theirs] = await Promise.all([load(auth.user.id), load(partnerId)]);

  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, display_name")
    .in("user_id", [auth.user.id, partnerId]);

  const displayName = (userId: string, fallback: string) =>
    (profiles ?? []).find((row) => row.user_id === userId)?.display_name?.trim() || fallback;

  // DIE KARTEN BEKOMMEN NAMEN IN DER DRITTEN PERSON, die Tabelle die Anrede.
  // Die Textbausteine aus Teil G lauten "A sagt ... zu"; mit "Du" als Namen
  // wird daraus "Du sagt ... zu".
  const nameA = displayName(auth.user.id, "Person A");
  const nameB = displayName(partnerId, "Person B");

  const result = buildAlignmentComparison(
    { name: nameA, instrumentId: ALIGNMENT_V2_INSTRUMENT_ID, rows: mine.rows,
      markedBlockIds: mine.marked, notSharedBlockIds: mine.notShared },
    { name: nameB, instrumentId: ALIGNMENT_V2_INSTRUMENT_ID, rows: theirs.rows,
      markedBlockIds: theirs.marked, notSharedBlockIds: theirs.notShared }
  );

  // Die eigenen Suchvorgaben, auf diese Person angewandt. Die Funktion sieht
  // beide Seiten und gibt nur Urteil und Basis heraus - keine Antwort verlaesst
  // sie.
  const { data: verdicts } = await supabase.rpc("discovery_topic_verdicts", {
    p_candidate_user_id: partnerId,
  });

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <AlignmentNav current="" />

      <p className="mb-2 inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-900">
        {t("shell.draftNotice")}
      </p>
      <h1 className="text-2xl font-semibold text-slate-900">{t("compare.title")}</h1>
      <p className="mt-3 text-slate-700">{t("compare.intro")}</p>

      <div className="mt-10 space-y-10">
        <DiscoveryVerdicts rows={(verdicts ?? []) as TopicVerdictRow[]} />

        <AlignmentComparisonView
          result={result}
          columnA={t("compare.you")}
          columnB={nameB}
        />
      </div>
    </main>
  );
}
