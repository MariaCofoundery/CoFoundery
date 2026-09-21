import manifest from "./interviewAudioManifest.json";

/**
 * Welche Texte vorgelesen werden können - und welche nicht.
 *
 * DAS VERZEICHNIS ENTSCHEIDET, nicht die Hoffnung. `scripts/tts-build.ts`
 * schreibt für jeden erzeugten Text einen Eintrag; nur wer einen hat, bekommt
 * einen Vorlese-Knopf. Ein Knopf, der auf eine fehlende Datei zeigt, wäre die
 * unangenehmste Art von Fehler: Man drückt, und es passiert nichts.
 *
 * NUR MP3 GILT. Das Skript legt auch WAV ab, aber als lokalen
 * Zwischenspeicher - zweiunddreißig Texte wären rund vierzehn Megabyte, und
 * die liegen nicht im Repository (siehe .gitignore). Ein Eintrag ohne `mp3`
 * bedeutet deshalb: erzeugt, aber nicht ausgeliefert.
 *
 * UND ES KOSTET ZUR LAUFZEIT NICHTS. Das Verzeichnis ist eine JSON-Datei im
 * Code, die Dateien sind statische Dateien - kein Aufruf beim Stimmdienst,
 * kein Schlüssel in der Produktion, keine Wartezeit. Der Katalog steht fest;
 * genau das macht diese Bauweise möglich.
 */

type AudioEntry = { hash: string; seconds: number; wav: string; mp3?: string };
const entries = manifest as Record<string, Record<string, AudioEntry>>;

export type SpokenText = { src: string; seconds: number };

/**
 * Die Tondatei zu einem Text, oder null.
 *
 * Der Schlüssel folgt dem Sprachbundle: `owned_last.title`,
 * `owned_last.followUps.whatWasYours`.
 */
export function spokenText(locale: string, key: string): SpokenText | null {
  const entry = entries[locale]?.[key];
  if (!entry?.mp3) return null;
  return {
    src: `/audio/interview/${locale}/${entry.mp3}`,
    seconds: entry.seconds,
  };
}

/** Ob für diese Sprache überhaupt etwas vorliegt - für Hinweise in der Oberfläche. */
export function hasSpokenTexts(locale: string) {
  return Object.values(entries[locale] ?? {}).some((entry) => Boolean(entry.mp3));
}
