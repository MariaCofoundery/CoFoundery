import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { IN_APP_NOTICE_KINDS, type InAppNoticeKind } from "@/features/notifications/inAppNotice";

/**
 * Was gerade auf jemanden wartet.
 *
 * NUR DAS UNGELESENE. Ein Hinweis ist kein Verlauf - er sagt "du bist dran",
 * und wenn man dran war, hat er seine Aufgabe erfuellt. Eine Liste, die alles
 * behaelt, ist nach zwei Wochen eine Liste, die niemand mehr ansieht.
 *
 * ES STEHT KEIN TEXT IN DER ZEILE. Die Worte entstehen hier, in der Sprache
 * der LESERIN, aus der Art. Und absichtlich ohne Namen: In Find sieht man
 * einander als das, was im Discovery-Profil steht, und ein Hinweis darf nicht
 * mehr verraten als die Seite, von der er handelt. "Die andere Seite hat
 * ausgefuellt" ist ohnehin das, was zaehlt - wer es war, steht dort, wohin der
 * Hinweis fuehrt.
 */

export type WaitingNotice = {
  id: string;
  kind: InAppNoticeKind;
  path: string;
  createdAt: string;
};

function isKind(value: unknown): value is InAppNoticeKind {
  return typeof value === "string" && (IN_APP_NOTICE_KINDS as readonly string[]).includes(value);
}

export async function getWaitingInAppNotices(client: SupabaseClient): Promise<WaitingNotice[]> {
  const { data, error } = await client
    .from("in_app_notices")
    .select("id, kind, path, created_at")
    .is("read_at", null)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error || !data) return [];

  // Eine Art, die der Code nicht kennt, wird uebersprungen statt angezeigt.
  // Sonst stuende dort ein leerer Platzhalter, wenn die Datenbank einmal
  // weiter ist als diese Fassung der Anwendung.
  return data.flatMap((row) =>
    isKind(row.kind)
      ? [{ id: row.id as string, kind: row.kind, path: row.path as string, createdAt: row.created_at as string }]
      : []
  );
}

/** Fuer die Zahl in der Leiste. Zaehlt, was die Liste zeigen wuerde. */
export async function getWaitingInAppNoticeCount(client: SupabaseClient) {
  const { count, error } = await client
    .from("in_app_notices")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);
  return error ? 0 : (count ?? 0);
}
