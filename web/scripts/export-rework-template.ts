import { writeFileSync } from "node:fs";
import { getSectionsV21, REGISTRY_V21 } from "@/features/instruments/v21/registryV21";

/**
 * Eine Vorlage zum Umformulieren der Fragen.
 *
 * ---------------------------------------------------------------------------
 * WARUM NICHT EINFACH DAS FRAGEBOGEN-DOKUMENT
 * ---------------------------------------------------------------------------
 *
 * Das zeigt, wie der Fragebogen AUSSIEHT. Wer umformuliert, braucht drei
 * andere Dinge: was die Frage messen soll, was sich ändern darf, und was
 * nicht - sonst entsteht ein besserer Satz, der etwas anderes misst oder beim
 * Einbauen alle bisherigen Antworten entwertet.
 *
 *   npm run export:rework
 */

const md: string[] = [];
const push = (line = "") => md.push(line);

push("# CoFoundery Align v2.1 — Fragen zum Überarbeiten");
push();
push(`_Erzeugt am ${new Date().toISOString().slice(0, 10)} aus der Registratur._`);
push();

push("## Worum es geht");
push();
push("Die Fragen sind fachlich geprüft, aber sprachlich sperrig. Mehrere klingen "
  + "nach Fragebogen und nicht nach einem Menschen: „Wie häufig möchtest du vor "
  + "einer wichtigen Entscheidung mehrere Möglichkeiten anhand derselben Kriterien "
  + "vergleichen?“ Gesucht ist für jede Frage eine Formulierung, die **dasselbe "
  + "misst** und sich lesen lässt.");
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

push("## Drei Dinge, die immer wieder auffallen");
push();
push("1. **„Wie häufig möchtest du…“** verbindet eine Häufigkeit mit einem Wunsch. "
  + "Beides zusammen klingt schief: Man wünscht sich keine Häufigkeit. Gemeint ist "
  + "eine Neigung — „wie sehr entspricht das deinem Vorgehen“ trifft es eher.");
push("2. **Fachsprache in Alltagsfragen** — „anhand derselben Kriterien vergleichen“, "
  + "„Gewicht geben“, „eine zentrale Annahme prüfen“. Das sind Begriffe aus der "
  + "Beschreibung dessen, was gemessen wird, nicht aus dem Leben der Person.");
push("3. **Bedingungen im Vorspann** — „Wenn du dich in einem Arbeitsgebiet gut "
  + "auskennst: …“ zwingt zum Zweimallesen. Eine kurze Situation davor ist besser "
  + "als ein Nebensatz mitten drin.");
push();
push("---");
push();

for (const { section, items } of getSectionsV21()) {
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
    push(`**Muss weiterhin messen:** ${item.note}`);
    push();

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

const markdown = md.join("\n");
writeFileSync("../docs/fragebogen-v2-1-ueberarbeitung.md", markdown, "utf8");

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
  "../docs/fragebogen-v2-1-ueberarbeitung.html",
  `<html><head><meta charset="utf-8">`
    + `<title>CoFoundery Align v2.1 — Fragen zum Überarbeiten</title></head><body>\n${html}\n</body></html>`,
  "utf8",
);

console.log(
  `docs/fragebogen-v2-1-ueberarbeitung.md und .html geschrieben — `
    + `${REGISTRY_V21.items.length} Fragen`,
);
