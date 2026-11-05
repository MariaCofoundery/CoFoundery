import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@supabase/supabase-js";
import { getTranslations } from "next-intl/server";
import { deliverPushToUser } from "@/features/notifications/pushDelivery";
import { getNotificationRecipient } from "@/lib/email/notificationRecipient";

/**
 * Teamraum: Mitteilungen aufs Geraet (20270316120000).
 *
 * Den Hinweis in der App legt die Datenbank selbst an - im selben Schritt wie Zuteilen oder
 * Kommentieren. Hier geht nur noch die Mitteilung aufs Geraet raus, an die, die die Datenbank nennt
 * (wer den Hinweis eben bekommen hat und die Art nicht abbestellt hat).
 *
 * AUF DEM SPERRBILDSCHIRM STEHT NUR, DASS ETWAS PASSIERT IST - nie der Titel der Aufgabe, nie ein
 * Team. Dieselbe Regel wie bei allen Mitteilungen (pushDelivery.ts).
 */

type PushKind = "org_task_assigned" | "org_task_comment" | "org_task_due";

async function pushTo(recipientUserId: string, kind: PushKind, path: string, taskId: string) {
  const recipient = await getNotificationRecipient(recipientUserId);
  const t = await getTranslations({ locale: recipient?.locale ?? "de", namespace: "advisor.teamraum.push" });
  const result = await deliverPushToUser(recipientUserId, {
    title: t(`${kind}.title`),
    body: t(`${kind}.body`),
    url: path,
    // Ein zweiter Anlass zur selben Aufgabe ersetzt den ersten auf dem Geraet.
    tag: `${kind}:${taskId}`,
  });
  return result.sent;
}

/** Direkt nach Zuteilen oder Kommentieren. Bewusst stumm: Eine Mitteilung darf die Handlung nicht mitreissen. */
export async function pushOrgTaskNotices(client: SupabaseClient, taskId: string, kind: "org_task_assigned" | "org_task_comment") {
  try {
    const { data, error } = await client.rpc("org_task_push_recipients", { p_task_id: taskId, p_kind: kind });
    if (error || !Array.isArray(data)) return;
    await Promise.all((data as { recipient_user_id: string; path: string }[]).map((row) => pushTo(row.recipient_user_id, kind, row.path, taskId)));
  } catch {
    // Stumm, wie alle Benachrichtigungen.
  }
}

export type OrgTaskDueResult = { ok: true; prepared: number; pushed: number } | { ok: false; reason: "missing_service_role" | "prepare_failed" };

/** Der taegliche Lauf: heute faellige Aufgaben. Die Datenbank stempelt, bevor gesendet wird. */
export async function runOrgTaskDueNotices(limit = 200): Promise<OrgTaskDueResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return { ok: false, reason: "missing_service_role" };
  const client = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data, error } = await client.rpc("prepare_org_task_due_notices", { p_limit: limit });
  if (error) return { ok: false, reason: "prepare_failed" };
  const rows = (data ?? []) as { recipient_user_id: string; task_id: string; path: string; wants_push: boolean }[];
  let pushed = 0;
  for (const row of rows) {
    if (!row.wants_push) continue;
    try {
      pushed += await pushTo(row.recipient_user_id, "org_task_due", row.path, row.task_id);
    } catch {
      // Ein Fehlschlag bei einem Menschen beendet den Lauf nicht.
    }
  }
  return { ok: true, prepared: rows.length, pushed };
}
