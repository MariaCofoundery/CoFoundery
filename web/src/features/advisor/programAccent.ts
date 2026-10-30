/**
 * Farben einer Programmseite: zwei Farben fuer den Verlauf, Hex-Codes wie in
 * Canva (`#rrggbb`). Die Farben werden unveraendert benutzt - nichts wird
 * eingedunkelt oder gemischt, damit der Verlauf so aussieht, wie er gewaehlt
 * wurde. Lesbar bleibt die Schrift darauf, weil ihre FARBE sich anpasst
 * (weiss auf dunkel, dunkel auf hell), nicht die Flaeche.
 */
export const DEFAULT_ACCENT = "#6d49e0";
export const DEFAULT_ACCENT_B = "#0a80b8";

/** Fertige Verlaeufe zum Anklicken; wer mehr will, tippt eigene Hex-Codes. */
export const GRADIENT_PRESETS: { name: string; a: string; b: string }[] = [
  { name: "Aurora", a: "#6d49e0", b: "#0a80b8" },
  { name: "Ocean", a: "#0a80b8", b: "#14b8a6" },
  { name: "Wald", a: "#166534", b: "#10b981" },
  { name: "Sunset", a: "#f97316", b: "#ec4899" },
  { name: "Beere", a: "#be185d", b: "#7c3aed" },
  { name: "Tinte", a: "#1e293b", b: "#4338ca" },
  { name: "Gold", a: "#f59e0b", b: "#fde68a" },
  { name: "Schiefer", a: "#334155", b: "#334155" },
];

/** Nimmt `#abc`, `abc`, `#aabbcc` oder `AABBCC` und liefert `#aabbcc` - oder null. */
export function parseAccent(value: string | null | undefined): string | null {
  const text = (value ?? "").trim().toLowerCase().replace(/^#/, "");
  if (/^[0-9a-f]{3}$/.test(text)) return `#${text[0]}${text[0]}${text[1]}${text[1]}${text[2]}${text[2]}`;
  return /^[0-9a-f]{6}$/.test(text) ? `#${text}` : null;
}

type Rgb = [number, number, number];

function toRgb(hex: string): Rgb {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}

function luminance([r, g, b]: Rgb) {
  const channel = (value: number) => {
    const s = value / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** Schriftfarbe auf einer Flaeche: weiss auf dunkel, fast schwarz auf hell. */
function inkOn(hex: string): "#ffffff" | "#0f172a" {
  const white = 1.05 / (luminance(toRgb(hex)) + 0.05);
  const dark = (luminance(toRgb(hex)) + 0.05) / (luminance([15, 23, 42]) + 0.05);
  return white >= dark ? "#ffffff" : "#0f172a";
}

export function accentStyles(a: string | null | undefined, b: string | null | undefined) {
  const first = parseAccent(a) ?? DEFAULT_ACCENT;
  const second = parseAccent(b) ?? parseAccent(a) ?? DEFAULT_ACCENT_B;
  const solid = first === second;
  // Die Schrift muss auf BEIDEN Enden lesbar sein; im Zweifel gewinnt die, die auf dem schlechteren Ende noch passt.
  const inkA = inkOn(first);
  const inkB = inkOn(second);
  const text = inkA === inkB ? inkA : luminance(toRgb(first)) + luminance(toRgb(second)) > 1 ? "#0f172a" : "#ffffff";
  const background = solid ? first : `linear-gradient(135deg, ${first}, ${second})`;
  return {
    first,
    second,
    text,
    background,
    button: solid ? first : `linear-gradient(120deg, ${first}, ${second})`,
    buttonText: inkOn(solid ? first : luminance(toRgb(first)) + luminance(toRgb(second)) > 1 ? "#ffffff" : "#000000"),
  };
}
