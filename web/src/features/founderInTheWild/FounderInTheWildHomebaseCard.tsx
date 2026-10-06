import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { findOpenFounderInTheWildRound, getFounderInTheWildTeam } from "./founderInTheWildData";
import type { FounderInTheWildTeam } from "./founderInTheWildModel";
import { founderInTheWildEntryHref, founderInTheWildRoundHref } from "./founderInTheWildRoutes";
import { createClient } from "@/lib/supabase/server";

export async function FounderInTheWildHomebaseCard({ team, currentUserId }: { team: FounderInTheWildTeam; currentUserId: string }) {
  const [t, supabase] = await Promise.all([getTranslations("founderInTheWild.homebase"), createClient()]);
  const context = await getFounderInTheWildTeam(team.id, currentUserId, supabase);
  const round = context ? await findOpenFounderInTheWildRound(context, currentUserId, supabase) : null;
  const entry = founderInTheWildEntryHref(team.id);
  const partnerName = round?.partner.displayName ?? t("partnerFallback");
  const ownRevealComplete = Boolean(
    round && round.openedPromptPositions.length === round.prompts.length
  );
  const status = round?.wholeRoundAnswerComplete
    ? ownRevealComplete
      ? t("completed")
      : t("revealReady")
    : round?.partnerAnswerComplete && !round.ownAnswerComplete
      ? t("yourTurn")
      : round?.ownAnswerComplete
        ? t("partnerTurn", { name: partnerName })
        : null;
  const action = !round
    ? t("action")
    : round.wholeRoundAnswerComplete
      ? ownRevealComplete
        ? t("view")
        : t("reveal")
      : round.ownAnswerComplete
      ? t("status")
      : round.partnerAnswerComplete && !round.ownStarted
        ? t("answer")
        : t("continue");
  // Seit Phase 9.4B dieselbe ruhige Karte wie Read My Mind im Bereich
  // "Vertiefen" (h3 unter der Bereichsueberschrift). Zustand und Aktion sind
  // unveraendert; ohne genau zwei Founder bleibt der ehrliche Hinweis.
  return <section id="founder-in-the-wild" className="scroll-mt-24 flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5" aria-labelledby="founder-wild-title">
    <h3 id="founder-wild-title" className="text-base font-semibold text-slate-950">{t("title")}</h3>
    <p className="mt-2 text-sm leading-6 text-slate-600">{t("description")}</p>
    {status ? <p className="mt-3 text-sm font-medium text-slate-800">{status}</p> : null}
    <div className="mt-auto pt-4">
      {team.members.length === 2 ? <Link href={round ? `${founderInTheWildRoundHref(team.id, round.id)}${round.wholeRoundAnswerComplete ? "/reveal" : ""}` : entry} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-accent)] focus-visible:ring-offset-2">{action}</Link> : <p className="text-sm text-slate-500">{t("twoFounders")}</p>}
    </div>
  </section>;
}
