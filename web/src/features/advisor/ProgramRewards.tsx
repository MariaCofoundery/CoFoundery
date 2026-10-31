import { getLocale, getTranslations } from "next-intl/server";
import { setRewardRedeemedAction } from "@/features/advisor/teamProgramActions";
import type { ProgramReward } from "@/features/advisor/teamProgramData";
import { getPresentationLocale } from "@/i18n/presentationLocale";
import { SubmitButton } from "@/features/ui/SubmitButton";

/**
 * Die Belohnungen der Organisation fuer EIN Team: wie weit es bis zur naechsten ist, was
 * freigeschaltet ist und was eingeloest wurde. Die Plattform vergibt nichts; was passiert, legt
 * die Organisation fest.
 */
export async function ProgramRewards({
  programId,
  rewards,
  mode,
  returnTo,
}: {
  programId: string;
  rewards: ProgramReward[];
  mode: "team" | "org";
  returnTo: string;
}) {
  if (rewards.length === 0) return null;
  const t = await getTranslations("advisor.teamProgram");
  const format = new Intl.DateTimeFormat(getPresentationLocale(await getLocale()), { dateStyle: "medium" });
  const total = rewards[0].starsTotal;
  const next = rewards.find((reward) => !reward.unlockedAt);
  return (
    <section aria-labelledby={`rewards-${programId}`} className="grid gap-3">
      <h3 id={`rewards-${programId}`} className="text-base font-semibold text-slate-950">{t("rewardsTitle")}</h3>
      {next ? (
        <div>
          <p className="text-xs text-slate-600">{t("rewardsNext", { missing: Math.max(0, next.starsNeeded - total), title: next.title })}</p>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuemin={0} aria-valuemax={next.starsNeeded} aria-valuenow={Math.min(total, next.starsNeeded)}>
            <div className="h-full rounded-full bg-amber-400" style={{ width: `${Math.min(100, Math.round((total / next.starsNeeded) * 100))}%` }} />
          </div>
        </div>
      ) : (
        <p className="text-xs text-slate-600">{t("rewardsAll")}</p>
      )}
      <ul className="grid gap-2">
        {rewards.map((reward) => (
          <li key={reward.rewardId} className={`rounded-2xl border px-4 py-3 shadow-[0_1px_2px_rgba(40,30,110,0.05)] ${reward.unlockedAt ? "border-amber-300 bg-amber-50/60" : "border-slate-200 bg-white"}`}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-sm font-semibold text-slate-950">{reward.title}</span>
              <span className="text-sm text-amber-500">{"★"} {reward.starsNeeded}</span>
            </div>
            {reward.description ? <p className="mt-1 text-sm leading-6 text-slate-700">{reward.description}</p> : null}
            <p className="mt-1 text-xs text-slate-600">
              {reward.redeemedAt
                ? t("rewardRedeemed", { date: format.format(new Date(reward.redeemedAt)) })
                : reward.unlockedAt
                  ? t("rewardUnlocked", { date: format.format(new Date(reward.unlockedAt)) })
                  : t("rewardLocked", { count: reward.starsNeeded })}
            </p>
            {mode === "org" && reward.unlockedAt ? (
              <form action={setRewardRedeemedAction} className="mt-1">
                <input type="hidden" name="returnTo" value={returnTo} />
                <input type="hidden" name="programId" value={programId} />
                <input type="hidden" name="rewardId" value={reward.rewardId} />
                <input type="hidden" name="redeemed" value={reward.redeemedAt ? "no" : "yes"} />
                <SubmitButton label={reward.redeemedAt ? t("rewardUndo") : t("rewardRedeem")} pendingLabel="…" className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700" />
              </form>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}
