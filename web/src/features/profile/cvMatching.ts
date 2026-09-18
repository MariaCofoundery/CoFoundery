import { scoreAreasByTerms } from "@/features/capability/narrativeAnalysis";
import { CV_INDUSTRY_KEYS, INDUSTRY_TERMS, type CvIndustryKey } from "@/features/profile/cvIndustries";

/**
 * Was sich aus einem Lebenslauf herauslesen lässt - regelbasiert.
 *
 * KEIN SPRACHMODELL, und das ist eine Entscheidung:
 *   Ein Lebenslauf ist das dichteste personenbezogene Dokument, das jemand hat
 *   - vollstaendiger Werdegang, oft Adresse, Geburtsdatum, Foto. Er verlaesst
 *   hier das Haus nicht, und nicht einmal den Browser: Diese Funktionen sind
 *   rein und laufen im Client. Es gibt keinen Server, der den Text sieht, und
 *   damit auch nichts, was gespeichert werden koennte.
 *
 * DER PREIS, ehrlich benannt:
 *   Gefunden wird nur, was in den Begriffslisten steht. Bei einem
 *   ungewoehnlichen Werdegang findet das Verfahren wenig. Deshalb ist das
 *   Ergebnis ausdruecklich ein VORSCHLAG: Nichts wird uebernommen, ohne dass
 *   jemand es anhakt, und was fehlt, traegt man wie bisher selbst ein.
 *
 * Und deshalb traegt jeder Vorschlag die Woerter mit, die zu ihm gefuehrt
 * haben. Wer "Vertrieb" vorgeschlagen bekommt, soll sehen, dass "key account"
 * im Text stand - und widersprechen koennen.
 */

export type CvSuggestion = {
  key: string;
  /** Die Woerter, die zu diesem Vorschlag gefuehrt haben. Nie eine Blackbox. */
  matchedTerms: string[];
};

export type CvAnalysis = {
  expertise: CvSuggestion[];
  industries: CvSuggestion[];
};

/**
 * Die Obergrenzen kommen aus dem Profil selbst: `expertise` nimmt acht
 * Eintraege, `industries` fuenf. Mehr vorzuschlagen, als hineinpasst, waere
 * eine Auswahl, die beim Speichern stillschweigend abgeschnitten wird.
 */
export const CV_MAX_EXPERTISE = 8;
export const CV_MAX_INDUSTRIES = 5;

/** Unter dieser Laenge ist ein Text kein Lebenslauf, sondern ein Versehen. */
export const CV_MIN_LENGTH = 200;

function scoreIndustries(text: string, limit: number): CvSuggestion[] {
  const haystack = text.toLocaleLowerCase("de-DE");

  return CV_INDUSTRY_KEYS.map((key: CvIndustryKey) => ({
    key,
    matchedTerms: INDUSTRY_TERMS[key].filter((term) => haystack.includes(term)),
  }))
    .filter((candidate) => candidate.matchedTerms.length > 0)
    .sort(
      (a, b) =>
        b.matchedTerms.length - a.matchedTerms.length ||
        // Bei Gleichstand der spezifischere Begriff, genau wie bei den
        // Bereichen: "medizintechnik" sagt mehr als "klinik".
        Math.max(...b.matchedTerms.map((term) => term.length)) -
          Math.max(...a.matchedTerms.map((term) => term.length))
    )
    .slice(0, limit);
}

export function analyzeCv(text: string): CvAnalysis {
  const trimmed = text.trim();
  if (trimmed.length < CV_MIN_LENGTH) return { expertise: [], industries: [] };

  return {
    expertise: scoreAreasByTerms(trimmed, CV_MAX_EXPERTISE).map((area) => ({
      key: area.areaId,
      matchedTerms: area.matchedTerms,
    })),
    industries: scoreIndustries(trimmed, CV_MAX_INDUSTRIES),
  };
}

/**
 * Angehakte Vorschlaege mit dem verbinden, was schon im Feld steht.
 *
 * Bewusst ERGAENZEND und nicht ersetzend: Was jemand selbst eingetragen hat,
 * ist die bessere Angabe - es waere absurd, eine Begriffsliste ueber die eigene
 * Formulierung eines Menschen zu stellen. Deshalb stehen die bestehenden
 * Eintraege vorn und behalten bei Ueberlauf den Platz.
 */
export function mergeIntoList(existing: string, additions: readonly string[], max: number) {
  const current = existing
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

  const seen = new Set(current.map((entry) => entry.toLocaleLowerCase()));
  for (const addition of additions) {
    const normalized = addition.trim();
    if (!normalized || seen.has(normalized.toLocaleLowerCase())) continue;
    current.push(normalized);
    seen.add(normalized.toLocaleLowerCase());
  }

  return current.slice(0, max).join(", ");
}
