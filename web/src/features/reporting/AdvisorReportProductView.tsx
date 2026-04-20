import Link from "next/link";
import { ComparisonScale } from "@/features/reporting/ComparisonScale";
import {
  FOUNDER_DIMENSION_META,
  getFounderDimensionPoleLabels,
} from "@/features/reporting/founderDimensionMeta";
import type {
  AdvisorClassification,
  AdvisorDimensionAssessment,
  AdvisorReportData,
} from "@/features/reporting/advisor-report/advisorReportTypes";
import {
  ADVISOR_IMPULSE_SECTION_META,
  ADVISOR_IMPULSE_SECTION_ORDER,
  type AdvisorImpulseSectionKey,
  type AdvisorSectionImpulse,
} from "@/features/reporting/advisorSectionImpulses";

type Props = {
  invitationId: string;
  participantAName: string;
  participantBName: string;
  report: AdvisorReportData;
  impulses: Record<AdvisorImpulseSectionKey, AdvisorSectionImpulse | null>;
  workbookHref: string;
  snapshotHref: string;
  savedSectionKey: AdvisorImpulseSectionKey | null;
  saveAction: (formData: FormData) => void | Promise<void>;
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0]?.slice(0, 1) ?? ""}${parts[1]?.slice(0, 1) ?? ""}`.toUpperCase();
}

function badgeTone(value: AdvisorClassification) {
  if (value === "risk") return "border-rose-200 bg-rose-50 text-rose-700";
  if (value === "chance") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function scaleTone(value: AdvisorClassification) {
  if (value === "chance") return "border-emerald-200 bg-emerald-50/70 text-emerald-800";
  if (value === "risk") return "border-amber-200 bg-amber-50/80 text-amber-800";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function summaryTone(value: AdvisorClassification) {
  if (value === "chance") return "Produktive Differenz";
  if (value === "risk") return "Moderationsrelevant";
  return "Aktuell stabil";
}

function tightenCopy(text: string) {
  return text
    .replace("bleibt zu lange unkommentiert", "bleibt lange unkommentiert")
    .replace("wird mehrfach neu bewertet", "wird wiederholt neu aufgerollt")
    .replace("wird mehrfach gefuehrt", "wird wiederholt gefuehrt")
    .replace(
      "wirkt nicht offen gegensaetzlich, aber auch nicht selbsterklaerend deckungsgleich",
      "ist nicht offen strittig, aber auch nicht klar abgestimmt"
    )
    .trim();
}

function getClassificationTooltip(dimension: AdvisorDimensionAssessment) {
  if (dimension.classification === "chance") {
    return "Unterschied kann produktiv genutzt werden, wenn Rollen, Timing und Entscheidungslogik klar sind.";
  }
  if (dimension.classification === "neutral") {
    return "Aktuell stabil – wenig Spannungsdruck in dieser Dimension.";
  }
  if (dimension.hasSharedBlindSpotRisk) {
    return "Kann auf fehlende Spannung oder blinde Flecken hinweisen – wichtige Perspektiven werden nicht ausreichend hinterfragt.";
  }
  if (
    dimension.jointState === "OPPOSITE" ||
    dimension.intensity === "high" ||
    (typeof dimension.distanceValue === "number" && dimension.distanceValue >= 40)
  ) {
    return "Kann zu Reibung oder blockierten Entscheidungen fuehren, wenn Unterschiede nicht aktiv moderiert werden.";
  }
  return "Unterschied wird relevant, sobald Entscheidungsdruck oder Abstimmungsbedarf steigt.";
}

function ClassificationBadge({
  dimension,
  tone = "default",
}: {
  dimension: AdvisorDimensionAssessment;
  tone?: "default" | "scale";
}) {
  const className = tone === "scale" ? scaleTone(dimension.classification) : badgeTone(dimension.classification);
  const tooltip = getClassificationTooltip(dimension);

  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${className}`}
        title={tooltip}
        aria-label={`${dimension.classification}: ${tooltip}`}
      >
        {dimension.classification}
      </span>
      <span
        className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-slate-300 bg-white text-[10px] font-semibold text-slate-500"
        title={tooltip}
        aria-hidden="true"
      >
        {dimension.classification === "risk" && dimension.hasSharedBlindSpotRisk ? "!" : "i"}
      </span>
    </span>
  );
}

