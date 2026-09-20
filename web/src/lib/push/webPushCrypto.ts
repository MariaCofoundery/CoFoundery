import {
  createCipheriv,
  createECDH,
  createHmac,
  createPrivateKey,
  randomBytes,
  sign as signWithKey,
} from "node:crypto";

/**
 * Web Push von Hand.
 *
 * WARUM OHNE PAKET:
 *   Der Rest dieses Verzeichnisses spricht mit Resend auch ueber ein nacktes
 *   fetch. Hier kommt ein zweiter Grund dazu: Es gibt in diesem Projekt keine
 *   CI, die eine verwundbare Abhaengigkeit melden wuerde - eine Bibliothek im
 *   Versandweg fuer Benachrichtigungen bliebe still veraltet. Und der Teil,
 *   der schwer ist, ist PRUEFBAR: RFC 8291 enthaelt in Abschnitt 5 ein
 *   vollstaendiges Rechenbeispiel mit festen Schluesseln. Die Umsetzung hier
 *   wird in `webPushCrypto.test.ts` genau daran gemessen. Eine Bibliothek
 *   haette diesen Test nicht besser gemacht, nur unsichtbarer.
 *
 * ZWEI UNABHAENGIGE TEILE, die oft verwechselt werden:
 *
 *   1. VAPID (RFC 8292) beweist dem Push-Dienst, WER sendet. Ein signiertes
 *      Token im Authorization-Kopf. Hat mit dem Inhalt nichts zu tun.
 *
 *   2. Die Verschluesselung (RFC 8291) sorgt dafuer, dass der Push-Dienst den
 *      Inhalt NICHT lesen kann. Apple und Google leiten nur eine Kiste weiter,
 *      deren Schluessel nur das Geraet hat.
 *
 * Der zweite Teil ist der Grund, warum in einer Mitteilung ueberhaupt Text
 * stehen darf: Zwischen uns und dem Geraet liest niemand mit.
 */

const AS_PUBLIC_LENGTH = 65;
const RECORD_SIZE = 4096;

export function base64UrlToBuffer(value: string) {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  return Buffer.from(normalized, "base64");
}

export function bufferToBase64Url(value: Buffer | Uint8Array) {
  return Buffer.from(value).toString("base64url");
}

function hkdfExtract(salt: Buffer, ikm: Buffer) {
  return createHmac("sha256", salt).update(ikm).digest();
}

/** HKDF-Expand fuer Laengen bis 32 Byte - laenger braucht Web Push nicht. */
function hkdfExpand(prk: Buffer, info: Buffer, length: number) {
  if (length > 32) throw new Error("hkdf_expand_length");
  return createHmac("sha256", prk)
    .update(Buffer.concat([info, Buffer.from([1])]))
    .digest()
    .subarray(0, length);
}

function encodingInfo(label: string) {
  return Buffer.concat([Buffer.from(`Content-Encoding: ${label}`, "ascii"), Buffer.from([0])]);
}

export type PushSubscriptionKeys = {
  /** Der oeffentliche Schluessel des Geraets, base64url (65 Byte). */
  p256dh: string;
  /** Das Authentifizierungsgeheimnis aus der Subscription, base64url (16 Byte). */
  auth: string;
};

/**
 * Verschluesselt einen Inhalt fuer genau ein Geraet (aes128gcm, RFC 8291).
 *
 * `fixed` ersetzt Salz und Kurzschluessel durch feste Werte. Das ist
 * ausschliesslich fuer das Rechenbeispiel aus dem RFC da - im Betrieb ist
 * beides Zufall, und ein wiederverwendetes Salz waere ein Fehler mit Folgen.
 */
