import { writeFileSync } from "node:fs";
import {
  REGISTRY_V21,
  getSectionsV21,
  type RegistryItemV21,
} from "@/features/instruments/v21/registryV21";
import { getBehaviourItems, behaviourItemFor } from "@/features/instruments/v21/behaviourV21";

/**
 * Den Fragebogen v2.1 zum Lesen ausgeben.
 *
 * ---------------------------------------------------------------------------
 * ERZEUGT, NICHT ABGETIPPT
 * ---------------------------------------------------------------------------
 *
 * Ein von Hand gepflegtes Dokument wäre nach der ersten Textänderung falsch -
 * und zwar unauffällig, weil es weiterhin plausibel aussieht. Dieses hier
 * kommt aus derselben Registratur, die der Fragebogen ausliefert.
 *
 * Es ersetzt den Export für v2: Jene Fassung ist seit dem 28.09.2026
 * archiviert, und ihr Dokument trug Anmerkungen, die die fachliche Durchsicht
 * inzwischen richtiggestellt hat - ein Dokument mit widerlegten Behauptungen
 * weiterzupflegen wäre schlimmer, als keines zu haben.
 *
 *   npm run export:questionnaire
 *
 * Für Word:
 *
 *   textutil -convert docx -output ~/Desktop/CoFoundery-Fragebogen-v2-1.docx \
 *     docs/fragebogen-v2-1.html
 */

const FORMAT_HINT: Record<string, string> = {
  ordinal_choice: "eine Stufe wählen",
  single_choice: "eine Antwort wählen",
  multi_choice: "mehrere Antworten möglich",
  multi_choice_priority: "mehrere Antworten möglich, eine darf Vorrang bekommen",
  money_range: "Betrag mit Währung",
  number_range: "Zahl mit Einheit",
  person_number_range: "je Person eine Angabe",
  time_windows: "Wochentag, Uhrzeit von/bis, Zeitzone",
  date: "Datum",
  structured_text: "Freitext",
  free_text_repeatable: "Freitext, mehrere Einträge möglich",
  free_text_per_entry: "Freitext je zuvor genanntem Eintrag",
  value_case: "zwei Wichtigkeiten und ein Weg",
};

const md: string[] = [];
const push = (line = "") => md.push(line);

push("# CoFoundery Align — Fragebogen v2.1");
push();
push(
  `_Erzeugt am ${new Date().toISOString().slice(0, 10)} aus der Registratur. ` +
    "Nicht von Hand ändern — Änderungen gehören in die Quelle und dann hierher " +
    "über `npm run export:questionnaire`._"
);
push();
push(`**Stand:** ${REGISTRY_V21.registryVersion}, Status ${REGISTRY_V21.status}. `
  + `${REGISTRY_V21.items.length} Fragen in ${REGISTRY_V21.sections.length} Abschnitten.`);
push();
push("**Kein Gesamtwert, keine Dimensionswerte, keine umgepolten Fragen.** Das steht "
  + "so im geprüften Quelldokument. Die Überschriften sind Gesprächsbereiche, keine "
  + "gemessenen Dimensionen: Zwei Fragen unter einem Titel ergeben noch keine Skala.");
push();

for (const note of REGISTRY_V21.notes) push(`- ${note}`);
push();

function renderItem(item: RegistryItemV21, extra?: string) {
  push();
  push(`### ${item.itemId}${extra ?? ""}`);
  push();
  push(`**${item.prompt}**`);
  push();
  if (item.hint) {
    push(`_${item.hint}_`);
    push();
  }

  if (item.options.length > 0) {
    for (const option of item.options) {
      const marks = [
        option.requiresText ? "mit Textfeld" : null,
        option.exclusive ? "schließt alle anderen aus" : null,
      ].filter(Boolean);
      push(`- ${option.label}${marks.length ? ` _(${marks.join(", ")})_` : ""}`);
    }
    push();
  }

  if (item.answerFormat === "value_case" && item.concerns) {
    push("Wie wichtig ist dir jedes dieser beiden Anliegen?");
    push();
    for (const concern of item.concerns) push(`- ${concern}`);
    push();
    push(`Jeweils: ${item.ratingOptions?.join(" · ")}`);
    push();
  }

  if (item.fields?.length) {
    push(`Eingabefelder: ${item.fields.join(" · ")}`);
    push();
  }

  if (item.followup) {
    const followup = item.followup as { question?: string; options?: string[]; other?: string };
    if (followup.question) {
      push(`_Anschlussfrage:_ **${followup.question}**`);
      push();
      for (const option of followup.options ?? []) push(`- ${option}`);
      if (followup.other) push(`- ${followup.other}`);
      push();
    }
  }

  if (item.showWhen) {
    push(`_Erscheint nur, wenn: ${item.showWhen}_`);
    push();
  }

  // Die Auslassungsgründe gehören sichtbar ins Dokument. Wer prüft, ob eine
  // Frage beantwortbar ist, muss sehen, welchen Ausweg sie lässt.
  push(`_Wer nicht antworten kann:_ ${item.missing.map((entry) => `„${entry.label}“`).join(" · ")}`);
  push();
  push(`_Format: ${FORMAT_HINT[item.answerFormat] ?? item.answerFormat}. ${item.note}_`);
}

