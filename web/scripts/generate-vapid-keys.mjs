#!/usr/bin/env node
/**
 * Erzeugt ein VAPID-Schluesselpaar fuer Web Push.
 *
 *   node scripts/generate-vapid-keys.mjs
 *
 * Dasselbe, was `npx web-push generate-vapid-keys` tut - nur ohne Paket: Es
 * ist ein P-256-Schluesselpaar, und node:crypto kann das seit immer.
 *
 * EINMAL ERZEUGEN, DANN LIEGEN LASSEN.
 *   Der oeffentliche Schluessel steckt in jeder Anmeldung, die ein Browser bei
 *   seinem Push-Dienst hinterlegt. Ein neues Paar macht alle bestehenden
 *   Anmeldungen ungueltig - jedes Geraet muesste sich neu einschalten, ohne es
 *   zu merken. Der Schluessel gehoert deshalb in die Umgebung und nicht ins
 *   Repository, und er wird nicht "zur Sicherheit" gewechselt.
 *
 * Der private Schluessel darf NIEMALS ein NEXT_PUBLIC_-Praefix bekommen. Damit
 * laege er im Bundle, das jeder Browser herunterlaedt.
 */

import { createECDH } from "node:crypto";

const key = createECDH("prime256v1");
key.generateKeys();

const publicKey = key.getPublicKey().toString("base64url");
const privateKey = key.getPrivateKey().toString("base64url");

console.log(`
Diese drei Werte in die Umgebung (Vercel: Settings -> Environment Variables),
danach einmal neu bauen - NEXT_PUBLIC_ wird beim Bauen eingesetzt:

NEXT_PUBLIC_VAPID_PUBLIC_KEY=${publicKey}
VAPID_PRIVATE_KEY=${privateKey}
VAPID_SUBJECT=mailto:DEINE-ADRESSE@example.com

VAPID_SUBJECT ist eine Stelle, an die sich der Push-Dienst wenden kann, wenn
etwas auffaellt. Ohne Angabe wird RESEND_FROM_EMAIL verwendet.
`);
