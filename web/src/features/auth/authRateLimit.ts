/**
 * Was Supabase meint, wenn es beim Mailversand "429" sagt.
 *
 * Dieselbe Antwort (`over_email_send_rate_limit`) steht fuer ZWEI verschiedene Dinge, und sie verlangen
 * verschiedene Auskuenfte an die Person:
 *
 *   cooldown  Fuer diese Adresse ging gerade erst eine Mail raus ("you can only request this after 60 seconds").
 *             Warten hilft nach Sekunden - und die letzte Mail gilt noch.
 *   hourly    Das Mail-Kontingent des GANZEN Projekts ist fuer diese Stunde aufgebraucht ("email rate limit
 *             exceeded"). Es betrifft alle, die sich anmelden wollen - nicht die einzelne Person. Das ist keine
 *             Frage des Verhaltens, sondern der Einstellung (Absender/SMTP und Limit im Supabase-Projekt).
 *
 * Geprueft wird Status und Code, die Unterscheidung kommt aus dem Text ("after N seconds"), weil es dafuer
 * keinen eigenen Code gibt.
 */
export type AuthRateLimit = { kind: "cooldown"; seconds: number } | { kind: "hourly" };

type AuthLikeError = { status?: number; code?: string; message?: string };

export function authRateLimit(error: AuthLikeError | null | undefined): AuthRateLimit | null {
  if (!error) return null;
  const message = error.message ?? "";
  const limited = error.status === 429 || error.code === "over_email_send_rate_limit" || /rate limit/i.test(message);
  if (!limited) return null;
  const seconds = /after (\d+) seconds?/i.exec(message)?.[1];
  return seconds ? { kind: "cooldown", seconds: Number(seconds) } : { kind: "hourly" };
}
