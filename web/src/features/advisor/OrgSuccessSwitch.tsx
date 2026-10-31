import { getTranslations } from "next-intl/server";
import { setSuccessEnabledAction } from "@/features/advisor/teamProgramActions";
import { SubmitButton } from "@/features/ui/SubmitButton";

/** Der Schalter fuer Erfolge, Sterne, Belohnungen und Gespraech zum Stand. Optional, standardmaessig aus. */
export async function OrgSuccessSwitch({ orgId, isOwner, enabled }: { orgId: string; isOwner: boolean; enabled: boolean }) {
  const t = await getTranslations("advisor.teamProgram");
  return (
    <section className="advisor-card p-5 sm:p-6" aria-labelledby="success-switch-title">
      <h2 id="success-switch-title" className="text-xl font-semibold text-slate-950">{t("successSwitchTitle")}</h2>
      <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">{t("successSwitchText")}</p>
      <p className="mt-2 text-sm font-semibold text-slate-900">{enabled ? t("successIsOn") : t("successIsOff")}</p>
      {isOwner ? (
        <form action={setSuccessEnabledAction} className="mt-3">
          <input type="hidden" name="orgId" value={orgId} />
          <input type="hidden" name="enabled" value={enabled ? "no" : "yes"} />
          <SubmitButton
            label={enabled ? t("successTurnOff") : t("successTurnOn")}
            pendingLabel="…"
            className={enabled ? "inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700" : "inline-flex min-h-11 items-center rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white"}
          />
        </form>
      ) : null}
      {enabled ? <p className="mt-2 max-w-2xl text-xs leading-5 text-slate-500">{t("successOffNote")}</p> : null}
    </section>
  );
}
