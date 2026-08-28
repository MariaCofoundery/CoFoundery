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
  const status = state.kind === "start" ? t("status.start") : state.kind === "unsupported" ? t("unsupported") : t(`status.${state.kind}`, { name: partner ?? t("partnerFallback") });
  const href = state.kind !== "start" && state.kind !== "unsupported" ? `${entry}/${encodeURIComponent(state.round.id)}` : entry;
  const action = state.kind === "start" ? t("action.start") : state.kind === "active_continue" ? t("action.continue") : t("action.open");
  return (
    <section className="rounded-2xl border border-violet-200/80 bg-gradient-to-br from-violet-50/90 via-white to-amber-50/60 p-5 shadow-[0_12px_30px_rgba(76,29,149,0.05)] sm:p-6" aria-labelledby="collaboration-lab-title">
      <h2 id="collaboration-lab-title" className="text-xl font-semibold text-slate-950">{t("title")}</h2>
      <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">{t("description")}</p>
      <article className="mt-5 flex flex-col gap-4 rounded-2xl border border-violet-200/70 bg-white/85 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div><h3 className="text-lg font-semibold text-slate-950">{t("experience")}</h3><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{t("experienceDescription")}</p><p className="mt-3 text-sm font-medium text-violet-800">{status}</p></div>
        {state.kind !== "unsupported" ? <Link href={href} className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl bg-violet-700 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2">{action}</Link> : null}
      </article>
    </section>
  );
}
