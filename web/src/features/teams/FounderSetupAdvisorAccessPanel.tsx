import { getTranslations } from "next-intl/server";
import {
  confirmFounderSetupAdvisorAccessAction,
  proposeFounderSetupAdvisorAccessAction,
  revokeFounderSetupAdvisorAccessAction,
} from "@/features/teams/founderSetupAdvisorAccessActions";
import type { FounderSetupAdvisorAccess } from "@/features/teams/founderSetupAdvisorAccessModel";
import type { FounderSetupMember } from "@/features/teams/founderSetupModel";

type Props = {
  teamId: string;
  currentUserId: string;
  members: FounderSetupMember[];
  access: FounderSetupAdvisorAccess[];
};

const PRIMARY =
  "inline-flex min-h-10 items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-accent)] focus-visible:ring-offset-2";
const SECONDARY =
  "inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-accent)] focus-visible:ring-offset-2";

export async function FounderSetupAdvisorAccessPanel({
  teamId,
  currentUserId,
  members,
  access,
}: Props) {
  if (access.length === 0) return null;
  const t = await getTranslations("teams.setup");

  return (
    <section
      id="advisor-setup-access"
      aria-labelledby="advisor-setup-access-title"
      className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.04)] sm:p-6"
    >
      <h2 id="advisor-setup-access-title" className="text-xl font-semibold text-slate-950">
        {t("advisorAccess.title")}
      </h2>
      <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
        {t("advisorAccess.description")}
      </p>

      <div className="mt-5 grid gap-4">
        {access.map((entry, advisorIndex) => {
          const advisorName =
            entry.advisorName ??
            t("advisorAccess.advisorFallback", { index: advisorIndex + 1 });
          const currentUserConsented = entry.consentedFounderUserIds.includes(currentUserId);
          return (
            <article
              key={entry.sourceRelationshipAdvisorId}
              className="rounded-xl border border-slate-200 bg-slate-50/70 p-4"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-950">{advisorName}</h3>
                  <p className="mt-1 text-sm text-slate-600">
                    {entry.accessActive
                      ? t("advisorAccess.active")
                      : entry.grantId
                        ? t("advisorAccess.pending")
                        : t("advisorAccess.notShared")}
                  </p>
                </div>
                {entry.accessActive ? (
                  <span className="w-fit rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700">
                    {t("advisorAccess.activeBadge")}
                  </span>
                ) : null}
              </div>

              {entry.grantId ? (
                <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {members.map((member, memberIndex) => {
                    const approved = entry.consentedFounderUserIds.includes(member.userId);
                    const name =
                      member.displayName ??
                      t("founderFallback", { index: memberIndex + 1 });
                    return (
                      <li
                        key={member.userId}
                        className="flex items-center gap-2 text-sm text-slate-700"
                      >
                        <span aria-hidden="true">{approved ? "✓" : "–"}</span>
                        <span>{name}</span>
                        <span className="text-xs text-slate-500">
                          {approved ? t("advisorAccess.approved") : t("advisorAccess.approvalOpen")}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-3">
                {!entry.grantId ? (
                  <form
                    action={proposeFounderSetupAdvisorAccessAction.bind(
                      null,
                      teamId,
                      entry.sourceRelationshipAdvisorId
                    )}
                  >
                    <button type="submit" className={PRIMARY}>
                      {t("advisorAccess.share")}
                    </button>
                  </form>
                ) : !entry.accessActive && !currentUserConsented ? (
                  <form
                    action={confirmFounderSetupAdvisorAccessAction.bind(
                      null,
                      teamId,
                      entry.grantId
                    )}
                  >
                    <button type="submit" className={PRIMARY}>
                      {t("advisorAccess.approve")}
                    </button>
                  </form>
                ) : null}
                {entry.grantId ? (
                  <form
                    action={revokeFounderSetupAdvisorAccessAction.bind(
                      null,
                      teamId,
                      entry.grantId
                    )}
                  >
                    <button type="submit" className={SECONDARY}>
                      {t("advisorAccess.revoke")}
                    </button>
                  </form>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
