import { ComparisonScale } from "@/features/reporting/ComparisonScale";
import { FOUNDER_DIMENSION_META } from "@/features/reporting/founderDimensionMeta";
import { ReportActionButton } from "@/features/reporting/ReportActionButton";
import type { CompareFoundersResult } from "@/features/reporting/founderMatchingEngine";
import type { FounderMatchingSelection } from "@/features/reporting/founderMatchingSelection";
import { buildFounderValuesBlockFromProfiles } from "@/features/reporting/founderValuesTextBuilder";
import {
  buildFounderMatchingAgreements,
  buildFounderMatchingDailyDynamics,
  buildFounderMatchingHero,
  buildBiggestTensionBlock,
  buildStableBaseBlock,
  buildStrongestComplementBlock,
} from "@/features/reporting/founderMatchingTextBuilder";
import type { SelfValuesProfile } from "@/features/reporting/types";
import { normalizeGermanText as t } from "@/lib/normalizeGermanText";

type Props = {
  participantAName: string;
  participantBName: string;
  compareResult: CompareFoundersResult;
  selection: FounderMatchingSelection;
  valuesProfileA?: SelfValuesProfile | null;
  valuesProfileB?: SelfValuesProfile | null;
  workbookHref: string;
};

export function FounderMatchingView({
  participantAName,
  participantBName,
  compareResult,
  selection,
  valuesProfileA,
  valuesProfileB,
  workbookHref,
}: Props) {
  const hero = buildFounderMatchingHero(selection);
  const stableBase = buildStableBaseBlock(selection.stableBase);
  const strongestComplement = buildStrongestComplementBlock(selection.strongestComplement, selection);
  const biggestTension = buildBiggestTensionBlock(selection.biggestTension, selection);
  const dailyDynamics = buildFounderMatchingDailyDynamics(selection);
  const agreements = buildFounderMatchingAgreements(selection);
  const valuesBlock = buildFounderValuesBlockFromProfiles(valuesProfileA, valuesProfileB);
  const markerA = buildMarkerLabel(participantAName);
  const markerB = buildMarkerLabel(participantBName);

  return (
    <>
      <section className="page-section rounded-2xl border border-slate-200/80 bg-white/95 p-8 print:rounded-none print:border-none print:bg-white print:px-0 print:py-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-4xl">
            <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Euer Founder Match</p>
            <h2 className="mt-3 text-2xl font-semibold text-slate-900">Euer Founder Match</h2>
            <p className="mt-5 max-w-3xl text-sm leading-7 text-slate-700">
              Dieser Report verdichtet eure gemeinsame Arbeitsdynamik: was euch trägt, wo ihr euch
              produktiv ergänzt und an welchen Stellen ihr ohne klare Regeln schnell Reibung
              erzeugt.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <StatusBadge label={participantAName} tone="accentA" />
              <StatusBadge label={participantBName} tone="accentB" />
              <StatusBadge
                label={
                  selection.meta.highSimilarityBlindSpotRisk
                    ? "Hohe Nähe mit Blind-Spot-Risiko"
                    : selection.meta.balancedButManageable
                      ? "Ausgeglichen, aber abstimmungsbedürftig"
                      : "Klar lesbare Teamdynamik"
                }
                tone="neutral"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="page-section mt-6 rounded-2xl border border-slate-200/80 bg-white/95 p-8 print:mt-4 print:rounded-none print:border-none print:bg-white print:px-0 print:py-4">
        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
          1. Euer Zusammenspiel auf einen Blick
        </p>
        <div className="mt-5 space-y-3.5">
          {splitIntoParagraphs(hero).map((paragraph) => (
            <p key={paragraph} className="text-sm leading-7 text-slate-700">
              {t(paragraph)}
            </p>
          ))}
        </div>
      </section>

      <section className="page-section mt-6 rounded-2xl border border-slate-200/80 bg-white/95 p-8 print:mt-4 print:rounded-none print:border-none print:bg-white print:px-0 print:py-4">
        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
          2. Die drei wichtigsten Felder
        </p>
        <div className="mt-6 grid gap-5 lg:grid-cols-3">
          {[stableBase, strongestComplement, biggestTension].map((entry, index) => (
            <article
              key={`${entry.title}-${index}`}
              className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6"
            >
              <p className="text-[11px] uppercase tracking-[0.16em] text-slate-500">
                {index === 0 ? "Stabile Basis" : index === 1 ? "Stärkste Ergänzung" : "Größtes Spannungsfeld"}
              </p>
              <h3 className="mt-3 text-base font-semibold text-slate-900">{t(entry.title)}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-700">{t(entry.body)}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="page-section mt-6 rounded-2xl border border-slate-200/80 bg-white/95 p-8 print:mt-4 print:rounded-none print:border-none print:bg-white print:px-0 print:py-4">
        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
          3. Typische Dynamik im Alltag
        </p>
        <p className="mt-5 max-w-4xl text-sm leading-7 text-slate-700">{t(dailyDynamics)}</p>
      </section>

      <section className="page-section mt-6 rounded-2xl border border-slate-200/80 bg-white/95 p-8 print:mt-4 print:rounded-none print:border-none print:bg-white print:px-0 print:py-4">
        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
          4. Was ihr konkret vereinbaren solltet
        </p>
        <div className="mt-6 grid gap-3.5">
          {agreements.map((agreement) => (
            <article
              key={agreement}
              className="rounded-2xl border border-slate-200/80 bg-slate-50/70 px-4 py-4 text-sm leading-7 text-slate-700 sm:px-5"
            >
              {t(agreement)}
            </article>
          ))}
        </div>
      </section>

      <section className="page-section mt-6 rounded-2xl border border-slate-200/80 bg-white/95 p-8 print:mt-4 print:rounded-none print:border-none print:bg-white print:px-0 print:py-4">
        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
          5. Eure Dynamik über alle Dimensionen
        </p>
        <div className="mt-6 space-y-4.5">
          {compareResult.dimensions.map((dimension) => {
            const meta = FOUNDER_DIMENSION_META[dimension.dimension];
            const status = selection.dimensionStatuses.find(
              (entry) => entry.dimension === dimension.dimension
            );

            return (
              <article
                key={`matching-overview-${dimension.dimension}`}
                className="rounded-2xl border border-slate-200/80 bg-white px-5 py-5 sm:px-6 sm:py-5.5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3 sm:flex-nowrap">
                  <div className="min-w-0 flex-1">
                    <h4 className="text-base font-semibold text-slate-900">{meta.canonicalName}</h4>
                  </div>
                  {status ? <MiniStatusBadge status={status.status} /> : null}
                </div>

                <div className="mt-4.5">
                  <ComparisonScale
                    scoreA={dimension.scoreA}
                    scoreB={dimension.scoreB}
                    markerA={markerA}
                    markerB={markerB}
                    participantAName={participantAName}
                    participantBName={participantBName}
                    lowLabel={t(meta.leftPole)}
                    highLabel={t(meta.rightPole)}
                    valueScale="founder_percent"
                  />
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {valuesBlock ? (
        <section className="page-section mt-6 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-6 print:mt-4 print:rounded-none print:border-none print:bg-white print:px-0 print:py-4">
          <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">6. Wertefokus im Duo</p>
          <p className="mt-4 max-w-4xl text-sm leading-7 text-slate-700">{t(valuesBlock.intro)}</p>
          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            {[
              { label: "Gemeinsame Basis", entry: valuesBlock.gemeinsameBasis },
              { label: "Unterschied unter Druck", entry: valuesBlock.unterschiedUnterDruck },
              { label: "Leitplanke", entry: valuesBlock.leitplanke },
            ].map(({ label, entry }) => (
              <article
                key={`${label}-${entry.title}`}
                className="rounded-xl border border-slate-200/80 bg-white/80 px-4 py-4"
              >
                <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">{label}</p>
                <h3 className="mt-2 text-sm font-semibold text-slate-900">{t(entry.title)}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-700">{t(entry.body)}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="page-section mt-6 rounded-2xl border border-[color:var(--brand-accent)]/18 bg-[linear-gradient(180deg,rgba(124,58,237,0.06)_0%,rgba(255,255,255,0.98)_100%)] p-8 print:hidden">
        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Nächster Schritt</p>
        <h3 className="mt-3 text-xl font-semibold text-slate-900">Jetzt Alignment konkret festhalten</h3>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-700">
          Ihr habt gesehen, wo ihr steht. Im Workbook legt ihr jetzt fest, wie ihr konkret
          zusammenarbeitet, was fuer euch gelten soll und wie ihr die naechsten 90 Tage sauber
          fuehrt.
        </p>
        <div className="mt-6">
          <ReportActionButton href={workbookHref}>Workbook starten</ReportActionButton>
        </div>
      </section>
    </>
  );
}

function splitIntoParagraphs(text: string) {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function buildMarkerLabel(name: string | null | undefined) {
  const trimmed = name?.trim();
  if (!trimmed) return "??";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("")
    .slice(0, 2);
}

function statusLabel(status: FounderMatchingSelection["dimensionStatuses"][number]["status"]) {
  switch (status) {
    case "nah":
      return "Nah";
    case "ergänzend":
      return "Ergänzend";
    case "abstimmung_nötig":
      return "Abstimmung nötig";
    case "kritisch":
      return "Kritisch";
  }
}

function StatusBadge({
  label,
  tone,
}: {
  label: string;
  tone: "neutral" | "accentA" | "accentB";
}) {
  const className =
    tone === "accentA"
      ? "border-[#00B8D9]/25 bg-[#00B8D9]/10 text-slate-700"
      : tone === "accentB"
        ? "border-[#7C3AED]/25 bg-[#7C3AED]/10 text-slate-700"
        : "border-slate-200 bg-slate-50 text-slate-600";

  return (
    <span
      className={`inline-flex min-h-7 items-center rounded-full border px-3 py-1 text-[11px] tracking-[0.08em] ${className}`}
    >
      {t(label)}
    </span>
  );
}

function MiniStatusBadge({
  status,
}: {
  status: FounderMatchingSelection["dimensionStatuses"][number]["status"];
}) {
  const className =
    status === "kritisch"
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : status === "abstimmung_nötig"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : status === "ergänzend"
          ? "border-sky-200 bg-sky-50 text-sky-700"
          : "border-emerald-200 bg-emerald-50 text-emerald-700";

  return (
    <span
      className={`inline-flex min-h-7 items-center whitespace-nowrap rounded-full border px-3 py-1 text-[11px] tracking-[0.08em] ${className}`}
    >
      {t(statusLabel(status))}
    </span>
  );
}
