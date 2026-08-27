import { getTranslations } from "next-intl/server";
import type { FounderTeamHomebase } from "@/features/teams/founderTeamHomebaseModel";
import {
  approveRelationshipAdvisorFromTeamAction,
  proposeRelationshipAdvisorFromTeamAction,
  revokeRelationshipAdvisorFromTeamAction,
  sendRelationshipAdvisorInviteFromTeamAction,
} from "@/features/teams/founderRelationshipAdvisorActions";

const PRIMARY = "inline-flex min-h-10 items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-accent)] focus-visible:ring-offset-2";
const SECONDARY = "inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-accent)] focus-visible:ring-offset-2";

export async function FounderRelationshipAdvisorPanel({
  team,
  currentUserId,
  names,
}: {
  team: FounderTeamHomebase;
  currentUserId: string;
  names: Map<string, string>;
}) {
  const t = await getTranslations("teams.homebase.advisor");
  const manageable = team.alignment.filter((entry) => entry.sourceInvitationId);
  if (manageable.length === 0) return null;

  return (
    <section id="relationship-advisor-access" className="scroll-mt-24 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.04)] sm:p-6" aria-labelledby="team-advisor-title">
      <h2 id="team-advisor-title" className="text-xl font-semibold text-slate-950">{t("title")}</h2>
      <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">{t("description")}</p>
      <div className="mt-5 grid gap-4">
        {manageable.map((relationship) => {
          const advisor = team.advisors.find((entry) => entry.relationshipId === relationship.relationshipId);
          const [founderAId, founderBId] = relationship.participantUserIds;
          const currentIsFounderA = founderAId === currentUserId;
          const currentApproved = advisor ? (currentIsFounderA ? advisor.founderAApproved : advisor.founderBApproved) : false;
          const otherApproved = advisor ? (currentIsFounderA ? advisor.founderBApproved : advisor.founderAApproved) : false;
          const otherName = names.get(currentIsFounderA ? founderBId : founderAId) ?? t("otherFounder");
          const invitationId = relationship.sourceInvitationId as string;
          return (
            <article key={relationship.relationshipId} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
              <p className="text-sm font-semibold text-slate-950">{names.get(founderAId) ?? t("founderA")} &amp; {names.get(founderBId) ?? t("founderB")}</p>
              {!advisor ? (
                <form action={proposeRelationshipAdvisorFromTeamAction.bind(null, team.id, invitationId, relationship.relationshipId)} className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label className="text-sm font-medium text-slate-700">{t("name")}<input name="advisorName" type="text" className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2" /></label>
                  <label className="text-sm font-medium text-slate-700">{t("email")}<input name="advisorEmail" type="email" required className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2" /></label>
                  <button type="submit" className={`${PRIMARY} sm:col-span-2 sm:w-fit`}>{t("propose")}</button>
                </form>
              ) : (
                <div className="mt-3">
                  <p className="text-sm font-medium text-slate-900">{advisor.advisorName || t("advisorFallback")}</p>
                  <p className="mt-2 text-sm text-slate-600">
                    {advisor.status === "linked" ? t("states.linked") : advisor.status === "revoked" ? t("states.revoked") : currentApproved && !otherApproved ? t("states.waitingOther", { name: otherName }) : !currentApproved ? t("states.needsYourApproval") : advisor.status === "invited" ? t("states.invited") : t("states.approved")}
                  </p>
                  {currentApproved && !otherApproved ? <p className="mt-1 text-xs text-slate-500">{t("ownApprovalSaved")}</p> : null}
                  <div className="mt-4 flex flex-wrap gap-3">
                    {!currentApproved && advisor.status !== "revoked" ? <form action={approveRelationshipAdvisorFromTeamAction.bind(null, team.id, invitationId, relationship.relationshipId, advisor.id)}><button className={PRIMARY} type="submit">{t("approve")}</button></form> : null}
                    {advisor.founderAApproved && advisor.founderBApproved && (advisor.status === "approved" || advisor.status === "invited") ? <form action={sendRelationshipAdvisorInviteFromTeamAction.bind(null, team.id, invitationId, relationship.relationshipId, advisor.id, team.teamContext)}><button className={PRIMARY} type="submit">{advisor.status === "invited" ? t("resend") : t("invite")}</button></form> : null}
                    {advisor.status !== "revoked" ? <details className="w-full"><summary className="w-fit cursor-pointer text-sm font-medium text-slate-700 underline decoration-slate-300 underline-offset-4">{t("revoke")}</summary><p className="mt-2 max-w-2xl text-xs leading-5 text-slate-600">{t("revokeDescription")}</p><form action={revokeRelationshipAdvisorFromTeamAction.bind(null, team.id, invitationId, relationship.relationshipId, advisor.id)} className="mt-3"><button className={SECONDARY} type="submit">{t("confirmRevoke")}</button></form></details> : null}
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
