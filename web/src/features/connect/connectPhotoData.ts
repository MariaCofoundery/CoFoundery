/**
 * Ein Bild aus einer data:-URL, mit Obergrenze.
 *
 * Lag bis zum 18.09.2026 als private Funktion in connectActions.ts. Die
 * Logos der Unternehmen brauchen dieselbe Pruefung - und eine zweite Kopie
 * waere die Stelle, an der spaeter eine der beiden eine andere Obergrenze
 * bekommt, ohne dass es jemandem auffaellt.
 */
export function decodePhotoData(value: string) {
  const match = value.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
  if (!match) return null;
  const buffer = Buffer.from(match[2], "base64");
  if (!buffer.length || buffer.byteLength > 2 * 1024 * 1024) return null;
  return { buffer, mimeType: match[1] };
}
