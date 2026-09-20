import assert from "node:assert/strict";
import {
  createDecipheriv,
  createECDH,
  createHmac,
  createPublicKey,
  verify as verifyWithKey,
} from "node:crypto";
import test from "node:test";

import {
  audienceForEndpoint,
  base64UrlToBuffer,
  bufferToBase64Url,
  buildVapidAuthorization,
  encryptWebPushPayload,
} from "@/lib/push/webPushCrypto";

/**
 * Die Verschluesselung fuer Web Push, gemessen am Rechenbeispiel des Standards.
 *
 * RFC 8291 enthaelt in Abschnitt 5 einen vollstaendigen Durchgang mit festen
 * Schluesseln und dem erwarteten Ergebnis. Das ist der Grund, warum diese
 * Rechnung hier von Hand stehen darf statt in einer Abhaengigkeit: Sie ist
 * nicht "hoffentlich richtig", sondern nachgerechnet.
 *
 * Ein Fehler hier faellt im Betrieb NICHT auf: Die Push-Dienste nehmen einen
 * falsch verschluesselten Inhalt mit 201 an, und das Geraet verwirft ihn
 * stillschweigend. Es gibt keine Fehlermeldung, nur ausbleibende Mitteilungen.
 */

// https://www.rfc-editor.org/rfc/rfc8291#section-5
const RFC8291 = {
  plaintext: "When I grow up, I want to be a watermelon",
  uaPublic: "BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4",
  uaPrivate: "q1dXpw3UpT5VOmu_cf_v6ih07Aems3njxI-JWgLcM94",
  authSecret: "BTBZMqHH6r4Tts7J_aSIgg",
  asPublic: "BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8",
  asPrivate: "yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw",
  salt: "DGv6ra1nlYgDCS1FRnbzlw",
  body:
    "DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27ml" +
    "mlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPT" +
    "pK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN",
};

test("das Rechenbeispiel aus RFC 8291 kommt Byte fuer Byte heraus", () => {
  const encrypted = encryptWebPushPayload(
    RFC8291.plaintext,
    { p256dh: RFC8291.uaPublic, auth: RFC8291.authSecret },
    {
      salt: base64UrlToBuffer(RFC8291.salt),
      senderPrivateKey: base64UrlToBuffer(RFC8291.asPrivate),
    }
  );

  assert.equal(bufferToBase64Url(encrypted), RFC8291.body);
});

test("die Laengen im Kopf stimmen mit dem Aufbau ueberein", () => {
  // 16 Byte Salz, 4 Byte Blockgroesse, 1 Byte Laenge, 65 Byte Schluessel.
  const encrypted = encryptWebPushPayload(
    RFC8291.plaintext,
    { p256dh: RFC8291.uaPublic, auth: RFC8291.authSecret },
    {
      salt: base64UrlToBuffer(RFC8291.salt),
      senderPrivateKey: base64UrlToBuffer(RFC8291.asPrivate),
    }
  );

  assert.equal(encrypted.readUInt32BE(16), 4096, "die Blockgroesse");
  assert.equal(encrypted.readUInt8(20), 65, "die Laenge des Kurzschluessels");
  assert.equal(
    bufferToBase64Url(encrypted.subarray(21, 86)),
    RFC8291.asPublic,
    "der Kurzschluessel steht im Kopf"
  );
  // Inhalt (41) + Markierung (1) + Siegel (16) hinter dem 86 Byte langen Kopf.
  assert.equal(encrypted.length, 86 + RFC8291.plaintext.length + 1 + 16);
});

test("zwei Versendungen benutzen nie dasselbe Salz", () => {
  // Ein wiederverwendetes Salz mit demselben Schluessel ist der klassische
  // Bruch bei AES-GCM. Im Betrieb kommt beides aus dem Zufall - das ist die
  // Voreinstellung, und dieser Test haelt sie fest.
  const keys = { p256dh: RFC8291.uaPublic, auth: RFC8291.authSecret };
  const first = encryptWebPushPayload("hallo", keys);
  const second = encryptWebPushPayload("hallo", keys);

  assert.notDeepEqual(first.subarray(0, 16), second.subarray(0, 16), "gleiches Salz");
  assert.notDeepEqual(first.subarray(21, 86), second.subarray(21, 86), "gleicher Kurzschluessel");
  assert.notDeepEqual(first, second);
});

