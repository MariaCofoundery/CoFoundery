import { type FounderSetupDisplayStatus } from "@/features/teams/founderSetupModel";

type FounderSetupStatusChipProps = {
  status: FounderSetupDisplayStatus;
  label: string;
};

const STATUS_CLASS: Record<FounderSetupDisplayStatus, string> = {
  open: "bg-slate-100 text-slate-700 ring-slate-200",
  discussing: "bg-cyan-50 text-cyan-900 ring-cyan-200",
  confirmation_pending: "bg-violet-50 text-violet-900 ring-violet-200",
  clarified: "bg-cyan-50 text-cyan-900 ring-cyan-200",
  documented: "bg-slate-100 text-slate-800 ring-slate-300",
  not_relevant: "bg-slate-50 text-slate-600 ring-slate-200",
};

function StatusIcon({ status }: { status: FounderSetupDisplayStatus }) {
  if (status === "clarified") {
    return (
      <svg aria-hidden="true" viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-none stroke-current" strokeWidth="2">
        <path d="m3.25 8.25 3 3 6.5-6.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (status === "confirmation_pending") {
    return (
      <svg aria-hidden="true" viewBox="0 0 16 16" className="h-3.5 w-3.5 fill-none stroke-current" strokeWidth="1.7">
        <circle cx="8" cy="8" r="5.5" />
        <path d="M8 4.75V8l2.25 1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  return null;
}

export function FounderSetupStatusChip({ status, label }: FounderSetupStatusChipProps) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${STATUS_CLASS[status]}`}
    >
      <StatusIcon status={status} />
      <span>{label}</span>
    </span>
  );
}
