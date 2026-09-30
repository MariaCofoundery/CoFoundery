import { redirect } from "next/navigation";
import { AlignNav } from "@/features/instruments/align/AlignNav";
import { getAlignNavState } from "@/features/instruments/align/navState";
import { Questionnaire } from "@/features/instruments/align/Questionnaire";
import { VentureHeader } from "@/features/instruments/align/VentureHeader";
import { buildSections, answerableOf } from "@/features/instruments/align/questionnaireData";
import { getItemsV22 } from "@/features/instruments/align/registries";
import { resolveVenture, solePartnerName } from "@/features/instruments/align/ventureResolution";
import { needsConfirmation } from "@/features/instruments/align/needsConfirmation";
import { VENTURE_ALIGNMENT_INSTRUMENT_ID } from "@/features/instruments/instruments";
import { createClient, getRequestUser } from "@/lib/supabase/server";

/**
 * Das Venture-Alignment.
 *
 * ES GEHÖRT ZU EINEM VORHABEN. Das Vorhaben entsteht ohnehin - beim Annehmen
 * einer Einladung oder beim Start eines Vergleichs. Wer noch allein ist,
 * bekommt eins angelegt: Gerade dort sind Zeit, Geld und Ziele die
 * wichtigsten Angaben, weil sie klarmachen, wonach jemand überhaupt sucht.
 */
export default async function VentureAlignmentPage({
  searchParams,
}: {
  searchParams: Promise<{ venture?: string }>;
}) {
  const { data: auth } = await getRequestUser();
  if (!auth?.user?.id) {
    redirect(`/login?next=${encodeURIComponent("/founder-alignment/vorhaben")}`);
  }

  const navState = await getAlignNavState(auth.user.id);

  const { venture: gewaehlt } = await searchParams;
  const { venture, choices } = await resolveVenture(auth.user.id, gewaehlt);

  // MEHRERE VORHABEN HEISST FRAGEN, NICHT WAEHLEN. Wer in zwei Teams ist,
  // weiss selbst, welches gemeint ist - und eine falsch geratene Zuordnung
  // legt Zusagen an ein Vorhaben, das niemand gemeint hat.
  if (!venture) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
      <AlignNav current="/founder-alignment/vorhaben" state={navState} />
        <h1 className="text-2xl font-semibold text-slate-900">Für welches Vorhaben?</h1>
        <p className="mt-3 text-slate-700">
          Du bist in mehreren. Deine Angaben zu Zeit, Geld und Zielen gelten jeweils
          für eins — deshalb fragen wir, statt zu raten.
        </p>
        <ul className="mt-6 space-y-2">
          {choices.map((entry) => (
            <li key={entry.id}>
              <a
                href={`/founder-alignment/vorhaben?venture=${encodeURIComponent(entry.id)}`}
                className="text-slate-900 underline"
              >
                {entry.name ?? "Ohne Namen"}
                {entry.alone && <span className="text-slate-500"> — nur du</span>}
              </a>
            </li>
          ))}
        </ul>
      </main>
    );
  }

  const supabase = await createClient();

  // R02 fragt nach einer Erwartung an eine bestimmte Person. Steht genau eine
  // im Vorhaben, steht ihr Name in der Frage - sonst "der anderen Person".
  const partnerName = await solePartnerName(venture.id, auth.user.id);

  const { data: assessment } = await supabase
    .from("assessments")
    .select("id, submitted_at, answers_confirmed_at")
    .eq("user_id", auth.user.id)
    .eq("instrument_id", VENTURE_ALIGNMENT_INSTRUMENT_ID)
    .eq("venture_id", venture.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: rows } = assessment
    ? await supabase
        .from("alignment_answers")
        .select("block_id, value, missing_code")
        .eq("assessment_id", assessment.id)
    : { data: [] };

  const { data: members } = await supabase
    .from("founder_team_members")
    .select("user_id, created_at")
    .eq("team_id", venture.id);

  const frageBestaetigung = needsConfirmation({
    confirmedAt: assessment?.answers_confirmed_at ?? null,
    otherJoinedAt: (members ?? [])
      .filter((row) => row.user_id !== auth.user.id)
      .map((row) => row.created_at as string),
    hasAnswers: (rows ?? []).length > 0,
  });

  const initialAnswers = Object.fromEntries(
    (rows ?? []).map((row) => [
      row.block_id,
      row.missing_code ? { missingCode: row.missing_code } : { value: row.value },
    ]),
  );

  const answerable = Object.fromEntries(
    getItemsV22("venture_alignment").map((item) => [item.itemId, answerableOf(item)]),
  );

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <AlignNav current="/founder-alignment/vorhaben" state={navState} />
      <p className="mb-2 inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-900">
        Testfassung
      </p>

      <VentureHeader venture={venture} needsConfirmation={frageBestaetigung} />

      <h1 className="mt-4 text-2xl font-semibold text-slate-900">
        Was du aufbauen willst
      </h1>
      {/* DIE TECHNISCHE EINLEITUNG IST WEG. Hier stand "42 Fragen zu Zielen,
          Zusagen, Regeln und Grenzen" und darunter "Gilt fuer EIN Vorhaben und
          einen Zeitraum. Nicht uebertragbar ..." - eine Auskunft ueber das
          Instrument an jemanden, der gerade anfangen will. Die Gueltigkeit
          gehoert in den Bericht, nicht vor den Fragebogen. */}
      <p className="mt-4 text-slate-700">
        Jetzt geht es um dein konkretes Vorhaben. Was möchtest du damit erreichen? Was
        kannst du realistisch einbringen? Und welche Erwartungen, Regeln oder Grenzen
        sind dir dabei wichtig?
      </p>
      <p className="mt-3 text-slate-700">
        Manche Dinge sind vielleicht schon ziemlich klar, andere noch nicht. Beides ist
        völlig okay — gerade offene Punkte können später helfen, wichtige Gespräche
        sichtbar zu machen.
      </p>

      <div className="mt-10">
        <Questionnaire
          scope="venture_alignment"
          ventureId={venture.id}
          sections={buildSections("venture_alignment", partnerName)}
          answerable={answerable}
          initialAnswers={initialAnswers}
          submitted={Boolean(assessment?.submitted_at)}
        />
      </div>
    </main>
  );
}