/**
 * Die Gegenrichtung - so, wie das Geraet es tut.
 *
 * Absichtlich unabhaengig von der Umsetzung geschrieben und nicht aus ihr
 * heraus aufgerufen: Sonst wuerde ein falscher info-String in beiden
 * Richtungen gleich falsch sein und der Test waere blind dafuer.
 */
function decryptAsDevice(body: Buffer, uaPrivate: Buffer) {
  const salt = body.subarray(0, 16);
  const keyLength = body.readUInt8(20);
  const asPublic = body.subarray(21, 21 + keyLength);
  const ciphertext = body.subarray(21 + keyLength);

  const ua = createECDH("prime256v1");
  ua.setPrivateKey(uaPrivate);
  const sharedSecret = ua.computeSecret(asPublic);

  const hmac = (key: Buffer, data: Buffer) => createHmac("sha256", key).update(data).digest();
  const expand = (prk: Buffer, info: Buffer, length: number) =>
    hmac(prk, Buffer.concat([info, Buffer.from([1])])).subarray(0, length);

  const keyInfo = Buffer.concat([
    Buffer.from("WebPush: info", "ascii"),
    Buffer.from([0]),
    ua.getPublicKey(),
    asPublic,
  ]);
  const ikm = expand(hmac(base64UrlToBuffer(RFC8291.authSecret), sharedSecret), keyInfo, 32);
  const prk = hmac(salt, ikm);
  const key = expand(prk, Buffer.concat([Buffer.from("Content-Encoding: aes128gcm", "ascii"), Buffer.from([0])]), 16);
  const nonce = expand(prk, Buffer.concat([Buffer.from("Content-Encoding: nonce", "ascii"), Buffer.from([0])]), 12);

  const decipher = createDecipheriv("aes-128-gcm", key, nonce);
  decipher.setAuthTag(ciphertext.subarray(ciphertext.length - 16));
  const record = Buffer.concat([
    decipher.update(ciphertext.subarray(0, ciphertext.length - 16)),
    decipher.final(),
  ]);

  // Die letzte Markierung gehoert nicht zum Inhalt.
  assert.equal(record.readUInt8(record.length - 1), 2, "die Markierung des letzten Blocks fehlt");
  return record.subarray(0, record.length - 1).toString("utf8");
}

test("das Geraet kann entschluesseln, was wir verschluesseln", () => {
  const uaPrivate = base64UrlToBuffer(RFC8291.uaPrivate);
  const ua = createECDH("prime256v1");
  ua.setPrivateKey(uaPrivate);
  assert.equal(
    bufferToBase64Url(ua.getPublicKey()),
    RFC8291.uaPublic,
    "der oeffentliche Schluessel des Beispiels passt zum privaten"
  );

  // Nicht nur das eine Beispiel, sondern der Weg: mit zufaelligem Salz,
  // zufaelligem Kurzschluessel und einem Inhalt, wie er hier wirklich
  // verschickt wird - Umlaute eingeschlossen.
  const payload = JSON.stringify({
    title: "Neue Nachricht",
    body: "Jemand hat dir geschrieben - Grüße aus München",
    url: "/messages/8f3a",
  });
  const encrypted = encryptWebPushPayload(payload, {
    p256dh: RFC8291.uaPublic,
    auth: RFC8291.authSecret,
  });

  assert.equal(decryptAsDevice(encrypted, uaPrivate), payload);
  // Und das Beispiel selbst, von der anderen Seite gelesen.
  assert.equal(
    decryptAsDevice(base64UrlToBuffer(RFC8291.body), uaPrivate),
    RFC8291.plaintext
  );
});

