import { getTranslations } from "next-intl/server";
import { saveRewardAction } from "@/features/advisor/teamProgramActions";
import type { OrgReward } from "@/features/advisor/teamProgramData";
import { SubmitButton } from "@/features/ui/SubmitButton";

const FIELD = "mt-1 min-h-11 rounded-xl border border-slate-300 px-3 text-sm";

/** Belohnungen der Organisation: Ab wie vielen Sternen passiert was. Nur der Inhaber aendert sie. */
export async function OrgRewards({ orgId, isOwner, rewards }: { orgId: string; isOwner: boolean; rewards: OrgReward[] }) {
  const t = await getTranslations("advisor.teamProgram");
  return (
    <section aria-labelledby="rewards-editor-title" className="mt-10 grid gap-4">
      <div>
        <h2 id="rewards-editor-title" className="text-xl font-semibold text-slate-950">{t("rewardsEditorTitle")}</h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">{t("rewardsEditorText")}</p>
      </div>
      {isOwner ? (
        <details className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-4">
          <summary className="inline-flex min-h-11 cursor-pointer items-center text-sm font-semibold text-slate-900">{t("rewardNew")}</summary>
          <form action={saveRewardAction} className="mt-3 grid gap-3 sm:grid-cols-[auto_1fr]">
            <input type="hidden" name="orgId" value={orgId} />
            <label>
              <span className="block text-xs text-slate-500">{t("rewardStars")}</span>
              <input name="stars" type="number" min={1} max={200} defaultValue={10} required className={`${FIELD} w-24`} />
            </label>
            <label>
              <span className="block text-xs text-slate-500">{t("rewardTitle")}</span>
              <input name="title" required maxLength={120} className={`${FIELD} w-full`} />
            </label>
            <label className="sm:col-span-2">
              <span className="block text-xs text-slate-500">{t("rewardDescription")}</span>
              <textarea name="description" rows={2} maxLength={500} className={`${FIELD} w-full py-2`} />
            </label>
            <SubmitButton label={t("catalogAdd")} pendingLabel="…" className="inline-flex min-h-11 w-fit items-center rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white" />
          </form>
        </details>
      ) : null}
      {rewards.length === 0 ? <p className="rounded-2xl border border-dashed border-slate-300 px-4 py-5 text-sm text-slate-600">{t("rewardsEmpty")}</p> : null}
      <ul className="grid gap-2">
        {rewards.map((reward) => (
          <li key={reward.rewardId} className={`rounded-2xl border border-slate-200 bg-white px-4 py-3 ${reward.active ? "" : "opacity-60"}`}>
            {isOwner ? (
              <form action={saveRewardAction} className="grid gap-2 sm:grid-cols-[auto_1fr_auto] sm:items-end">
                <input type="hidden" name="orgId" value={orgId} />
                <input type="hidden" name="rewardId" value={reward.rewardId} />
                <input type="hidden" name="activeFlag" value="1" />
                <label>
                  <span className="block text-xs text-slate-500">{t("rewardStars")}</span>
                  <input name="stars" type="number" min={1} max={200} defaultValue={reward.starsNeeded} className={`${FIELD} w-24`} />
                </label>
                <label>
                  <span className="block text-xs text-slate-500">{t("rewardTitle")}</span>
                  <input name="title" maxLength={120} defaultValue={reward.title} className={`${FIELD} w-full`} />
                </label>
                <select name="active" defaultValue={reward.active ? "yes" : "no"} aria-label={t("catalogActive")} className={FIELD}>
                  <option value="yes">{t("catalogOn")}</option>
                  <option value="no">{t("catalogOff")}</option>
                </select>
                <label className="sm:col-span-3">
                  <span className="block text-xs text-slate-500">{t("rewardDescription")}</span>
                  <textarea name="description" rows={2} maxLength={500} defaultValue={reward.description ?? ""} className={`${FIELD} w-full py-2`} />
                </label>
                <SubmitButton label={t("catalogSave")} pendingLabel="…" className="inline-flex min-h-11 w-fit items-center rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700" />
              </form>
            ) : (
              <p className="text-sm text-slate-900"><span className="text-amber-500">★ {reward.starsNeeded}</span> · {reward.title}</p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
