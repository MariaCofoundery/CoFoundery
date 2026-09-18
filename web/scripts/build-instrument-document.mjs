/**
 * Baut ein lesbares Dokument mit allen Fragen und Antwortmöglichkeiten.
 *
 * WARUM ALS SKRIPT UND NICHT ALS EINMALIGE DATEI:
 *   Die 36 Alignment-Fragen stehen in der Registry im Code. Eine von Hand
 *   abgeschriebene Fassung wäre ab der ersten Textänderung falsch, ohne dass
 *   es jemand merkt - genau das ist dem Wertemodul passiert, dessen
 *   Schnappschuss in docs/ vom 27.03.2026 stammt.
 *
 * AUFRUF:
 *   node --import ./scripts/register-ts-alias.mjs --experimental-strip-types \
 *     scripts/build-instrument-document.mjs
 *
 * Schreibt docs/fragebogen-uebersicht.html. Im Browser öffnen und über
 * "Drucken → Als PDF sichern" ablegen; das Layout ist auf Papier ausgelegt.
 */

import { writeFileSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  getActiveRegistryItems,
  getOrderedRegistryDimensions,
} from "../src/features/scoring/founderCompatibilityRegistry.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..", "..");

const escape = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

/** Zeilenumbrüche im Fragetext sind bedeutungstragend (A/B-Gegenüberstellung). */
const asLines = (text) =>
  escape(text)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

const TYPE_LABEL = {
  likert: "Zustimmung",
  forced_choice: "A gegen B",
  scenario: "Situation",
};

const POLARITY_NOTE = {
  left_pole_keyed: "Niedriger Wert = linker Pol der Dimension.",
  right_pole_keyed: "Niedriger Wert = rechter Pol der Dimension.",
  forced_choice_left_to_right: "A bis B, links nach rechts.",
};

function renderItem(item, index) {
  const lines = asLines(item.prompt);
  const usage = item.reportUsage ?? {};
  const flags = [
    usage.drivesDimensionScore ? "zählt in den Dimensionswert" : null,
    usage.drivesExecutiveSummary ? "kann in die Zusammenfassung" : null,
    usage.canAnchorDimensionCard ? "kann eine Dimensionskarte tragen" : null,
  ].filter(Boolean);

  return `
  <article class="item">
    <div class="item-head">
      <span class="num">${index}</span>
      <div>
        <p class="meta">
          <code>${escape(item.itemId)}</code>
          <span class="tag">${escape(TYPE_LABEL[item.type] ?? item.type)}</span>
          <span class="tag ${item.layer === "core" ? "tag-core" : ""}">${item.layer === "core" ? "Kern" : "Ergänzung"}</span>
        </p>
        ${lines.map((line, i) => `<p class="${i === 0 ? "prompt" : "prompt-line"}">${line}</p>`).join("\n        ")}
      </div>
    </div>
    <ol class="choices">
      ${item.choices
        .map((choice) => `<li><span class="val">${choice.value}</span>${escape(choice.label)}</li>`)
        .join("\n      ")}
    </ol>
    <p class="note">
      ${escape(POLARITY_NOTE[item.polarity] ?? item.polarity)}
      ${flags.length ? ` · ${escape(flags.join(" · "))}` : " · <strong>fließt nicht in die Auswertung</strong>"}
    </p>
  </article>`;
}

function renderValuesQuestion(question, index) {
  const choices = [...(question.choices ?? [])].sort(
    (a, b) => Number(a.order ?? 0) - Number(b.order ?? 0)
  );
  return `
  <article class="item">
    <div class="item-head">
      <span class="num">${index}</span>
      <div>
        <p class="meta">
          <code>${escape(question.question_id)}</code>
          <span class="tag">${escape(question.type ?? "")}</span>
          ${question.dimension ? `<span class="tag">${escape(question.dimension)}</span>` : ""}
        </p>
        <p class="prompt">${escape(question.prompt)}</p>
        ${question.description ? `<p class="prompt-line">${escape(question.description)}</p>` : ""}
      </div>
    </div>
    <ol class="choices">
      ${choices
        .map((choice) => `<li><span class="val">${escape(choice.value)}</span>${escape(choice.text)}</li>`)
        .join("\n      ")}
    </ol>
  </article>`;
}

// ---------------------------------------------------------------------------
// Zusammentragen
// ---------------------------------------------------------------------------
const items = getActiveRegistryItems();
const dimensions = getOrderedRegistryDimensions();

const valuesPath = path.join(repoRoot, "docs", "values-instrument-v1.json");
const values = JSON.parse(readFileSync(valuesPath, "utf8"));
const valuesQuestions = [...(values.values_questions_snapshot ?? [])].sort(
  (a, b) => Number(a.order ?? 0) - Number(b.order ?? 0)
);
const valuesDate = new Date(values.generated_at).toLocaleDateString("de-DE");

