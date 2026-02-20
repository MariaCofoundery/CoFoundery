type Props = {
  commonTendencies: string[];
  frictionPoints: string[];
  personBReady: boolean;
};

export function MatchNarratives({ commonTendencies, frictionPoints, personBReady }: Props) {
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white/95 p-8">
      <h3 className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Match-Report</h3>

      {!personBReady ? (
        <p className="mt-5 text-sm leading-7 text-slate-600">
          Für die Match-Analyse fehlt aktuell das vollständige Profil von Person B.
        </p>
      ) : (
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200/80 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Gemeinsame Tendenzen</p>
            {commonTendencies.length === 0 ? (
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Derzeit keine signifikant deckungsgleichen Muster mit hoher Aussagekraft.
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
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Potenzielle Reibungspunkte</p>
            {frictionPoints.length === 0 ? (
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Aktuell keine kritischen Spannungsfelder mit hoher Differenz sichtbar.
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
