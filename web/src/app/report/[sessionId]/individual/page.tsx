import { redirect } from "next/navigation";
import { getSessionAlignmentReport } from "@/features/reporting/actions";
import { PrintReportButton } from "@/features/reporting/PrintReportButton";
import {
  DIMENSION_INTERPRETATIONS,
  REPORT_CONTENT,
} from "@/features/reporting/constants";
import {
  REPORT_DIMENSIONS,
  type ReportDimension,
} from "@/features/reporting/types";

type PageProps = {
  params: Promise<{ sessionId: string }>;
};

export default async function IndividualReportPage({ params }: PageProps) {
  const { sessionId } = await params;
  const report = await getSessionAlignmentReport(sessionId);

  if (!report) {
    redirect("/dashboard");
  }

  const profileName = report.participantAName || "Teilnehmer";
  const dimensions = REPORT_DIMENSIONS.map((dimension) => {
    const score = report.scoresA[dimension];
    const profile = score != null ? resolveDimensionProfile(dimension, score) : null;
    return { dimension, score, profile };
  });
  const executive = buildExecutiveSummary(dimensions, profileName);
  const topReflection = dimensions
    .filter((item) => item.score != null)
    .sort((a, b) => Math.abs((b.score ?? 3.5) - 3.5) - Math.abs((a.score ?? 3.5) - 3.5))
    .slice(0, 3)
    .map((item) => reflectionQuestion(item.dimension));

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#F0FAFF] via-[#F9FAFB] to-[#F6F1FF] py-10">
      <div className="mx-auto max-w-[800px] px-6">
        <div className="mb-8 flex items-center justify-between print:hidden">
          <a
            href="/dashboard"
            className="inline-flex rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700"
          >
            Zurück zum Dashboard
          </a>
          <PrintReportButton />
        </div>

        <article className="space-y-12 rounded-2xl border border-slate-200/80 bg-white px-10 py-12 shadow-sm">
          <section>
            <div className="flex items-center justify-start">
              <BrandMark />
            </div>
            <p className="mt-6 text-[11px] uppercase tracking-[0.24em] text-slate-500">Individual Alignment Report</p>
            <h1 className="mt-4 text-2xl font-semibold tracking-[0.03em] text-slate-900">{profileName}</h1>
            <p className="mt-2 text-sm text-slate-500">
              Ausgefüllt am: {formatDate(report.personACompletedAt ?? report.createdAt)}
            </p>
          </section>

          <section className="rounded-2xl border border-violet-200/70 bg-gradient-to-r from-violet-50/70 to-cyan-50/70 p-6">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-700">
              Executive Summary
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-700">{executive.core}</p>
            <p className="mt-2 text-sm leading-7 text-slate-700">{executive.focus}</p>
          </section>

          <section>
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              Dimensionen
            </h2>
            <div className="mt-5 grid gap-4">
              {dimensions.map((item) => (
                <article key={item.dimension} className="rounded-xl border border-slate-200/80 bg-white p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-600">
                      {dimensionLabel(item.dimension)}
                    </span>
                    {item.profile ? (
                      <span className="rounded-full border border-cyan-200 bg-cyan-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-cyan-700">
                        {item.profile.title}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-3 text-sm leading-7 text-slate-700">
                    {item.profile?.text ?? "Für diese Dimension liegen noch nicht genügend Antworten vor."}
                  </p>
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-cyan-200/70 bg-cyan-50/40 p-6">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-700">
              Reflexionsfragen Für Deine Co-Founder-Erwartung
            </h2>
            <ul className="mt-4 space-y-3">
              {topReflection.map((question) => (
                <li key={question} className="rounded-lg border border-white bg-white px-4 py-3 text-sm leading-7 text-slate-700">
                  {question}
                </li>
              ))}
              <li className="rounded-lg border border-white bg-white px-4 py-3 text-sm leading-7 text-slate-700">
                Welche drei Verhaltensweisen sind für dich in den ersten 90 Tagen einer Zusammenarbeit nicht verhandelbar?
              </li>
              <li className="rounded-lg border border-white bg-white px-4 py-3 text-sm leading-7 text-slate-700">
                Bei welchen Entscheidungen erwartest du Alignment und bei welchen akzeptierst du bewusst unterschiedliche Stile?
              </li>
            </ul>
          </section>
        </article>
      </div>
    </main>
  );
}

function buildExecutiveSummary(
  dimensions: Array<{ dimension: ReportDimension; score: number | null }>,
  name: string
) {
  const scored = dimensions.filter((item): item is { dimension: ReportDimension; score: number } => item.score != null);
  if (scored.length === 0) {
    return {
      core: `${name} hat noch nicht genug Antworten geliefert, um eine belastbare Profil-Einordnung vorzunehmen.`,
      focus: "Beantworte zunächst die Basisfragen, damit die Analyse präzise und vergleichbar wird.",
    };
  }

  const strongest = [...scored].sort((a, b) => Math.abs(b.score - 3.5) - Math.abs(a.score - 3.5))[0];
  const mostBalanced = [...scored].sort((a, b) => Math.abs(a.score - 3.5) - Math.abs(b.score - 3.5))[0];
  const strongestProfile = resolveDimensionProfile(strongest.dimension, strongest.score);
  const balancedProfile = resolveDimensionProfile(mostBalanced.dimension, mostBalanced.score);

  return {
    core: `${name} zeigt aktuell ein klares Profil im Bereich ${dimensionLabel(strongest.dimension)} mit der Tendenz "${strongestProfile.title}". Das bedeutet: In diesem Feld hast du eine starke Präferenz, die deine Zusammenarbeit besonders prägen wird.`,
    focus: `Als stabiler Gesprächsanker wirkt bei dir ${dimensionLabel(mostBalanced.dimension)} (${balancedProfile.title}). Für die Co-Founder-Suche ist das wichtig, weil du hier meist flexibel anschlussfähig bist und Unterschiede leichter moderieren kannst.`,
  };
}

function resolveDimensionProfile(dimension: ReportDimension, score: number) {
  const pack = DIMENSION_INTERPRETATIONS[dimension];
  if (score <= 2.5) return pack.low;
  if (score >= 4.5) return pack.high;
  return pack.mid;
}

function reflectionQuestion(dimension: ReportDimension) {
  switch (dimension) {
    case "Vision":
      return REPORT_CONTENT.dimensions.vision.q;
    case "Entscheidung":
      return REPORT_CONTENT.dimensions.entscheidung.q;
    case "Risiko":
      return REPORT_CONTENT.dimensions.risiko.q;
    case "Autonomie":
      return REPORT_CONTENT.dimensions.autonomie.q;
    case "Verbindlichkeit":
      return REPORT_CONTENT.dimensions.verbindlichkeit.q;
    case "Konflikt":
      return REPORT_CONTENT.dimensions.konflikt.q;
  }
}

function dimensionLabel(dimension: ReportDimension) {
  return dimension === "Risiko" ? "Risikoprofil" : dimension;
}

function formatDate(value: string | null) {
  if (!value) return "unbekannt";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "unbekannt";
  return date.toLocaleDateString("de-DE");
}

function BrandMark() {
  return (
    <div className="flex h-[50px] max-h-[50px] items-center">
      <object
        data="/cofoundery-align-logo.svg"
        type="image/svg+xml"
        aria-label="CoFoundery Align Logo"
        className="h-[50px] w-auto max-w-[260px]"
      >
        <p className="bg-gradient-to-r from-[#00B8D9] to-[#7C3AED] bg-clip-text text-xl font-bold text-transparent">
          CoFoundery Align
        </p>
      </object>
    </div>
  );
}
