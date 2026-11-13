import { WORKSTYLE_PRETEST_V5, type WorkstyleItem } from "@/features/instruments/workstyle/registry";

/**
 * Testhilfe Fassung 5: die Antwortoption einer Zweierwahl, die auf der linken oder rechten Seite ihres Bereichs liegt.
 * A/B sind bei jeder Frage anders verteilt - ein Profil, das "unten" oder "oben" antworten soll, wechselt deshalb je Frage.
 * Facette A von ORG (Struktur/Fluss) hat keine Achse: links = A, rechts = B.
 */
export function optionOnSide(item: WorkstyleItem, side: "left" | "right", strong = false): string {
  const sides = WORKSTYLE_PRETEST_V5.pole_sides?.[item.area_key ?? ""];
  const a = item.poles ? sides?.[item.poles.A] : undefined;
  const pickA = a ? a === side : side === "left";
  return `${strong ? "strong" : "lean"}_${pickA ? "a" : "b"}`;
}
