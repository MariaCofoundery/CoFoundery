import { type PersonBStatus } from "@/features/reporting/types";

type Props = {
  status: PersonBStatus;
};

const STATUS_CONFIG: Record<PersonBStatus, { label: string; classes: string }> = {
  invitation_open: {
    label: "Einladung offen",
    classes: "border-slate-300 bg-slate-100/80 text-slate-700",
  },
  in_progress: {
    label: "In Bearbeitung",
    classes: "border-slate-900 bg-slate-900 text-white",
  },
  match_ready: {
    label: "Match bereit",
    classes: "border-emerald-300 bg-emerald-50/80 text-emerald-700",
  },
};

export function PersonBStatusBadge({ status }: Props) {
  const config = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex rounded-full border px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] ${config.classes}`}
    >
      {config.label}
    </span>
  );
}
