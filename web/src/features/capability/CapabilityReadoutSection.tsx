import type { CapabilityReadout } from "./capabilityReadout";

/**
 * Die Auswertung, wie die Person sie sieht.
 *
 * Ein Befund erscheint nur, wenn er belegt ist - keine leeren Rubriken, kein
 * "keine Angaben". Und die Auswertung sagt selbst, worauf sie beruht: Sie
 * stellt Angaben nebeneinander, sie deutet nicht.
 */
export function CapabilityReadoutSection({
  readout,
  copy,
}: {
  readout: CapabilityReadout;
  copy: {
    title: string;
    basis: string;
    focus: string | null;
    coverage: string;
    findingTitle: (key: string) => string;
    findingText: (key: string) => string;
    areaLabel: (areaId: string) => string;
  };
}) {
  if (readout.areaCount === 0) return null;

  return (
    <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6">
      <h2 className="text-lg font-semibold">{copy.title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{copy.coverage}</p>
      {copy.focus ? <p className="mt-1 text-sm leading-6 text-slate-600">{copy.focus}</p> : null}

      <div className="mt-6 space-y-5">
        {readout.findings.map((finding) => (
          <div key={finding.key} className="rounded-2xl bg-slate-50 p-4">
            <h3 className="text-sm font-semibold text-slate-900">{copy.findingTitle(finding.key)}</h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">{copy.findingText(finding.key)}</p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {finding.areaIds.map((areaId) => (
                <li key={areaId} className="rounded-full bg-white px-3 py-1 text-sm text-slate-800">
                  {copy.areaLabel(areaId)}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Woraus die Auswertung entsteht, gehoert dazu - sonst liest sie sich
          als Urteil ueber einen Menschen statt als Zusammenstellung seiner
          eigenen Angaben. */}
      <p className="mt-5 text-xs leading-5 text-slate-500">{copy.basis}</p>
    </section>
  );
}
