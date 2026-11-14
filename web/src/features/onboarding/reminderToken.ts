import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Das Zeichen, mit dem man sich aus der Erinnerungs-Mail abmeldet - ohne angemeldet zu sein.
 *
 * Der Link traegt die Person und eine Unterschrift (HMAC ueber die Kennung, mit dem Geheimnis des Servers). Ohne
 * die Unterschrift laesst sich niemand fremdes abmelden. Die Seite dahinter fragt noch einmal nach (ein Knopf), weil
 * Mail-Programme Links vorab abrufen: Ein reiner Abruf darf nichts aendern.
 */
export function reminderUnsubscribeToken(userId: string, secret: string): string {
  return createHmac("sha256", secret).update(`onboarding-reminder:${userId}`).digest("hex");
}

export function isValidReminderToken(userId: string, token: string, secret: string): boolean {
  if (!secret || !userId || !token) return false;
  const expected = Buffer.from(reminderUnsubscribeToken(userId, secret), "hex");
  let given: Buffer;
  try {
    given = Buffer.from(token, "hex");
  } catch {
    return false;
  }
  return given.length === expected.length && timingSafeEqual(given, expected);
}
