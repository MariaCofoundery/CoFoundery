import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { getDiscoveryWorkstyleSignals } from "./workstyleSignalData";

export async function DiscoveryWorkstyle({ candidateId, compact = false }: { candidateId: string; compact?: boolean }) {
  const t = await getTranslations("find.workstyle");
  const signals = await getDiscoveryWorkstyleSignals(await createClient(), candidateId);
  const visible = signals.filter(s => s.pattern !== "INSUFFICIENT_DATA");
  if (!visible.length && compact) return null;
  return <section className="mt-4 rounded-2xl border border-slate-200 p-4">
    <h3 className="text-sm font-semibold">{t("title")}</h3>
    {visible.length ? <ul className="mt-2 space-y-3 text-sm">{visible.slice(0, compact ? 2 : 6).map(signal => <li key={signal.area_key}>
      <span className="font-medium">{t(`areas.${signal.area_key}`)}</span><p>{t(signal.pattern)}</p>
    </li>)}</ul> : <p className="mt-2 text-sm">{t("unavailable")}</p>}
    {!compact && <Link className="mt-3 inline-block text-sm underline" href="/discovery/suche#workstyle">{t("settings")}</Link>}
  </section>;
}
