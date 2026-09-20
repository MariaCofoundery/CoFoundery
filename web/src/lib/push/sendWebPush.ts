import "server-only";

import {
  buildVapidAuthorization,
  encryptWebPushPayload,
  type VapidKeys,
} from "@/lib/push/webPushCrypto";

/**
 * Der Versand an ein Geraet.
 *
 * Die drei Schluessel muessen als Umgebungsvariablen gesetzt sein. Fehlen sie,
 * wird nichts verschickt und nichts geworfen - wie beim Mailversand ohne
 * Resend-Schluessel. Eine Benachrichtigung ist eine Beigabe; ihr Fehlen darf
 * keine Handlung scheitern lassen.
 *
 * VAPID_PUBLIC_KEY steht als NEXT_PUBLIC_ in der Umgebung, weil der Browser
 * ihn zum Anmelden braucht. Das ist kein Versehen: Er ist oeffentlich, genau
 * dafuer ist er da. Der private Schluessel ist es nicht und darf niemals ein
 * NEXT_PUBLIC_-Praefix bekommen - damit laege er im Bundle.
 */

export type PushTarget = { endpoint: string; p256dh: string; auth: string };

export type PushResult =
  | { ok: true }
  /** `gone`: Die Subscription gilt nicht mehr. Die Zeile kann weg. */
  | { ok: false; gone: boolean; error: string };

export function getVapidKeys(): VapidKeys | null {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  if (!publicKey || !privateKey) return null;

  // Der Push-Dienst will eine Stelle, an die er sich wenden kann, wenn etwas
  // auffaellt. Ohne Angabe fallen manche Dienste auf 400 zurueck.
  const subject =
    process.env.VAPID_SUBJECT?.trim() ||
    (process.env.RESEND_FROM_EMAIL?.trim() ? `mailto:${process.env.RESEND_FROM_EMAIL.trim()}` : null);
  if (!subject) return null;

  return { publicKey, privateKey, subject };
}

/**
 * Verschickt einen Inhalt an genau ein Geraet.
 *
 * `ttlSeconds` sagt dem Push-Dienst, wie lange er es aufbewahren soll, wenn
 * das Geraet aus ist. Einen Tag: Was aelter ist, erfaehrt man ohnehin besser
 * beim naechsten Oeffnen als aus einer Mitteilung von gestern.
 */
export async function sendWebPush(
  target: PushTarget,
  payload: unknown,
  ttlSeconds = 24 * 60 * 60
): Promise<PushResult> {
  const keys = getVapidKeys();
  if (!keys) return { ok: false, gone: false, error: "missing_vapid_keys" };

  let body: Buffer;
  let authorization: string;
  try {
    body = encryptWebPushPayload(JSON.stringify(payload), {
      p256dh: target.p256dh,
      auth: target.auth,
    });
    authorization = buildVapidAuthorization(target.endpoint, keys).authorization;
  } catch (error) {
    // Eine unbrauchbare Zeile in der Datenbank ist dauerhaft unbrauchbar.
    return {
      ok: false,
      gone: true,
      error: error instanceof Error ? error.message : "encrypt_failed",
    };
  }

  let response: Response;
  try {
    response = await fetch(target.endpoint, {
      method: "POST",
      headers: {
        authorization,
        "content-encoding": "aes128gcm",
        "content-type": "application/octet-stream",
        ttl: String(ttlSeconds),
        // Normal heisst: zustellen, wenn es passt - nicht das Geraet wecken.
        urgency: "normal",
      },
      body: new Uint8Array(body),
    });
  } catch {
    return { ok: false, gone: false, error: "network" };
  }

  if (response.status >= 200 && response.status < 300) return { ok: true };

  // 404 und 410 sind die Antwort der Push-Dienste auf eine Subscription, die
  // es nicht mehr gibt - geloeschte App, entzogene Erlaubnis, neuer Browser.
  // Das ist kein Fehler, sondern eine Abmeldung, die uns niemand gesagt hat.
  const gone = response.status === 404 || response.status === 410;
  return { ok: false, gone, error: `push_${response.status}` };
}
