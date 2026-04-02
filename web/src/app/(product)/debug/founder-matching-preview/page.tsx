import { notFound } from "next/navigation";
import type { TeamContext } from "@/features/reporting/buildExecutiveSummary";
import { FOUNDER_MATCHING_TEST_CASES, compareFounders } from "@/features/reporting/founderMatchingEngine";
import { FounderMatchingView } from "@/features/reporting/FounderMatchingView";
import { buildFounderMatchingSelection } from "@/features/reporting/founderMatchingSelection";
import { FOUNDER_VALUES_TEST_CASES } from "@/features/reporting/founderValuesSelection";
import { PrintReportButton } from "@/features/reporting/PrintReportButton";

type SearchParams = {
  case?: string;
  mode?: string;
};

const DEMO_NAMES: Record<string, { participantAName: string; participantBName: string }> = {
  complementary_builders: {
    participantAName: "Mara Keller",
    participantBName: "Jonas Brandt",
  },
  misaligned_pressure_pair: {
    participantAName: "Lea Hoffmann",
    participantBName: "Tim Becker",
  },
  balanced_but_manageable_pair: {
    participantAName: "Nora Weiss",
    participantBName: "David Kern",
  },
  highly_similar_but_blind_spot_pair: {
    participantAName: "Clara Neumann",
    participantBName: "Felix Hartmann",
  },
};

const DEMO_VALUES_PROFILES = {
  complementary_builders: FOUNDER_VALUES_TEST_CASES.aehnliche_basis,
  misaligned_pressure_pair: FOUNDER_VALUES_TEST_CASES.anderer_massstab_unter_druck,
  balanced_but_manageable_pair: FOUNDER_VALUES_TEST_CASES.aehnliche_basis,
  highly_similar_but_blind_spot_pair: FOUNDER_VALUES_TEST_CASES.aehnlich_mit_blind_spot,
} as const;

function resolveCase(
  value: string | undefined
): keyof typeof FOUNDER_MATCHING_TEST_CASES {
  if (value === "misaligned_pressure_pair") return value;
  if (value === "balanced_but_manageable_pair") return value;
  if (value === "highly_similar_but_blind_spot_pair") return value;
  return "complementary_builders";
}

function resolveTeamContext(value: string | undefined): TeamContext {
  return value === "existing_team" ? "existing_team" : "pre_founder";
}

export default async function FounderMatchingPreviewPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const params = await searchParams;
  const selectedCase = resolveCase(params.case);
  const teamContext = resolveTeamContext(params.mode);
  const scores = FOUNDER_MATCHING_TEST_CASES[selectedCase];
  const names = DEMO_NAMES[selectedCase];
  const valuesProfiles = DEMO_VALUES_PROFILES[selectedCase];
  const compareResult = compareFounders(scores.a, scores.b);
  const selection = buildFounderMatchingSelection(compareResult);

  return (
    <main className="report-print-root mx-auto min-h-screen w-full max-w-6xl px-6 py-12 print:max-w-none print:px-0 print:py-0">
      <div className="no-print mb-8 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            {Object.keys(FOUNDER_MATCHING_TEST_CASES).map((demoCase) => (
              <a
                key={demoCase}
                href={`/debug/founder-matching-preview?case=${demoCase}&mode=${teamContext}`}
                className={`inline-flex rounded-lg border px-4 py-2 text-sm ${
                  demoCase === selectedCase
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-700"
                }`}
              >
                {demoCase}
              </a>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { id: "pre_founder", label: "Pre-Founder" },
              { id: "existing_team", label: "Bestehendes Team" },
            ].map((mode) => (
              <a
                key={mode.id}
                href={`/debug/founder-matching-preview?case=${selectedCase}&mode=${mode.id}`}
                className={`inline-flex rounded-lg border px-4 py-2 text-sm ${
                  mode.id === teamContext
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-700"
                }`}
              >
                {mode.label}
              </a>
            ))}
          </div>
        </div>
        <PrintReportButton label="Als PDF speichern" />
      </div>

      <section className="page-section mb-6 rounded-2xl border border-slate-200/80 bg-white/95 p-8 print:mb-4 print:rounded-none print:border-none print:bg-white print:px-0 print:py-0">
        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
          Founder Matching Report
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-900">
          {names.participantAName} + {names.participantBName}
        </h1>
        <p className="mt-3 text-sm leading-7 text-slate-700">
          Demo-Report auf Basis der neuen V1-Matching-Engine, der bestehenden Selection und der
          aktuellen Text-Builder. Der aktuelle Fall ist{" "}
          <span className="font-medium text-slate-900">{selectedCase}</span> im Modus{" "}
          <span className="font-medium text-slate-900">
            {teamContext === "existing_team" ? "existing_team" : "pre_founder"}
          </span>.
        </p>
      </section>

      <FounderMatchingView
        participantAName={names.participantAName}
        participantBName={names.participantBName}
        compareResult={compareResult}
        selection={selection}
        valuesProfileA={valuesProfiles?.a ?? null}
        valuesProfileB={valuesProfiles?.b ?? null}
        workbookHref="#"
        teamContext={teamContext}
      />
    </main>
  );
}