test("ein falsch langer Geraeteschluessel wird abgewiesen, nicht verschickt", () => {
  // Eine Zeile in der Datenbank kann alt oder halb sein. Dann soll der Versand
  // abbrechen und nicht ein Paket bauen, das das Geraet verwirft.
  assert.throws(
    () => encryptWebPushPayload("hallo", { p256dh: "AAAA", auth: RFC8291.authSecret }),
    /bad_p256dh/
  );
});

// ---------------------------------------------------------------------------
// VAPID
// ---------------------------------------------------------------------------
test("das VAPID-Token ist mit dem eigenen Schluessel nachpruefbar", () => {
  // Erzeugt wie `npx web-push generate-vapid-keys` es tut: ein P-256-Paar.
  const keyPair = createECDH("prime256v1");
  keyPair.generateKeys();
  const keys = {
    publicKey: bufferToBase64Url(keyPair.getPublicKey()),
    privateKey: bufferToBase64Url(keyPair.getPrivateKey()),
    subject: "mailto:hallo@cofoundery.de",
  };

  const endpoint = "https://web.push.apple.com/abc123?token=x";
  const { token, authorization } = buildVapidAuthorization(endpoint, keys, 1_700_000_000);

  const [rawHeader, rawBody, rawSignature] = token.split(".");
  assert.deepEqual(JSON.parse(base64UrlToBuffer(rawHeader).toString("utf8")), {
    typ: "JWT",
    alg: "ES256",
  });
  const body = JSON.parse(base64UrlToBuffer(rawBody).toString("utf8")) as Record<string, unknown>;
  // Nur der Ursprung, nicht der ganze Endpunkt: Der Endpunkt ist ein
  // Geheimnis, und im Token hat er nichts zu suchen.
  assert.equal(body.aud, "https://web.push.apple.com");
  assert.equal(body.sub, "mailto:hallo@cofoundery.de");
  assert.equal(body.exp, 1_700_000_000 + 12 * 60 * 60);

  // Die Unterschrift muss r||s sein, 64 Byte. Mit der Voreinstellung von Node
  // waere sie DER-kodiert und laenger - und jeder Push-Dienst lehnte ab.
  const signature = base64UrlToBuffer(rawSignature);
  assert.equal(signature.length, 64);

  const publicKey = keyPair.getPublicKey();
  const verifyKey = createPublicKey({
    key: {
      kty: "EC",
      crv: "P-256",
      x: publicKey.subarray(1, 33).toString("base64url"),
      y: publicKey.subarray(33, 65).toString("base64url"),
    },
    format: "jwk",
  });
  assert.ok(
    verifyWithKey(
      "sha256",
      Buffer.from(`${rawHeader}.${rawBody}`, "ascii"),
      { key: verifyKey, dsaEncoding: "ieee-p1363" },
      signature
    ),
    "die Unterschrift haelt der eigenen Pruefung nicht stand"
  );

  // Der Kopf traegt Token UND oeffentlichen Schluessel - ohne k= weiss der
  // Dienst nicht, gegen welchen Schluessel er pruefen soll.
  assert.match(authorization, /^vapid t=[\w-]+\.[\w-]+\.[\w-]+, k=[\w-]+$/);
  assert.ok(authorization.endsWith(keys.publicKey));
});

test("der Ursprung kommt aus dem Endpunkt und wird nicht geraten", () => {
  assert.equal(audienceForEndpoint("https://fcm.googleapis.com/fcm/send/abc"), "https://fcm.googleapis.com");
  assert.equal(audienceForEndpoint("https://updates.push.services.mozilla.com/wpush/v2/x"), "https://updates.push.services.mozilla.com");
});

test("ein unbrauchbarer VAPID-Schluessel faellt beim Bauen auf", () => {
  assert.throws(
    () =>
      buildVapidAuthorization("https://web.push.apple.com/x", {
        publicKey: "AAAA",
        privateKey: "AAAA",
        subject: "mailto:x@example.com",
      }),
    /bad_vapid_public_key/
  );
});
