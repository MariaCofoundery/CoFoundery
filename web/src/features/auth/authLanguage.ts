import { normalizeLocale, type AppLocale } from "@/i18n/config";

/**
 * Die Sprache der Supabase-Auth-Mails.
 *
 * Die Vorlagen im Supabase-Dashboard waehlen zwischen DE und EN anhand von
 * `user_metadata.language` (im Template `.Data.language`). Fehlt der Wert,
 * bleibt die Mail deutsch.
 *
 * WAS SUPABASE MIT DEN METADATEN TUT (gegen den Auth-Quellcode geprueft):
 * - `signInWithOtp({ options: { data } })` uebernimmt `data` NUR beim Anlegen
 *   eines Kontos. Bei bestehenden Konten wird es ignoriert - deren Mail
 *   spricht die zuletzt gespeicherte Sprache.
 * - `updateUser({ data })` mergt auf oberster Ebene: andere Schluessel
 *   (z. B. `avatar_url`) bleiben stehen. Deshalb geht hier nur `{ language }`
 *   hinaus, nie ein ganzes Metadatenobjekt.
 *
 * Gespeichert wird die Sprache nur von der angemeldeten Person selbst. Eine
 * Anfrage ohne Sitzung (Login-Formular) darf fremde Konten nicht veraendern.
 */
export type AuthLanguage = AppLocale;

export function normalizeAuthLanguage(value: unknown): AuthLanguage {
  return normalizeLocale(typeof value === "string" ? value : null);
}

/** Fuer `signInWithOtp` / Signup: wirkt nur bei einem neu angelegten Konto. */
export function authLanguageMetadata(locale: unknown): { language: AuthLanguage } {
  return { language: normalizeAuthLanguage(locale) };
}

type AuthLanguageClient = {
  auth: {
    getUser: () => Promise<{ data: { user: { user_metadata?: Record<string, unknown> | null } | null } }>;
    updateUser: (params: { data: Record<string, unknown> }) => Promise<{ error: unknown }>;
  };
};

/**
 * Nach einer Anmeldung: die aktuelle UI-Sprache als Mailsprache merken.
 *
 * Schreibt nur, wenn sich etwas aendert, und nur den Schluessel `language`.
 * Ein Fehler darf die Anmeldung nie aufhalten - schlimmstenfalls kommt die
 * naechste Auth-Mail in der bisherigen Sprache.
 */
export async function syncAuthLanguage(client: AuthLanguageClient, locale: unknown) {
  const language = normalizeAuthLanguage(locale);
  try {
    const {
      data: { user },
    } = await client.auth.getUser();
    if (!user || user.user_metadata?.language === language) return;
    await client.auth.updateUser({ data: { language } });
  } catch {
    // Absichtlich still: siehe oben.
  }
}
