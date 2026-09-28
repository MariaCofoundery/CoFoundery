import { writeFileSync } from "node:fs";
import {
  ALIGNMENT_REGISTRY_V2,
  getAlignmentPreferences,
} from "@/features/instruments/v2/alignmentRegistryV2";
import {
  CONTEXT_REGISTRY_V2,
  getMvpContextBlocks,
  getMvpValueCases,
  type ContextBlock,
} from "@/features/instruments/v2/contextRegistryV2";
import { offeredMissingCodes } from "@/features/instruments/v2/validateAlignmentAnswer";

/**
 * Den Fragebogen zum Lesen ausgeben.
 *
 * ---------------------------------------------------------------------------
 * ERZEUGT, NICHT ABGETIPPT
 * ---------------------------------------------------------------------------
 *
 * Maria am 28.09.2026: „Gib mir mal die ganzen Fragen mit möglichen Antworten
 * und mit den Formulierungen, so wie wir sie jetzt beschlossen haben."
 *
 * Ein von Hand gepflegtes Dokument wäre nach der ersten Textänderung falsch -
 * und zwar unauffällig, weil es weiterhin plausibel aussieht. Dieses hier
 * kommt aus derselben Registratur, die der Fragebogen ausliefert, und geht
 * durch dieselben Leser: Was hier steht, steht auch auf dem Bildschirm.
 *
 * Nach jeder Änderung an einer Frage neu erzeugen:
 *
 *   npm run export:questionnaire
 *
 * Erzeugt `docs/fragebogen-v2.md` (versioniert, damit Änderungen im Diff
 * sichtbar werden) und `docs/fragebogen-v2.html`. Für Word:
 *
 *   textutil -convert docx -output ~/Desktop/CoFoundery-Fragebogen-v2.docx \
 *     docs/fragebogen-v2.html
 */

/** Anmerkungen aus der Durchsicht - sie stehen als solche gekennzeichnet dabei. */
const NOTES: Record<string, string> = {
  E03: "Deckeneffekt: Wenn die Folgen billig korrigierbar sind, sagt kaum jemand „bei keiner“.",
  U01: "Deckeneffekt: Innerhalb eines vereinbarten Bereichs will fast jeder selbst entscheiden.",
  K02: "Deckeneffekt: Informiert werden will fast jeder. Die Varianz liegt im Aufwand.",
  D04: "Deckeneffekt: klingt nur positiv, soziale Erwünschtheit.",
  I01: "Deckeneffekt: „als Hinweis nutzen“ lehnt praktisch niemand ab.",
  T03: "Mit T06 auf derselben Achse — Vorschlag: zu einer Frage mit Zeitpunktoptionen zusammenlegen.",
  T06: "Siehe T03.",
};

const GROUPS: Record<string, string> = {
  S: "Unternehmerische Ziele",
  B: "Risiken und Grenzen",
  G: "Entscheidungs- und Konfliktvereinbarungen",
};

const INPUT_KIND: Record<string, string> = {
  number_range: "Zahl oder Bereich",
  money_range: "Betrag oder Bereich",
  free_text: "Freitext",
  structured_text: "Freitext, mehrere Felder",
  time_windows: "Zeitfenster",
  date: "Datum",
  person_number_range: "Zahl oder Bereich je Person",
};

const missingLabels = new Map(
  ALIGNMENT_REGISTRY_V2.missingCodes.map((entry) => [entry.code, entry.label])
);

function missingOf(blockId: string): string[] {
  return offeredMissingCodes(blockId)
    // 'technical' ist ein Befund des Systems und wird niemandem angeboten.
    .filter((code) => code !== "technical")
    .map((code) => missingLabels.get(code))
    .filter((label): label is string => Boolean(label));
}

const md: string[] = [];
const push = (line = "") => md.push(line);

push("# CoFoundery Align — Fragebogen (Fassung v2, Entwurf)");
push();
push(
  "_Erzeugt aus der Registratur — das ist genau der Wortlaut, den die Anwendung " +
    "ausliefert. Nicht von Hand pflegen: `npm run export:questionnaire`._"
);
push();
push(
  "_Unter „Antwortmöglichkeiten“ stehen die Stufen, unter „Oder“ die " +
    "Auslassungsgründe. Die sind vollwertige Antworten und kein Überspringen._"
);

