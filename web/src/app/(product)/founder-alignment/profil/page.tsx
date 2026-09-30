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
export default async function FounderProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ invitationId?: string }>;
}) {
  const { invitationId } = await searchParams;
  const { data: auth } = await getRequestUser();
  if (!auth?.user?.id) {
    redirect(`/login?next=${encodeURIComponent("/founder-alignment/profil")}`);
  }

  const navState = await getAlignNavState(auth.user.id);

  const supabase = await createClient();

  // WARUM MAN HIER IST. Wer ueber eine Einladung kommt, hat nicht nach einem
  // Fragebogen gesucht - ohne einen Satz dazu steht er in etwas, das er nicht
  // gesucht hat. Der Name steht auf der Einladung selbst; in einer
  // Profiltabelle verdeckt die Zeilensicherheit ihn zu Recht.
  const einladender = invitationId
    ? (
        await supabase
          .from("invitations")
          .select("inviter_display_name")
          .eq("id", invitationId)
          .maybeSingle()
      ).data?.inviter_display_name ?? null
    : null;

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
      {einladender && (
        <section className="mb-6 rounded-2xl border border-slate-200 bg-slate-50/70 px-5 py-4">
          <p className="text-sm leading-7 text-slate-700">
            Du bist über die Einladung von{" "}
            <span className="font-medium text-slate-900">{einladender}</span> hier. Fang
            mit diesem Bogen an — danach könnt ihr eure Antworten nebeneinanderlegen.
          </p>
        </section>
      )}

      <div className="mt-6">
        <Questionnaire
          scope="founder_profile"
          screens={screenSet("founder_profile", (itemId: string) => Boolean(getItemV22(itemId)))}
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
