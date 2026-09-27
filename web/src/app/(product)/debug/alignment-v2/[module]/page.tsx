import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AlignmentQuestionnaire } from "@/features/instruments/v2/AlignmentQuestionnaire";
import { buildAlignmentSections } from "@/features/instruments/v2/alignmentQuestionnaireData";
import { ALIGNMENT_V2_INSTRUMENT_ID } from "@/features/instruments/instruments";
import type { AlignmentModule } from "@/features/instruments/v2/alignmentProgress";
import { createClient, getRequestUser } from "@/lib/supabase/server";

/**
 * Der Fragebogen v2 - sichtbar, aber nicht ausgeliefert.
 *
 * WARUM UNTER `debug` UND NICHT AUF EINER ECHTEN ROUTE. Das Instrument steht
 * auf `draft`: Die Texte sind nicht redigiert, die kognitiven Interviews haben
 * nicht stattgefunden, und die Auswertung dahinter gibt es noch nicht. Diese
 * Seite existiert, damit Maria sich das Ausfüllen ansehen kann - nicht, damit
 * jemand es tut.
 *
 * In Production ist sie 404, wie alle Seiten unter `debug`. Der Umzug auf eine
 * echte Route ist Schritt 9 und soll eine eigene, bewusste Änderung sein.
 */

type Props = {
  params: Promise<{ module: string }>;
  searchParams: Promise<{ step?: string }>;
};

export default async function AlignmentV2Page({ params, searchParams }: Props) {
  if (process.env.NODE_ENV === "production") notFound();

  const { module: raw } = await params;
  const { step: rawStep } = await searchParams;
  if (raw !== "base" && raw !== "values") notFound();
  // Nicht `module` nennen: Next verbietet diesen Namen als Variable.
  const moduleKey = raw as AlignmentModule;
  const step = moduleKey === "base" ? (rawStep === "2" ? 2 : 1) : undefined;

  const t = await getTranslations("alignment");
  const sections = buildAlignmentSections(moduleKey, step);

  // getRequestUser statt auth.getUser: Die Middleware hat die Person fuer
  // diese Anfrage bereits geholt, ein zweiter Netzwerkgang je Seitenaufbau
  // waere geschenkt. Ein Test im Projekt haelt das fest.
  const { data: auth } = await getRequestUser();
  if (!auth?.user?.id) notFound();

  const supabase = await createClient();

  const { data: draft } = await supabase
    .from("assessments")
    .select("id, submitted_at")
    .eq("user_id", auth.user.id)
    .eq("module", moduleKey)
    .eq("instrument_id", ALIGNMENT_V2_INSTRUMENT_ID)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: rows } = draft
    ? await supabase
        .from("alignment_answers")
        .select("block_id, value, missing_code, marked_for_discussion")
        .eq("assessment_id", draft.id)
    : { data: [] };

  const initialAnswers = Object.fromEntries(
    (rows ?? []).map((row) => [
      row.block_id,
      {
        ...(row.missing_code ? { missingCode: row.missing_code } : { value: row.value }),
        markedForDiscussion: row.marked_for_discussion,
      },
    ])
  );

  const heading = moduleKey === "values" ? t("values.title") : t("base.title");
  const intro = moduleKey === "values" ? t("values.intro") : t(`base.step${step}.intro`);
  const note = moduleKey === "values" ? t("values.note") : t(`base.step${step}.note`);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <p className="mb-2 inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-900">
        {t("shell.draftNotice")}
      </p>
      <h1 className="text-2xl font-semibold text-slate-900">{heading}</h1>
      {moduleKey === "base" && (
        <p className="mt-1 text-sm text-slate-500">{t(`base.step${step}.title`)}</p>
      )}
      <p className="mt-4 text-slate-700">{intro}</p>
      <p className="mt-2 text-sm text-slate-500">{note}</p>

      <div className="mt-10">
        <AlignmentQuestionnaire
          module={moduleKey}
          step={step}
          sections={sections}
          initialAnswers={initialAnswers}
          submitted={Boolean(draft?.submitted_at)}
        />
      </div>
    </main>
  );
}
