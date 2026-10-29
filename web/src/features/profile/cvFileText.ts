/**
 * Text aus einer Lebenslauf-Datei - im Browser.
 *
 * Die Datei verlaesst das Geraet nicht: PDF und Word werden hier gelesen, nicht
 * auf einem Server. Die schweren Bibliotheken (pdf.js, fflate) werden erst
 * geladen, wenn jemand eine solche Datei waehlt - wer nur Text einfuegt,
 * zahlt dafuer nichts.
 *
 * Grenzen mit Absicht: ein Lebenslauf ist kein Buch. Zu grosse Dateien und zu
 * viele Seiten werden abgelehnt beziehungsweise gekappt, damit ein falsch
 * gewaehltes Dokument den Browser nicht festsetzt.
 */
import { docxXmlToText } from "@/features/profile/docxText";

export const CV_FILE_MAX_BYTES = 10 * 1024 * 1024;
const PDF_MAX_PAGES = 15;
/** Entpackt hoechstens so viel - Schutz vor einer Zip-Bombe. */
const DOCX_MAX_XML_BYTES = 20 * 1024 * 1024;

export type CvFileResult =
  | { ok: true; text: string }
  | { ok: false; reason: "unsupported" | "tooBig" | "noText" | "unreadable" };

const isPdf = (file: File) => /\.pdf$/i.test(file.name) || file.type === "application/pdf";
const isDocx = (file: File) =>
  /\.docx$/i.test(file.name) ||
  file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const isPlain = (file: File) => /\.(txt|md|markdown)$/i.test(file.name) || file.type.startsWith("text/");

async function readPdf(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  try {
    const pages = Math.min(doc.numPages, PDF_MAX_PAGES);
    const out: string[] = [];
    for (let number = 1; number <= pages; number += 1) {
      const page = await doc.getPage(number);
      const content = await page.getTextContent();
      let line = "";
      let prevEnd = 0;
      let prevY = 0;
      for (const item of content.items) {
        if (!("str" in item)) continue;
        const [, , , , x, y] = item.transform as number[];
        const size = Math.max(item.height, 1);
        // pdf.js liefert oft Stuecke mitten im Wort (Ligaturen, Kerning). Ein
        // Leerzeichen kommt nur dazu, wenn zwischen den Stuecken wirklich eine
        // Luecke ist; eine neue Zeile, wenn die Grundlinie springt.
        if (line.length > 0) {
          if (Math.abs(y - prevY) > size * 0.5) line += line.endsWith("\n") ? "" : "\n";
          else if (x - prevEnd > size * 0.15 && !/\s$/.test(line) && !/^\s/.test(item.str)) line += " ";
        }
        line += item.str;
        if (item.hasEOL) line += "\n";
        prevEnd = x + item.width;
        prevY = y;
      }
      out.push(line);
    }
    return out.join("\n").replace(/[ \t]+\n/g, "\n").replace(/[ \t]{2,}/g, " ").trim();
  } finally {
    void doc.destroy();
  }
}

async function readDocx(file: File): Promise<string> {
  const { unzipSync } = await import("fflate");
  const files = unzipSync(new Uint8Array(await file.arrayBuffer()), {
    filter: (entry) => entry.name === "word/document.xml" && entry.originalSize <= DOCX_MAX_XML_BYTES,
  });
  const xml = files["word/document.xml"];
  if (!xml) throw new Error("no document.xml");
  return docxXmlToText(new TextDecoder("utf-8").decode(xml));
}

export async function readCvFile(file: File): Promise<CvFileResult> {
  if (!isPdf(file) && !isDocx(file) && !isPlain(file)) return { ok: false, reason: "unsupported" };
  if (file.size > CV_FILE_MAX_BYTES) return { ok: false, reason: "tooBig" };
  try {
    const text = isPdf(file) ? await readPdf(file) : isDocx(file) ? await readDocx(file) : await file.text();
    // Ein Scan hat keine Textebene: lesbar fuer Menschen, leer fuer uns.
    return text.trim().length === 0 ? { ok: false, reason: "noText" } : { ok: true, text };
  } catch {
    return { ok: false, reason: "unreadable" };
  }
}
