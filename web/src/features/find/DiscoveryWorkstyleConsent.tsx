import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { saveDiscoveryWorkstyleConsent } from "./discoveryWorkstyleActions";
export async function DiscoveryWorkstyleConsent({ userId, result }: { userId: string; result?: string }) {
  const t = await getTranslations("find.workstyle");
  const { data, error } = await (await createClient()).from("founder_search_preferences")
    .select("workstyle_discovery_enabled,workstyle_discovery_consent_version").eq("user_id", userId).maybeSingle();
  const enabled = data?.workstyle_discovery_enabled && data?.workstyle_discovery_consent_version === "workstyle_discovery_v1";
  return <section id="workstyle" className="mt-10 scroll-mt-24 rounded-2xl border border-slate-200 p-5">
    <h2 className="text-xl font-semibold">{t("consentTitle")}</h2>
    <p className="mt-3 leading-7">{t("consentText")}</p>
    <p className="mt-2 text-sm leading-6">{t("separate")}</p>
    <p className="mt-3 font-medium">{error ? t("loadError") : t(enabled ? "enabled" : "disabled")}</p>
    {result && <p role="status" className="mt-2">{t(result === "saved" ? "saved" : "error")}</p>}
    <form action={saveDiscoveryWorkstyleConsent} className="mt-4">
      <button disabled={Boolean(error)} name="decision" value={enabled ? "disable" : "enable"} className="min-h-11 rounded-xl border border-slate-400 px-4 py-2 disabled:opacity-50">{t(enabled ? "revoke" : "enable")}</button>
    </form>
    <Link href="/me/profile/workstyle" className="mt-3 inline-block text-sm underline">{t("profile")}</Link>
  </section>;
}
