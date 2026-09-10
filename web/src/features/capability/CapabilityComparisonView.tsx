import type { CapabilityComparison, ComparisonArea, ComparisonStateKey } from "./capabilityComparison";

/**
 * Der Vergleich, wie zwei Menschen ihn sehen.
 *
 * Die Gestaltung traegt die Aussage des Modells, sie schmueckt sie nicht:
 *
 *   Keine Zahl im Kopfbereich. Ein Score waere das Erste, was jemand liest,
 *   und alles danach waere Beleg dafuer. Oben steht die Lage, nicht ein Urteil.
 *
 *   Zwei Spalten pro Bereich, immer beide. Wer den Befund sieht, sieht die
 *   Angaben, aus denen er entstand - links die eigenen, rechts die der anderen
 *   Person.
 *
 *   Farbe nach Dringlichkeit, nicht nach gut und schlecht. Ein doppelter
 *   Anspruch ist nicht "schlecht", sondern ungeklaert; eine geklaerte Rolle
 *   ist nicht "gut", sondern erledigt.
 *
 * Bewegung nur, wo sie etwas erklaert: Die Gruppen erscheinen in der
 * Reihenfolge ihrer Dringlichkeit gestaffelt, damit die Sortierung nicht nur
 * behauptet, sondern spuerbar ist. Alles ueber `prefers-reduced-motion`
 * abschaltbar, und ohne Animation steht die Seite vollstaendig da.
 */

const STATE_TONE: Record<ComparisonStateKey, { accent: string; ring: string; dot: string }> = {
  contested: {
    accent: "text-rose-900",
    ring: "border-rose-200 bg-rose-50/70",
    dot: "bg-rose-500",
  },
  openPosition: {
    accent: "text-amber-900",
    ring: "border-amber-200 bg-amber-50/70",
    dot: "bg-amber-500",
  },
  bothShallow: {
    accent: "text-orange-900",
    ring: "border-orange-200 bg-orange-50/60",
    dot: "bg-orange-400",
  },
  handoverPath: {
    accent: "text-sky-900",
    ring: "border-sky-200 bg-sky-50/70",
    dot: "bg-sky-500",
  },
  settled: {
    accent: "text-emerald-900",
    ring: "border-emerald-200 bg-emerald-50/70",
    dot: "bg-emerald-500",
  },
  noBasis: {
    accent: "text-slate-700",
    ring: "border-slate-200 bg-slate-50",
    dot: "bg-slate-300",
  },
};

export type ComparisonCopy = {
  title: string;
  intro: string;
  basis: string;
  coverage: string;
  gapNote: string;
  yours: string;
  theirName: string;
  overlap: string | null;
  ownerLabel: (who: string) => string;
  stateTitle: (state: string) => string;
  stateText: (state: string) => string;
  areaLabel: (areaId: string) => string;
  familyLabel: (familyId: string) => string;
  levelLabel: (level: number) => string;
  levelUnset: string;
  ownershipLabel: (wish: string) => string;
  wishUnset: string;
};

