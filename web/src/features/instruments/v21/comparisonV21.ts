import { getItemV21, getItemsV21, REGISTRY_V21 } from "@/features/instruments/v21/registryV21";
import type { ReadableItem } from "@/features/instruments/v21/readoutV21";
import type { ReadoutEntry, ReadoutValue } from "@/features/instruments/v21/readoutV21";

/**
 * Zwei Menschen nebeneinander - nicht gegeneinander verrechnet.
 *
 * ---------------------------------------------------------------------------
 * KEIN GESAMTWERT, UND ZWAR AUSDRÜCKLICH
 * ---------------------------------------------------------------------------
 *
 * Ein globaler Abstandswert könnte eine ausdrückliche Haftungsgrenze durch
 * mehrere harmlose Gemeinsamkeiten verdecken. Zwei Menschen, die sich in zwölf
 * Fragen einig sind und bei der dreizehnten unvereinbar, hätten einen
 * hervorragenden Wert - und würden genau deshalb nicht über die dreizehnte
 * sprechen.
 *
 * ---------------------------------------------------------------------------
 * KEIN GRAD, KEINE STÄRKE
 * ---------------------------------------------------------------------------
 *
 * Es gibt keinen Schwellwert für „deutlich“, „riskant“ oder „unpassend“. Eine
 * andere Antwort ist eine andere Antwort - ob das viel bedeutet, weiß das
 * Gespräch und nicht dieses Modul.
 *
 * UND KEINE ZAHL, AUCH KEINE KLEINE. Hier stand bis zum 29.09.2026 „zwei
 * Stufen auseinander“ - gedacht als Beschreibung, gelesen als Maß. Maria beim
 * Durchsehen der Reportspezifikation: „keine Zahlen im Report, die sind
 * irreführend.“ Sie hat recht: Eine Zahl neben zwei Antworten wird zu der
 * Zahl, über die man spricht, und die beiden Antworten treten dahinter zurück.
 *
 * Der Abstand wird weiterhin BERECHNET - er entscheidet, ob zwei Antworten als
 * gleich oder unterschiedlich gelten. Er verlässt dieses Modul nur nicht mehr.
 *
 * ---------------------------------------------------------------------------
 * „FEHLT“ SIEHT NICHT AUS WIE „PASST NICHT“
 * ---------------------------------------------------------------------------
 *
 * Drei verschiedene Dinge, und die Unterscheidung ist wichtig: Jemand hat
 * einen Auslassungsgrund angegeben (`withheld_by_a`), die Frage ist noch nicht
 * beantwortet (`unanswered_a`), oder die beiden Antworten haben keine
 * gemeinsame Grundlage (`not_comparable`). Wer das zusammenwirft, macht aus
 * einer Entscheidung ein Versäumnis.
 */

export type ComparisonState =
  | "same"
  | "different"
  | "partly_same"
  | "side_by_side"
  | "no_basis";

export type ItemComparison = {
  itemId: string;
  section: string;
  prompt: string;
  a: ReadoutEntry | null;
  b: ReadoutEntry | null;
  state: ComparisonState;
  why:
    | "withheld_a" | "withheld_b" | "withheld_both"
    | "unanswered_a" | "unanswered_b" | "unanswered_both"
    | "no_common_ground"
    | null;
};

/**
 * Der Vergleich - für v2.1 oder für einen der beiden neuen Bögen.
 *
 * `bogen` gibt die Fragen und Abschnitte vor. Ohne Angabe ist es v2.1.
 *
 * WARUM DAS HIER BESONDERS ZAEHLT: Arbeitsprofil und Venture-Alignment werden
 * GETRENNT verglichen. Zwei Menschen können beim Arbeitsprofil
 * nebeneinanderstehen und beim Vorhaben noch gar nichts gesagt haben - beides
 * in eine Liste zu werfen hiesse, eine Luecke im einen als Aussage im anderen
 * zu lesen.
 */
