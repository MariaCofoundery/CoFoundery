import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getReadMyMindHomebaseState } from "@/features/collaborationLab/readMyMindData";
import type { ReadMyMindTeamContext } from "@/features/collaborationLab/readMyMindModel";
import { createClient } from "@/lib/supabase/server";

export async function ReadMyMindHomebaseCard({ team, currentUserId }: { team: ReadMyMindTeamContext; currentUserId: string }) {
  const [t, supabase] = await Promise.all([getTranslations("collaborationLab.homebase"), createClient()]);
  const state = await getReadMyMindHomebaseState(team, currentUserId, supabase);
  const entry = `/teams/${encodeURIComponent(team.id)}/collaboration-lab/read-my-mind`;
  const partner = state.kind !== "start" && state.kind !== "unsupported" ? state.round.partner.displayName ?? t("partnerFallback") : null;
  const status = state.kind === "start" ? t("status.start") : state.kind === "unsupported" ? t(team.members.length === 3 ? "unsupported" : "unsupportedTeamSize") : t(`status.${state.kind}`, { name: partner ?? t("partnerFallback") });
  const roundHref = state.kind !== "start" && state.kind !== "unsupported" ? `${entry}/${encodeURIComponent(state.round.id)}` : entry;
  const href = state.kind === "reveal_ready" || state.kind === "reveal_waiting" ? `${roundHref}/reveal` : roundHref;
  const action = state.kind === "start" ? t("action.start") : state.kind === "active_continue" ? t("action.continue") : state.kind === "reveal_ready" ? t("action.reveal") : state.kind === "reveal_waiting" ? t("action.check") : t("action.open");
  const historicalRound = state.kind === "unsupported" ? state.completedRound : null;
  return (
    <section className="rounded-2xl border border-violet-200/80 bg-gradient-to-br from-violet-50/90 via-white to-amber-50/60 p-5 shadow-[0_12px_30px_rgba(76,29,149,0.05)] sm:p-6" aria-labelledby="collaboration-lab-title">
      <h2 id="collaboration-lab-title" className="text-xl font-semibold text-slate-950">{t("title")}</h2>
      <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">{t("description")}</p>
      <article className="mt-5 flex flex-col gap-4 rounded-2xl border border-violet-200/70 bg-white/85 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div><div className="flex flex-wrap items-center gap-2"><h3 className="text-lg font-semibold text-slate-950">{t("experience")}</h3><span className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-800">{t("betaLabel")}</span></div><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{t("experienceDescription")}</p><p className="mt-3 text-sm font-medium text-violet-800">{status}</p>{state.kind === "reveal_waiting" ? <p className="mt-1 max-w-2xl text-xs leading-5 text-slate-500">{t("revealWaitingText")}</p> : null}</div>
        <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
          {state.kind !== "unsupported" ? <Link href={href} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-violet-700 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2">{action}</Link> : null}
          {historicalRound ? <Link prefetch={false} href={`${entry}/${encodeURIComponent(historicalRound.id)}/reveal`} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-violet-200 bg-white px-4 py-2 text-sm font-semibold text-violet-800 hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2">{t("action.reviewCompleted")}</Link> : null}
        </div>
      </article>
    </section>
  );
}
