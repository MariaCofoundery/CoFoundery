import { redirect } from "next/navigation";
import { NavV21 } from "@/features/instruments/v21/NavV21";
import { ComparisonViewV21 } from "@/features/instruments/v21/ComparisonViewV21";
import { ConversationCardsView } from "@/features/instruments/v21/ConversationCardsView";
import { ExpectationGapsView } from "@/features/instruments/v21/ExpectationGapsView";
import { buildCardsV21 } from "@/features/instruments/v21/conversationCardsV21";
import {
  buildComparisonV21,
  type StoredRow,
} from "@/features/instruments/v21/comparisonDataV21";
import { ALIGNMENT_V21_INSTRUMENT_ID } from "@/features/instruments/instruments";
import { createClient, getRequestUser } from "@/lib/supabase/server";

/**
 * Der Vergleich - sichtbar, nicht ausgeliefert.
 *
 * WAS HIER NICHT PASSIERT: Die Seite umgeht keine Freigabe. Sie liest die
 * Antworten der anderen Person über dieselben Policies wie jede andere Stelle
 * - ohne Freigabe kommt schlicht nichts zurück. Eine Debug-Seite, die mehr
 * sieht als das Produkt, prüft das Produkt nicht.
 */
export default async function CompareV21Page({
  params,
}: {
  params: Promise<{ partnerId: string }>;
}) {

  const { partnerId } = await params;
  const { data: auth } = await getRequestUser();
  if (!auth?.user?.id) {
    redirect(`/login?next=${encodeURIComponent(`/founder-alignment/pilot/compare/${partnerId}`)}`);
  }

  const supabase = await createClient();

  const load = async (userId: string) => {
    const { data: assessments } = await supabase
      .from("assessments")
      .select("id")
      .eq("user_id", userId)
      .eq("instrument_id", ALIGNMENT_V21_INSTRUMENT_ID)
      .not("submitted_at", "is", null);

    const ids = (assessments ?? []).map((row) => row.id);
    if (ids.length === 0) return { rows: [] as StoredRow[], notShared: [] as string[] };

    const { data: rows } = await supabase
      .from("alignment_answers")
      .select("block_id, value, missing_code, marked_for_discussion")
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
      rows: (rows ?? []) as StoredRow[],
      notShared: (hidden ?? []).map((row) => row.block_id),
    };
  };

  const mine = await load(auth.user.id);
  const theirs = await load(partnerId);

  // Ohne abgegebene Fragebögen auf beiden Seiten gibt es nichts zu zeigen -
  // und ein leerer Vergleich sähe aus wie „ihr seid euch in nichts einig“.
  if (mine.rows.length === 0 || theirs.rows.length === 0) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <NavV21 current="/founder-alignment/pilot" />
        <h1 className="text-2xl font-semibold text-slate-900">Nebeneinander</h1>
        <p className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-6 text-slate-700">
          {mine.rows.length === 0
            ? "Du hast den Fragebogen noch nicht abgegeben."
            : "Diese Person hat ihre Antworten noch nicht abgegeben oder nicht mit dir geteilt."}
        </p>
      </main>
    );
  }

  const comparison = buildComparisonV21(
    {
      name: "Du",
      instrumentId: ALIGNMENT_V21_INSTRUMENT_ID,
      rows: mine.rows,
      notSharedItemIds: mine.notShared,
    },
    {
      name: "Die andere Person",
      instrumentId: ALIGNMENT_V21_INSTRUMENT_ID,
      rows: theirs.rows,
      notSharedItemIds: theirs.notShared,
    },
  );

  const cards = buildCardsV21({
    comparison: comparison.sections,
    markedItemIds: [
      ...mine.rows.filter((row) => row.marked_for_discussion).map((row) => row.block_id),
      ...theirs.rows.filter((row) => row.marked_for_discussion).map((row) => row.block_id),
    ],
    nameA: "Du",
    nameB: "Die andere Person",
  });

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <NavV21 current="/founder-alignment/pilot" />

      <p className="mb-2 inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-900">
        Entwurf — wird niemandem vorgelegt
      </p>
      <h1 className="text-2xl font-semibold text-slate-900">Nebeneinander</h1>
      <p className="mt-4 text-slate-700">
        Eure Antworten nebeneinander — keine Passungszahl, keine Bewertung. Wo ihr
        unterschiedlich geantwortet habt, heißt das nicht, dass etwas nicht passt. Es
        heißt, dass ihr darüber noch nicht gesprochen habt.
      </p>

      {/* GANZ OBEN: die konkreteste Aussage, die dieser Vergleich hergibt.
          Zwei Zahlen, ueber die sich am Dienstag reden laesst - waehrend
          "ihr geht unterschiedlich mit Unsicherheit um" ein Gespraech
          braucht, bevor es etwas bedeutet. */}
      <div className="mt-10">
        <ExpectationGapsView
          result={comparison.expectations}
          nameA="Du"
          nameB="Die andere Person"
        />
      </div>

      {/* DIE KARTEN VOR DEM VERGLEICH. Wer zuerst die Tabelle sieht, hat
          schon gedeutet, bevor die Frage danebensteht - und die Karten sind
          genau dafuer da, das zu verhindern. */}
      <section className="mt-12">
        <h2 className="text-lg font-semibold text-slate-900">Gesprächskarten</h2>
        <p className="mt-1 text-sm text-slate-600">
          Aus einer geprüften Sammlung, nicht erzeugt. Zu jeder Karte steht, was
          tatsächlich geantwortet wurde, was es bedeuten <em>kann</em>, was ihr fragen
          könnt und woraus eine Vereinbarung bestehen sollte.
        </p>
        <div className="mt-4">
          <ConversationCardsView cards={cards} />
        </div>
      </section>

      <div className="mt-12">
        <h2 className="text-lg font-semibold text-slate-900">Alle Antworten nebeneinander</h2>
        <div className="mt-4">
          <ComparisonViewV21 comparison={comparison} nameA="Du" nameB="Die andere Person" />
        </div>
      </div>
    </main>
  );
}
