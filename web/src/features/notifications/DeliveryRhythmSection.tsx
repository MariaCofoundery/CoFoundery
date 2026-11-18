import { getTranslations } from "next-intl/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { saveDeliveryRhythmAction } from "@/features/notifications/deliveryActions";
import { DEFAULT_DELIVERY_MODE, DELIVERY_MODES, isDeliveryMode, type DeliveryMode } from "@/features/notifications/deliveryRhythm";
import { SubmitButton } from "@/features/ui/SubmitButton";

/**
 * Wie es ankommt (18.11.2026): gebuendelt, sofort oder ruhig - und die Zahl am App-Symbol.
 *
 * Keine Zeile in der Datenbank heisst: gebuendelt, Zahl an. Das steht hier als Standard, nicht als
 * Fehlen. Was jemand bekommt, steht einen Kasten hoeher; hier geht es nur um das WIE.
 */
export type DeliveryRhythm = { mode: DeliveryMode; badge: boolean };

export async function getMyDeliveryRhythm(client: SupabaseClient): Promise<DeliveryRhythm> {
  const { data } = await client.from("notification_delivery_prefs").select("mode, badge").maybeSingle();
  const row = data as { mode?: unknown; badge?: boolean } | null;
  return { mode: isDeliveryMode(row?.mode) ? row.mode : DEFAULT_DELIVERY_MODE, badge: row?.badge !== false };
}

export async function DeliveryRhythmSection({ rhythm, status }: { rhythm: DeliveryRhythm; status: string | null }) {
  const t = await getTranslations("notices.delivery");
  return (
    <section id="rhythmus" className="advisor-card mt-6 scroll-mt-24 p-5 sm:p-6">
      <h2 className="text-lg font-semibold text-slate-950">{t("title")}</h2>
      <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">{t("text")}</p>
      {status === "saved" ? <p role="status" className="mt-3 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{t("saved")}</p> : null}
      {status === "invalid" ? <p role="alert" className="mt-3 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800">{t("invalid")}</p> : null}
      <form action={saveDeliveryRhythmAction} className="mt-4 grid gap-3">
        <fieldset className="grid gap-2">
          <legend className="sr-only">{t("legend")}</legend>
          {DELIVERY_MODES.map((mode) => (
            <label
              key={mode}
              className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-slate-300 bg-white p-3 has-[:checked]:border-2 has-[:checked]:border-violet-500 has-[:checked]:bg-violet-50"
            >
              <input type="radio" name="mode" value={mode} defaultChecked={rhythm.mode === mode} className="mt-0.5 size-5 shrink-0" />
              <span className="grid gap-1">
                <span className="text-[15px] font-semibold text-slate-950">
                  {t(`modes.${mode}.label`)}
                  {mode === DEFAULT_DELIVERY_MODE ? <span className="ml-2 text-xs font-bold text-violet-700">{t("recommended")}</span> : null}
                </span>
                <span className="text-[13px] leading-5 text-slate-700">{t(`modes.${mode}.text`)}</span>
              </span>
            </label>
          ))}
        </fieldset>
        <div className="flex items-start gap-3 border-t border-slate-200 pt-3">
          <input id="badge" type="checkbox" name="badge" value="yes" defaultChecked={rhythm.badge} className="mt-0.5 size-5 shrink-0" />
          <label htmlFor="badge" className="grid min-h-11 gap-1">
            <span className="text-[15px] font-semibold text-slate-950">{t("badge.label")}</span>
            <span className="text-[13px] leading-5 text-slate-700">{t("badge.text")}</span>
          </label>
        </div>
        <p className="text-xs leading-5 text-slate-500">{t("always")}</p>
        <SubmitButton label={t("save")} pendingLabel="…" className="brand-cta inline-flex min-h-11 w-fit items-center rounded-xl px-5 text-sm font-semibold" />
      </form>
    </section>
  );
}
