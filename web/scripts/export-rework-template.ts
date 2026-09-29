import { writeFileSync } from "node:fs";
import { REGISTRIES, SCOPES } from "@/features/instruments/align/registries";
import { getSectionsV22 } from "@/features/instruments/align/registries";

/**
 * Eine Vorlage zum Umformulieren der Fragen.
 *
 * ---------------------------------------------------------------------------
 * AUS DEN BEIDEN AKTUELLEN BÖGEN, NICHT AUS v2.1
 * ---------------------------------------------------------------------------
 *
 * Bis zum 29.09.2026 erzeugte dieses Skript eine Vorlage aus v2.1 — 36 Fragen
 * in Wortlauten, die es nicht mehr gibt. Die Master-Arbeitsfassung v0.2 hat
 * sie bereits umformuliert, und aus ihr sind die beiden Bögen gebaut. Wer die
 * alte Vorlage bearbeitet hätte, hätte Fragen überarbeitet, die niemandem mehr
 * vorgelegt werden.
 *
 * ---------------------------------------------------------------------------
 * WARUM NICHT EINFACH DAS FRAGEBOGEN-DOKUMENT
 * ---------------------------------------------------------------------------
 *
 * Das zeigt, wie der Fragebogen AUSSIEHT. Wer umformuliert, braucht drei
 * andere Dinge: was die Frage messen soll, was sich ändern darf, und was
 * nicht — sonst entsteht ein besserer Satz, der etwas anderes misst oder beim
 * Einbauen alle bisherigen Antworten entwertet.
 *
 *   npm run export:rework
 */

const md: string[] = [];
const push = (line = "") => md.push(line);

const alleItems = SCOPES.flatMap((scope) => REGISTRIES[scope].items);
const anzahl = alleItems.length;

/**
 * Was auffällt, wird GEZÄHLT und nicht behauptet.
 *
 * Beim ersten Anlauf stand hier von Hand „W02 bis W06 und G01“. G01 endet
 * aber mit einem Fragezeichen - die Behauptung war falsch, und beim nächsten
 * Umformulieren wäre sie noch falscher geworden. Was aus den Fragen selbst
 * folgt, gehört auch aus ihnen ausgerechnet.
 */
const ohneFragesatz = alleItems
  .filter((item) => !item.prompt.trimEnd().endsWith("?"))
  .map((item) => item.itemId);

const luecken = (() => {
  const nachBuchstabe = new Map<string, number[]>();
  for (const item of alleItems) {
    const treffer = /^([A-Z])(\d+)$/.exec(item.itemId);
    if (!treffer) continue;
    const bisher = nachBuchstabe.get(treffer[1]) ?? [];
    bisher.push(Number(treffer[2]));
    nachBuchstabe.set(treffer[1], bisher);
  }
  const fehlend: string[] = [];
  for (const [buchstabe, nummern] of nachBuchstabe) {
    for (let n = 1; n <= Math.max(...nummern); n += 1) {
      if (!nummern.includes(n)) fehlend.push(`${buchstabe}${String(n).padStart(2, "0")}`);
    }
  }
  return fehlend.sort();
})();

push("# CoFoundery Align — Fragen zum Überarbeiten");
push();
push(`_Erzeugt am ${new Date().toISOString().slice(0, 10)} aus den beiden aktuellen `
  + `Bögen (${anzahl} Fragen)._`);
push();

push("## Worum es geht");
push();
push("Diese Fragen stammen **wörtlich aus der Master-Arbeitsfassung v0.2** — sie "
  + "sind also schon einmal überarbeitet worden und nicht mehr die Fassung, über die "
  + "du im September gestolpert bist. Geprüft: Jeder Fragetext und jede "
  + "Antwortmöglichkeit steht so in der Master-Fassung. Die einzige Abweichung ist "
  + "eine Antwort bei R12, wo aus „Datum“ ein Feld zum Eintragen wurde.");
push();
push("Was trotzdem noch auffällt, steht unten. Gesucht ist für jede Frage, die dir "
  + "sperrig vorkommt, eine Formulierung, die **dasselbe misst** und sich lesen "
  + "lässt. Fragen, die schon gut sind, lässt du einfach leer.");
push();

push("## Was sich ändern darf — und was nicht");
push();
push("| | |");
push("|---|---|");
push("| **Der Fragetext** | darf frei umformuliert werden |");
push("| **Der Hinweis darunter** | darf umformuliert, ergänzt oder gestrichen werden |");
push("| **Die Beschriftung einer Antwort** | darf umformuliert werden |");
push("| **Die Reihenfolge der Antworten** | **muss bleiben** |");
push("| **Die Anzahl der Antworten** | **muss bleiben** |");
push("| **Was die Frage misst** | **muss bleiben** |");
push();
push("**Warum Reihenfolge und Anzahl festliegen:** Eine gespeicherte Antwort merkt "
  + "sich nicht den Text, sondern die Stelle — „die dritte Antwort auf A01“. Wer eine "
  + "Antwortmöglichkeit in der Mitte einfügt oder streicht, lässt jede bisher "
  + "gegebene Antwort auf etwas anderes zeigen, ohne dass es jemand merkt. Wenn eine "
  + "Antwort wirklich fehlt: **hinten anhängen** — dann bleibt alles andere, wo es ist.");
