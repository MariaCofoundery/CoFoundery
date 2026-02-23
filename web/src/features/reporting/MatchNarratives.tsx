import { DimensionScale } from "@/features/reporting/DimensionScale";
import { type CompareLabel, REPORT_DIMENSIONS, type ReportDimension } from "@/features/reporting/types";

type Props = {
  commonTendencies: string[];
  frictionPoints: string[];
  personBReady: boolean;
  mode?: "match" | "self";
  sections?: unknown[];
  dimensionComparisons?: Array<{
    dimension: string;
    scoreA: number | null;
    scoreB: number | null;
    label?: CompareLabel;
  }>;
  participantAName?: string;
  participantBName?: string;
};

type TaggedEntry = {
  tag: string;
  title: string;
  text: string;
};

export function MatchNarratives({
  commonTendencies,
  frictionPoints,
  personBReady,
  mode = "match",
  sections,
  dimensionComparisons,
  participantAName = "Person A",
  participantBName = "Person B",
}: Props) {
  const isSelfMode = mode === "self";
  const heading = isSelfMode ? "Profil-Narrative" : "Match-Report";
  const leftTitle = isSelfMode ? "Stabile Muster" : "Gemeinsame Tendenzen";
  const rightTitle = isSelfMode ? "Potenzielle Entwicklungsfelder" : "Potenzielle Reibungspunkte";
  const missingCompareCopy = isSelfMode
    ? "Für diese Einordnung fehlen aktuell noch genügend Daten."
    : "Für die Match-Analyse fehlt aktuell das vollständige Profil von Person B.";
  const taggedCommon = parseTaggedEntries(commonTendencies);
  const taggedFriction = parseTaggedEntries(frictionPoints);
  const premiumSections = parsePremiumSections(sections);
  const sectionDecision = premiumSections.get("decision_architecture");
  const sectionRisk = premiumSections.get("risk_contract");
  const sectionDimensions = premiumSections.get("dimension_details");
  const sectionStolperstellen = premiumSections.get("critical_stolperstellen");
  const comparisonByDimension = new Map<ReportDimension, {
    scoreA: number | null;
    scoreB: number | null;
    label?: CompareLabel;
  }>();
  for (const item of dimensionComparisons ?? []) {
    if (!isReportDimension(item.dimension)) continue;
    comparisonByDimension.set(item.dimension, {
      scoreA: item.scoreA,
      scoreB: item.scoreB,
      label: item.label,
    });
  }

  if (!isSelfMode && personBReady) {
    const architecture = sectionDecision?.bullets?.length
      ? splitSectionLines(sectionDecision.bullets)
      : taggedCommon.filter((entry) => entry.tag === "ARCH");
    const dossiers = sectionDimensions?.bullets?.length
      ? splitSectionLines(sectionDimensions.bullets)
      : taggedCommon.filter((entry) => entry.tag === "DIM");
    const riskContract = sectionRisk?.bullets?.length
      ? splitSectionLines(sectionRisk.bullets)
      : taggedFriction.filter((entry) => entry.tag === "RISK");
    const criticalTensions = sectionStolperstellen?.bullets?.length
      ? splitSectionLines(sectionStolperstellen.bullets)
      : taggedFriction.filter((entry) => entry.tag === "TENSION");
    const hasPremiumPayload =
      architecture.length +
      dossiers.length +
      riskContract.length +
      criticalTensions.length > 0;

    if (!hasPremiumPayload) {
      return (
        <section className="rounded-2xl border border-slate-200/80 bg-white/95 p-8">
          <h3 className="text-[11px] uppercase tracking-[0.24em] text-slate-500">{heading}</h3>
          <div className="mt-6 grid gap-5 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200/80 p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{leftTitle}</p>
              <ul className="mt-3 space-y-3">
                {commonTendencies.map((item, idx) => (
                  <li key={`legacy-common-${idx}`} className="text-sm leading-7 text-slate-700">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl border border-slate-200/80 p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{rightTitle}</p>
              <ul className="mt-3 space-y-3">
                {frictionPoints.map((item, idx) => (
                  <li key={`legacy-friction-${idx}`} className="text-sm leading-7 text-slate-700">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      );
    }

    return (
      <section className="rounded-2xl border border-slate-200/80 bg-white/95 p-8">
        <h3 className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-slate-500">
          <SectionIcon type="architecture" />
          Arbeitsarchitektur
        </h3>

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200/80 p-5">
            <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-500">
              <SectionIcon type="decision" />
              {sectionDecision?.title ?? "Entscheidungsarchitektur"}
            </p>
            <ul className="mt-3 space-y-3">
              {architecture.map((entry, idx) => (
                <li key={`arch-${idx}`} className="text-sm leading-7 text-slate-700">
                  {entry.title ? <span className="font-semibold text-slate-800">{entry.title}:</span> : null} {entry.text}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-slate-200/80 p-5">
            <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-500">
              <SectionIcon type="risk" />
              {sectionRisk?.title ?? "Risikovertrag"}
            </p>
            <ul className="mt-3 space-y-3">
              {riskContract.map((entry, idx) => (
                <li key={`risk-${idx}`} className="text-sm leading-7 text-slate-700">
                  {entry.title ? <span className="font-semibold text-slate-800">{entry.title}:</span> : null} {entry.text}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-slate-200/80 p-5">
            <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-500">
              <SectionIcon type="dimension" />
              {sectionDimensions?.title ?? "Dimensionen im Detail"}
            </p>
            <div className="mt-3 space-y-4">
              {dossiers.map((entry, idx) => {
                const dimension = resolveReportDimensionFromTitle(entry.title ?? "");
                const anchors = dimension ? DIMENSION_SCALE_ANCHORS[dimension] : null;
                const comparison = dimension ? comparisonByDimension.get(dimension) : undefined;
                return (
                  <article key={`dim-${idx}`} className="rounded-lg border border-slate-200/80 bg-white p-4">
                    <DimensionDetailCard
                      entry={entry}
                      anchors={anchors}
                      comparison={comparison}
                      participantAName={participantAName}
                      participantBName={participantBName}
                    />
                  </article>
                );
              })}
            </div>
          </div>

        <div className="mt-5 rounded-xl border border-[color:var(--brand-accent)]/25 bg-[color:var(--brand-accent)]/5 p-5">
          <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-slate-700">
            <SectionIcon type="stolperstein" />
            {sectionStolperstellen?.title ?? "Kritische Stolperstellen"}
          </p>
          <ul className="mt-3 space-y-4">
            {criticalTensions.map((entry, idx) => (
              <li key={`flag-${idx}`} className="rounded-lg border border-[color:var(--brand-accent)]/20 bg-white/80 p-4 text-sm leading-7 text-slate-700">
                <CriticalTensionCard entry={entry} />
              </li>
            ))}
          </ul>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white/95 p-8">
      <h3 className="text-[11px] uppercase tracking-[0.24em] text-slate-500">{heading}</h3>

      {!personBReady ? (
        <p className="mt-5 text-sm leading-7 text-slate-600">
          {missingCompareCopy}
        </p>
      ) : (
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200/80 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{leftTitle}</p>
            {commonTendencies.length === 0 ? (
              <p className="mt-3 text-sm leading-7 text-slate-600">
                {isSelfMode
                  ? "Derzeit keine stabilen Muster mit hoher Aussagekraft erkennbar."
                  : "Derzeit keine signifikant deckungsgleichen Muster mit hoher Aussagekraft."}
              </p>
            ) : (
              <ul className="mt-3 space-y-3">
                {commonTendencies.map((item, idx) => (
                  <li key={`common-${idx}`} className="text-sm leading-7 text-slate-700">
                    {item}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-xl border border-slate-200/80 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{rightTitle}</p>
            {frictionPoints.length === 0 ? (
              <p className="mt-3 text-sm leading-7 text-slate-600">
                {isSelfMode
                  ? "Aktuell keine kritischen Spannungsfelder mit hoher Dringlichkeit sichtbar."
                  : "Aktuell keine kritischen Spannungsfelder mit hoher Konfliktintensität sichtbar."}
              </p>
            ) : (
              <ul className="mt-3 space-y-3">
                {frictionPoints.map((item, idx) => (
                  <li key={`friction-${idx}`} className="text-sm leading-7 text-slate-700">
                    {item}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function parseTaggedEntries(values: string[]): TaggedEntry[] {
  return values
    .map((value) => {
      const [tag, title, ...textParts] = value.split("|");
      if (!tag || !title || textParts.length === 0) return null;
      return {
        tag,
        title,
        text: textParts.join("|").trim(),
      };
    })
    .filter((entry): entry is TaggedEntry => entry != null);
}

function splitSectionLines(lines: string[]) {
  return lines.map((line) => {
    const separatorIndex = line.indexOf(":");
    if (separatorIndex <= 0) {
      return {
        title: "",
        text: line.trim(),
      };
    }
    return {
      title: line.slice(0, separatorIndex).trim(),
      text: line.slice(separatorIndex + 1).trim(),
    };
  });
}

type PremiumSection = {
  id: string;
  title: string;
  body?: string;
  bullets?: string[];
  checklist?: string[];
};

function parsePremiumSections(sections: unknown[] | undefined) {
  const map = new Map<string, PremiumSection>();
  if (!sections) return map;
  for (const raw of sections) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
    const entry = raw as Record<string, unknown>;
    const id = typeof entry.id === "string" ? entry.id : null;
    const title = typeof entry.title === "string" ? entry.title : null;
    if (!id || !title) continue;
    map.set(id, {
      id,
      title,
      body: typeof entry.body === "string" ? entry.body : undefined,
      bullets: Array.isArray(entry.bullets) ? entry.bullets.filter((item): item is string => typeof item === "string") : undefined,
      checklist: Array.isArray(entry.checklist) ? entry.checklist.filter((item): item is string => typeof item === "string") : undefined,
    });
  }
  return map;
}

const DIMENSION_SCALE_ANCHORS: Record<ReportDimension, { left: string; mid: string; right: string }> = {
  Vision: {
    left: "konkret & operativ",
    mid: "balanciert",
    right: "ambitioniert & langfristig",
  },
  Entscheidung: {
    left: "schnell & pragmatisch",
    mid: "balanciert",
    right: "gründlich & analytisch",
  },
  Risiko: {
    left: "Sicherheitsfokus",
    mid: "balanciert",
    right: "Experimentierfreude",
  },
  Autonomie: {
    left: "Nähe & Abstimmung",
    mid: "balanciert",
    right: "Freiheit & Eigenraum",
  },
  Verbindlichkeit: {
    left: "flexibel",
    mid: "balanciert",
    right: "hoch verbindlich",
  },
  Konflikt: {
    left: "harmonieorientiert",
    mid: "balanciert",
    right: "direkt & konfrontationsklar",
  },
};

function DimensionDetailCard({
  entry,
  anchors,
  comparison,
  participantAName,
  participantBName,
}: {
  entry: { title?: string; text: string };
  anchors: { left: string; mid: string; right: string } | null;
  comparison?: { scoreA: number | null; scoreB: number | null; label?: CompareLabel };
  participantAName: string;
  participantBName: string;
}) {
  const parsed = parseDimensionEntry(entry.text);
  if (!parsed) {
    return (
      <>
        {entry.title ? (
          <p className="text-sm font-semibold tracking-[0.04em] text-slate-900">{entry.title}</p>
        ) : null}
        <p className="mt-2 text-sm leading-7 text-slate-700">{entry.text}</p>
      </>
    );
  }

  return (
    <>
      {entry.title ? (
        <p className="text-sm font-semibold tracking-[0.04em] text-slate-900">{entry.title}</p>
      ) : null}
      <div className="mt-3 space-y-3 text-sm leading-7 text-slate-700">
        <p>
          <span className="font-semibold text-slate-900">🧠 Diagnose:</span> {parsed.kurzdiagnose}
        </p>
        <p>
          <span className="font-semibold text-slate-900">👀 Alltagswirkung:</span> {parsed.alltagssignal}
        </p>
        <p>
          <span className="font-semibold text-slate-900">⚠️ Stolperstelle:</span> {parsed.fehlschluss}
        </p>
        <div>
          <p className="font-semibold text-slate-900">✅ Arbeitsabsprachen:</p>
          <ul className="mt-1 space-y-1">
            {parsed.absprachen.map((item, index) => (
              <li key={`${entry.title ?? "dimension"}-agreement-${index}`} className="rounded-md border border-slate-200/80 bg-slate-50/50 px-3 py-2">
                {`[ ] ${item}`}
              </li>
            ))}
          </ul>
        </div>
        {anchors ? (
          <DimensionScale
            scoreA={comparison?.scoreA ?? null}
            scoreB={comparison?.scoreB ?? null}
            participantAName={participantAName}
            participantBName={participantBName}
            anchorLeft={anchors.left}
            anchorMid={anchors.mid}
            anchorRight={anchors.right}
            tone={toScaleTone(comparison?.label)}
            toneLabel={toScaleToneLabel(comparison?.label)}
          />
        ) : null}
        <div className="rounded-lg border border-[color:var(--brand-primary)]/25 bg-[color:var(--brand-primary)]/8 p-3">
          <p className="inline-flex items-center gap-2 font-semibold italic text-slate-900">
            <SectionIcon type="leitfrage" />
            💬 Gesprächsanker: {parsed.leitfrage}
          </p>
        </div>
      </div>
    </>
  );
}

function parseDimensionEntry(value: string) {
  const parts = value.split("||").map((part) => part.trim());
  if (parts.length < 5) return null;

  const readField = (prefix: string) =>
    parts.find((part) => part.startsWith(prefix))?.replace(prefix, "").trim() ?? "";

  const kurzdiagnose = readField("Kurzdiagnose:");
  const alltagssignal = readField("Alltagssignal:");
  const fehlschluss = readField("Typischer Fehlschluss:");
  const leitfrage = readField("Leitfrage:");
  const absprachenRaw = readField("Konkrete Absprachen:");
  const absprachen = absprachenRaw
    .split("•")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  if (!kurzdiagnose || !alltagssignal || !fehlschluss || !leitfrage || absprachen.length === 0) {
    return null;
  }

  return {
    kurzdiagnose,
    alltagssignal,
    fehlschluss,
    absprachen,
    leitfrage,
  };
}

function CriticalTensionCard({ entry }: { entry: { title?: string; text: string } }) {
  const parsed = parseCriticalTensionEntry(entry.text);
  if (!parsed) {
    return (
      <p>
        {entry.title ? <span className="font-semibold text-slate-800">{entry.title}:</span> : null} {entry.text}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold tracking-[0.04em] text-slate-900">{entry.title}</p>
      <p>{parsed.beschreibung}</p>
      <p><span className="font-semibold text-slate-900">✅ Entschärfung:</span> {parsed.entschaerfung}</p>
      <div className="rounded-lg border border-[color:var(--brand-accent)]/25 bg-[color:var(--brand-accent)]/10 p-3">
        <p className="inline-flex items-center gap-2 font-semibold italic text-slate-900">
          <SectionIcon type="leitfrage" />
          💬 Gesprächsanker: {parsed.leitfrage}
        </p>
      </div>
    </div>
  );
}

function resolveReportDimensionFromTitle(title: string): ReportDimension | null {
  const normalized = title.trim().toLowerCase();
  if (!normalized) return null;
  if (normalized.includes("vision")) return "Vision";
  if (normalized.includes("entscheid")) return "Entscheidung";
  if (normalized.includes("risiko")) return "Risiko";
  if (normalized.includes("autonom")) return "Autonomie";
  if (normalized.includes("verbind")) return "Verbindlichkeit";
  if (normalized.includes("konflikt")) return "Konflikt";
  return null;
}

function isReportDimension(value: string): value is ReportDimension {
  return REPORT_DIMENSIONS.includes(value as ReportDimension);
}

function toScaleTone(label: CompareLabel | undefined) {
  if (label === "MATCH") return "hohe_passung" as const;
  if (label === "KOMPLEMENTAER") return "produktive_ergaenzung" as const;
  if (label === "FOKUS_THEMA") return "abstimmungsbedarf" as const;
  return "daten_unvollstaendig" as const;
}

function toScaleToneLabel(label: CompareLabel | undefined) {
  if (label === "MATCH") return "Hohe Passung";
  if (label === "KOMPLEMENTAER") return "Produktive Ergänzung";
  if (label === "FOKUS_THEMA") return "Braucht bewusste Abstimmung";
  return "Daten unvollständig";
}

function parseCriticalTensionEntry(value: string) {
  const leadSplit = value.split("Entschärfung:");
  if (leadSplit.length !== 2) return null;
  const questionSplit = leadSplit[1].split("Leitfrage:");
  if (questionSplit.length !== 2) return null;

  return {
    beschreibung: leadSplit[0].trim(),
    entschaerfung: questionSplit[0].trim(),
    leitfrage: questionSplit[1].trim(),
  };
}

function SectionIcon({ type }: { type: "architecture" | "decision" | "risk" | "dimension" | "stolperstein" | "leitfrage" }) {
  if (type === "architecture") {
    return (
      <svg viewBox="0 0 20 20" className="h-4 w-4 text-[color:var(--brand-primary)]" aria-hidden="true">
        <path d="M3 7h14M4 7v10m12-10v10M2 17h16" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    );
  }
  if (type === "decision") {
    return (
      <svg viewBox="0 0 20 20" className="h-4 w-4 text-[color:var(--brand-primary)]" aria-hidden="true">
        <path d="M10 2l7 4v8l-7 4-7-4V6l7-4z" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    );
  }
  if (type === "risk") {
    return (
      <svg viewBox="0 0 20 20" className="h-4 w-4 text-[color:var(--brand-accent)]" aria-hidden="true">
        <path d="M10 3l7 14H3l7-14z" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    );
  }
  if (type === "dimension") {
    return (
      <svg viewBox="0 0 20 20" className="h-4 w-4 text-[color:var(--brand-primary)]" aria-hidden="true">
        <circle cx="10" cy="10" r="7" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    );
  }
  if (type === "leitfrage") {
    return (
      <svg viewBox="0 0 20 20" className="h-4 w-4 text-[color:var(--brand-primary)]" aria-hidden="true">
        <path d="M10 3a5 5 0 015 5c0 2-1 3-3 4-1 1-1 1-1 2m-1 3h.01" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4 text-[color:var(--brand-accent)]" aria-hidden="true">
      <path d="M10 3v8m0 4h.01M4 17h12L10 3 4 17z" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
