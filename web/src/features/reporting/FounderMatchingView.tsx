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
  const heroHeadline = buildMatchHeadline(selection);
  const heroParagraphs = splitIntoParagraphs(hero);
  const dailyDynamicsSections = splitNarrativeSections(dailyDynamics);
  const keyFieldCards = [
    { label: "Größtes Spannungsfeld", entry: biggestTension, featured: true },
    { label: "Stabile Basis", entry: stableBase, featured: false },
    { label: "Stärkste Ergänzung", entry: strongestComplement, featured: false },
  ].filter((entry) => entry.entry !== null);
  const [primaryAgreement, ...secondaryAgreements] = agreements;
  const nextStepSectionNumber = valuesBlock ? 6 : 5;

  return (
    <>
      <section className="page-section rounded-[28px] border border-slate-200/80 bg-white/96 p-8 shadow-[0_18px_60px_rgba(15,23,42,0.05)] print:rounded-none print:border-none print:bg-white print:px-0 print:py-4 sm:p-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-4xl">
            <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Matching-Report</p>
            <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-5xl">
              {t(heroHeadline)}
            </h1>
            <h2 className="mt-5 text-lg font-medium text-slate-900">Euer Matching-Report</h2>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-700">
              Hier seht ihr, was euch traegt, wo ihr euch produktiv ergaenzt und wo klare Regeln
              wichtig sind.
            </p>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-500">
              Im naechsten Schritt klaert ihr eure wichtigsten Punkte im Workbook.
            </p>
            <div className="mt-7 flex flex-wrap gap-2.5">
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

      <section className="page-section mt-8 rounded-[28px] border border-slate-200/80 bg-slate-50/70 p-8 print:mt-4 print:rounded-none print:border-none print:bg-white print:px-0 print:py-4 sm:p-10">
        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
          1. Euer Zusammenspiel auf einen Blick
        </p>
        <div className="mt-6 max-w-4xl space-y-3.5">
          {heroParagraphs.map((paragraph) => (
            <p key={paragraph} className="text-[15px] leading-7 text-slate-700">
              {t(paragraph)}
            </p>
          ))}
        </div>
      </section>

      <section className="page-section mt-8 rounded-[28px] border border-slate-200/80 bg-white/96 p-8 print:mt-4 print:rounded-none print:border-none print:bg-white print:px-0 print:py-4 sm:p-10">
        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
          2. Die drei wichtigsten Felder
        </p>
        <div className="mt-7 grid gap-5 lg:grid-cols-[1.15fr_1fr_1fr]">
          {keyFieldCards.map(({ label, entry, featured }) => (
            <article
              key={`${label}-${entry?.title}`}
              className={`rounded-[24px] border sm:p-6 ${
                featured
                  ? "border-rose-200/80 bg-[linear-gradient(180deg,rgba(255,241,242,0.92),rgba(255,255,255,0.98))] p-6 shadow-[0_18px_40px_rgba(244,63,94,0.08)] lg:py-7"
                  : "border-slate-200/80 bg-slate-50/60 p-5"
              }`}
            >
              <p
                className={`text-[11px] uppercase tracking-[0.16em] ${
                  featured ? "text-rose-700" : "text-slate-500"
                }`}
              >
                {label}
              </p>
              <h3 className={`mt-3 font-semibold text-slate-900 ${featured ? "text-lg" : "text-base"}`}>
                {t(entry?.title ?? "")}
              </h3>
              <p className={`mt-3 leading-7 text-slate-700 ${featured ? "text-[15px]" : "text-sm"}`}>
                {t(entry?.body ?? "")}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="page-section mt-8 rounded-[28px] border border-slate-200/80 bg-white/96 p-8 print:mt-4 print:rounded-none print:border-none print:bg-white print:px-0 print:py-4 sm:p-10">
        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
          3. Typische Dynamik im Alltag
        </p>
        <div className="mt-6 grid gap-5 lg:grid-cols-3">
          {dailyDynamicsSections.map((section) => (
            <article
              key={`${section.title}-${section.body}`}
              className="rounded-[22px] border border-slate-200/80 bg-slate-50/70 p-5"
            >
              <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{section.title}</p>
              <p className="mt-3 text-sm leading-7 text-slate-700">{t(section.body)}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="page-section mt-8 rounded-[28px] border border-slate-200/80 bg-slate-50/70 p-8 print:mt-4 print:rounded-none print:border-none print:bg-white print:px-0 print:py-4 sm:p-10">
        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
          4. Eure Dynamik über alle Dimensionen
        </p>
        <div className="mt-6 space-y-4">
          {compareResult.dimensions.map((dimension) => {
            const meta = FOUNDER_DIMENSION_META[dimension.dimension];
            const status = selection.dimensionStatuses.find(
              (entry) => entry.dimension === dimension.dimension
            );

            return (
              <article
                key={`matching-overview-${dimension.dimension}`}
                className="rounded-[22px] border border-slate-200/70 bg-white/85 px-5 py-4 sm:px-6 sm:py-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3 sm:flex-nowrap">
                  <div className="min-w-0 flex-1">
                    <h4 className="text-[15px] font-semibold text-slate-900">{meta.canonicalName}</h4>
                  </div>
                  {status ? <MiniStatusBadge status={status.status} /> : null}
                </div>

                <div className="mt-4 max-w-3xl">
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
                    compact
                  />
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {valuesBlock ? (
        <section className="page-section mt-8 rounded-[28px] border border-slate-200/80 bg-white/96 p-8 print:mt-4 print:rounded-none print:border-none print:bg-white print:px-0 print:py-4 sm:p-10">
          <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">5. Wertefokus im Duo</p>
          <p className="mt-4 max-w-4xl text-sm leading-7 text-slate-700">{t(valuesBlock.intro)}</p>
          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            {[
              { label: "Gemeinsame Basis", entry: valuesBlock.gemeinsameBasis },
              { label: "Unterschied unter Druck", entry: valuesBlock.unterschiedUnterDruck },
              { label: "Leitplanke", entry: valuesBlock.leitplanke },
            ].map(({ label, entry }) => (
              <article
                key={`${label}-${entry.title}`}
                className="rounded-[22px] border border-slate-200/80 bg-slate-50/60 px-5 py-5"
              >
                <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">{label}</p>
                <h3 className="mt-2 text-sm font-semibold text-slate-900">{t(entry.title)}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-700">{t(entry.body)}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="page-section mt-8 rounded-[30px] border border-[color:var(--brand-accent)]/18 bg-[linear-gradient(180deg,rgba(124,58,237,0.07)_0%,rgba(255,255,255,0.99)_100%)] p-8 shadow-[0_18px_50px_rgba(124,58,237,0.08)] print:mt-4 print:rounded-none print:border-none print:bg-white print:px-0 print:py-4 sm:p-10">
        <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">{`${nextStepSectionNumber}. Euer wichtigster nächster Schritt`}</p>
        {primaryAgreement ? (
          <div className="mt-5 rounded-[24px] border border-[color:var(--brand-accent)]/18 bg-white/92 p-6">
            <p className="text-lg font-semibold leading-8 text-slate-900">{t(primaryAgreement)}</p>
          </div>
        ) : null}
        {secondaryAgreements.length > 0 ? (
          <div className="mt-4 grid gap-3">
            {secondaryAgreements.map((agreement) => (
              <article
                key={agreement}
                className="rounded-[20px] border border-slate-200/80 bg-white/80 px-5 py-4 text-sm leading-7 text-slate-700"
              >
                {t(agreement)}
              </article>
            ))}
          </div>
        ) : null}

        <div className="mt-8 border-t border-slate-200/80 pt-8 print:hidden">
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

function splitNarrativeSections(text: string) {
  const sentences = splitIntoParagraphs(text);
  const sectionTitles =
    sentences.length >= 5
      ? ["Im Alltag", "Unter Druck", "Was oft zu spät auffällt"]
      : ["Im Alltag", "Unter Druck"];
  const targetSections = Math.min(sectionTitles.length, Math.max(2, Math.ceil(sentences.length / 2)));
  const chunkSize = Math.ceil(sentences.length / targetSections);

  return Array.from({ length: targetSections }, (_, index) => {
    const start = index * chunkSize;
    const body = sentences.slice(start, start + chunkSize).join(" ").trim();
    return {
      title: sectionTitles[index] ?? `Teil ${index + 1}`,
      body,
    };
  }).filter((section) => section.body.length > 0);
}

function buildMatchHeadline(selection: FounderMatchingSelection) {
  switch (selection.heroSelection.mode) {
    case "tension_led":
      return "Unter Druck braucht ihr frueh klare Absprachen";
    case "complement_led":
      return "Eure Unterschiede tragen, wenn Regeln frueh klar sind";
    case "coordination_led":
      return "Viel passt, Abstimmung entscheidet ueber euer Tempo";
    case "blind_spot_watch":
      return "Aehnlich im Start, spaeter drohen stille Luecken";
    case "alignment_led":
    default:
      return "Viel gemeinsame Linie, klare Reibung an wenigen Punkten";
  }
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
