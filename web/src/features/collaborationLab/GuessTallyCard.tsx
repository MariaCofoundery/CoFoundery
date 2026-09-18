import { getTranslations } from "next-intl/server";
import type { GuessTallyRound, GuessTallySummary } from "@/features/collaborationLab/guessTally";

/**
 * Die Trefferbilanz - dieselbe in beiden Labs.
 *
 * Read My Mind und Founder in the Wild lassen beide raten, wie der andere
 * antwortet, und verglichen wurde bisher nur Situation fuer Situation. Die
 * Summe ist der Moment, den man mitnimmt.
 *
 * KEINE WERTUNG, KEIN ZIEL.
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

  const headline = round
    ? t("roundHeadline", { hits: round.ownHits, total: round.promptCount, name: partnerName })
    : t("acrossHeadline", { hits: summary.ownHits, total: summary.totalPrompts, name: partnerName });

  // Der Satz darunter richtet sich danach, wie es gelaufen ist - ohne zu
  // bewerten. "Wenig Treffer" ist die interessantere Lage, nicht die
  // schlechtere.
  const hits = round ? round.ownHits : summary.ownHits;
  const total = round ? round.promptCount : summary.totalPrompts;
  const tone = total === 0 ? "none" : hits === total ? "all" : hits * 2 >= total ? "many" : "few";

  return (
    <section
      className={`rounded-[28px] border border-violet-200/80 bg-[linear-gradient(120deg,rgba(124,58,237,.07),rgba(34,211,238,.08))] p-6 ${
        variant === "entry" ? "mt-6" : "mt-8"
      } sm:p-8`}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-700">{t("eyebrow")}</p>
      <p className="mt-3 text-2xl font-semibold leading-9 tracking-tight text-slate-950">{headline}</p>
      <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-700">{t(`tone.${tone}`, { name: partnerName })}</p>

      {round ? (
        <p className="mt-4 text-sm leading-6 text-slate-600">
          {t("otherDirection", { name: partnerName, hits: round.partnerHits, total: round.promptCount })}
        </p>
      ) : null}

      {hasHistory ? (
        <p className="mt-4 border-t border-violet-200/70 pt-4 text-sm leading-6 text-slate-600">
          {t("across", {
            hits: summary.ownHits,
            total: summary.totalPrompts,
            rounds: summary.rounds.length,
          })}
        </p>
      ) : null}
    </section>
  );
}
