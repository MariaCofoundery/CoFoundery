/**
 * Akzentfarbe einer Programmseite. Gespeichert wird nur ein Hex-Wert
 * (`#rrggbb`); daraus entstehen hier Kopfflaeche und Knopf. Damit weisse Schrift
 * lesbar bleibt, wird die Farbe bei Bedarf abgedunkelt - die Organisation kann
 * also keine Kombination waehlen, die man nicht lesen kann.
 */
export const DEFAULT_ACCENT = "#6d49e0";
export const ACCENT_PRESETS = ["#6d49e0", "#0a80b8", "#0f766e", "#15803d", "#c2410c", "#be185d", "#b91c1c", "#334155"] as const;

export function parseAccent(value: string | null | undefined): string | null {
  const text = (value ?? "").trim().toLowerCase();
  return /^#[0-9a-f]{6}$/.test(text) ? text : null;
}

type Rgb = [number, number, number];

function toRgb(hex: string): Rgb {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}

function toHex([r, g, b]: Rgb) {
  return `#${[r, g, b].map((channel) => Math.round(Math.max(0, Math.min(255, channel))).toString(16).padStart(2, "0")).join("")}`;
}

function mix(a: Rgb, b: Rgb, amountOfA: number): Rgb {
  return [a[0] * amountOfA + b[0] * (1 - amountOfA), a[1] * amountOfA + b[1] * (1 - amountOfA), a[2] * amountOfA + b[2] * (1 - amountOfA)];
}

function luminance([r, g, b]: Rgb) {
  const channel = (value: number) => {
    const s = value / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** Dunkelt ab, bis weisse Schrift darauf ein Kontrastverhaeltnis von mindestens 4,5 erreicht. */
function readable(hex: string): Rgb {
  let color = toRgb(hex);
  for (let step = 0; step < 20 && luminance(color) > 0.18; step += 1) color = mix(color, [0, 0, 0], 0.92);
  return color;
}

export function accentStyles(value: string | null | undefined) {
  const accent = parseAccent(value) ?? DEFAULT_ACCENT;
  const base = readable(accent);
  const ink: Rgb = [11, 11, 36];
  return {
    accent: toHex(base),
    hero: `radial-gradient(120% 140% at 8% 0%, ${toHex(mix(base, ink, 0.6))} 0%, ${toHex(mix(base, ink, 0.24))} 62%)`,
    heroColor: toHex(mix(base, ink, 0.24)),
    button: `linear-gradient(120deg, ${toHex(base)}, ${toHex(readable(toHex(mix(base, [10, 128, 184], 0.55))))})`,
    soft: toHex(mix(base, [255, 255, 255], 0.1)),
  };
}
