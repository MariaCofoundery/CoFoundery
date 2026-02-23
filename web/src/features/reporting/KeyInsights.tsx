import { type KeyInsight } from "@/features/reporting/types";

type Props = {
  insights: KeyInsight[];
  mode?: "match" | "self";
};

export function KeyInsights({ insights, mode = "self" }: Props) {
  const intro =
    mode === "match"
      ? "Verdichtete Einordnung eurer Zusammenarbeit mit Fokus auf Stabilität, Hebel und Risiko."
      : "Priorisierte Ableitungen aus deinem Antwortprofil mit Fokus auf Umsetzung im Gründungsalltag.";
  const emptyCopy =
    mode === "match"
      ? "Für dieses Match liegen noch nicht genügend Daten für eine belastbare Einordnung vor."
      : "Für dieses Profil liegen noch nicht genügend Daten für eine belastbare Einordnung vor.";

  if (insights.length === 0) {
    return (
      <section className="rounded-2xl border border-slate-200/80 bg-white/95 p-8">
        <h3 className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-slate-500">
          <InsightIcon />
          Strategische Kerninsights
        </h3>
        <p className="mt-4 text-sm text-slate-600">{emptyCopy}</p>
      </section>
    );
  }

  const visibleInsights =
    mode === "match"
      ? uniqueByDimension(insights).slice(0, 3)
      : insights.slice(0, 3);

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white/95 p-10">
      <h3 className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-slate-500">
        <InsightIcon />
        Strategische Kerninsights
      </h3>
      <p className="mt-2 text-sm leading-7 text-slate-600">{intro}</p>
      <ul className="mt-8 space-y-5">
        {visibleInsights.map((insight) => {
          const meta = parseInsightMeta(insight.title);
          const [legacyDimension, legacyProfile] = splitInsightTitle(insight.title);
          return (
          <li key={insight.dimension} className="rounded-xl border border-slate-200/80 px-5 py-4">
            {mode === "match" ? (
              <>
                <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] ${severityBadgeClass(meta.severity)}`}>
                  <SeverityDot severity={meta.severity} />
                  {meta.severity}
                </span>
                <p className="mt-1 text-sm font-semibold uppercase tracking-[0.08em] text-slate-800">
                  {meta.dimension}
                </p>
              </>
            ) : (
              <>
                <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-600">
                  {legacyDimension}
                </span>
                <p className="mt-1 text-sm font-semibold uppercase tracking-[0.08em] text-slate-800">
                  {legacyProfile}
                </p>
              </>
            )}
            <p className="mt-1 whitespace-normal break-words text-sm leading-7 text-slate-700">
              {insight.text}
            </p>
          </li>
          );
        })}
      </ul>
    </section>
  );
}

function uniqueByDimension(insights: KeyInsight[]) {
  const seen = new Set<string>();
  const result: KeyInsight[] = [];
  for (const insight of insights) {
    if (seen.has(insight.dimension)) continue;
    seen.add(insight.dimension);
    result.push(insight);
  }
  return result;
}

function parseInsightMeta(title: string) {
  const [severityRaw, dimensionRaw] = title.split("·").map((part) => part.trim());
  if (!dimensionRaw) {
    return {
      severity: "Einordnung",
      dimension: title.trim() || "Dimension",
    };
  }
  return {
    severity: severityRaw || "Einordnung",
    dimension: dimensionRaw,
  };
}

function severityBadgeClass(severity: string) {
  const normalized = severity.toLowerCase();
  if (normalized.includes("daten")) {
    return "border-slate-300 bg-slate-100 text-slate-700";
  }
  if (normalized.includes("abstimmungsbedarf") || normalized.includes("abstimmungsfeld") || normalized.includes("bewusste abstimmung")) {
    return "border-[color:var(--brand-accent)]/30 bg-[color:var(--brand-accent)]/10 text-slate-800";
  }
  if (normalized.includes("produktive ergänzung") || normalized.includes("hebel")) {
    return "border-[color:var(--brand-accent)]/20 bg-[color:var(--brand-accent)]/5 text-slate-700";
  }
  return "border-[color:var(--brand-primary)]/30 bg-[color:var(--brand-primary)]/10 text-slate-700";
}

function SeverityDot({ severity }: { severity: string }) {
  const normalized = severity.toLowerCase();
  const color = normalized.includes("daten")
    ? "bg-slate-400"
    : normalized.includes("abstimmungsbedarf") || normalized.includes("abstimmungsfeld") || normalized.includes("bewusste abstimmung")
      ? "bg-[color:var(--brand-accent)]"
      : normalized.includes("produktive ergänzung") || normalized.includes("hebel")
        ? "bg-[color:var(--brand-accent)]/70"
        : "bg-[color:var(--brand-primary)]";
  return <span className={`h-1.5 w-1.5 rounded-full ${color}`} />;
}

function InsightIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4 text-[color:var(--brand-primary)]" aria-hidden="true">
      <path d="M10 3a5 5 0 00-3 9v2h6v-2a5 5 0 00-3-9zM8 17h4" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function splitInsightTitle(title: string) {
  const [dimensionPart, profilePart] = title.split(" - ");
  const dimension = (dimensionPart ?? "").trim() || "Dimension";
  const profile = (profilePart ?? title).trim();
  return [dimension, profile];
}
