type Props = {
  derivationText: string;
  status: "not_started" | "in_progress" | "completed";
  answeredA: number;
  answeredB: number;
  total: number;
  personBReady: boolean;
};

export function ValuesModulePlaceholder({
  derivationText,
  status,
  answeredA,
  answeredB,
  total,
  personBReady,
}: Props) {
  const statusLabel =
    status === "completed"
      ? "Werte-Profil vollständig"
      : status === "in_progress"
        ? "in Bearbeitung"
        : "offen";
  const intro =
    status === "not_started"
      ? "Das dedizierte Werte-Modul wurde noch nicht ausgefüllt. Vorläufige Herleitung auf Basis der 36 Kernfragen zu Ethik und Transparenz:"
      : "Extra-Kapitel auf Basis der bisherigen Werte-Vertiefung (Ethik & Transparenz):";
  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white/95 p-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-[11px] uppercase tracking-[0.24em] text-slate-500">
          Werte-Modul (Add-on)
        </h3>
        <span className="rounded-full border border-slate-300 bg-slate-100/80 px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-slate-700">
          {statusLabel}
        </span>
      </div>
      <p className="mt-4 text-sm leading-7 text-slate-600">{intro}</p>
      <p className="mt-3 text-xs tracking-[0.08em] text-slate-500">
        Fortschritt: Profil A {answeredA}/{total}
        {personBReady ? `, Profil B ${answeredB}/${total}` : ""}
      </p>
      <p className="mt-4 rounded-xl border border-slate-200/80 bg-slate-50/70 px-5 py-4 text-sm leading-7 text-slate-700">
        {derivationText}
      </p>
    </section>
  );
}
