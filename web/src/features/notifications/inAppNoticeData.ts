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
  /** Nur fuer Arten, deren Text etwas nennt (heute: die Organisation beim Programm-Hinweis). */
  orgName?: string;
};

function isKind(value: unknown): value is InAppNoticeKind {
  return typeof value === "string" && (IN_APP_NOTICE_KINDS as readonly string[]).includes(value);
}

export async function getWaitingInAppNotices(client: SupabaseClient): Promise<WaitingNotice[]> {
  const { data, error } = await client
    .from("in_app_notices")
    .select("id, kind, path, created_at, subject_id")
    .is("read_at", null)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error || !data) return [];

  // Der Programm-Hinweis nennt die Organisation. Sie steht nicht in der Zeile,
  // sondern wird hier aus dem Programm gelesen - nur fuer Programme, in denen
  // die Person Teammitglied ist (get_my_team_programs). Ein beendetes Programm
  // liefert nichts, und der Hinweis faellt weg statt ohne Namen zu stehen.
  const programs = data.some((row) => row.kind === "program_invited")
    ? await client.rpc("get_my_team_programs")
    : { data: [] as { program_id: string; org_name: string }[] };
  const orgOf = new Map(
    ((programs.data ?? []) as { program_id: string; org_name: string }[]).map((row) => [row.program_id, row.org_name]),
  );

  // Eine Art, die der Code nicht kennt, wird uebersprungen statt angezeigt.
  // Sonst stuende dort ein leerer Platzhalter, wenn die Datenbank einmal
  // weiter ist als diese Fassung der Anwendung.
  return data.flatMap((row) => {
    if (!isKind(row.kind)) return [];
    const base = { id: row.id as string, kind: row.kind, path: row.path as string, createdAt: row.created_at as string };
    if (row.kind === "program_invited") {
      const orgName = orgOf.get(row.subject_id as string);
      return orgName ? [{ ...base, orgName }] : [];
    }
    return [base];
  });
}

/** Fuer die Zahl in der Leiste. Zaehlt, was die Liste zeigen wuerde. */
export async function getWaitingInAppNoticeCount(client: SupabaseClient) {
  const { count, error } = await client
    .from("in_app_notices")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);
  return error ? 0 : (count ?? 0);
}
