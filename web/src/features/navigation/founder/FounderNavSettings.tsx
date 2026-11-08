import { getTranslations } from "next-intl/server";
import { FounderIcon } from "@/features/navigation/founder/FounderIcon";
import { FIXED_FOUNDER_KEYS, FOUNDER_AREA_KEYS, orderedFounderKeys, type FounderAreaKey, type FounderNavPrefs } from "@/features/navigation/founder/founderNav";
import { moveFounderNavItemAction, resetFounderNavPrefsAction, toggleFounderNavItemAction } from "@/features/navigation/founder/founderNavPrefsActions";
import { SubmitButton } from "@/features/ui/SubmitButton";

const LABEL: Record<FounderAreaKey, "areaStart" | "areaAlign" | "areaFind" | "areaConnect" | "areaEvents"> = {
  home: "areaStart",
  align: "areaAlign",
  find: "areaFind",
  connect: "areaConnect",
  events: "areaEvents",
};

/**
 * Die Founder-Leiste selbst einrichten (08.11.2026): jeden Bereich ein- oder ausblenden und nach oben oder unten
 * schieben. "Start" bleibt immer. Reine Darstellung: ein ausgeblendeter Bereich bleibt ueber die Suche (⌘K) und
 * Links erreichbar.
 */
export async function FounderNavSettings({ hasConnect, prefs }: { hasConnect: boolean; prefs: FounderNavPrefs | null }) {
  const t = await getTranslations("navigation");
  const ts = await getTranslations("navigation.settings");
  const available = FOUNDER_AREA_KEYS.filter((key) => key !== "connect" || hasConnect);
  const keys = orderedFounderKeys(prefs, available).filter((key) => !FIXED_FOUNDER_KEYS.includes(key));
  const hidden = new Set(prefs?.hidden ?? []);
  const arrow = "grid h-10 w-10 place-items-center rounded-[10px] border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 disabled:opacity-35";

  return (
    <section aria-labelledby="founder-nav-settings-title" className="grid gap-4">
      <div>
        <h2 id="founder-nav-settings-title" className="font-brand text-[24px] font-semibold leading-tight text-slate-950">{ts("title")}</h2>
        <p className="mt-1 max-w-2xl text-[14.5px] leading-6 text-slate-700">{ts("founderText")}</p>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <ul className="grid gap-1.5">
          <li className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2">
            <span className="text-violet-700"><FounderIcon name="home" /></span>
            <span className="min-w-0 flex-1 text-[15px] font-semibold text-slate-950">{t("areaStart")}</span>
            <span className="text-[13px] text-slate-600">{ts("fixed")}</span>
          </li>
          {keys.map((key, index) => {
            const off = hidden.has(key);
            const name = t(LABEL[key]);
            return (
              <li key={key} className={`flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border px-3 py-2 ${off ? "border-dashed border-slate-300 bg-slate-50" : "border-slate-200"}`}>
                <span className={off ? "text-slate-500" : "text-violet-700"}><FounderIcon name={key} /></span>
                <span className={`min-w-0 flex-1 basis-32 text-[15px] ${off ? "text-slate-600" : "font-semibold text-slate-950"}`}>
                  {name}
                  {off ? <span className="ml-2 text-[12.5px] font-medium text-slate-600">· {ts("hiddenBadge")}</span> : null}
                </span>
                <form action={moveFounderNavItemAction}>
                  <input type="hidden" name="key" value={key} /><input type="hidden" name="dir" value="up" />
                  <button type="submit" disabled={index === 0} aria-label={ts("up", { name })} className={arrow}>↑</button>
                </form>
                <form action={moveFounderNavItemAction}>
                  <input type="hidden" name="key" value={key} /><input type="hidden" name="dir" value="down" />
                  <button type="submit" disabled={index === keys.length - 1} aria-label={ts("down", { name })} className={arrow}>↓</button>
                </form>
                <form action={toggleFounderNavItemAction}>
                  <input type="hidden" name="key" value={key} />
                  <SubmitButton
                    label={off ? ts("show") : ts("hide")}
                    pendingLabel="…"
                    className={`inline-flex min-h-10 min-w-24 items-center justify-center rounded-[10px] border px-3 text-[13.5px] font-semibold ${off ? "border-violet-400 bg-violet-50 text-violet-900" : "border-slate-300 bg-white text-slate-800 hover:bg-slate-50"}`}
                  />
                </form>
              </li>
            );
          })}
        </ul>
      </div>
      <form action={resetFounderNavPrefsAction}>
        <SubmitButton label={ts("reset")} pendingLabel="…" className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50" />
      </form>
    </section>
  );
}
