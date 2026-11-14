/**
 * Die Kartenreise ist der Einstieg (seit 14.11.2026): zwei Fragen, dann ist man drin; das Profil richtet man
 * danach in kleinen, einzeln gespeicherten Schritten ein (`/welcome/profil`).
 *
 * `PROFILE_JOURNEY=false` stellt den bisherigen langen Einstieg (`/welcome` mit dem Formular) wieder her - als
 * Notausgang, nicht als zweiter Weg. Wer ihn im Einzelfall will, nutzt `classic=1`.
 */
export const PROFILE_JOURNEY_FLAG = "PROFILE_JOURNEY";

export function isProfileJourneyEnabled(env: Readonly<Record<string, string | undefined>> = process.env): boolean {
  const raw = env[PROFILE_JOURNEY_FLAG];
  return !(typeof raw === "string" && raw.trim().toLowerCase() === "false");
}
