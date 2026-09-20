/**
 * Kann dieses Geraet Mitteilungen - und wenn nicht, warum.
 *
 * Reine Funktionen, damit die Fallunterscheidung pruefbar ist, ohne einen
 * Browser zu haben. Der interessante Fall ist nicht "kann oder kann nicht",
 * sondern der dritte: Auf einem iPhone gibt es Web Push AUSSCHLIESSLICH fuer
 * Seiten, die auf dem Startbildschirm liegen und eigenstaendig starten (seit
 * iOS 16.4). Im Safari-Tab fehlen die Schnittstellen einfach - ohne eigenen
 * Hinweis stuende dort "dieser Browser kann das nicht", obwohl er es kann,
 * sobald die Seite auf dem Startbildschirm liegt.
 */

export type PushAvailability =
  /** Es kann losgehen. */
  | "supported"
  /** iPhone oder iPad im Browser-Tab: erst auf den Startbildschirm legen. */
  | "needs_home_screen"
  /** Der Browser hat die Schnittstellen nicht. */
  | "unsupported"
  /** Wir haben die Schluessel nicht - dann gibt es den Kanal noch nicht. */
  | "not_configured";

export function detectAppleMobile(userAgent: string, maxTouchPoints = 0) {
  if (/iPad|iPhone|iPod/.test(userAgent)) return true;
  // Ein iPad ab iPadOS 13 gibt sich als Macintosh aus. Ein Mac hat keine
  // Mehrfachberuehrung, ein iPad schon - das ist die uebliche Unterscheidung.
  return /Macintosh/.test(userAgent) && maxTouchPoints > 1;
}

export function resolvePushAvailability(input: {
  hasVapidKey: boolean;
  hasServiceWorker: boolean;
  hasPushManager: boolean;
  hasNotification: boolean;
  isAppleMobile: boolean;
  isStandalone: boolean;
}): PushAvailability {
  // Zuerst unsere eigene Seite: Ohne Schluessel ist alles andere gleichgueltig,
  // und jemanden nach einer Erlaubnis zu fragen, die wir nicht einloesen
  // koennen, waere die schlechteste Reihenfolge.
  if (!input.hasVapidKey) return "not_configured";

  const hasApis = input.hasServiceWorker && input.hasPushManager && input.hasNotification;
  if (hasApis) return "supported";

  // Der Hinweis kommt VOR der Absage: Auf dem iPhone fehlen die
  // Schnittstellen im Tab, nicht im Geraet.
  if (input.isAppleMobile && !input.isStandalone) return "needs_home_screen";

  return "unsupported";
}

/**
 * Die Push-Dienste, an die wir zustellen.
 *
 * WARUM EINE LISTE UND NICHT "IRGENDEINE HTTPS-ADRESSE":
 *   Der Endpunkt kommt vom Browser, wird bei uns gespeichert, und UNSER SERVER
 *   ruft ihn spaeter auf. Eine frei waehlbare Adresse waere damit ein Weg, den
 *   Server fremde Adressen anzusprechen zu lassen - mit einem Inhalt, den
 *   niemand lesen kann, und einer Antwort, die niemand ansieht, aber eben doch
 *   ein Aufruf von innen nach draussen.
 *
 *   Der Preis ist ein Browser, dessen Dienst hier fehlt und der deshalb keine
 *   Mitteilungen einrichten kann. Deshalb gibt dieser Fall eine eigene Meldung,
 *   die sagt, was zu tun ist - und nicht "hat nicht geklappt".
 *
 * Abgedeckt: Safari (Apple), Chrome und alles auf Chromium (Google), Firefox
 * (Mozilla), Edge (Microsoft).
 */
export const PUSH_SERVICE_HOSTS = [
  "push.apple.com",
  "fcm.googleapis.com",
  "android.googleapis.com",
  "push.services.mozilla.com",
  "notify.windows.com",
] as const;

export function isKnownPushEndpoint(endpoint: string) {
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return false;
  }

  if (url.protocol !== "https:") return false;

  return PUSH_SERVICE_HOSTS.some(
    (host) => url.hostname === host || url.hostname.endsWith(`.${host}`)
  );
}

/**
 * Der oeffentliche VAPID-Schluessel als Bytes.
 *
 * `applicationServerKey` nimmt keinen Text, sondern die 65 rohen Bytes. Und
 * base64url ist nicht base64: atob kennt die beiden getauschten Zeichen nicht.
 */
export function base64UrlToBytes(value: string) {
  const padded = value.padEnd(value.length + ((4 - (value.length % 4)) % 4), "=");
  const binary = atob(padded.replaceAll("-", "+").replaceAll("_", "/"));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

export function bytesToBase64Url(buffer: ArrayBuffer | null) {
  if (!buffer) return null;
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}
