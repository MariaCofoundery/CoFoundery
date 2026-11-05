import { getTranslations } from "next-intl/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { saveQuietHoursAction } from "@/features/notifications/quietHoursActions";
import { QuietQuickSwitch, TimezoneInput } from "@/features/notifications/QuietQuickSwitch";
import { SubmitButton } from "@/features/ui/SubmitButton";

/**
 * Feierabend im Konto (20270317120000): Zeitfenster, ganze Tage, Schnellschalter. Gilt fuer alle
 * Mitteilungen aufs Geraet; Hinweise und Nachrichten in der App kommen immer an.
 */
export type QuietHours = { enabled: boolean; quietFrom: string | null; quietUntil: string | null; quietDays: number[]; pausedUntil: string | null; quietNow: boolean };

export async function getMyQuietHours(client: SupabaseClient): Promise<QuietHours> {
  const [{ data }, { data: quietNow }] = await Promise.all([
    client.from("notification_quiet_hours").select("enabled, quiet_from, quiet_until, quiet_days, paused_until").maybeSingle(),
    client.rpc("am_i_quiet_now"),
  ]);
  const row = data as { enabled: boolean; quiet_from: string | null; quiet_until: string | null; quiet_days: number[] | null; paused_until: string | null } | null;
  const paused = row?.paused_until && new Date(row.paused_until).getTime() > Date.now() ? row.paused_until : null;
  return {
    enabled: row?.enabled ?? false,
    quietFrom: row?.quiet_from?.slice(0, 5) ?? null,
    quietUntil: row?.quiet_until?.slice(0, 5) ?? null,
    quietDays: row?.quiet_days ?? [],
    pausedUntil: paused,
    quietNow: quietNow === true,
  };
}

// Montag zuerst, wie man eine Woche liest; gespeichert wird 0 = Sonntag.
const WEEK = [1, 2, 3, 4, 5, 6, 0];

export async function QuietHoursSection({ quiet, status, locale }: { quiet: QuietHours; status: string | null; locale: string }) {
  const t = await getTranslations("notices.quiet");
  const time = new Intl.DateTimeFormat(locale, { weekday: "short", hour: "2-digit", minute: "2-digit" });
  return (
    <section id="feierabend" className="advisor-card mt-6 scroll-mt-24 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-slate-950">{t("title")}</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">{t("text")}</p>
        </div>
        <QuietQuickSwitch paused={quiet.pausedUntil !== null} back="/account" />
      </div>
      {quiet.quietNow ? (
        <p role="status" className="mt-3 rounded-xl bg-sky-50 px-4 py-3 text-sm text-sky-900">
          {quiet.pausedUntil ? t("pausedUntil", { time: time.format(new Date(quiet.pausedUntil)) }) : t("quietNow")}
        </p>
      ) : null}
      {status === "saved" || status === "paused" ? <p role="status" className="mt-3 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{t("saved")}</p> : null}
      {status === "invalid" ? <p role="alert" className="mt-3 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800">{t("invalid")}</p> : null}
      <form action={saveQuietHoursAction} className="mt-4 grid gap-4">
        <input type="hidden" name="back" value="/account" />
        <TimezoneInput />
        <label className="flex min-h-11 items-center gap-3 text-sm font-semibold text-slate-900">
          <input type="checkbox" name="enabled" value="yes" defaultChecked={quiet.enabled} className="size-5" />
          {t("enabled")}
        </label>
        <div className="flex flex-wrap items-end gap-3">
          <label>
            <span className="block text-xs font-semibold uppercase tracking-[.12em] text-slate-500">{t("from")}</span>
            <input type="time" name="quietFrom" defaultValue={quiet.quietFrom ?? "18:00"} className="mt-1 min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm" />
          </label>
          <label>
            <span className="block text-xs font-semibold uppercase tracking-[.12em] text-slate-500">{t("until")}</span>
            <input type="time" name="quietUntil" defaultValue={quiet.quietUntil ?? "08:00"} className="mt-1 min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm" />
          </label>
          <p className="pb-3 text-xs text-slate-500">{t("windowHint")}</p>
        </div>
        <fieldset>
          <legend className="text-xs font-semibold uppercase tracking-[.12em] text-slate-500">{t("days")}</legend>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {WEEK.map((day) => (
              <label key={day} className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-full border border-slate-200 bg-white px-3 text-sm text-slate-700 has-[:checked]:border-violet-400 has-[:checked]:bg-violet-50 has-[:checked]:font-semibold">
                <input type="checkbox" name="quietDay" value={day} defaultChecked={quiet.quietDays.includes(day)} className="size-4" />
                {t(`day${day}`)}
              </label>
            ))}
          </div>
        </fieldset>
        <p className="text-xs leading-5 text-slate-500">{t("always")}</p>
        <SubmitButton label={t("save")} pendingLabel="…" className="brand-cta inline-flex min-h-11 w-fit items-center rounded-xl px-5 text-sm font-semibold" />
      </form>
    </section>
  );
}
