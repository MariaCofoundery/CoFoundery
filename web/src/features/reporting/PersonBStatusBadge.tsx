import { useTranslations } from "next-intl";
import { type PersonBStatus } from "@/features/reporting/types";

type Props = {
  status: PersonBStatus;
};

const STATUS_CONFIG: Record<PersonBStatus, { labelKey: string; classes: string }> = {
  invitation_open: {
    labelKey: "invitation_open",
    classes: "border-slate-300 bg-slate-100/80 text-slate-700",
  },
  in_progress: {
    labelKey: "in_progress",
    classes: "border-slate-900 bg-slate-900 text-white",
  },
  match_ready: {
    labelKey: "match_ready",
    classes: "border-emerald-300 bg-emerald-50/80 text-emerald-700",
  },
};

export function PersonBStatusBadge({ status }: Props) {
  const t = useTranslations("invite.teamMatching.statuses");
  const config = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex rounded-full border px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] ${config.classes}`}
    >
      {t(config.labelKey)}
    </span>
  );
}
