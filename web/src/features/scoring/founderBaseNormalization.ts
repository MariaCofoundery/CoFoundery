function round(value: number, precision = 3) {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function looksLikeLegacyBaseScale(rawValue: string) {
  return /^(?:1|2|3|4)(?:\.0+)?$/.test(rawValue.trim());
}

export function normalizeStoredBaseAnswerToFounderPercent(rawValue: string): number | null {
  const trimmed = rawValue.trim();
  if (trimmed.length === 0) return null;

  const parsedValue = Number.parseFloat(trimmed);
  if (!Number.isFinite(parsedValue)) return null;

  if (looksLikeLegacyBaseScale(trimmed)) {
    return round(((parsedValue - 1) / 3) * 100);
  }

  if (parsedValue >= 0 && parsedValue <= 100) {
    return round(parsedValue);
  }

  if (parsedValue >= 1 && parsedValue <= 6) {
    return round(((parsedValue - 1) / 5) * 100);
  }

  return round(clamp(parsedValue, 0, 100));
}

export function founderPercentToDisplayScore(percentValue: number | null) {
  if (percentValue == null || !Number.isFinite(percentValue)) return null;
  const clamped = clamp(percentValue, 0, 100);
  return round(1 + (clamped / 100) * 5);
}

export function founderDisplayScoreToPercent(displayScore: number | null) {
  if (displayScore == null || !Number.isFinite(displayScore)) return null;
  const clamped = clamp(displayScore, 1, 6);
  return round(((clamped - 1) / 5) * 100);
}
