import { getTranslations } from "next-intl/server";
import { setOrgFeaturesAction } from "@/features/advisor/orgActions";
import { ORG_FEATURES, type OrgFeature } from "@/features/advisor/orgFeatures";
import { SubmitButton } from "@/features/ui/SubmitButton";

/**
 * Welche Bereiche die Organisation nutzt. Beim ersten Mal (`setup`) eine kurze Auswahl nach dem Anlegen,
 * danach derselbe Reiter unter "Einrichten". Aus heisst verbergen: die Eintraege bleiben erhalten.
 */
export async function OrgFeaturesForm({
  orgId,
  isOwner,
  enabled,
  setup,
  saved,
}: {
  orgId: string;
  isOwner: boolean;
  enabled: string[];
  setup: boolean;
  saved: boolean;
}) {
  const t = await getTranslations("advisor.org.features");
  return (
    <section aria-labelledby="features-title" className="grid max-w-3xl gap-4">
      <div>
        <h2 id="features-title" className="text-xl font-semibold text-slate-950">{setup ? t("setupTitle") : t("title")}</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">{setup ? t("setupText") : t("text")}</p>
        <p className="mt-2 rounded-xl bg-slate-50 px-4 py-3 text-xs leading-6 text-slate-600">{t("alwaysOn")}</p>
      </div>
      {saved ? <p role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{t("saved")}</p> : null}
      <form action={setOrgFeaturesAction} className="grid gap-3">
        <input type="hidden" name="orgId" value={orgId} />
        {setup ? <input type="hidden" name="setup" value="1" /> : null}
        <ul className="grid gap-2">
          {ORG_FEATURES.map((feature: OrgFeature) => (
            <li key={feature}>
              <label className="advisor-card flex min-h-11 cursor-pointer items-start gap-3 p-4">
                <input type="checkbox" name="feature" value={feature} defaultChecked={enabled.includes(feature)} disabled={!isOwner} className="mt-1 size-5" />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-slate-950">{t(`${feature}Title`)}</span>
                  <span className="mt-0.5 block text-sm leading-6 text-slate-600">{t(`${feature}Text`)}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>
        <p className="text-xs leading-5 text-slate-600">{t("offNote")}</p>
        {isOwner ? (
          <SubmitButton label={setup ? t("saveSetup") : t("save")} pendingLabel="…" className="inline-flex min-h-11 w-fit items-center rounded-xl bg-slate-900 px-5 py-2 text-sm font-semibold text-white" />
        ) : (
          <p className="text-xs text-slate-600">{t("ownerOnly")}</p>
        )}
      </form>
    </section>
  );
}
