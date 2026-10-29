import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { isProductChromePath } from "@/features/navigation/productChromePath";

const source = (path: string) => readFileSync(path, "utf8");
const codeOnly = (path: string) =>
  source(path)
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

const INBOX = "src/app/(product)/messages/page.tsx";
const WELCOME = "src/app/(product)/messages/willkommen/page.tsx";

test("Marias Begrüßung steht im Postfach, für alle und auch ohne Gespräch", () => {
  const inbox = codeOnly(INBOX);
  assert.match(inbox, /href="\/messages\/willkommen"/);
  // Vor der Leer-/Listenverzweigung, damit sie immer da ist.
  assert.ok(inbox.indexOf("/messages/willkommen") < inbox.indexOf("conversations.length === 0 ? ("));
  assert.equal(isProductChromePath("/messages/willkommen"), true);
});

test("die Begrüßung ist ein fester Text: kein Zähler, keine Antwort, keine Mitteilung", () => {
  const page = codeOnly(WELCOME);
  assert.match(page, /requireSignedInForMessages\("\/messages\/willkommen"\)/);
  assert.match(page, /<WelcomeLetter/);
  assert.doesNotMatch(page, /send|rpc|insert|notify|ConnectSubmitButton|unread/i);
  assert.doesNotMatch(codeOnly(INBOX).split("/messages/willkommen")[1].split("conversations.length === 0")[0], /unread/i);
});