function renderBlock(block: ContextBlock) {
  push();
  push(`### ${block.blockId}`);
  push();
  push(`**${block.prompt}**`);
  push();
  if (block.answerFormat === "importance_rating") {
    push(`Antwortmöglichkeiten: ${CONTEXT_REGISTRY_V2.importanceLabels.join(" · ")}`);
  } else {
    // DAS EINGABEFELD ZUERST UND IMMER. Am 28.09.2026 in einer externen
    // Durchsicht bemängelt: Bei R02 und R03 zeigte der Export nur die
    // Sonderoptionen („keine feste Erwartung") und verschwieg die eigentliche
    // Eingabe - Stunden je Person, Wochentage mit Uhrzeit. Die Anwendung hat
    // diese Felder; der Export hatte sie nicht, weil er beim ersten Treffer
    // aufhoerte. Wer den Fragebogen danach beurteilt, haelt zwei Fragen fuer
    // unbeantwortbar, die es nicht sind.
    const structured = INPUT_KIND[block.answerFormat];
    if (structured) {
      const detail = block.hint ? ` — ${block.hint}` : "";
      push(`Eingabe: ${structured}${detail}${block.unit ? ` (${block.unit})` : ""}`);
      if (block.options.length > 0) {
        push();
        push("Statt einer Angabe wählbar:");
        push();
        for (const option of block.options) push(`- ${option.value}`);
      }
    } else if (block.options.length > 0) {
      push("Antwortmöglichkeiten:");
      push();
      for (const option of block.options) push(`- ${option.value}`);
    }
  }
  // Feldhinweise nur, wenn sie fuer einen Menschen lesbar sind. „0" allein war
  // ein technischer Rest aus der Quelle und stand so im Dokument.
  const readable = block.fieldNotes.filter((note) => note.trim().length > 3);
  if (readable.length) {
    push();
    push(`Hinweis: ${readable.join("; ")}`);
  }
  const missing = missingOf(block.blockId);
  if (missing.length) {
    push();
    push(`Oder: ${missing.join(" · ")}`);
  }
  if (NOTES[block.blockId]) {
    push();
    push(`_Anmerkung aus der Durchsicht: ${NOTES[block.blockId]}_`);
  }
}

push();
push("## Teil 1 — Wie du arbeiten möchtest");

for (const preference of getAlignmentPreferences()) {
  const items = preference.items.filter((item) => item.inMvp);
  if (!items.length) continue;
  push();
  push(`## ${preference.label} (${preference.id})`);
  if (preference.condition) {
    push();
    push(`_${preference.condition}_`);
  }
  const labels = ALIGNMENT_REGISTRY_V2.answerFormats[preference.answerFormat].labels;
  for (const item of items) {
    push();
    push(`### ${item.itemId}`);
    push();
    push(`**${item.prompt}**`);
    push();
    push(`Antwortmöglichkeiten: ${labels.join(" · ")}`);
    const missing = missingOf(item.itemId);
    if (missing.length) {
      push();
      push(`Oder: ${missing.join(" · ")}`);
    }
    if (NOTES[item.itemId]) {
      push();
      push(`_Anmerkung aus der Durchsicht: ${NOTES[item.itemId]}_`);
    }
  }
}

let currentGroup: string | null = null;
for (const block of getMvpContextBlocks(1)) {
  if (block.group === "L") continue;
  if (block.group !== currentGroup) {
    push();
    push(`## ${GROUPS[block.group] ?? block.group}`);
    currentGroup = block.group;
  }
  renderBlock(block);
}

push();
push("## Teil 2 — Die Zusagen");
push();
push(
  "_Stunden, Geld und Termine. Sie kommen als zweiter Schritt, weil sie eine " +
    "Festlegung verlangen, bevor überhaupt klar ist, mit wem._"
);
for (const block of getMvpContextBlocks(2)) renderBlock(block);

push();
push("## Teil 3 — Prioritäten und Grenzen");
push();
push(
  "_Kurze Situationen, in denen zwei nachvollziehbare Anliegen zusammenstoßen. " +
    "Beide werden getrennt bewertet — beide dürfen sehr wichtig sein._"
);
for (const card of getMvpValueCases()) {
  push();
  push(`### ${card.caseId} — ${card.title}`);
  push();
  push(`**${card.situation}**`);
  push();
  push("Wie wichtig ist dir jedes dieser beiden Anliegen?");
  push();
  for (const concern of card.concerns) push(`- ${concern.label}`);
  push();
  push(`Jeweils: ${CONTEXT_REGISTRY_V2.importanceLabels.join(" · ")}`);
  push();
  push("Welchen Weg würdest du unter diesen Bedingungen zuerst wählen?");
  push();
  for (const path of card.paths) push(`- ${path.label}`);
}

push();
push("## Deine Grenzen");
for (const block of getMvpContextBlocks().filter((entry) => entry.group === "L")) {
  renderBlock(block);
}

push();
push("## Offene Punkte aus der Durchsicht");
push();
for (const [id, note] of Object.entries(NOTES)) push(`- **${id}** — ${note}`);
push();
push("_Die vollständige Begründung steht in `docs/fragenformat-review.md`._");
push();

const markdown = md.join("\n");
writeFileSync("../docs/fragebogen-v2.md", markdown, "utf8");

/** Fürs Word-Dokument: dasselbe als HTML, sehr einfach gehalten. */
const escape = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const html = markdown
  .split("\n")
  .map((line) => {
    if (line.startsWith("### ")) return `<h3>${escape(line.slice(4))}</h3>`;
    if (line.startsWith("## ")) return `<h2>${escape(line.slice(3))}</h2>`;
    if (line.startsWith("# ")) return `<h1>${escape(line.slice(2))}</h1>`;
    if (line.startsWith("- ")) return `<li>${inline(line.slice(2))}</li>`;
    if (!line.trim()) return "";
    return `<p>${inline(line)}</p>`;
  })
  .join("\n");

function inline(text: string): string {
  return escape(text)
    .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
    .replace(/_(.+?)_/g, "<i>$1</i>")
    .replace(/`(.+?)`/g, "$1");
}

writeFileSync(
  "../docs/fragebogen-v2.html",
  `<html><head><meta charset="utf-8"><title>CoFoundery Align — Fragebogen v2</title></head><body>\n${html}\n</body></html>`,
  "utf8"
);

console.log("docs/fragebogen-v2.md und .html geschrieben");
