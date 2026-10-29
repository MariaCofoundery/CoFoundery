import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { zipSync, unzipSync, strToU8 } from "fflate";
import { docxXmlToText } from "@/features/profile/docxText";

const source = (path: string) => readFileSync(path, "utf8");

test("Word-Text: Absätze, Zeilenumbrüche, Tabs und Sonderzeichen", () => {
  const xml =
    '<w:document><w:body>' +
    '<w:p><w:r><w:t>Maria Muster</w:t></w:r></w:p>' +
    '<w:p><w:r><w:t xml:space="preserve">Vertrieb </w:t></w:r><w:r><w:t>&amp; Marketing</w:t></w:r><w:r><w:tab/></w:r><w:r><w:t>2019</w:t></w:r></w:p>' +
    '<w:p><w:r><w:t>Zeile 1</w:t><w:br/><w:t>Zeile 2 &#228;&#x00F6;</w:t></w:r></w:p>' +
    '</w:body></w:document>';
  assert.equal(docxXmlToText(xml), "Maria Muster\nVertrieb & Marketing 2019\nZeile 1\nZeile 2 äö");
});

test("Word-Text: ein echtes Zip mit word/document.xml wird gelesen", () => {
  const zip = zipSync({ "word/document.xml": strToU8("<w:p><w:r><w:t>Key Account</w:t></w:r></w:p>"), "other.xml": strToU8("<x/>") });
  const files = unzipSync(zip, { filter: (entry) => entry.name === "word/document.xml" });
  assert.deepEqual(Object.keys(files), ["word/document.xml"]);
  assert.equal(docxXmlToText(new TextDecoder().decode(files["word/document.xml"])), "Key Account");
});

test("die Datei bleibt im Browser: kein Upload, PDF/Word-Bibliotheken nur nachgeladen", () => {
  const code = source("src/features/profile/cvFileText.ts").replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");
  assert.doesNotMatch(code, /fetch\(|supabase|FormData|XMLHttpRequest|sendBeacon/);
  assert.match(code, /await import\("pdfjs-dist\/legacy\/build\/pdf\.mjs"\)/);
  assert.match(code, /await import\("fflate"\)/);
  assert.doesNotMatch(code, /^import .*(pdfjs|fflate)/m);
  assert.match(code, /CV_FILE_MAX_BYTES/);
});

test("das Feld nutzt den Dateileser und nennt vier Fehlerfälle", () => {
  const field = source("src/features/profile/CvImportField.tsx");
  assert.match(field, /readCvFile\(file\)/);
  for (const key of ["fileUnsupported", "fileTooBig", "fileNoText", "fileUnreadable", "fileReading"]) {
    assert.match(field, new RegExp(`copy\\.${key}`), key);
  }
  for (const locale of ["de", "en"]) {
    const cv = (JSON.parse(source(`messages/${locale}/capability.json`)) as { identity: { cv: Record<string, string> } }).identity.cv;
    for (const key of ["fileUnsupported", "fileTooBig", "fileNoText", "fileUnreadable", "fileReading"]) {
      assert.ok(cv[key] && cv[key].length > 10, `${locale}.${key}`);
    }
  }
});
