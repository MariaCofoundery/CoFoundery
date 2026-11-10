"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { HOLIDAY_COOKIE, isHolidayState, serializeHolidayPrefs } from "@/features/advisor/calendar/holidaysModel";

/** Bundesland und Auswahl merken (Cookie, nur Darstellung). Zurueck geht es nur in den Kalender. */
export async function setCalendarHolidaysAction(formData: FormData) {
  const state = formData.get("state");
  const publicHolidays = formData.get("publicHolidays") === "on";
  const school = formData.get("school") === "on";
  const store = await cookies();
  if (isHolidayState(state) && (publicHolidays || school)) {
    store.set(HOLIDAY_COOKIE, serializeHolidayPrefs({ state, publicHolidays, school }), { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  } else {
    store.delete(HOLIDAY_COOKIE);
  }
  const back = String(formData.get("back") ?? "");
  redirect(/^\/advisor\/kalender(\?[^#]*)?$/.test(back) ? back : "/advisor/kalender");
}
