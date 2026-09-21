import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(path, "utf8");
/** Ohne Kommentare - sonst findet die Pruefung Begriffe in ihrer Begruendung. */
const codeOnly = (path: string) =>
  source(path)
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

const WILD_ACTIONS = "src/features/founderInTheWild/founderInTheWildActions.ts";
const RMM_ACTIONS = "src/features/collaborationLab/readMyMindActions.ts";
const BUTTON = "src/features/collaborationLab/ConversationMarkerButton.tsx";
const WILD_CARD =
  "src/app/(product)/teams/[teamId]/collaboration-lab/founder-in-the-wild/[roundId]/reveal/[position]/page.tsx";
const RMM_CARD =
  "src/app/(product)/teams/[teamId]/collaboration-lab/read-my-mind/[roundId]/reveal/[position]/page.tsx";

// ---------------------------------------------------------------------------
// Zwei Reibungen im Reveal
// ---------------------------------------------------------------------------
//
// GEMELDET AM 21.09.2026, nach einem Durchlauf mit zwei Profilen:
//
//   "Immer wenn ich geklickt habe, darüber möchte ich sprechen, hat er diese
//    Seite im Prinzip noch mal ein bisschen neu geladen. Und das war irgendwie
//    ein unangenehmes User-Gefühl."
//
//   "Da musstest du immer noch mal so einen Zwischenschritt machen mit jetzt
//    wieder aufdecken und okay, nächstes und dann musst du das auch wieder
//    aufdecken, obwohl du ja schon zu Anfang gesagt hast, dass du aufdecken
//    willst. Ich fand, das war ein bisschen zu viele Schritte."

test("das Markieren leitet nicht mehr auf dieselbe Seite um", () => {
  // DIE URSACHE DES NEULADENS: Beide Aktionen endeten mit einem `redirect()`
  // auf dieselbe Adresse plus `#conversation-marker`. Das ist eine echte
  // Navigation samt Sprung zum Anker - für einen Knopf, der nur an oder aus
  // ist. `revalidatePath` allein baut die Serverkomponenten neu und flickt den
  // Baum: kein Sprung, kein Neuaufbau.
  for (const path of [WILD_ACTIONS, RMM_ACTIONS]) {
    assert.doesNotMatch(codeOnly(path), /#conversation-marker/, path);
  }
});

test("der Knopf zeigt sofort das Ziel, bleibt aber ein echtes Formular", () => {
  const button = codeOnly(BUTTON);
  // Sofort: Während es läuft, steht schon der neue Stand da. Ein Schalter, der
  // nach dem Drücken noch das Alte anzeigt, fühlt sich kaputt an.
  assert.match(button, /pending \? !marked : marked/);
  // Und trotzdem ein echtes Formular: Die Aktion des Formulars bleibt die
  // Server-Aktion. Mit `useOptimistic` müsste dort eine Client-Funktion
  // stehen - und die tut ohne Javascript nichts.
  assert.match(button, /useFormStatus/);
  assert.doesNotMatch(button, /useOptimistic/);
  assert.match(button, /type="submit"/);

  // Beide Erlebnisse benutzen ihn, und die Formular-Aktion ist weiter die
  // gebundene Server-Aktion.
  for (const [path, action] of [
    [WILD_CARD, "unmarkFounderInTheWildConversationAction"],
    [RMM_CARD, "unmarkReadMyMindConversationAction"],
  ] as const) {
    const card = codeOnly(path);
    assert.match(card, /<ConversationMarkerButton/, path);
    assert.match(card, new RegExp(`action=\\{\\(ownMarked \\? ${action}`), path);
  }
});

test("weiter deckt auf, wenn die nächste Karte noch versiegelt ist", () => {
  // Wer auf "nächste" drückt, will sie sehen. Das Siegel bleibt als Moment
  // erhalten - beim ERSTEN Aufdecken auf der Übersicht. Ab dann ist es ein
  // Schritt statt zwei.
  for (const path of [WILD_CARD, RMM_CARD]) {
    const card = codeOnly(path);
    assert.match(card, /round\.openedPromptPositions\.includes\(next\)/, path);
    assert.match(card, /nextAndOpen/, path);
  }
  // Der Beleg entsteht weiterhin je Karte: Es ist dieselbe Aktion wie beim
  // Aufdecken auf der Übersicht, nur mit der nächsten Position. Ohne ihn
  // könnte die Runde nicht abgeschlossen werden, denn das verlangt ihn von
  // beiden Seiten für jede Karte.
  assert.match(codeOnly(WILD_CARD), /openFounderInTheWildRevealAction\.bind\(null, teamId, roundId, next\)/);
  assert.match(codeOnly(RMM_CARD), /openReadMyMindRevealAction\.bind\(null, teamId, roundId, next\)/);
});

test("beide Sprachen haben die neuen Sätze", () => {
  for (const locale of ["de", "en"]) {
    for (const bundle of ["founderInTheWild", "collaborationLab"]) {
      const messages = JSON.parse(
        readFileSync(`messages/${locale}/${bundle}.json`, "utf8")
      ) as { reveal: Record<string, string> };
      assert.ok(messages.reveal.nextAndOpen, `${locale}/${bundle}: nextAndOpen fehlt`);
      assert.ok(messages.reveal.opening, `${locale}/${bundle}: opening fehlt`);
    }
  }
});
