import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { findOpenFounderInTheWildRound, getFounderInTheWildTeam } from "./founderInTheWildData";
import type { FounderInTheWildTeam } from "./founderInTheWildModel";
import { founderInTheWildEntryHref, founderInTheWildRoundHref } from "./founderInTheWildRoutes";
import { IconTile } from "@/features/ui/Icons";
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
  return <section id="founder-in-the-wild" className="card-lift scroll-mt-24 flex h-full flex-col gap-3 rounded-[24px] border border-[#e4e2f0] bg-white p-6" aria-labelledby="founder-wild-title">
    <div className="flex items-center justify-between gap-2"><IconTile name="game" tone="blue" /></div>
    <h3 id="founder-wild-title" className="text-xl font-semibold leading-tight text-[#0b1f3a]">{t("title")}</h3>
    <p className="text-sm leading-[1.55] text-[#5f5e7a]">{t("description")}</p>
    {status ? <p className="self-start rounded-full bg-[#f1f0f7] px-2.5 py-0.5 text-[13px] font-semibold text-[#33325e]">{status}</p> : null}
    <div className="mt-auto pt-1">
      {team.members.length === 2 ? <Link href={round ? `${founderInTheWildRoundHref(team.id, round.id)}${round.wholeRoundAnswerComplete ? "/reveal" : ""}` : entry} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[linear-gradient(120deg,#6d49e0,#0a80b8)] px-[18px] text-[15px] font-semibold text-white transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6d49e0] focus-visible:ring-offset-2">{action}</Link> : <p className="text-sm text-[#5f5e7a]">{t("twoFounders")}</p>}
    </div>
  </section>;
}
