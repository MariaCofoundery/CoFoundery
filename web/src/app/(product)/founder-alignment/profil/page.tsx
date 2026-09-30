import { redirect } from "next/navigation";
import { AlignNav } from "@/features/instruments/align/AlignNav";
import { getAlignNavState } from "@/features/instruments/align/navState";
import { Questionnaire } from "@/features/instruments/align/Questionnaire";
import { buildSections, answerableOf } from "@/features/instruments/align/questionnaireData";
import { screenSet } from "@/features/instruments/align/screens";
import { getItemsV22, getItemV22 } from "@/features/instruments/align/registries";
import { FOUNDER_PROFILE_INSTRUMENT_ID } from "@/features/instruments/instruments";
import { createClient, getRequestUser } from "@/lib/supabase/server";

/**
 * Das Founder-Arbeitsprofil.
 *
 * ES GEHÖRT ZUR PERSON UND ZU KEINEM VORHABEN. Deshalb gibt es hier keine
 * Auswahl und keine Frage nach einem Team: Wer es einmal ausgefüllt hat, hat
 * es - auch beim zweiten Vorhaben.
 */
export default async function FounderProfilePage() {
  const { data: auth } = await getRequestUser();
  if (!auth?.user?.id) {
    redirect(`/login?next=${encodeURIComponent("/founder-alignment/profil")}`);
  }

  const navState = await getAlignNavState(auth.user.id);

  const supabase = await createClient();

  const { data: assessment } = await supabase
    .from("assessments")
    .select("id, submitted_at")
    .eq("user_id", auth.user.id)
    .eq("instrument_id", FOUNDER_PROFILE_INSTRUMENT_ID)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: rows } = assessment
    ? await supabase
        .from("alignment_answers")
        .select("block_id, value, missing_code")
        .eq("assessment_id", assessment.id)
    : { data: [] };

  const initialAnswers = Object.fromEntries(
    (rows ?? []).map((row) => [
      row.block_id,
      row.missing_code ? { missingCode: row.missing_code } : { value: row.value },
    ]),
  );

  const answerable = Object.fromEntries(
    getItemsV22("founder_profile").map((item) => [item.itemId, answerableOf(item)]),
  );

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <AlignNav current="/founder-alignment/profil" state={navState} />
      <p className="mb-2 inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-900">
        Testfassung
      </p>
      {/* KEINE UEBERSCHRIFT UND KEINE FRAGENZAHL MEHR. Die Einleitung des
          Fragebogens traegt beides - "16 Fragen dazu, wie du entscheidest"
          stand hier zusaetzlich und widersprach den sieben Schritten, in die
          das UX-Review sie portioniert. Zwei Ueberschriften uebereinander
          waeren ausserdem zwei Anfaenge. */}
      <div className="mt-6">
        <Questionnaire
          scope="founder_profile"
          screens={screenSet((itemId) => Boolean(getItemV22(itemId)))}
          afterSubmit="/founder-alignment/profil/antworten?erstellt=1"
          sections={buildSections("founder_profile")}
          answerable={answerable}
          initialAnswers={initialAnswers}
          submitted={Boolean(assessment?.submitted_at)}
        />
      </div>
    </main>
  );
}
