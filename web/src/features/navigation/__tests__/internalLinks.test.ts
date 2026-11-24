import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// Es gibt keine CI und keinen Linkpruefer. Dieser Test faengt den haeufigsten
// stillen Fehler beim Aufraeumen: ein fester interner Link zeigt auf eine Seite,
// die es nicht (mehr) gibt. Geprueft werden nur Links, die als Text im Quellcode
// stehen (href="...", redirect("..."), router.push("...")). Pfade, die eine
// Hilfsfunktion zusammenbaut, sieht der Test nicht - er ist ein Netz, kein Beweis.

const APP = join("src", "app");
const SRC = "src";

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

// Route aus dem Dateipfad: Routengruppen "(x)" zaehlen nicht, "[x]" ist dynamisch.
function routeSegments(file: string): string[] | null {
  const rel = file.slice(APP.length + 1).replace(/\\/g, "/");
  const m = rel.match(/^(.*?)\/?(page\.tsx|route\.ts)$/);
  if (!m) return null;
  return m[1].split("/").filter((s) => s && !/^\(.+\)$/.test(s));
}

const appFiles = walk(APP);
const routes = appFiles.map(routeSegments).filter((r): r is string[] => r !== null);

// Weiterleitungen aus next.config.mjs (Quelle -> gilt als vorhanden).
const configText = readFileSync("next.config.mjs", "utf8");
const configSources = [...configText.matchAll(/source:\s*"([^"]+)"/g)].map((m) =>
  m[1].split("/").filter(Boolean),
);

function segmentMatches(routeSeg: string, linkSeg: string): boolean {
  if (/^\[\[?\.\.\./.test(routeSeg) || /^:.+\*$/.test(routeSeg)) return true;
  if (routeSeg.startsWith("[") || routeSeg.startsWith(":")) return true;
  // Ein Platzhalter aus ${...} kann ein ganzes Segment oder ein Teil davon sein.
  if (linkSeg.includes("\u0000")) {
    const re = new RegExp("^" + linkSeg.split("\u0000").map(escape).join("[^/]*") + "$");
    return re.test(routeSeg);
  }
  return routeSeg === linkSeg;
}

function escape(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function exists(path: string): boolean {
  const link = path.split("/").filter(Boolean);
  const candidates = [...routes, ...configSources];
  return candidates.some((route) => {
    const catchAll = route.some((s) => /^\[\[?\.\.\./.test(s) || /^:.+\*$/.test(s));
    if (!catchAll && route.length !== link.length) return false;
    if (catchAll && link.length < route.length - 1) return false;
    return route.every((seg, i) => {
      if (/^\[\[?\.\.\./.test(seg) || /^:.+\*$/.test(seg)) return true;
      return link[i] !== undefined && segmentMatches(seg, link[i]);
    });
  });
}

// Orte, an denen ein Link als Zeichenkette steht.
const LINK_PATTERNS = [
  /\bhref=["']((?:\/)[^"'<>\s]*)["']/g,
  /\bhref=\{["'`]((?:\/)[^"'`]*)["'`]\}/g,
  /\b(?:redirect|permanentRedirect)\(\s*["'`]((?:\/)[^"'`]*)["'`]/g,
  /\brouter\.(?:push|replace)\(\s*["'`]((?:\/)[^"'`]*)["'`]/g,
];

// Ziele, die es bewusst nicht als Seite gibt (Dateien, die Next selbst bedient).
const IGNORED_EXACT = new Set(["/", "/favicon.ico", "/manifest.webmanifest", "/robots.txt", "/sitemap.xml"]);

function normalise(raw: string): string | null {
  let p = raw.replace(/\$\{[^}]*\}/g, "\u0000");
  // Verschachtelte Ausdruecke (${a ? "x" : "y"}) lassen sich so nicht sauber lesen:
  // ab dort zaehlt der Rest als ein Platzhalter.
  p = p.replace(/\$\{.*$/, "\u0000");
  p = p.split(/[?#]/)[0];
  if (!p.startsWith("/") || p.startsWith("//")) return null;
  // Aus einem Template entstandene Pfade, die mit Platzhalter anfangen, sind nicht pruefbar.
  if (p.startsWith("/\u0000") && p.split("/").filter(Boolean).length === 1) return null;
  if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
  return p;
}

type Finding = { file: string; link: string };
let scanned = 0;

function findBrokenLinks(): Finding[] {
  const files = walk(SRC).filter(
    (f) => /\.(ts|tsx)$/.test(f) && !/\.test\.ts$/.test(f) && !f.includes("__tests__"),
  );
  const broken: Finding[] = [];
  for (const file of files) {
    const text = readFileSync(file, "utf8");
    for (const pattern of LINK_PATTERNS) {
      pattern.lastIndex = 0;
      for (const m of text.matchAll(pattern)) {
        const link = normalise(m[1]);
        if (!link || IGNORED_EXACT.has(link)) continue;
        scanned += 1;
        // Dateien aus public/ (PDF, Bilder) sind keine Routen.
        if (existsSync(join("public", link))) continue;
        if (!exists(link)) broken.push({ file: file.replace(/\\/g, "/"), link });
      }
    }
  }
  return broken;
}

test("die Routentabelle liest die Seiten des Projekts", () => {
  assert.ok(routes.length > 200, `nur ${routes.length} Routen gefunden`);
  assert.ok(exists("/dashboard"));
  assert.ok(exists("/teams/abc/setup"));
  assert.ok(exists("/network/foo"), "next.config-Weiterleitung zaehlt als vorhanden");
  assert.ok(!exists("/gibt-es-nicht"));
  assert.ok(!exists("/teams/abc/gibt-es-nicht"));
});

test("feste interne Links zeigen auf Seiten, die es gibt", () => {
  const broken = findBrokenLinks();
  // Ein Test, der nichts liest, waere gruen und wertlos.
  assert.ok(scanned > 300, `nur ${scanned} Links gelesen`);
  const unique = [...new Set(broken.map((b) => `${b.link}   <- ${b.file}`))].sort();
  assert.equal(
    unique.length,
    0,
    `Links ohne Zielseite:\n${unique.join("\n")}\n(Ist die Seite weg: Link anpassen. Ist das Ziel gewollt, z. B. ein Handler ausserhalb von src/app: Muster im Test erweitern.)`,
  );
});
