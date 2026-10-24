import { getTranslations } from "next-intl/server";
import type { GuessTallyRound, GuessTallySummary } from "@/features/collaborationLab/guessTally";

/**
 * Die Trefferbilanz - dieselbe in beiden Labs.
 *
 * Read My Mind und Founder in the Wild lassen beide raten, wie der andere
 * antwortet, und verglichen wurde bisher nur Situation fuer Situation. Die
 * Summe ist der Moment, den man mitnimmt.
 *
 * KEINE WERTUNG, KEIN ZIEL, KEINE ZAHL.
 *   Seit dem 24.10.2026 steht auch keine Trefferzahl mehr da ("3 von 5"): Die Seiten sagen "es gibt keine
 *   richtigen Antworten", und eine Zaehlung war ein Punktestand. Es bleibt der Satz, der beschreibt, was die
 *   Einschaetzungen gezeigt haben.
 *   Es steht keine Prozentzahl da und nichts, was nach "gut" oder "schlecht"
 *   aussieht. Zwei Menschen, die sich selten richtig einschaetzen, haben nicht
 *   verloren - sie haben etwas gefunden, worueber sich zu reden lohnt. Genau
 *   das sagt der Text unter der Zahl.
 */
export async function GuessTallyCard({
  round,
  summary,
  partnerName,
  variant = "round",
}: {
  /** Die Bilanz dieser Runde. Null blendet den Runden-Teil aus. */
  round: GuessTallyRound | null;
  /** Alles zusammen - erscheint nur, wenn es mehr als diese eine Runde gibt. */
  summary: GuessTallySummary;
  partnerName: string;
  variant?: "round" | "entry";
}) {
  const t = await getTranslations("collaborationLab.tally");
  const hasHistory = summary.rounds.length > (round ? 1 : 0);
  if (!round && !hasHistory) return null;

  // Der Satz darunter richtet sich danach, wie es gelaufen ist - ohne zu
  // bewerten. "Wenig Treffer" ist die interessantere Lage, nicht die
  // schlechtere.
  const hits = round ? round.ownHits : summary.ownHits;
  const total = round ? round.promptCount : summary.totalPrompts;
  const tone = total === 0 ? "none" : hits === total ? "all" : hits * 2 >= total ? "many" : "few";

  return (
    <section
      className={`rounded-[24px] border border-[#d9cff8] bg-[#f5f2fe] p-6 ${
        variant === "entry" ? "mt-6" : "mt-8"
      } sm:p-8`}
    >
      <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#4a2fb8]">{t("eyebrow")}</p>
      <p className="mt-3 max-w-2xl text-xl font-semibold leading-8 tracking-tight text-[#0b1f3a]">{t(`tone.${tone}`, { name: partnerName })}</p>
    </section>
  );
}
