import { redirect } from "next/navigation";
import Link from "next/link";
import { ReportViewV21 } from "@/features/instruments/v21/ReportViewV21";
import { readAll } from "@/features/instruments/v21/readoutV21";
import { orphanedFollowUps } from "@/features/instruments/v21/progressV21";
import { ALIGNMENT_V21_INSTRUMENT_ID } from "@/features/instruments/instruments";
import type { AlignmentAnswerV21 } from "@/features/instruments/v21/answersV21";
import { NavV21 } from "@/features/instruments/v21/NavV21";
import { createClient, getRequestUser } from "@/lib/supabase/server";

/**
 * Der eigene Bericht zu v2.1 - sichtbar, aber nicht ausgeliefert.
 *
 * In Production 404, wie alle Seiten unter `debug`.
 */

export default async function ReportV21Page() {

  const { data: auth } = await getRequestUser();
  // Zum Login statt 404: Wer den Link bekommt und gerade ausgeloggt ist, soll
  // sich anmelden koennen und danach hier landen - nicht ins Leere laufen.
  if (!auth?.user?.id) redirect(`/login?next=${encodeURIComponent("/founder-alignment/pilot/report")}`);

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
        .select("block_id, value, missing_code, marked_for_discussion")
        .eq("assessment_id", assessment.id)
    : { data: [] };

  const answers = Object.fromEntries(
    (rows ?? []).map((row) => [
      row.block_id,
      (row.missing_code
        ? { blockId: row.block_id, missingCode: row.missing_code }
        : { blockId: row.block_id, value: row.value }) as AlignmentAnswerV21,
    ]),
  );

  const marked = (rows ?? [])
    .filter((row) => row.marked_for_discussion)
    .map((row) => row.block_id);

  const sections = readAll(answers);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <NavV21 current="/founder-alignment/pilot/report" />

      <p className="mb-2 inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-900">
        Entwurf — wird niemandem vorgelegt
      </p>
      <h1 className="text-2xl font-semibold text-slate-900">Deine Antworten</h1>
      <p className="mt-4 text-slate-700">
        Das ist, was du geantwortet hast — keine Auswertung, keine Punktzahl, kein
        Vergleich mit anderen. Es ist die Grundlage für ein Gespräch, nicht sein
        Ergebnis.
      </p>
      <p className="mt-2 text-sm text-slate-500">
        Setz einen Haken bei allem, worüber du sprechen möchtest. Das geht auch nach
        dem Abgeben und sagt nichts über deine Antwort aus — es kommt in eurem
        gemeinsamen Teil ganz oben auf die Liste.
      </p>

      {sections.length === 0 ? (
        <p className="mt-10 rounded-xl border border-slate-200 bg-slate-50 p-6 text-slate-700">
          Hier steht noch nichts.{" "}
          <Link href="/founder-alignment/pilot" className="underline">
            Zum Fragebogen
          </Link>
          .
        </p>
      ) : (
        <div className="mt-10">
          <ReportViewV21
            sections={sections}
            orphans={orphanedFollowUps(answers)}
            marked={marked}
          />
        </div>
      )}
    </main>
  );
}
