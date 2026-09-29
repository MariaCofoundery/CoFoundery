import { redirect } from "next/navigation";
import { AlignNav } from "@/features/instruments/align/AlignNav";
import { getAlignNavState } from "@/features/instruments/align/navState";
import { Questionnaire } from "@/features/instruments/align/Questionnaire";
import { buildSections, answerableOf } from "@/features/instruments/align/questionnaireData";
import { getItemsV22, FOUNDER_PROFILE } from "@/features/instruments/align/registries";
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
      <h1 className="text-2xl font-semibold text-slate-900">Wie du arbeitest</h1>
      <p className="mt-4 text-slate-700">
        {getItemsV22("founder_profile").length} Fragen dazu, wie du entscheidest,
        Unterschiede ansprichst und mit offenen Fragen umgehst. Es gibt keine richtigen
        Antworten und am Ende keine Punktzahl.
      </p>
      <p className="mt-2 text-sm text-slate-500">{FOUNDER_PROFILE.validity}</p>

      <div className="mt-10">
        <Questionnaire
          scope="founder_profile"
          sections={buildSections("founder_profile")}
          answerable={answerable}
          initialAnswers={initialAnswers}
          submitted={Boolean(assessment?.submitted_at)}
        />
      </div>
    </main>
  );
}
