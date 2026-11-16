import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Das Zeichen in den Links der Newsletter-Mails: Bestaetigen und Abmelden, ohne angemeldet zu sein.
 *
 * Wie bei den Erinnerungen: Person + Zweck + Unterschrift (HMAC mit dem Geheimnis des Servers). Der Zweck steckt in der Unterschrift -
 * ein Bestaetigungs-Link kann nicht zum Abmelden dienen und umgekehrt. Die Seiten dahinter fragen noch einmal nach (ein Knopf), weil
 * Mail-Programme Links vorab abrufen: Ein reiner Abruf darf nichts aendern.
 */
export type NewsletterPurpose = "confirm" | "unsubscribe";

export function newsletterToken(userId: string, purpose: NewsletterPurpose, secret: string): string {
  return createHmac("sha256", secret).update(`newsletter-${purpose}:${userId}`).digest("hex");
}

export function isValidNewsletterToken(userId: string, purpose: NewsletterPurpose, token: string, secret: string): boolean {
  if (!secret || !userId || !token) return false;
  const expected = Buffer.from(newsletterToken(userId, purpose, secret), "hex");
  let given: Buffer;
  try {
    given = Buffer.from(token, "hex");
  } catch {
    return false;
  }
  return given.length === expected.length && timingSafeEqual(given, expected);
}