const byDimension = dimensions.map((dimension) => ({
  dimension,
  items: items
    .filter((item) => item.dimensionId === dimension.dimensionId)
    .sort((a, b) => a.order - b.order),
}));

const generatedAt = new Date().toLocaleDateString("de-DE");
let counter = 0;

const html = `<!doctype html>
<html lang="de">
<head>
<meta charset="utf-8" />
<title>CoFoundery – Fragen und Antwortmöglichkeiten</title>
<style>
  :root { --line: #e2e8f0; --muted: #64748b; --ink: #0f172a; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 40px; font: 15px/1.6 -apple-system, "Segoe UI", system-ui, sans-serif; color: var(--ink); max-width: 860px; margin-inline: auto; }
  h1 { font-size: 30px; letter-spacing: -.02em; margin: 0 0 6px; }
  h2 { font-size: 21px; margin: 44px 0 4px; padding-top: 18px; border-top: 2px solid var(--ink); }
  h3 { font-size: 17px; margin: 28px 0 0; }
  .lead { color: var(--muted); margin: 0 0 4px; }
  .item { border: 1px solid var(--line); border-radius: 12px; padding: 16px 18px; margin-top: 14px; break-inside: avoid; }
  .item-head { display: flex; gap: 14px; align-items: baseline; }
  .num { font-weight: 700; color: var(--muted); min-width: 28px; }
  .meta { margin: 0 0 6px; font-size: 12px; color: var(--muted); }
  .meta code { background: #f1f5f9; padding: 1px 6px; border-radius: 5px; }
  .tag { display: inline-block; margin-left: 6px; padding: 1px 8px; border: 1px solid var(--line); border-radius: 999px; }
  .tag-core { background: #f5f3ff; border-color: #ddd6fe; color: #5b21b6; }
  .prompt { margin: 0; font-weight: 600; }
  .prompt-line { margin: 4px 0 0; }
  .choices { margin: 12px 0 0 42px; padding: 0; list-style: none; }
  .choices li { margin-top: 5px; display: flex; gap: 10px; }
  .val { flex: 0 0 42px; font-variant-numeric: tabular-nums; color: var(--muted); font-size: 13px; }
  .note { margin: 12px 0 0 42px; font-size: 12px; color: var(--muted); }
  .poles { margin: 2px 0 0; font-size: 13px; }
  .hint { background: #fffbeb; border: 1px solid #fde68a; border-radius: 10px; padding: 12px 14px; margin-top: 16px; font-size: 14px; }
  @media print {
    body { padding: 0; font-size: 11pt; }
    h2 { break-before: page; }
    h2:first-of-type { break-before: auto; }
    .item { border-color: #cbd5e1; }
  }
</style>
</head>
<body>
<h1>Fragen und Antwortmöglichkeiten</h1>
<p class="lead">CoFoundery – Alignment (${items.length} Fragen) und Wertemodul (${valuesQuestions.length} Fragen)</p>
<p class="lead">Erzeugt am ${generatedAt} aus der Registry im Code.</p>

<div class="hint">
  <strong>Woher die Angaben stammen.</strong> Die ${items.length} Alignment-Fragen kommen direkt aus der
  Registry, sind also immer aktuell. Die ${valuesQuestions.length} Fragen des Wertemoduls liegen in der
  Datenbank; hier steht der Schnappschuss aus <code>docs/values-instrument-v1.json</code>
  vom ${valuesDate}. Wenn dort seitdem etwas geändert wurde, steht es hier noch alt.
</div>

<h2>Teil 1 · Alignment</h2>
<p class="lead">${items.length} Fragen in ${dimensions.length} Dimensionen. Die Zahl vor einer Antwort ist der Wert, mit dem sie in die Auswertung geht (0–100).</p>
${byDimension
  .map(
    ({ dimension, items: dimensionItems }) => `
<h3>${escape(dimension.dimensionLabel ?? dimension.dimensionId)} <span class="lead">· ${dimensionItems.length} Fragen</span></h3>
<p class="lead poles">Die Achse läuft von „${escape(dimension.leftPoleLabel)}“ (0) bis „${escape(dimension.rightPoleLabel)}“ (100).</p>
${dimensionItems.map((item) => renderItem(item, ++counter)).join("\n")}`
  )
  .join("\n")}

<h2>Teil 2 · Wertemodul</h2>
<p class="lead">${valuesQuestions.length} Situationen. Stand ${valuesDate}.</p>
${valuesQuestions.map((question, index) => renderValuesQuestion(question, index + 1)).join("\n")}

</body>
</html>
`;

const outPath = path.join(repoRoot, "docs", "fragebogen-uebersicht.html");
writeFileSync(outPath, html, "utf8");
console.log(
  `geschrieben: ${path.relative(repoRoot, outPath)}\n` +
    `  Alignment:  ${items.length} Fragen (${byDimension.map((d) => d.items.length).join("+")})\n` +
    `  Wertemodul: ${valuesQuestions.length} Fragen, Schnappschuss vom ${valuesDate}`
);