for (const { section, items } of getSectionsV21()) {
  push();
  push(`## ${section}`);
  for (const item of items) renderItem(item);
}

// ---------------------------------------------------------------------------
// Der Vorschlagsteil - deutlich abgesetzt
// ---------------------------------------------------------------------------

push();
push("---");
push();
push("# Vorschlag: vier Fragen zum Verhalten");
push();
push("**Diese vier Fragen stehen nicht im geprüften Quelldokument.** Sie sind ein "
  + "Vorschlag und liegen deshalb hier hinten, damit niemand sie für geprüft hält.");
push();
push("Der Gedanke: Zu vier der Wunschfragen zusätzlich fragen, wie es beim letzten "
  + "konkreten Mal war. Wenn beides auseinanderliegt, ist das ein Gesprächsthema — "
  + "und ausdrücklich kein Urteil darüber, ob jemand ehrlich geantwortet hat. Wer "
  + "sich etwas wünscht und zuletzt anders gehandelt hat, hat nicht falsch "
  + "geantwortet: Die Lage kann es nicht hergegeben haben, der Wunsch kann neu sein.");
push();
push("**Worum wir bitten:** eine Einschätzung zu den fünf Punkten unten. Sie sind "
  + "nach absteigender Wichtigkeit geordnet — wenn die Zeit nur für einen reicht, "
  + "ist es der erste.");
push();

push("### 1. Ändert das, was das Instrument ist?");
push();
push("Der Fragebogen misst bisher ausschließlich **gewünschtes** Vorgehen, und das "
  + "steht in jeder Itembegründung so drin („Analytischer Vergleich als gewünschtes "
  + "Vorgehen. Kein Beleg für Analysefähigkeit.“). Vier Verhaltensfragen daneben "
  + "sind eine andere Art von Angabe. Bleibt es ein Präferenzinstrument mit einer "
  + "Gegenprobe — oder wird es unbemerkt zu etwas anderem, nämlich zu einem, das "
  + "beansprucht, Selbstauskunft zu überprüfen?");
push();

push("### 2. Liest sich die Gegenüberstellung als Gültigkeitsurteil?");
push();
push("Das ist unsere größte Sorge. Wir stellen Wunsch und Verhalten nebeneinander "
  + "und sagen ausdrücklich, dass ein Unterschied **kein** Urteil ist: Die Lage kann "
  + "es nicht hergegeben haben, der Wunsch kann neu sein. Es gibt kein "
  + "Übereinstimmungsmaß, keine Zahl, keine Richtung — nur zwei Sätze nebeneinander "
  + "und den Hinweis, dass sich darüber sprechen lässt.");
push();
push("Reicht das? Oder liest eine Person, die ihren eigenen Bericht ansieht, dort "
  + "unvermeidlich „du tust nicht, was du sagst“ — egal, wie wir es formulieren? "
  + "Falls ja: Wäre es dann besser, die Gegenüberstellung nur intern zur "
  + "Itemprüfung zu verwenden und der Person gar nicht zu zeigen?");
push();

push("### 3. Ein einzelner letzter Fall statt einer Häufigkeit");
push();
push("Wir fragen nach dem **letzten** konkreten Fall in den vergangenen drei "
  + "Monaten, nicht nach einer Häufigkeit. Begründung: Ein einzelner Fall ist "
  + "erinnerbar, eine Häufigkeit über drei Monate wäre wieder geschätzt — und genau "
  + "dieser Punkt war an der Vorfassung zu Recht kritisiert worden.");
push();
push("Der Preis ist bekannt: Ein Einzelfall ist anfällig für Auswahl beim Erinnern "
  + "(man erinnert die Fälle, die zum Selbstbild passen) und für Besonderheiten der "
  + "Lage. Ist der Tausch vertretbar, oder wäre ein anderes Format besser — etwa "
  + "„die letzten drei“ oder ein festes Ereignis statt eines Zeitraums?");
push();

push("### 4. „Kam nicht vor“ als Antwort, nicht als Auslassung");
push();
push("Jede der vier Fragen bietet an: „in den vergangenen drei Monaten stand keine "
  + "solche Entscheidung an“. Das ist bewusst eine **Antwortmöglichkeit** und kein "
  + "Auslassungsgrund — wer in drei Monaten keinen solchen Fall hatte, hat etwas "
  + "gesagt und nichts verschwiegen. Der Vergleich mit der Wunschangabe endet dort, "
  + "statt zu einem Unterschied zu werden.");
push();
push("Ist das richtig so? Und: Bei Gründerinnen und Gründern ganz am Anfang dürfte "
  + "das die häufigste Antwort sein. Macht das die Fragen für diese Gruppe wertlos, "
  + "und wenn ja — sollte man sie dann überhaupt stellen?");
push();

push("### 5. Die vier Paare und ihre Vergleichbarkeit");
push();
push("Gepaart sind A02/A91, U04/U91, K01/K91 und T03/T91. Zwei Fragen dazu:");
push();
push("- Sind das die vier, bei denen eine Gegenprobe am meisten bringt? Oder gäbe es "
  + "geeignetere — etwa dort, wo soziale Erwünschtheit am stärksten wirkt?");
