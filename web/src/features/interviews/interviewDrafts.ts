/**
 * Der Browser-Puffer fuer Interview-Antworten.
 *
 * NUR EIN CRASH-PUFFER. Waehrend des Tippens liegt der Text in
 * `localStorage`, damit ein geschlossenes Fenster, ein leerer Akku oder ein
 * Netzabbruch nichts kostet. Sobald der Server denselben Text bestaetigt hat,
 * gibt es keinen Grund mehr, Freitext auf dem Geraet zu halten - dann wird er
 * geloescht. Ebenso beim Absenden und beim Abmelden.
 *
 * Geloescht wird nur, was der Server nachweislich hat: Wer nach dem Start eines
 * Speicherns weitertippt, behaelt seinen neueren Stand im Puffer.
 */
export const INTERVIEW_DRAFT_PREFIX = "cofoundery.interview.";

type DraftStorage = Pick<Storage, "getItem" | "setItem" | "removeItem" | "key" | "length">;

function storage(): DraftStorage | null {
  // Ein privates Fenster, geloeschte Websitedaten, ein Browser mit
  // abgeschaltetem Speicher: Jeder Zugriff kann werfen, und dann gibt es eben
  // keinen Zwischenstand.
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function draftKey(sessionId: string, turnId: string) {
  return `${INTERVIEW_DRAFT_PREFIX}${sessionId}.${turnId}`;
}

export function readDraft(key: string) {
  try {
    return storage()?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function writeDraft(key: string, value: string) {
  try {
    const store = storage();
    if (!store) return false;
    store.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function clearDraft(key: string) {
  try {
    storage()?.removeItem(key);
  } catch {
    // Nichts zu tun: Ein liegengebliebener Zwischenstand wird beim naechsten
    // Mal ueberschrieben.
  }
}

/**
 * Der Puffer verschwindet, wenn er genau das enthaelt, was auf dem Server
 * steht - nach einem bestaetigten Speichern ebenso wie beim Laden (ein Rest
 * von frueher). Hat jemand inzwischen weitergetippt oder steht im Puffer etwas
 * anderes, bleibt er liegen.
 */
export function clearDraftIfSaved(key: string, savedText: string) {
  const draft = readDraft(key);
  if (draft !== null && draft.trim() === savedText.trim()) clearDraft(key);
}

/** Beim Abmelden: alle Interview-Puffer in diesem Browser. */
export function clearAllInterviewDrafts() {
  try {
    const store = storage();
    if (!store) return;
    for (let index = store.length - 1; index >= 0; index -= 1) {
      const key = store.key(index);
      if (key?.startsWith(INTERVIEW_DRAFT_PREFIX)) store.removeItem(key);
    }
  } catch {
    // Best effort: Abmelden darf daran nicht scheitern.
  }
}