export function compareV21(
  a: Record<string, ReadoutEntry>,
  b: Record<string, ReadoutEntry>,
  bogen?: { items: ReadableItem[]; sections: string[] },
): { section: string; items: ItemComparison[] }[] {
  const fragen = bogen?.items ?? getItemsV21();
  const items = fragen.map((item) =>
    compareItem(item.itemId, a[item.itemId], b[item.itemId], item));

  return (bogen?.sections ?? REGISTRY_V21.sections)
    .map((section) => ({ section, items: items.filter((entry) => entry.section === section) }))
    .filter((group) => group.items.length > 0);
}

function compareItem(
  itemId: string,
  a: ReadoutEntry | undefined,
  b: ReadoutEntry | undefined,
  known?: { itemId: string; section: string; prompt: string },
): ItemComparison {
  const item = known ?? getItemV21(itemId)!;
  const base = {
    itemId,
    section: item.section,
    prompt: item.prompt,
    a: a ?? null,
    b: b ?? null,
  };

  // Erst die Gründe, warum es nichts zu vergleichen gibt - und zwar getrennt,
  // damit „hat nicht geantwortet“ nicht wie „ist anderer Meinung“ aussieht.
  if (!a && !b) return { ...base, state: "no_basis", why: "unanswered_both" };
  if (!a) return { ...base, state: "no_basis", why: "unanswered_a" };
  if (!b) return { ...base, state: "no_basis", why: "unanswered_b" };

  if (a.missing && b.missing) return { ...base, state: "no_basis", why: "withheld_both" };
  if (a.missing) return { ...base, state: "no_basis", why: "withheld_a" };
  if (b.missing) return { ...base, state: "no_basis", why: "withheld_b" };

  if (!a.value || !b.value) return { ...base, state: "no_basis", why: "no_common_ground" };
  if (a.value.kind !== b.value.kind) return { ...base, state: "no_basis", why: "no_common_ground" };

  return compareValues(base, a.value, b.value);
}

function compareValues(
  base: Omit<ItemComparison, "state" | "why">,
  a: ReadoutValue,
  b: ReadoutValue,
): ItemComparison {
  switch (a.kind) {
    case "ordinal": {
      const other = b as typeof a;
      // Eine Stufe daneben ist noch nicht dieselbe Antwort. Der Abstand
      // entscheidet hier - und bleibt hier.
      const steps = Math.abs(a.position - other.position);
      return { ...base, state: steps === 0 ? "same" : "different", why: null };
    }

    case "choice": {
      const other = b as typeof a;
      // Keine Stufenzahl: Zwei Handlungswahlen haben keinen Abstand.
      return { ...base, state: a.label === other.label ? "same" : "different", why: null };
    }

    case "choices": {
      const other = b as typeof a;
      const mine = new Set(a.labels);
      const yours = new Set(other.labels);
      const shared = [...mine].filter((label) => yours.has(label));
      if (shared.length === mine.size && shared.length === yours.size) {
        return { ...base, state: "same", why: null };
      }
      // Teilweise gleich ist ein eigener Zustand. Es als „unterschiedlich“ zu
      // zeigen würde drei geteilte Absicherungen unter den Tisch fallen lassen.
      return { ...base, state: shared.length > 0 ? "partly_same" : "different", why: null };
    }

    case "case": {
      const other = b as typeof a;
      const samePath = a.path === other.path;
      const sameWeight = a.concerns.every(
        (concern, index) =>
          concern.importance.position === other.concerns[index]?.importance.position,
      );
      if (samePath && sameWeight) return { ...base, state: "same", why: null };
      // Derselbe Weg bei anderer Gewichtung ist NICHT dasselbe - und gerade
      // das ist ein Gespräch wert: Zwei Menschen tun dasselbe aus
      // verschiedenen Gründen, und beim nächsten Fall tun sie es nicht mehr.
      return { ...base, state: samePath ? "partly_same" : "different", why: null };
    }

    case "number":
    case "money":
    case "date":
    case "text":
    case "entries":
    case "perEntry":
    case "perPerson":
    case "windows":
      // NEBENEINANDER, NICHT VERRECHNET. 10 Stunden und 30 Stunden sind keine
      // „20 Stunden Abstand“ - sie sind zwei Zusagen, über die zu sprechen
      // ist. Und Beträge in verschiedenen Währungen erst recht nicht.
      return { ...base, state: "side_by_side", why: null };
  }
}