push("- Bei K01/K91 und T03/T91 haben wir die Antwortstufen **absichtlich gleich "
  + "formuliert**, damit sich Wunsch und Verhalten nebeneinander lesen lassen. Bei "
  + "A02/A91 und U04/U91 geht das nicht (Häufigkeit gegen Einzelfall), dort legen wir "
  + "beides nur nebeneinander. Ist die gleiche Stufung bei den ersten beiden ein "
  + "Vorteil — oder erzeugt sie erst den Eindruck einer Skala, die es nicht gibt?");
push();

push("### Außerdem, unabhängig von den Verhaltensfragen");
push();
push("Wir haben in der geprüften Fassung eine Abweichung stehen lassen und möchten "
  + "sie bestätigt oder verworfen haben: `confidential_first` („möchte ich zunächst "
  + "vertraulich klären“) ist bei uns ein **eigener** Auslassungsgrund und nicht "
  + "unter „möchte ich nicht angeben“ zusammengefasst. Begründung: Das eine ist ein "
  + "aufgeschobenes Gespräch, das andere eine Absage — wer beides zusammenfasst, "
  + "verliert den Unterschied genau dort, wo er zählt. Ist das haltbar?");
push();

push("---");
push();
for (const item of getBehaviourItems()) {
  const wish = item.crossChecks;
  push();
  push(`### ${item.itemId} — Gegenprobe zu ${wish}`);
  push();
  push(`**${item.prompt}**`);
  push();
  if (item.hint) {
    push(`_${item.hint}_`);
    push();
  }
  for (const option of item.options) {
    const marks = [
      option.noOccasion ? "die Situation gab es nicht" : null,
      option.outsideSequence ? "steht außerhalb der Abfolge" : null,
    ].filter(Boolean);
    push(`- ${option.label}${marks.length ? ` _(${marks.join(", ")})_` : ""}`);
  }
  push();
  push(`_Wer nicht antworten kann:_ ${item.missing.map((entry) => `„${entry.label}“`).join(" · ")}`);
  push();
  push(`_${item.note}_`);
}

push();
push("## Wie Wunsch und Verhalten gegenübergestellt werden");
push();
push(REGISTRY_V21.deviationsFromSource.length > 0 ? "" : "");
push("Verglichen wird nur, wo beide Fragen dieselbe Abfolge benutzen — bei "
  + "K01/K91 und T03/T91. Bei A02/A91 und U04/U91 fragt die eine nach Häufigkeit "
  + "und die andere nach einem einzelnen Fall; ein Abstand zwischen „fast immer“ "
  + "und „ja, bevor ich entschieden habe“ wäre eine Zahl zwischen zwei Dingen ohne "
  + "gemeinsame Skala. Dort wird beides nebeneinandergelegt statt verrechnet.");
push();
for (const item of getBehaviourItems()) {
  const pair = behaviourItemFor(item.crossChecks);
  push(`- **${item.crossChecks} ↔ ${pair?.itemId}** — ${item.section}`);
}
push();

// ---------------------------------------------------------------------------
// Offene Punkte
// ---------------------------------------------------------------------------

push();
push("## Offen, bevor etwas festgeschrieben wird");
push();
for (const deviation of REGISTRY_V21.deviationsFromSource) {
  push(`- **${deviation.what}** — ${deviation.reason} _(Quelle: ${deviation.source}; `
    + `${deviation.decidedBy})_`);
}
push();

const markdown = md.join("\n");
writeFileSync("../docs/fragebogen-v2-1.md", markdown, "utf8");

/** Fürs Word-Dokument: dasselbe als HTML, sehr einfach gehalten. */
const escape = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function inline(text: string): string {
  return escape(text)
    .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
    .replace(/_(.+?)_/g, "<i>$1</i>")
    .replace(/`(.+?)`/g, "$1");
}

const html = markdown
  .split("\n")
  .map((line) => {
    if (line.startsWith("### ")) return `<h3>${escape(line.slice(4))}</h3>`;
    if (line.startsWith("## ")) return `<h2>${escape(line.slice(3))}</h2>`;
    if (line.startsWith("# ")) return `<h1>${escape(line.slice(2))}</h1>`;
    if (line.trim() === "---") return "<hr>";
    if (line.startsWith("- ")) return `<li>${inline(line.slice(2))}</li>`;
    if (/^\d+\. /.test(line)) return `<li>${inline(line.replace(/^\d+\. /, ""))}</li>`;
    if (!line.trim()) return "";
    return `<p>${inline(line)}</p>`;
  })
  .join("\n");

writeFileSync(
  "../docs/fragebogen-v2-1.html",
  `<html><head><meta charset="utf-8">`
    + `<title>CoFoundery Align — Fragebogen v2.1</title></head><body>\n${html}\n</body></html>`,
  "utf8"
);

console.log(
  `docs/fragebogen-v2-1.md und .html geschrieben — `
    + `${REGISTRY_V21.items.length} Fragen, ${getBehaviourItems().length} Vorschläge`,
);
