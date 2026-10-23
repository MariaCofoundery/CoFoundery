import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getReadMyMindHomebaseState } from "@/features/collaborationLab/readMyMindData";
import type { ReadMyMindTeamContext } from "@/features/collaborationLab/readMyMindModel";
import { IconTile } from "@/features/ui/Icons";
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
    <section id="collaboration-lab" className="card-lift scroll-mt-24 flex h-full flex-col gap-3 rounded-[24px] border border-[#e4e2f0] bg-white p-6" aria-labelledby="collaboration-lab-title">
      <div className="flex items-center justify-between gap-2">
        <IconTile name="chat" tone="violet" />
        <span className="rounded-full bg-[#fdecc8] px-2.5 py-0.5 text-[13px] font-semibold text-[#7a4300]">{t("betaLabel")}</span>
      </div>
      <h3 id="collaboration-lab-title" className="text-xl font-semibold leading-tight text-[#0b1f3a]">{t("experience")}</h3>
      <p className="text-sm leading-[1.55] text-[#5f5e7a]">{t("experienceDescription")}</p>
      <p className="self-start rounded-full bg-[#f1f0f7] px-2.5 py-0.5 text-[13px] font-semibold text-[#33325e]">{status}</p>
      {state.kind === "reveal_waiting" ? <p className="text-[13px] leading-5 text-[#5f5e7a]">{t("revealWaitingText")}</p> : null}
      <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
        {state.kind !== "unsupported" ? <Link href={href} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[linear-gradient(120deg,#6d49e0,#0a80b8)] px-[18px] text-[15px] font-semibold text-white transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6d49e0] focus-visible:ring-offset-2">{action}</Link> : null}
        {state.kind !== "start" && state.kind !== "unsupported" ? <Link href={entry} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#f1f0f7] px-[18px] text-[15px] font-semibold text-[#0b1f3a] transition hover:bg-[#e9e7f4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6d49e0] focus-visible:ring-offset-2">{t("action.allPacks")}</Link> : null}
        {historicalRound ? <Link prefetch={false} href={`${entry}/${encodeURIComponent(historicalRound.id)}/reveal`} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#f1f0f7] px-[18px] text-[15px] font-semibold text-[#0b1f3a] transition hover:bg-[#e9e7f4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6d49e0] focus-visible:ring-offset-2">{t("action.reviewCompleted")}</Link> : null}
      </div>
    </section>
  );
}