/**
 * Worüber zuerst sprechen.
 *
 * ---------------------------------------------------------------------------
 * NACH ART GEORDNET, NICHT NACH SCHWERE
 * ---------------------------------------------------------------------------
 *
 * Der Unterschied ist wichtig, weil hier vorher bewusst gar nicht sortiert
 * wurde: Eine Rangfolge nach Schwere würde einen Schwellwert behaupten, ab dem
 * ein Unterschied „ernst“ wird - und den gibt es nicht.
 *
 * Diese Gruppen sind keine Schwere, sondern eine Art von Aussage:
 *
 *   `commitment` - konkrete Zusagen und Regeln. Zahlen und Festlegungen, über
 *                  die sich am Dienstag reden lässt.
 *   `preference` - Arbeitspräferenzen. Sie brauchen erst ein Gespräch, bevor
 *                  sie etwas bedeuten.
 *   `shared`     - Gemeinsamkeiten. Sie werden AKTIV gezeigt, nicht nur
 *                  Unterschiede - sonst liest sich jeder Report wie eine
 *                  Mängelliste.
 *
 * Innerhalb jeder Gruppe bleibt die Reihenfolge die des Fragebogens. Kein Rang
 * innerhalb der Gruppe, keine Zahl darüber.
 *
 * Eine MARKIERUNG steht vor allem anderen. Wer sagt „darüber möchte ich
 * sprechen“, hat einen Grund, den kein Vergleich kennt.
 */
export type AgendaKind = "marked" | "commitment" | "preference" | "shared";

export type AgendaEntry = {
  itemId: string;
  section: string;
  prompt: string;
  kind: AgendaKind;
  /** Warum es hier steht - `same` nur bei `shared`. */
  state: ComparisonState;
};

/**
 * Konkrete Zusagen und Regeln - oder Arbeitspräferenz?
 *
 * Am Buchstaben der Kennung, weil der die Herkunft trägt: S(Ziele),
 * R(Ressourcen), G(Regeln), B(Risikogrenzen), W(Prioritäten), L(Grenzen)
 * gehören zum Vorhaben. A/I/E/U/K/T/D/X beschreiben, wie jemand arbeitet.
 */
function kindOf(itemId: string): "commitment" | "preference" {
  return /^[SRGBWL]/.test(itemId) ? "commitment" : "preference";
}

export function agendaV21(
  comparison: { section: string; items: ItemComparison[] }[],
  markedForDiscussion: readonly string[] = [],
): AgendaEntry[] {
  const marked = new Set(markedForDiscussion);
  const gruppen: Record<AgendaKind, AgendaEntry[]> = {
    marked: [], commitment: [], preference: [], shared: [],
  };

  for (const group of comparison) {
    for (const item of group.items) {
      const eintrag = (kind: AgendaKind): AgendaEntry => ({
        itemId: item.itemId,
        section: item.section,
        prompt: item.prompt,
        kind,
        state: item.state,
      });

      if (marked.has(item.itemId)) {
        gruppen.marked.push(eintrag("marked"));
        continue;
      }
      // Was niemand beantwortet hat, steht nicht drauf: Sonst waere die
      // Agenda voll mit Fragen, ueber die es nichts zu sagen gibt.
      if (item.state === "no_basis") continue;

      if (item.state === "same") {
        gruppen.shared.push(eintrag("shared"));
        continue;
      }
      gruppen[kindOf(item.itemId)].push(eintrag(kindOf(item.itemId)));
    }
  }

  return [...gruppen.marked, ...gruppen.commitment, ...gruppen.preference, ...gruppen.shared];
}