push();
push("**Was „muss dasselbe messen“ heißt:** Bei jeder Frage steht unten, worauf sie "
  + "zielt. Eine schönere Frage, die etwas anderes misst, ist keine Verbesserung, "
  + "sondern eine neue Frage — und die bräuchte eine eigene Kennung.");
push();

push("## Was an diesen Fragen auffällt");
push();
push("1. **Großgeschriebenes „Du“ und „Dein“** — durchgehend, aus der Master-Fassung "
  + "übernommen. Der Rest der Anwendung sagt „du“. Das ist eine Entscheidung, die "
  + "einmal fällt und dann für alle 52 Fragen gilt; ich habe sie nicht selbst "
  + "getroffen.");
push("2. **„Wenn …: Wie häufig …“** — ein Bedingungssatz im Vorspann, dann die Frage. "
  + "Das ist präzise und zwingt zum Zweimallesen. Eine kurze Situation als eigener "
  + "Satz davor liest sich leichter als ein Doppelpunkt mitten drin.");
push(`3. **${ohneFragesatz.length} Fragen sind Situationen ohne Fragesatz** `
  + `(${ohneFragesatz.join(", ")}). Sie beschreiben eine Lage und enden mit einem `
  + "Punkt; was gefragt ist, steht erst in den Antworten. Beim Ausfüllen fehlt der "
  + "Moment, in dem klar wird, was man eigentlich beantworten soll.");
push(`4. **Die Kennungen haben Lücken** — ${luecken.join(", ")} fehlen. Das ist kein `
  + "Fehler: Die Master-Fassung hat sie gestrichen. Die übrigen behalten ihre Nummer, "
  + "weil eine Umnummerierung gespeicherte Antworten auf andere Fragen zeigen ließe.");
push();
push("---");
push();

for (const scope of SCOPES) {
  push();
  push(`# ${REGISTRIES[scope].label}`);
  push();
  push(`_${REGISTRIES[scope].validity}_`);

  for (const { section, items } of getSectionsV22(scope)) {
    push();
    push(`## ${section}`);

    for (const item of items) {
      push();
      push(`### ${item.itemId}`);
      push();
      push("**Jetzt:**");
      push();
      push(`> ${item.prompt}`);
      if (item.hint) {
        push(">");
        push(`> _${item.hint}_`);
      }
      push();

      if (item.showAfter) {
        push(`**Erscheint nur**, wenn ${item.showAfter} beantwortet ist.`);
        push();
      }

      if (item.options.length > 0) {
        push(`**Antworten** (${item.options.length}, Reihenfolge und Anzahl bleiben):`);
        push();
        for (const [index, option] of item.options.entries()) {
          const marks = [
            option.requiresText ? "mit Textfeld" : null,
            option.exclusive ? "schließt alle anderen aus" : null,
          ].filter(Boolean);
          push(`${index + 1}. ${option.label}${marks.length ? ` _(${marks.join(", ")})_` : ""}`);
        }
        push();
      } else {
        push(`**Antwortform:** ${item.answerFormat} — keine feste Auswahl.`);
        push();
      }

      // DAS WICHTIGSTE FELD. Ohne es entsteht eine schoenere Frage, die etwas
      // anderes misst - und das faellt erst auf, wenn die Daten da sind.
      if (item.note) {
        push(`**Muss weiterhin messen:** ${item.note}`);
        push();
      }

      if (item.missing.length > 0) {
        push(`**Wer nicht antworten kann:** ${item.missing.map((m) => `„${m.label}“`).join(" · ")}`);
        push();
      }

      push("**Neu:**");
      push();
      push("> ");
      push();
    }
  }
}

const markdown = md.join("\n");
writeFileSync("../docs/fragen-ueberarbeiten.md", markdown, "utf8");

const escape = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const inline = (text: string) =>
  escape(text)
    .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
    .replace(/_(.+?)_/g, "<i>$1</i>")
    .replace(/`(.+?)`/g, "$1");

const html = markdown
  .split("\n")
  .map((line) => {
    if (line.startsWith("### ")) return `<h3>${escape(line.slice(4))}</h3>`;
    if (line.startsWith("## ")) return `<h2>${escape(line.slice(3))}</h2>`;
    if (line.startsWith("# ")) return `<h1>${escape(line.slice(2))}</h1>`;
    if (line.trim() === "---") return "<hr>";
    if (line.startsWith("> ")) return `<blockquote>${inline(line.slice(2))}</blockquote>`;
    if (line.trim() === ">") return "";
    if (line.startsWith("|")) return "";
    if (/^\d+\. /.test(line)) return `<li>${inline(line.replace(/^\d+\. /, ""))}</li>`;
    if (!line.trim()) return "";
    return `<p>${inline(line)}</p>`;
  })
  .join("\n");

writeFileSync(
  "../docs/fragen-ueberarbeiten.html",
  `<html><head><meta charset="utf-8">`
    + `<title>CoFoundery Align — Fragen zum Überarbeiten</title></head><body>\n${html}\n</body></html>`,
  "utf8",
);

console.log(`docs/fragen-ueberarbeiten.md und .html geschrieben — ${anzahl} Fragen`);
