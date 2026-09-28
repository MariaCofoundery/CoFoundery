import { notFound } from "next/navigation";
import { QuestionnaireV21 } from "@/features/instruments/v21/QuestionnaireV21";
import { buildSectionsV21 } from "@/features/instruments/v21/questionnaireDataV21";
import { ALIGNMENT_V21_INSTRUMENT_ID } from "@/features/instruments/instruments";
import { createClient, getRequestUser } from "@/lib/supabase/server";

/**
 * Der Fragebogen v2.1 - sichtbar, aber nicht ausgeliefert.
 *
 * WARUM UNTER `debug` UND NICHT AUF EINER ECHTEN ROUTE. Das Instrument steht
 * auf `draft`: Die kognitiven Interviews haben nicht stattgefunden, die vier
 * Verhaltensfragen liegen noch bei der Gutachterin, und die Auswertung
 * dahinter gibt es noch nicht. Diese Seite existiert, damit Maria sich das
 * Ausfüllen ansehen kann - nicht, damit jemand es tut.
 *
 * In Production ist sie 404, wie alle Seiten unter `debug`. Der Umzug auf eine
 * echte Route soll eine eigene, bewusste Änderung sein.
 */

export default async function AlignmentV21Page() {
  if (process.env.NODE_ENV === "production") notFound();

  // getRequestUser statt auth.getUser: Die Middleware hat die Person für diese
  // Anfrage bereits geholt, ein zweiter Netzwerkgang je Seitenaufbau wäre
  // geschenkt. Ein Test im Projekt hält das fest.
  const { data: auth } = await getRequestUser();
  if (!auth?.user?.id) notFound();

  const supabase = await createClient();

  const { data: assessment } = await supabase
    .from("assessments")
    .select("id, submitted_at")
    .eq("user_id", auth.user.id)
    .eq("module", "base")
    .eq("instrument_id", ALIGNMENT_V21_INSTRUMENT_ID)
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

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <p className="mb-2 inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-900">
        Entwurf — wird niemandem vorgelegt
      </p>
      <h1 className="text-2xl font-semibold text-slate-900">
        Wie du arbeiten möchtest
      </h1>
      <p className="mt-4 text-slate-700">
        36 Fragen dazu, wie du entscheiden, zusammenarbeiten und mit offenen Fragen
        umgehen möchtest. Es gibt keine richtigen Antworten und am Ende keine Punktzahl
        — das Ergebnis ist eine Grundlage für ein Gespräch.
      </p>
      <p className="mt-2 text-sm text-slate-500">
        Du kannst jederzeit aufhören und später weitermachen. Alles wird sofort
        gespeichert.
      </p>

      <div className="mt-10">
        <QuestionnaireV21
          sections={buildSectionsV21()}
          initialAnswers={initialAnswers}
          submitted={Boolean(assessment?.submitted_at)}
        />
      </div>
    </main>
  );
}
