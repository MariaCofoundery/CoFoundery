"use client";

import { useTranslations } from "next-intl";
import { getIncomingRequestBadgePresentation } from "@/features/discovery/discoveryIntroTypes";

export function IncomingRequestBadge({ count }: { count: number }) {
  const t = useTranslations("navigation");
  const presentation = getIncomingRequestBadgePresentation(count);

  if (!presentation) {
    return null;
  }

  const accessibleLabel = t(presentation.messageKey, { count });

  return (
    <span
      aria-label={accessibleLabel}
      title={accessibleLabel}
      className="inline-flex min-w-5 items-center justify-center rounded-full bg-red-600 px-1.5 py-0.5 text-[0.68rem] font-bold leading-none text-white shadow-sm"
    >
      {presentation.displayCount}
    </span>
  );
}
