"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { pauseNotificationsAction } from "@/features/notifications/quietHoursActions";
import { SubmitButton } from "@/features/ui/SubmitButton";

/**
 * "Jetzt Feierabend bis morgen 8 Uhr" - die Uhrzeit rechnet der Browser in der Zeitzone der Person aus,
 * erst nach dem Laden (sonst wuerde Server und Browser verschieden zeichnen).
 */
export function QuietQuickSwitch({ paused, back, compact = false }: { paused: boolean; back: string; compact?: boolean }) {
  const t = useTranslations("notices.quiet");
  const [until, setUntil] = useState("");
  useEffect(() => {
    const next = new Date();
    next.setDate(next.getDate() + (next.getHours() >= 8 ? 1 : 0));
    next.setHours(8, 0, 0, 0);
    queueMicrotask(() => setUntil(next.toISOString()));
  }, []);
  const button = compact
    ? "inline-flex min-h-10 items-center gap-2 rounded-full border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
    : "inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50";
  return (
    <form action={pauseNotificationsAction}>
      <input type="hidden" name="back" value={back} />
      <input type="hidden" name="until" value={paused ? "" : until} />
      <SubmitButton label={paused ? t("resume") : t("pauseUntilMorning")} pendingLabel="…" className={button} />
    </form>
  );
}

/** Die Zeitzone des Browsers fuer das Speichern der Feierabend-Zeiten. */
export function TimezoneInput() {
  const [zone, setZone] = useState("Europe/Berlin");
  useEffect(() => {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (detected) queueMicrotask(() => setZone(detected));
  }, []);
  return <input type="hidden" name="timezone" value={zone} />;
}
