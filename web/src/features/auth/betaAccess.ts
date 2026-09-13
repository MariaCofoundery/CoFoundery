// Hier standen BETA_ACCESS_COOKIE_NAME und hasBetaAccessCookie: ein Cookie,
// das nie gesetzt und nie gelesen wurde. Ein Zugangsschutz, den es nur dem
// Namen nach gab, ist schlimmer als keiner - man haelt eine Tuer fuer
// verschlossen. Der Code wird an genau einer Stelle geprueft, in /start,
// serverseitig beim Absenden.

export const BETA_ACCESS_REQUEST_EMAIL =
  process.env.RESEND_REPLY_TO_EMAIL?.trim() || "hello@cofoundery.de";

function normalizeCode(value: string) {
  return value.trim().toLowerCase();
}

export function getBetaAccessRequestHref() {
  const subject = encodeURIComponent("Beta-Zugang anfragen");
  const body = encodeURIComponent(`Hallo Cofoundery-Team,

ich würde gerne Zugang zur Cofoundery-Beta anfragen.

Kurz zu mir / uns:
[bitte ergänzen]

Viele Grüße`);
  return `mailto:${BETA_ACCESS_REQUEST_EMAIL}?subject=${subject}&body=${body}`;
}

export function getAllowedBetaCodes() {
  const configuredCodes = (process.env.BETA_ACCESS_CODES ?? "")
    .split(/[\n,]+/)
    .map((value) => normalizeCode(value))
    .filter(Boolean);

  return configuredCodes;
}

export function isValidBetaAccessCode(value: string) {
  const normalized = normalizeCode(value);
  if (!normalized) return false;
  return getAllowedBetaCodes().includes(normalized);
}

/**
 * Ob von dieser Seite aus ein Konto entstehen darf.
 *
 * Der Zugang laeuft normalerweise ueber /start mit Code. Eine Einladung ist
 * der zweite Weg: Wer eingeladen wurde, hat noch kein Konto und muss eines
 * bekommen koennen, ohne einen Code zu haben.
 *
 * Hier standen bis 13.09.2026 ZWEI Listen, und keine davon stimmte:
 *
 *   In der Login-Seite eine enge (`/join/continue`, `/team-invite/`,
 *   `/advisor/invite/continue`). Sie war die wirksame - und ihr fehlten drei
 *   Wege, die es wirklich gibt: `/join`, `/join/start?invitationId=…` und
 *   `/join/welcome?invitationId=…`. Wer darueber kam, bekam ein
 *   Anmeldeformular, das sein Konto still nicht anlegte und trotzdem "wir
 *   senden dir einen Link" sagte. Es kam nie eine Mail.
 *
 *   Hier eine breite, die niemand aufrief. Sie hatte die Pfade richtig, aber
 *   zusaetzlich die Regel "irgendein token- oder invitationId-Parameter
 *   genuegt". Das waere ein Loch gewesen: `/login?next=/dashboard?token=x`
 *   haette jedem die Selbstregistrierung erlaubt. Die Regel ist bewusst nicht
 *   uebernommen.
 *
 * Jetzt eine Liste, an einem Ort, mit Test.
 */
const ACCOUNT_CREATING_PREFIXES = [
  "/join",
  "/team-invite/",
  "/advisor/invite/continue",
];

export function canCreateAccountFromPath(nextPath: string) {
  const normalized = nextPath.trim();
  // Nur interne Pfade. `//example.com` waere sonst ein fremder Host.
  if (!normalized.startsWith("/") || normalized.startsWith("//")) return false;

  let path: string;
  try {
    path = new URL(normalized, "https://cofoundery.local").pathname;
  } catch {
    return false;
  }

  return ACCOUNT_CREATING_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(prefix.endsWith("/") ? prefix : `${prefix}/`)
  );
}
