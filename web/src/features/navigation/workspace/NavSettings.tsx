import { getTranslations } from "next-intl/server";
import { WorkspaceIcon } from "@/features/navigation/workspace/WorkspaceIcon";
import { moveNavItemAction, resetNavPrefsAction, toggleNavItemAction } from "@/features/navigation/workspace/navPrefsActions";
import { FIXED_NAV_KEYS, buildWorkspaceNav, orderedGroups, type NavPrefs } from "@/features/navigation/workspace/workspaceNav";
import { SubmitButton } from "@/features/ui/SubmitButton";

/**
 * Die Seitenleiste selbst einrichten (08.11.2026): jede Station ein- oder ausblenden und nach oben oder unten schieben.
 * "Heute" und "Einrichten" bleiben immer. Reine Darstellung: ausgeblendete Stationen bleiben ueber die Suche (⌘K) und
 * Links erreichbar. Im Onboarding ein Schritt, sonst unter "Seitenleiste anpassen".
 */
export async function NavSettings({ hasOrg, prefs, orgId, back, error = false }: { hasOrg: boolean; prefs: NavPrefs | null; orgId: string | null; back?: "setup"; error?: boolean }) {
  const t = await getTranslations("navigation.workspace");
  const ts = await getTranslations("navigation.settings");
  const nav = buildWorkspaceNav({ hasOrg });
  const groups = orderedGroups(nav, prefs);
  const hidden = new Set(prefs?.hidden ?? []);
  const fields = (key: string, extra: Record<string, string> = {}) => (
    <>
      <input type="hidden" name="key" value={key} />
      <input type="hidden" name="hasOrg" value={hasOrg ? "1" : "0"} />
      {orgId ? <input type="hidden" name="orgId" value={orgId} /> : null}
      {back ? <input type="hidden" name="back" value={back} /> : null}
      {Object.entries(extra).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}
    </>
  );
  const arrow = "grid h-10 w-10 place-items-center rounded-[10px] border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 disabled:opacity-35";

  return (
    <section aria-labelledby="nav-settings-title" className="grid gap-4">
      <div>
        <h2 id="nav-settings-title" className="font-brand text-[24px] font-semibold leading-tight text-slate-950">{ts("title")}</h2>
        <p className="mt-1 max-w-2xl text-[14.5px] leading-6 text-slate-700">{ts("text")}</p>
      </div>
      {error ? <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-900">{ts("error")}</p> : null}
      {[{ key: "home", items: [nav.home] }, ...groups].map((group) => (
        <div key={group.key} className="rounded-2xl border border-slate-200 bg-white p-4">
          {group.key !== "home" ? <h3 className="mb-2 text-xs font-bold uppercase tracking-[0.08em] text-slate-600">{t(`groups.${group.key}`)}</h3> : null}
          <ul className="grid gap-1.5">
            {group.items.map((item, index) => {
              const fixed = (FIXED_NAV_KEYS as string[]).includes(item.key);
              const off = hidden.has(item.key);
              return (
                <li key={item.key} className={`flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border px-3 py-2 ${off ? "border-dashed border-slate-300 bg-slate-50" : "border-slate-200"}`}>
                  <span className={off ? "text-slate-500" : "text-violet-700"}><WorkspaceIcon name={item.icon} size={20} /></span>
                  <span className={`min-w-0 flex-1 basis-32 text-[15px] ${off ? "text-slate-600" : "font-semibold text-slate-950"}`}>{t(`items.${item.key}`)}{off ? <span className="ml-2 text-[12.5px] font-medium text-slate-600">· {ts("hiddenBadge")}</span> : null}</span>
                  {fixed ? (
                    <span className="text-[13px] text-slate-600">{ts("fixed")}</span>
                  ) : (
                    <>
                      {group.key !== "home" ? (
                        <>
                          <form action={moveNavItemAction}>{fields(item.key, { dir: "up" })}<button type="submit" disabled={index === 0} aria-label={ts("up", { name: t(`items.${item.key}`) })} className={arrow}>↑</button></form>
                          <form action={moveNavItemAction}>{fields(item.key, { dir: "down" })}<button type="submit" disabled={index === group.items.length - 1} aria-label={ts("down", { name: t(`items.${item.key}`) })} className={arrow}>↓</button></form>
                        </>
                      ) : null}
                      <form action={toggleNavItemAction}>
                        {fields(item.key)}
                        <SubmitButton label={off ? ts("show") : ts("hide")} pendingLabel="…" className={`inline-flex min-h-10 min-w-24 items-center justify-center rounded-[10px] border px-3 text-[13.5px] font-semibold ${off ? "border-violet-400 bg-violet-50 text-violet-900" : "border-slate-300 bg-white text-slate-800 hover:bg-slate-50"}`} />
                      </form>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
      {nav.setup ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <ul>
            <li className="flex items-center gap-3 px-3 py-2">
              <span className="text-violet-700"><WorkspaceIcon name={nav.setup.icon} size={20} /></span>
              <span className="min-w-0 flex-1 text-[15px] font-semibold text-slate-950">{t("items.setup")}</span>
              <span className="text-[13px] text-slate-600">{ts("fixed")}</span>
            </li>
          </ul>
        </div>
      ) : null}
      <form action={resetNavPrefsAction}>
        {orgId ? <input type="hidden" name="orgId" value={orgId} /> : null}
        {back ? <input type="hidden" name="back" value={back} /> : null}
        <SubmitButton label={ts("reset")} pendingLabel="…" className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50" />
      </form>
    </section>
  );
}
