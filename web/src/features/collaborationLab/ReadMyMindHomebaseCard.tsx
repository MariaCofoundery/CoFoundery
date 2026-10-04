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
  const status = state.kind === "start" ? t("status.start") : state.kind === "unsupported" ? t(team.members.length > 2 ? "unsupported" : "unsupportedTeamSize") : state.kind === "forming_invitation" && state.waitingOnYouCount > 1 ? t("status.multiple_waiting_on_you", { count: state.waitingOnYouCount }) : state.kind === "forming_creator_waiting" && state.waitingOnPartnerCount > 1 ? t("status.multiple_waiting_on_partner", { count: state.waitingOnPartnerCount, name: partner ?? t("partnerFallback") }) : t(`status.${state.kind}`, { name: partner ?? t("partnerFallback") });
  const roundHref = state.kind !== "start" && state.kind !== "unsupported" ? `${entry}/${encodeURIComponent(state.round.id)}` : entry;
  const aggregateOverview = state.kind !== "start" && state.kind !== "unsupported" && ((state.kind === "forming_invitation" && state.waitingOnYouCount > 1) || state.kind === "forming_creator_waiting");
  const href = aggregateOverview ? entry : state.kind === "reveal_ready" || state.kind === "reveal_waiting" ? `${roundHref}/reveal` : roundHref;
  const action = state.kind === "start"
    ? t("action.start")
    : state.kind === "forming_creator_continue" || state.kind === "active_continue"
      ? t("action.continue")
      : state.kind === "forming_invitation"
        ? t("action.handoff")
        : state.kind === "forming_creator_waiting"
          ? t("action.packs")
        : state.kind === "reveal_ready"
          ? t("action.reveal")
          : state.kind === "reveal_waiting"
            ? t("action.check")
            : t("action.open");
  const historicalRound = state.kind === "unsupported" ? state.completedRound : null;
  // Seit Phase 9.4B eine ruhige Karte im Bereich "Vertiefen": kein eigener
  // Sammeltitel mehr ("Zusammenarbeit staerken") ueber der einen Erfahrung,
  // keine Verlaufsflaeche. Zustand, Aktionen und Anker sind unveraendert.
  return (
    <section id="collaboration-lab" className="scroll-mt-24 flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5" aria-labelledby="collaboration-lab-title">
      <div className="flex flex-wrap items-center gap-2">
        <h3 id="collaboration-lab-title" className="text-base font-semibold text-slate-950">{t("experience")}</h3>
        <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-600">{t("betaLabel")}</span>
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-600">{t("experienceDescription")}</p>
      <p className="mt-3 text-sm font-medium text-slate-800">{status}</p>
      {state.kind === "reveal_waiting" ? <p className="mt-1 text-xs leading-5 text-slate-500">{t("revealWaitingText")}</p> : null}
      <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
        {state.kind !== "unsupported" ? <Link href={href} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-accent)] focus-visible:ring-offset-2">{action}</Link> : null}
        {state.kind !== "start" && state.kind !== "unsupported" ? <Link href={entry} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-accent)] focus-visible:ring-offset-2">{t("action.allPacks")}</Link> : null}
        {historicalRound ? <Link prefetch={false} href={`${entry}/${encodeURIComponent(historicalRound.id)}/reveal`} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-accent)] focus-visible:ring-offset-2">{t("action.reviewCompleted")}</Link> : null}
      </div>
    </section>
  );
}
