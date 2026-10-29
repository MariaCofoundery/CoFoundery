/**
 * Die Kartenreise ist noch ein Zusatzweg. Solange `PROFILE_JOURNEY` nicht auf
 * "true" steht, schickt `/welcome` niemanden dorthin; wer die Adresse
 * `/welcome/reise` direkt oeffnet, kann sie aber ausprobieren.
 */
export const PROFILE_JOURNEY_FLAG = "PROFILE_JOURNEY";

export function isProfileJourneyEnabled(env: Readonly<Record<string, string | undefined>> = process.env): boolean {
  const raw = env[PROFILE_JOURNEY_FLAG];
  return typeof raw === "string" && raw.trim().toLowerCase() === "true";
}
