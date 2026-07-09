export type ReportAccessMode = "default" | "free_beta";

export type LegacyReportAccessState = {
  mode: ReportAccessMode;
  isUnlocked: boolean;
  reason: "free_beta" | "unlocked" | "locked";
};

export function getReportAccessMode(
  rawMode: string | null | undefined = process.env.REPORT_ACCESS_MODE
): ReportAccessMode {
  return rawMode?.trim() === "free_beta" ? "free_beta" : "default";
}

export function isLegacyReportUnlockedForCurrentMode({
  isLocked,
  mode = getReportAccessMode(),
}: {
  isLocked: boolean;
  mode?: ReportAccessMode;
}) {
  return mode === "free_beta" || !isLocked;
}

export function getLegacyReportAccessState({
  isLocked,
  mode = getReportAccessMode(),
}: {
  isLocked: boolean;
  mode?: ReportAccessMode;
}): LegacyReportAccessState {
  const isUnlocked = isLegacyReportUnlockedForCurrentMode({ isLocked, mode });

  if (mode === "free_beta") {
    return {
      mode,
      isUnlocked,
      reason: "free_beta",
    };
  }

  return {
    mode,
    isUnlocked,
    reason: isUnlocked ? "unlocked" : "locked",
  };
}
