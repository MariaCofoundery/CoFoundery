"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Feierabend speichern und den Schnellschalter setzen (20270317120000). Rueckweg: ein fester Pfad aus
 * einer kurzen Liste, nie eine uebergebene Adresse.
 */
const BACK = ["/account", "/advisor/organisation"] as const;
const backOf = (formData: FormData, extra: string) => {
  const raw = String(formData.get("back") ?? "");
  const path = BACK.find((entry) => raw === entry || raw.startsWith(`${entry}?`)) ? raw.split("#")[0] : "/account";
  return `${path}${path.includes("?") ? "&" : "?"}${extra}${path === "/account" ? "#feierabend" : ""}`;
};
const timeOrNull = (value: FormDataEntryValue | null) => {
  const text = String(value ?? "").trim();
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(text) ? text : null;
};

async function requireClient() {
  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) redirect("/login?next=/account");
  return client;
}

export async function saveQuietHoursAction(formData: FormData) {
  const client = await requireClient();
  const from = timeOrNull(formData.get("quietFrom"));
  const until = timeOrNull(formData.get("quietUntil"));
  const days = formData.getAll("quietDay").map(Number).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6);
  const timezone = String(formData.get("timezone") ?? "").trim().slice(0, 64) || "Europe/Berlin";
  const { error } = await client.rpc("save_my_quiet_hours", {
    p_enabled: formData.get("enabled") === "yes",
    p_quiet_from: from && until ? from : null,
    p_quiet_until: from && until ? until : null,
    p_quiet_days: days,
    p_timezone: timezone,
  });
  revalidatePath("/account");
  redirect(backOf(formData, error ? "quiet=invalid" : "quiet=saved"));
}

export async function pauseNotificationsAction(formData: FormData) {
  const client = await requireClient();
  const until = String(formData.get("until") ?? "");
  const parsed = until ? new Date(until) : null;
  const { error } = await client.rpc("pause_my_notifications", { p_until: parsed && !Number.isNaN(parsed.getTime()) ? parsed.toISOString() : null });
  revalidatePath("/account");
  revalidatePath("/advisor/organisation");
  redirect(backOf(formData, error ? "quiet=invalid" : "quiet=paused"));
}
