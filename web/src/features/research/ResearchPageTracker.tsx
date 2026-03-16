"use client";

import { useEffect, useMemo } from "react";
import { getOrCreateResearchFlowId, trackResearchEvent } from "@/features/research/client";

type Props = {
  eventName: string;
  invitationId?: string | null;
  module?: "base" | "values" | null;
  properties?: Record<string, unknown>;
};

export function ResearchPageTracker({ eventName, invitationId = null, module = null, properties }: Props) {
  const flowScope = useMemo(
    () => (invitationId ? `invite:${invitationId}` : `page:${eventName}`),
    [eventName, invitationId]
  );

  useEffect(() => {
    const flowId = getOrCreateResearchFlowId(flowScope);
    trackResearchEvent({
      eventName,
      invitationId,
      module,
      flowId,
      properties,
    });
  }, [eventName, flowScope, invitationId, module, properties]);

  return null;
}