function DimensionScaleCard({
  dimension,
  participantAName,
  participantBName,
}: {
  dimension: AdvisorDimensionAssessment;
  participantAName: string;
  participantBName: string;
}) {
  const meta = FOUNDER_DIMENSION_META[dimension.dimensionKey];
  const poles = getFounderDimensionPoleLabels(dimension.dimensionKey, "report");

  return (
    <article className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-950">{meta.shortLabel}</h3>
          <p className="mt-1 text-xs text-slate-500">{summaryTone(dimension.classification)}</p>
        </div>
        <ClassificationBadge dimension={dimension} tone="scale" />
      </div>

      <div className="mt-4">
        <ComparisonScale
          scoreA={dimension.founderAScore}
          scoreB={dimension.founderBScore}
          markerA={initials(participantAName)}
          markerB={initials(participantBName)}
          participantAName={participantAName}
          participantBName={participantBName}
          lowLabel={poles?.left ?? meta.reportLeftPole}
          highLabel={poles?.right ?? meta.reportRightPole}
          valueScale="founder_percent"
          compact
        />
      </div>
    </article>
  );
}

function formatSavedLabel(value: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function AdvisorReportProductView({
  invitationId,
  participantAName,
  participantBName,
  report,
  impulses,
  workbookHref,
  snapshotHref,
  savedSectionKey,
  saveAction,
}: Props) {
  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-6 py-12 md:px-10 xl:px-12">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/advisor/dashboard"
          className="inline-flex rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700"
        >
          Zurück zum Advisor-Dashboard
        </Link>
        <div className="flex flex-wrap gap-3">
          <Link
            href={workbookHref}
            className="inline-flex rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700"
          >
            Workbook öffnen
          </Link>
          <Link
            href={snapshotHref}
            className="inline-flex rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700"
          >
            Snapshot exportieren
          </Link>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500">
          Advisor Report
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-950">
          {participantAName} + {participantBName}
        </h1>
        <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-700">
          {report.teamSummary.leadStatement}
        </p>
      </section>

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">6 Dimensionen im Vergleich</p>
        <h2 className="mt-2 text-lg font-semibold text-slate-950">
          Wo die beiden Founder pro Dimension liegen
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
          Unterschiede sind nicht automatisch gut oder schlecht. Nähe kann Stabilität bringen oder
          blinde Flecken erzeugen. Unterschiede können Reibung erzeugen oder produktiv wirken. Die
          Einordnung `risk / chance / neutral` zeigt, wie moderationsrelevant die Konstellation
          aktuell ist.
        </p>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {report.dimensions.map((dimension) => (
            <DimensionScaleCard
              key={dimension.dimensionKey}
              dimension={dimension}
              participantAName={participantAName}
              participantBName={participantBName}
            />
          ))}
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Top 3 Spannungsfelder</p>
        <h2 className="mt-2 text-lg font-semibold text-slate-950">Priorisierte Moderationsfelder</h2>
        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {report.topTensions.map((item) => {
            const dimension =
              report.dimensions.find((candidate) => candidate.dimensionKey === item.dimensionKey) ??
              report.dimensions[0]!;
            return (
              <article key={item.dimensionKey} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-sm font-semibold text-slate-950">{item.title}</h3>
                  <ClassificationBadge dimension={dimension} />
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-700">{tightenCopy(item.summary.replace(`${item.title}:`, "").trim())}</p>
                <dl className="mt-4 space-y-2 text-sm leading-6 text-slate-700">
                  <div>
                    <dt className="font-medium text-slate-950">Kipprisiko</dt>
                    <dd>{tightenCopy(item.tippingPoint)}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-slate-950">Moderationsfrage</dt>
                    <dd>{item.moderationQuestion}</dd>
                  </div>
                </dl>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Beobachtungspunkte</p>
          <ul className="mt-4 space-y-3">
            {report.observationPoints.map((item) => (
              <li key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-950">{tightenCopy(item.marker)}</p>
                <p className="mt-2 text-xs uppercase tracking-[0.14em] text-slate-500">
                  {item.dimensionKey}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-700">{tightenCopy(item.whyItMatters)}</p>
              </li>
            ))}
          </ul>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Interventionen</p>
          <div className="mt-4 space-y-4">
            {report.interventions.map((item) => (
              <div key={item.dimensionKey} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-sm font-semibold text-slate-950">{item.title}</h3>
                <p className="mt-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                  {item.interventionType}
                </p>
                <p className="mt-3 text-sm leading-6 text-slate-700">{item.objective}</p>
                <p className="mt-3 text-sm leading-6 text-slate-900">{item.prompt}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section id="advisor-impulses" className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="max-w-3xl">
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Advisor-Impulse</p>
          <h2 className="mt-2 text-lg font-semibold text-slate-950">Kurze Impulse pro Abschnitt</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Halte hier knappe Beobachtungen oder Moderationshinweise fest. Pro Abschnitt gibt es genau
            einen editierbaren Advisor-Impuls. Leere Felder entfernen den Eintrag wieder.
          </p>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {ADVISOR_IMPULSE_SECTION_ORDER.map((sectionKey) => {
            const meta = ADVISOR_IMPULSE_SECTION_META[sectionKey];
            const impulse = impulses[sectionKey];
            const savedLabel = formatSavedLabel(impulse?.updatedAt ?? null);
            return (
              <form
                key={sectionKey}
                action={saveAction}
                className="rounded-xl border border-slate-200 bg-slate-50/70 p-4"
              >
                <input type="hidden" name="invitationId" value={invitationId} />
                <input type="hidden" name="sectionKey" value={sectionKey} />
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-950">{meta.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{meta.description}</p>
                  </div>
                  {savedSectionKey === sectionKey ? (
                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-medium text-emerald-700">
                      Gespeichert
                    </span>
                  ) : null}
                </div>
                <textarea
                  name="text"
                  defaultValue={impulse?.text ?? ""}
                  placeholder={meta.placeholder}
                  className="mt-4 min-h-[132px] w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm leading-6 text-slate-700"
                />
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs leading-6 text-slate-500">
                    {savedLabel ? `Zuletzt gespeichert: ${savedLabel}` : "Noch kein Impuls hinterlegt"}
                  </p>
                  <button
                    type="submit"
                    className="inline-flex rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
                  >
                    Speichern
                  </button>
                </div>
              </form>
            );
          })}
        </div>
      </section>

      <details className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Vertiefung</p>
            <h2 className="mt-2 text-lg font-semibold text-slate-950">
              Stabilitaetsfaktoren und Detail-Lesart anzeigen
            </h2>
          </div>
          <span className="text-sm text-slate-500">Optional</span>
        </summary>

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {report.stabilityFactors.map((item) => (
            <div key={item.dimensionKey} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-sm font-semibold text-slate-950">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-700">{tightenCopy(item.rationale)}</p>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Blind Spot: {tightenCopy(item.constraintNote)}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {report.dimensions.map((dimension) => (
            <article key={dimension.dimensionKey} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-950">
                    {FOUNDER_DIMENSION_META[dimension.dimensionKey].canonicalName}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">Intensität: {dimension.intensity}</p>
                </div>
                <ClassificationBadge dimension={dimension} />
              </div>
              <div className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
                <div>
                  <p className="font-medium text-slate-950">Spannungsrisiko</p>
                  <p>{tightenCopy(dimension.tensionRisk)}</p>
                </div>
                <div>
                  <p className="font-medium text-slate-950">Tragfähigkeit</p>
                  <p>{tightenCopy(dimension.strengthPotential)}</p>
                </div>
                <div>
                  <p className="font-medium text-slate-950">Kipppunkt</p>
                  <p>{tightenCopy(dimension.tippingPoint)}</p>
                </div>
                <div>
                  <p className="font-medium text-slate-950">Moderationsfrage</p>
                  <p>{dimension.moderationQuestion}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </details>
    </main>
  );
}
