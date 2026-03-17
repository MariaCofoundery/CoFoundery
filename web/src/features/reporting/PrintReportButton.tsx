"use client";

import { ReportActionButton } from "@/features/reporting/ReportActionButton";
import { trackResearchEvent } from "@/features/research/client";

export function PrintReportButton({
  label = "Als PDF speichern",
  className = "",
  eventName = null,
  invitationId = null,
  teamContext = null,
  module = null,
  properties,
}: {
  label?: string;
  className?: string;
  eventName?: string | null;
  invitationId?: string | null;
  teamContext?: "pre_founder" | "existing_team" | null;
  module?: "base" | "values" | null;
  properties?: Record<string, unknown>;
}) {
  return (
    <ReportActionButton
      onClick={() => {
        if (eventName) {
          trackResearchEvent({
            eventName,
            invitationId,
            teamContext,
            module,
            properties,
          });
        }
        window.print();
      }}
      className={className}
    >
      {label}
    </ReportActionButton>
  );
}