export function encryptWebPushPayload(
  payload: string | Buffer,
  keys: PushSubscriptionKeys,
  fixed?: { salt: Buffer; senderPrivateKey: Buffer }
) {
  const uaPublic = base64UrlToBuffer(keys.p256dh);
  const authSecret = base64UrlToBuffer(keys.auth);
  if (uaPublic.length !== AS_PUBLIC_LENGTH) throw new Error("bad_p256dh");

  const ecdh = createECDH("prime256v1");
  if (fixed) {
    ecdh.setPrivateKey(fixed.senderPrivateKey);
  } else {
    ecdh.generateKeys();
  }
  const asPublic = ecdh.getPublicKey();
  const salt = fixed ? fixed.salt : randomBytes(16);

  // Schritt 1: das gemeinsame Geheimnis aus beiden Schluesselpaaren.
  const sharedSecret = ecdh.computeSecret(uaPublic);

  // Schritt 2: Aus dem gemeinsamen Geheimnis und dem Authentifizierungs-
  // geheimnis wird das eigentliche Ausgangsmaterial. Die beiden oeffentlichen
  // Schluessel stehen dabei IM info-String - damit ist der Schluessel an
  // dieses eine Paar gebunden und laesst sich nicht auf ein anderes Geraet
  // umbiegen.
  const keyInfo = Buffer.concat([
    Buffer.from("WebPush: info", "ascii"),
    Buffer.from([0]),
    uaPublic,
    asPublic,
  ]);
  const ikm = hkdfExpand(hkdfExtract(authSecret, sharedSecret), keyInfo, 32);

  // Schritt 3: Schluessel und Nonce fuer die eigentliche Verschluesselung.
  const prk = hkdfExtract(salt, ikm);
  const contentEncryptionKey = hkdfExpand(prk, encodingInfo("aes128gcm"), 16);
  const nonce = hkdfExpand(prk, encodingInfo("nonce"), 12);

  // Schritt 4: Der Satz endet mit 0x02 - das ist die Markierung "letzter
  // Block". Ohne sie verwirft das Geraet den Inhalt stillschweigend.
  const plaintext = typeof payload === "string" ? Buffer.from(payload, "utf8") : payload;
  const record = Buffer.concat([plaintext, Buffer.from([2])]);

  const cipher = createCipheriv("aes-128-gcm", contentEncryptionKey, nonce);
  const ciphertext = Buffer.concat([cipher.update(record), cipher.final(), cipher.getAuthTag()]);

  // Schritt 5: Der Kopf traegt alles, was das Geraet zum Entschluesseln
  // braucht - Salz, Blockgroesse und unseren Kurzschluessel.
  const header = Buffer.alloc(5);
  header.writeUInt32BE(RECORD_SIZE, 0);
  header.writeUInt8(asPublic.length, 4);

  return Buffer.concat([salt, header, asPublic, ciphertext]);
}

export type VapidKeys = {
  /** base64url, 65 Byte unkomprimierter Punkt. */
  publicKey: string;
  /** base64url, 32 Byte Skalar. */
  privateKey: string;
  /** Eine erreichbare Adresse fuer den Push-Dienst, mailto: oder https:. */
  subject: string;
};

/** Der Ursprung des Endpunkts - mehr darf im Token nicht stehen. */
export function audienceForEndpoint(endpoint: string) {
  return new URL(endpoint).origin;
}

/**
 * Das VAPID-Token als Authorization-Kopf.
 *
 * Die Gueltigkeit ist auf zwoelf Stunden gesetzt. Das RFC erlaubt bis zu 24;
 * kuerzer ist hier nichts wert, weil das Token pro Versand neu entsteht, und
 * laenger waere ein laenger gueltiger Nachweis ohne Gegenwert.
 */
export function buildVapidAuthorization(
  endpoint: string,
  keys: VapidKeys,
  nowSeconds = Math.floor(Date.now() / 1000)
) {
  const publicKey = base64UrlToBuffer(keys.publicKey);
  const privateKey = base64UrlToBuffer(keys.privateKey);
  if (publicKey.length !== AS_PUBLIC_LENGTH) throw new Error("bad_vapid_public_key");
  if (privateKey.length !== 32) throw new Error("bad_vapid_private_key");

  const header = { typ: "JWT", alg: "ES256" };
  const body = {
    aud: audienceForEndpoint(endpoint),
    exp: nowSeconds + 12 * 60 * 60,
    sub: keys.subject,
  };

  const signingInput = [
    Buffer.from(JSON.stringify(header), "utf8").toString("base64url"),
    Buffer.from(JSON.stringify(body), "utf8").toString("base64url"),
  ].join(".");

  // Aus den rohen Bytes wird ein Schluessel ueber JWK - der Umweg ueber DER
  // und ASN.1 waere hier nur eine zweite Gelegenheit fuer Fehler. x und y sind
  // die beiden Haelften des oeffentlichen Punkts hinter dem Praefix 0x04.
  const key = createPrivateKey({
    key: {
      kty: "EC",
      crv: "P-256",
      d: privateKey.toString("base64url"),
      x: publicKey.subarray(1, 33).toString("base64url"),
      y: publicKey.subarray(33, 65).toString("base64url"),
    },
    format: "jwk",
  });

  // ieee-p1363 ist r||s als 64 Byte. Der Standardwert von Node waere DER, und
  // damit verwerfen alle Push-Dienste das Token.
  const signature = signWithKey("sha256", Buffer.from(signingInput, "ascii"), {
    key,
    dsaEncoding: "ieee-p1363",
  });

  return {
    token: `${signingInput}.${signature.toString("base64url")}`,
    authorization: `vapid t=${signingInput}.${signature.toString("base64url")}, k=${keys.publicKey}`,
  };
}
