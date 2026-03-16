"use client";

import { ReportActionButton } from "@/features/reporting/ReportActionButton";

export function PrintReportButton({
  label = "Als PDF speichern",
  className = "",
}: {
  label?: string;
  className?: string;
}) {
  return (
    <ReportActionButton onClick={() => window.print()} className={className}>
      {label}
    </ReportActionButton>
  );
}
