"use client";

import Link, { type LinkProps } from "next/link";
import type { ReactNode } from "react";
import { getOrCreateResearchFlowId, trackResearchEvent } from "@/features/research/client";

type Props = LinkProps & {
  children: ReactNode;
  className?: string;
  eventName: string;
  invitationId?: string | null;
  teamContext?: "pre_founder" | "existing_team" | null;
  module?: "base" | "values" | null;
  properties?: Record<string, unknown>;
};

export function ResearchTrackedLink({
  children,
  className,
  eventName,
  invitationId = null,
  teamContext = null,
  module = null,
  properties,
  ...linkProps
}: Props) {
  return (
    <Link
      {...linkProps}
      className={className}
      onClick={() => {
        const flowScope = invitationId ? `invite:${invitationId}` : `link:${eventName}`;
        const flowId = getOrCreateResearchFlowId(flowScope);
        trackResearchEvent({
          eventName,
          invitationId,
          teamContext,
          module,
          flowId,
          properties,
        });
      }}
    >
      {children}
    </Link>
  );
}
