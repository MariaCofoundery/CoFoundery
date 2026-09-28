import test from "node:test";
import assert from "node:assert/strict";

import { getItemsV21, REGISTRY_V21 } from "@/features/instruments/v21/registryV21";
import { getBehaviourItems, BEHAVIOUR_SET_V21 } from "@/features/instruments/v21/behaviourV21";

/**
 * Was ein Mensch zu sehen bekommt, ist auf Deutsch geschrieben.
 *
 * Es gibt in `web/scripts/check-umlauts.sh` ein Skript für genau das. Es läuft
 * vom Projektwurzelverzeichnis und sucht in `src` - ein Ordner, den es dort
 * nicht gibt, weil er unter `web/` liegt. Es meldet seit jeher „No umlaut
 * fallbacks found“ und hat dabei nie eine Datei angesehen. Ein Prüfwerkzeug,
 * das nicht anschlagen kann, ist schlimmer als keines: Es beruhigt.
 *
 * Deshalb hier ein Test statt einer Reparatur des Skripts. Sein Muster
 * `(ae|oe|ue)` würde an „neue“, „Steuerung“ und „Datei“ hängenbleiben; es ist
 * für Quelltext gedacht und dort hoffnungslos. Was wirklich zählt, ist ein
 * enger Kreis: die Sätze, die auf dem Bildschirm stehen.
 */

/**
 * Wortstämme, in denen ein Umlaut gehört. Bewusst eine Liste und kein
 * allgemeines Muster: „neue“, „Steuer“ und „Freitext“ sind richtig
 * geschrieben, und ein Test, der sie anmeckert, wird abgeschaltet.
 */
const FALLBACKS = [
  "pruef", "moecht", "waer", "fuer", "koenn", "haeuf", "spaet", "zusaetz",
  "aehnl", "ueber", "gruen", "gespraech", "naechst", "laesst", "muess",
  "gehoert", "moegl", "wuensch", "haett", "staend", "aendern", "erklaer",
  "gueltig", "verhaeltnis", "traegt", "faellt", "waehl", "erfuell",
];

/** Jeder Satz, den ein Mensch im Fragebogen liest. */
function readerFacingStrings(): { where: string; text: string }[] {
  const out: { where: string; text: string }[] = [];
  for (const item of getItemsV21()) {
    out.push({ where: `${item.itemId}.prompt`, text: item.prompt });
    if (item.hint) out.push({ where: `${item.itemId}.hint`, text: item.hint });
    for (const option of item.options) {
      out.push({ where: `${option.optionId}`, text: option.label });
    }
    for (const entry of item.missing) {
      out.push({ where: `${item.itemId}.missing.${entry.code}`, text: entry.label });
    }
    for (const concern of item.concerns ?? []) {
      out.push({ where: `${item.itemId}.concern`, text: concern });
    }
    for (const option of item.ratingOptions ?? []) {
      out.push({ where: `${item.itemId}.rating`, text: option });
    }
  }
  for (const item of getBehaviourItems()) {
    out.push({ where: `${item.itemId}.prompt`, text: item.prompt });
    if (item.hint) out.push({ where: `${item.itemId}.hint`, text: item.hint });
    for (const option of item.options) {
      out.push({ where: `${option.optionId}`, text: option.label });
    }
    for (const entry of item.missing) {
      out.push({ where: `${item.itemId}.missing.${entry.code}`, text: entry.label });
    }
  }
  return out;
}

test("kein Text auf dem Bildschirm steht in Umlaut-Ersatzschreibung", () => {
  const wrong: string[] = [];
  for (const { where, text } of readerFacingStrings()) {
    const lower = text.toLowerCase();
    for (const fallback of FALLBACKS) {
      if (lower.includes(fallback)) wrong.push(`${where}: „${text}“ (${fallback})`);
    }
  }
  assert.deepEqual(wrong, []);
});

test("die Prüfung greift überhaupt - Gegenprobe", () => {
  // Ohne diesen Test wäre nicht belegt, dass die Liste anschlägt. Genau das
  // ist dem Umlaut-Skript passiert: Es fand nichts, weil es nichts ansah.
  const kaputt = "Hast du davor geprueft, ob eine zentrale Annahme zutrifft?";
  assert.ok(FALLBACKS.some((fallback) => kaputt.toLowerCase().includes(fallback)));
});

test("die Liste schlägt bei richtig geschriebenem Deutsch NICHT an", () => {
  // Ein Test, der falsch Alarm schlägt, wird abgeschaltet - und dann prüft
  // wieder niemand etwas.
  for (const richtig of [
    "eine neue Richtung", "die Steuerung übernehmen", "ein erstes nutzbares Ergebnis",
    "Freitext", "eine andere Regel – bitte beschreiben", "heute", "die Gruppe",
  ]) {
    for (const fallback of FALLBACKS) {
      assert.ok(!richtig.toLowerCase().includes(fallback), `${richtig} / ${fallback}`);
    }
  }
});

test("jeder Fragetext endet als Frage oder Aufforderung", () => {
  // Eine Frage ohne Fragezeichen ist meist eine, die beim Umformulieren
  // halbiert wurde.
  const odd = getItemsV21()
    .concat(getBehaviourItems() as never[])
    .filter((item) => !/[?.]$/.test(item.prompt.trim()))
    .map((item) => `${item.itemId}: ${item.prompt}`);
  assert.deepEqual(odd, []);
});

test("keine Beschriftung ist leer oder nur ein Zeichen lang", () => {
  const tooShort = readerFacingStrings().filter(({ text }) => text.trim().length < 2);
  assert.deepEqual(tooShort, []);
});

test("die Begründungstexte sind Sätze und keine Stichworte", () => {
  // Sie erscheinen im Exportdokument, das Maria ihrer Gutachterin vorlegt.
  for (const item of getItemsV21()) {
    assert.ok(item.note.trim().length > 15, `${item.itemId}: ${item.note}`);
  }
  for (const item of getBehaviourItems()) {
    assert.ok(item.note.trim().length > 15, `${item.itemId}: ${item.note}`);
  }
  for (const note of REGISTRY_V21.notes.concat(BEHAVIOUR_SET_V21.notes)) {
    assert.ok(note.trim().length > 15);
  }
});