export function CapabilityComparisonView({
  comparison,
  copy,
}: {
  comparison: CapabilityComparison;
  copy: ComparisonCopy;
}) {
  return (
    <div className="comparison">
      <style>{COMPARISON_STYLES}</style>

      <header className="comparison-rise">
        <h1 className="text-3xl font-semibold tracking-tight">{copy.title}</h1>
        <p className="mt-3 max-w-2xl leading-7 text-slate-600">{copy.intro}</p>
      </header>

      {/* Die Lage. Bewusst Text und ein Balken aus Anteilen - kein Wert, der
          sich als Note lesen liesse. */}
      <section className="comparison-rise mt-8 rounded-3xl border border-slate-200 bg-white p-6" style={{ animationDelay: "60ms" }}>
        <p className="text-sm leading-6 text-slate-700">{copy.coverage}</p>
        {copy.overlap ? <p className="mt-2 text-sm leading-6 text-slate-600">{copy.overlap}</p> : null}
        <CoverageBar coverage={comparison.coverage} copy={copy} />
      </section>

      <div className="mt-8 space-y-6">
        {comparison.groups.map((group, index) => {
          const tone = STATE_TONE[group.state];
          return (
            <section
              key={group.state}
              className={`comparison-rise rounded-3xl border p-6 ${tone.ring}`}
              // Gestaffelt in der Reihenfolge der Dringlichkeit: Die
              // Sortierung soll man sehen, nicht nur lesen.
              style={{ animationDelay: `${140 + index * 90}ms` }}
            >
              <div className="flex items-start gap-3">
                <span className={`mt-2 h-2.5 w-2.5 shrink-0 rounded-full ${tone.dot}`} />
                <div>
                  <h2 className={`text-lg font-semibold ${tone.accent}`}>
                    {copy.stateTitle(group.state)}
                    <span className="ml-2 text-sm font-normal opacity-70">{group.areas.length}</span>
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-700">
                    {copy.stateText(group.state)}
                  </p>
                </div>
              </div>

              <ul className="mt-5 space-y-3">
                {group.areas.map((area) => (
                  <li key={area.areaId} className="rounded-2xl bg-white/80 p-4">
                    <AreaRow area={area} copy={copy} />
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      <footer className="comparison-rise mt-8 space-y-2" style={{ animationDelay: "320ms" }}>
        <p className="text-xs leading-5 text-slate-500">{copy.gapNote}</p>
        <p className="text-xs leading-5 text-slate-500">{copy.basis}</p>
      </footer>
    </div>
  );
}

function AreaRow({ area, copy }: { area: ComparisonArea; copy: ComparisonCopy }) {
  const owner = area.owner === "a" ? copy.yours : area.owner === "b" ? copy.theirName : null;

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-medium text-slate-900">{copy.areaLabel(area.areaId)}</span>
        <span className="text-xs uppercase tracking-[.12em] text-slate-400">
          {copy.familyLabel(area.familyId)}
        </span>
      </div>
      {owner ? (
        <p className="mt-1 text-sm font-medium text-slate-700">{copy.ownerLabel(owner)}</p>
      ) : null}
      {/* Immer beide Seiten, immer beide Felder. Der Befund ohne die Angaben
          dahinter waere eine Behauptung. */}
      <dl className="mt-3 grid gap-3 sm:grid-cols-2">
        <SideCell label={copy.yours} side={area.a} copy={copy} />
        <SideCell label={copy.theirName} side={area.b} copy={copy} />
      </dl>
    </>
  );
}

function SideCell({
  label,
  side,
  copy,
}: {
  label: string;
  side: { level: number | null; wish: string | null } | null;
  copy: ComparisonCopy;
}) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2">
      <dt className="text-xs font-semibold uppercase tracking-[.1em] text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm text-slate-700">
        {side ? (
          <>
            <span className="block">
              {side.level ? copy.levelLabel(side.level) : copy.levelUnset}
            </span>
            <span className="block text-slate-600">
              {side.wish ? copy.ownershipLabel(side.wish) : copy.wishUnset}
            </span>
          </>
        ) : (
          // Kein erfundener Nullwert: Diese Person hat den Bereich nicht
          // eingetragen, und das ist etwas anderes als eine leere Angabe.
          <span className="text-slate-500">–</span>
        )}
      </dd>
    </div>
  );
}

/**
 * Anteile statt Prozentzahl: Der Balken zeigt, wie sich die Bereiche auf
 * "nur du", "beide" und "nur die andere Person" verteilen. Er bewertet nichts,
 * und keine der drei Zonen ist die gute.
 */
function CoverageBar({
  coverage,
  copy,
}: {
  coverage: CapabilityComparison["coverage"];
  copy: ComparisonCopy;
}) {
  if (coverage.together === 0) return null;

  const parts = [
    { key: "onlyA", value: coverage.onlyA, className: "bg-slate-400", label: copy.yours },
    { key: "shared", value: coverage.shared, className: "bg-slate-800", label: "∩" },
    { key: "onlyB", value: coverage.onlyB, className: "bg-slate-400/60", label: copy.theirName },
  ].filter((part) => part.value > 0);

  return (
    <div className="mt-4">
      <div className="flex h-3 overflow-hidden rounded-full bg-slate-100">
        {parts.map((part) => (
          <span
            key={part.key}
            className={`comparison-grow ${part.className}`}
            style={{ flexGrow: part.value }}
            aria-hidden="true"
          />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
        {parts.map((part) => (
          <span key={part.key}>
            {part.label}: {part.value}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * Zwei Bewegungen, beide kurz: ein Aufsteigen der Abschnitte in der
 * Reihenfolge der Dringlichkeit und ein Aufziehen des Balkens.
 *
 * Reine CSS-Animation, kein JavaScript - die Seite bleibt eine Server
 * Component. Unter `prefers-reduced-motion` faellt beides weg, und weil die
 * Endzustaende die Standardwerte sind, steht dann sofort alles da.
 */
const COMPARISON_STYLES = `
.comparison-rise { animation: comparison-rise 520ms cubic-bezier(.22,.61,.36,1) both; }
.comparison-grow { transform-origin: left center; animation: comparison-grow 680ms cubic-bezier(.22,.61,.36,1) 180ms both; }

@keyframes comparison-rise {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: none; }
}
@keyframes comparison-grow {
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
}

@media (prefers-reduced-motion: reduce) {
  .comparison-rise, .comparison-grow { animation: none; }
}
`;
