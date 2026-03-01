"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

type ReportAutoRefreshProps = {
  intervalMs?: number;
  timeoutMs?: number;
};

export function ReportAutoRefresh({
  intervalMs = 5000,
  timeoutMs = 120000,
}: ReportAutoRefreshProps) {
  const router = useRouter();

  useEffect(() => {
    const startedAt = Date.now();
    const interval = window.setInterval(() => {
      if (Date.now() - startedAt >= timeoutMs) {
        window.clearInterval(interval);
        return;
      }
      router.refresh();
    }, intervalMs);

    return () => window.clearInterval(interval);
  }, [intervalMs, router, timeoutMs]);

  return null;
}
