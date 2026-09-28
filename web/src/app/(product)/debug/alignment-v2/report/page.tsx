import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AlignmentNav } from "@/features/instruments/v2/AlignmentNav";
import { AlignmentReportView } from "@/features/instruments/v2/AlignmentReportView";
import { buildAlignmentReport } from "@/features/instruments/v2/alignmentReportData";
import { ALIGNMENT_V2_INSTRUMENT_ID } from "@/features/instruments/instruments";
import { InstrumentTransitionNotice } from "@/features/instruments/v2/InstrumentTransitionNotice";
import { needsTransitionNotice } from "@/features/instruments/v2/instrumentTransitionActions";
import { createClient, getRequestUser } from "@/lib/supabase/server";

/**
 * Der Einzelreport zum Instrument v2 - sichtbar, nicht ausgeliefert.
 *
 * Wie der Fragebogen unter `debug`, und aus demselben Grund: Das Instrument
 * steht auf `draft`. In Production 404.
 */
export default async function AlignmentV2ReportPage() {
  if (process.env.NODE_ENV === "production") notFound();

  const { data: auth } = await getRequestUser();
  if (!auth?.user?.id) notFound();

  const t = await getTranslations("alignment");
  const supabase = await createClient();

  // AUCH ENTWUERFE - anders als beim Vergleich. Das hier sind die eigenen
  // Angaben, und wer mitten im Ausfuellen nachsehen moechte, was er bisher
  // gesagt hat, soll es sehen. Beim Vergleich zaehlt dagegen nur Abgegebenes:
  // Der andere haette sonst etwas gelesen, das sich danach noch aendert.
  const { data: assessments } = await supabase
    .from("assessments")
    .select("id")
    .eq("user_id", auth.user.id)
    .eq("instrument_id", ALIGNMENT_V2_INSTRUMENT_ID);

  const ids = (assessments ?? []).map((row) => row.id);
  const { data: rows } = ids.length
    ? await supabase
        .from("alignment_answers")
        .select("block_id, answer_format, value, missing_code, marked_for_discussion")
        .in("assessment_id", ids)
    : { data: [] };

  // Wer die alte Fassung abgegeben und noch nicht entschieden hat, wird
  // gefragt - und zwar hier oben, nicht irgendwo in den Einstellungen.
  const showTransition = await needsTransitionNotice();

  const report = buildAlignmentReport(rows ?? [], {
    hasComparison: false,
    markedBlockIds: (rows ?? []).filter((row) => row.marked_for_discussion).map((row) => row.block_id),
  });

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <AlignmentNav current={"/debug/alignment-v2/report"} />

      <p className="mb-2 inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-900">
        {t("shell.draftNotice")}
      </p>
      <h1 className="text-2xl font-semibold text-slate-900">{t("report.title")}</h1>
      <p className="mt-3 text-slate-700">{t("report.intro")}</p>

      {showTransition && (
        <div className="mt-8">
          <InstrumentTransitionNotice />
        </div>
      )}

      <div className="mt-10">
        <AlignmentReportView report={report} />
      </div>
    </main>
  );
}
