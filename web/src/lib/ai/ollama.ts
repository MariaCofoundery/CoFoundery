/**
 * Der Draht zum lokalen Sprachmodell.
 *
 * EINE FUNKTION, KEIN FRAMEWORK. Solange es genau einen Anbieter gibt, ist
 * eine Schnittstelle mit mehreren Klassen dahinter nur eine Datei mehr zum
 * Lesen. Die Austauschbarkeit, die das Produkt wirklich braucht, sitzt eine
 * Ebene hoeher: `NarrativeAnalyzer` in features/capability/narrativeAnalysis.ts
 * ist seit dem ersten Tag eine Schnittstelle mit `engine: "rules" | "model"`.
 * Wer den Anbieter wechselt, tauscht diese Datei - nicht die Anwendung.
 *
 * DAS MODELL LAEUFT AUF EINEM LAPTOP, der auch ausgeschaltet sein kann. Deshalb
 * ist "nicht erreichbar" hier kein Fehler, sondern ein Ergebnis: Die Funktion
 * gibt `null` zurueck, und die aufrufende Stelle entscheidet, was das bedeutet.
 * Beim Narrativ heisst es "nimm die Begriffsliste", woanders wird es "spaeter
 * noch einmal" heissen.
 *
 * ERZWUNGENES SCHEMA: Ollama nimmt in `format` ein JSON-Schema entgegen und
 * laesst das Modell nur noch Antworten erzeugen, die dazu passen. Das ersetzt
 * das Bitten im Prompt ("antworte als JSON"), an das sich kleine Modelle nicht
 * zuverlaessig halten. Geprueft wird die Antwort trotzdem noch einmal hier -
 * ein Schema sagt, dass die FORM stimmt, nicht dass der INHALT stimmt.
 */

const DEFAULT_URL = "http://127.0.0.1:11434";
const DEFAULT_MODEL = "qwen3.5:4b";

/** Nach dieser Zeit gilt das Modell als nicht erreichbar. */
const DEFAULT_TIMEOUT_MS = 60_000;

export type ModelCall = {
  /** Die Aufgabe. Enthaelt KEINEN fremden Text - der geht getrennt mit. */
  instruction: string;
  /**
   * Fremder Text - erzaehlte Aufgabe, Lebenslauf, Anzeige.
   *
   * Steht ABSICHTLICH in einer eigenen Nachricht und nicht im Systemteil:
   * Alles, was eine Person geschrieben hat, ist fuer das Modell Stoff und
   * niemals Anweisung. Ein Lebenslauf mit "Ignore previous instructions" darf
   * nichts bewirken - deshalb bekommt das Modell seine Aufgabe, bevor es den
   * Text sieht, und der Text ist sichtbar als Zitat abgegrenzt.
   */
  input: string;
  /** JSON-Schema. Ollama laesst nur noch dazu passende Antworten zu. */
  schema: Record<string, unknown>;
  model?: string;
  timeoutMs?: number;
};

export function getAiModel() {
  return process.env.AI_MODEL?.trim() || DEFAULT_MODEL;
}

function getAiUrl() {
  return process.env.OLLAMA_URL?.trim() || DEFAULT_URL;
}

/**
 * Fragt das Modell und gibt die geparste Antwort zurueck - oder null, wenn es
 * nicht erreichbar war, zu lange gebraucht hat oder etwas Unlesbares kam.
 *
 * Wirft nicht. Eine Modellantwort ist nirgends in diesem Produkt so wichtig,
 * dass ihr Ausbleiben eine Handlung scheitern lassen duerfte.
 */
export async function askModelForJson(call: ModelCall): Promise<unknown | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), call.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(`${getAiUrl()}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        model: call.model ?? getAiModel(),
        stream: false,
        format: call.schema,
        // OHNE DAS DENKT DAS MODELL SICH ZU TODE.
        //
        // qwen3.5 ist ein Thinking-Modell: Es erzeugt vor der Antwort eine
        // Gedankenkette. Gemessen am 20.09.2026 auf einem M3: 19 Sekunden fuer
        // das Wort "Paris", und zusammen mit einem erzwungenen Schema lief
        // jeder Aufruf in den Zeitablauf von 60 Sekunden. Abgeschaltet
        // antwortet dasselbe Modell in viereinhalb.
        //
        // Es passt ausserdem zur Regel, keine verborgenen Gedankenketten zu
        // speichern: Was wir nicht anfordern, koennen wir auch nicht aus
        // Versehen ablegen. Fuer eine Zuordnung mit Belegpflicht ist die
        // Begruendung ohnehin das Zitat und nicht der Denkweg.
        think: false,
        options: {
          // Bei einer Zuordnung ist Einfallsreichtum kein Vorzug. Niedrige
          // Temperatur heisst: zweimal dieselbe Frage, zweimal dieselbe
          // Antwort - sonst waere nichts davon pruefbar.
          temperature: 0.1,
        },
        messages: [
          { role: "system", content: call.instruction },
          {
            role: "user",
            content: `<text>\n${call.input}\n</text>`,
          },
        ],
      }),
    });

    if (!response.ok) return null;

    const payload = (await response.json()) as { message?: { content?: string } };
    const content = payload.message?.content;
    if (!content) return null;

    return JSON.parse(content) as unknown;
  } catch {
    // Laptop aus, Ollama nicht gestartet, Modell nicht geladen, Zeit
    // abgelaufen, unlesbare Antwort - fuer die aufrufende Stelle ist das
    // dasselbe: es gibt gerade keine Modellantwort.
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/** Laeuft das Modell gerade? Fuer die Anzeige und fuer das Auswertungsskript. */
export async function isModelReachable(timeoutMs = 2_000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${getAiUrl()}/api/tags`, { signal: controller.signal });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}
