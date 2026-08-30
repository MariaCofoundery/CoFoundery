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
  return <section className="rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50/60 via-white to-violet-50/50 p-5 shadow-[0_12px_30px_rgba(76,29,149,0.05)] sm:p-6" aria-labelledby="founder-wild-title">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 id="founder-wild-title" className="text-xl font-semibold text-slate-950">{t("title")}</h2><p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">{t("description")}</p>{status ? <p className="mt-2 text-sm font-semibold text-violet-800">{status}</p> : null}</div>
    {team.members.length === 2 ? <Link href={round ? `${founderInTheWildRoundHref(team.id, round.id)}${round.wholeRoundAnswerComplete ? "/reveal" : ""}` : entry} className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500">{action}</Link> : <p className="text-sm text-slate-500">{t("twoFounders")}</p>}</div>
  </section>;
}
