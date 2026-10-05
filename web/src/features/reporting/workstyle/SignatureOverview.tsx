import { AREAS, memberInitials, type AreaKey, type ProductProfile } from "@/features/reporting/workstyle/model";
import { overviewMark, type OverviewMark } from "@/features/reporting/workstyle/narrative";

/**
 * "Workstyle Signature" - eine Darstellung der Antworten, kein Messwert.
 *
 * Logik unveraendert seit Phase 10B (`overviewMark`): Punkt nur bei getragener
 * Richtung, gestrichelte Spannweite bei gemischten Antworten, nichts bei zu
 * wenigen Antworten. Kein Radar, kein Gesamtwert, keine Interpolation.
 *
 * Phase 11.5 (nur Darstellung):
 * - kontextbezogene Pole je Bereich - woertlich aus den Richtungsaussagen der
 *   Phase 10B, also innerhalb der gemessenen Situationen; darunter klein die
 *   tatsaechlichen Skalenenden;
 * - 1 Person: eine Spur; 2 Personen: eine gemeinsame Spur mit zwei Markern
 *   (oberhalb / unterhalb); 3-4 Personen: je Person eine eigene schmale Spur
 *   mit Namen - nichts liegt uebereinander, keine Mehrheit, keine Wertungsfarbe.
 */
const POLES: Record<AreaKey, { left: string; right: string }> = {
  EVI: { left: "prüft eine Einschätzung eher nicht noch einmal", right: "prüft eine Einschätzung eher noch einmal" },
  EXP: { left: "frühere Erfahrung beeinflusst eher wenig", right: "frühere Erfahrung beeinflusst eher stark" },
  EL: { left: "kleiner Versuch eher nicht naheliegend", right: "kleiner Versuch eher naheliegend" },
  VOICE: { left: "spricht Einwände eher nicht an", right: "spricht Einwände eher an" },
  AMB: { left: "offene Situationen eher nicht unangenehm", right: "offene Situationen eher unangenehm" },
  ORG: { left: "klärt eher nicht zuerst nächste Schritte", right: "klärt eher zuerst nächste Schritte" },
};

type Person = { id: string; name: string; profile: ProductProfile };

const left = (position: number) => `calc(${position * 25}% + ${2 - position * 8}px)`;

function Marker({ mark, name, index, top }: { mark: OverviewMark; name: string; index: number; top: number }) {
  if (mark.kind === "point")
    return (
      <span className={`ws-token ws-token-${index % 4} absolute`} style={{ left: left(mark.position), top }}>
        {memberInitials(name)}
      </span>
    );
  if (mark.kind === "range")
    return (
      <span
        className="ws-range absolute"
        style={{ left: left(mark.from), width: `calc(${(mark.to - mark.from) * 25}% - ${(mark.to - mark.from) * 8}px + 26px)`, top }}
      >
        {memberInitials(name)}
      </span>
    );
  return null;
}

function Track({ line }: { line: number }) {
  return (
    <>
      <div className="absolute inset-x-3 border-t border-slate-300" style={{ top: line }} />
      {[0, 1, 2, 3, 4].map((n) => (
        <span
          key={n}
          className="absolute h-2 w-2 -translate-y-1/2 rounded-full border border-slate-400 bg-white"
          style={{ left: `calc(${n * 25}% + ${12 - n * 8}px)`, top: line }}
        />
      ))}
    </>
  );
}

function describe(mark: OverviewMark) {
  return mark.kind === "point"
    ? mark.label
    : mark.kind === "range"
      ? `je nach Situation von „${mark.fromLabel}“ bis „${mark.toLabel}“`
      : "zu wenige Antworten für eine Darstellung";
}

export function SignatureOverview({ people }: { people: Person[] }) {
  const lanes = people.length >= 3;
  return (
    <figure
      className="ws-overview my-6 rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-white to-violet-50/50 p-5 sm:p-7"
      aria-label="Workstyle Signature"
    >
      <figcaption>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">Workstyle Signature</p>
        <h3 className="mt-1 text-xl font-semibold">
          {people.length === 1 ? "Dein Antwortmuster auf einen Blick" : "Eure Antwortmuster auf einen Blick"}
        </h3>
      </figcaption>
      {people.length > 1 && (
        <ul className="mt-4 flex flex-wrap gap-4">
          {people.map((p, n) => (
            <li key={p.id} className="flex items-center gap-2 text-sm">
              <span aria-hidden="true" className={`ws-token ws-token-${n % 4}`}>
                {memberInitials(p.name)}
              </span>
              {p.name}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-5 grid gap-4">
        {AREAS.map((area) => {
          const marks = people.map((p) => ({ ...p, mark: overviewMark(p.profile, area.key) }));
          const options = marks.flatMap((m) => (m.mark.kind === "none" ? [] : [m.mark.options]))[0];
          const poles = POLES[area.key];
          return (
            <section key={area.key} className="ws-lane rounded-2xl border border-slate-200/80 bg-white/80 p-4">
              <h4 className="text-sm font-semibold text-slate-900">{area.team}</h4>
              <div className="mt-2 flex justify-between gap-6 text-xs leading-5 text-slate-600">
                <span className="max-w-[45%]">{poles.left}</span>
                <span className="max-w-[45%] text-right">{poles.right}</span>
              </div>
              {lanes ? (
                <div aria-hidden="true" className="mt-2 grid gap-1">
                  {marks.map((m, n) => (
                    <div key={m.id} className="grid grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-2">
                      <span className="truncate text-xs text-slate-600">{m.name}</span>
                      <div className="relative" style={{ height: 30 }}>
                        <Track line={15} />
                        <Marker mark={m.mark} name={m.name} index={n} top={2} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div aria-hidden="true" className="relative mt-2" style={{ height: people.length === 2 ? 62 : 34 }}>
                  <Track line={people.length === 2 ? 31 : 17} />
                  {marks.map((m, n) => (
                    <Marker key={m.id} mark={m.mark} name={m.name} index={n} top={people.length === 2 ? (n === 0 ? 2 : 34) : 4} />
                  ))}
                </div>
              )}
              {options && (
                <div aria-hidden="true" className="mt-1 flex justify-between gap-4 text-[11px] text-slate-400">
                  <span>{options[0].label}</span>
                  <span className="text-right">{options.at(-1)!.label}</span>
                </div>
              )}
              <p className="mt-2 text-xs leading-5 text-slate-600">
                {marks.map((m) => (people.length === 1 ? describe(m.mark) : `${m.name}: ${describe(m.mark)}`)).join(" · ")}
              </p>
              {area.key === "ORG" && (
                <p className="mt-1 text-xs text-slate-500">
                  Hier nur: nächste Schritte und eigene Zwischenpunkte. Fokus, Unterbrechungen und Planänderungen stehen
                  einzeln im Text.
                </p>
              )}
              {area.key === "EXP" && (
                <p className="mt-1 text-xs text-slate-500">
                  Ohne den „vertrauten Eindruck“ – diese Frage hat ein anderes Antwortformat und steht einzeln im Text.
                </p>
              )}
            </section>
          );
        })}
      </div>
      <p className="mt-4 text-xs leading-5 text-slate-500">
        Ein Punkt erscheint nur, wenn die Antworten eines Bereichs in eine Richtung gehen – er steht auf der mittleren der
        gewählten Antworten. Unterscheiden sich die Antworten je nach Situation, zeigt ein gestrichelter Balken die
        Spannweite. Das ist eine Darstellung der Antworten, kein Messwert. Links und rechts sind gleichwertig, und es gibt
        keinen Gesamtwert.
      </p>
    </figure>
  );
}
