import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const codeOnly = (path: string) =>
  readFileSync(path, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, " ");

test("die Karten der Unternehmen und Projekte führen sichtbar zum ganzen Eintrag", () => {
  const page = codeOnly("src/app/(product)/connect/ventures/page.tsx");
  assert.match(page, /ventures\.openDetails/);
  assert.match(page, /href=\{`\/connect\/ventures\/\$\{venture\.id\}`\}[\s\S]*?ventures\.openDetails/);
});
