import {
  type FounderSetupResolutionStatus,
  type FounderSetupStage,
} from "@/features/teams/founderSetupModel";

type FounderSetupStatusChipProps = {
  /** Wie weit ihr seid. */
  stage: FounderSetupStage;
  /** Wie es endet - nur bei `settled` gesetzt. */
  outcome?: FounderSetupResolutionStatus | null;
  label: string;
};

/**
 * Ein Zeichen fuer den Fortschritt, nicht sechs nebeneinander.
 *
 * Vorher trug der Chip einen von sechs Werten, die zwei verschiedene Fragen
 * beantworteten - wie weit seid ihr, und wie endet es. "Dokumentiert" sah aus
 * wie ein Geschwister von "Offen", war aber ein staerkerer Endzustand.
 *
 * Jetzt zeigt der Chip die STUFE. Das Ergebnis faerbt nur den letzten Schritt:
 * Ein abgeschlossenes Thema sieht anders aus, je nachdem ob es geklaert,
 * zusaetzlich dokumentiert oder fuer euch nicht relevant ist - aber es steht
 * nicht mehr auf derselben Ebene wie "In Klaerung".
 *
 * Kein Gruen und kein Rot - das war von Anfang an so gedacht und bleibt so.
 * Ein offenes Thema ist kein Versagen und ein geklaertes kein Sieg; eine Ampel
 * wuerde Teams bewerten, die einfach unterschiedlich weit sind. Der Abschluss
 * ist deshalb an der FUELLUNG erkennbar, nicht an einer Farbe.
 */
const STAGE_CLASS: Record<FounderSetupStage, string> = {
  open: "bg-slate-100 text-slate-700 ring-slate-200",
  discussing: "bg-cyan-50 text-cyan-900 ring-cyan-200",
  awaiting_confirmation: "bg-violet-50 text-violet-900 ring-violet-200",
  settled: "bg-slate-800 text-white ring-slate-800",
};

/** "Nicht relevant" ist abgeschlossen, aber kein Erfolg - es bleibt still. */
const OUTCOME_CLASS: Partial<Record<FounderSetupResolutionStatus, string>> = {
  not_relevant: "bg-slate-50 text-slate-500 ring-slate-200",
};

function StageIcon({ stage, outcome }: { stage: FounderSetupStage; outcome?: FounderSetupResolutionStatus | null }) {
  if (stage === "settled" && outcome !== "not_relevant") {
    return (
      <svg aria-hidden="true" viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-none stroke-current" strokeWidth="2">
        <path d="m3.25 8.25 3 3 6.5-6.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (stage === "awaiting_confirmation") {
    return (
      <svg aria-hidden="true" viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-none stroke-current" strokeWidth="1.7">
        <circle cx="8" cy="8" r="5.5" />
        <path d="M8 4.75V8l2.25 1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  return null;
}

export function FounderSetupStatusChip({ stage, outcome, label }: FounderSetupStatusChipProps) {
  const tone =
    (stage === "settled" && outcome ? OUTCOME_CLASS[outcome] : undefined) ?? STAGE_CLASS[stage];

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${tone}`}
    >
      <StageIcon stage={stage} outcome={outcome} />
      <span>{label}</span>
    </span>
  );
}
