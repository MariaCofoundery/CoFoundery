import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { CapabilityEntry } from "@/features/capability/capabilityTypes";
import { CAPABILITY_INTERVIEW, DIRECTION_INTERVIEW } from "@/features/interviews/interviewKinds";
import { CURRENT_WORKSTYLE_INSTRUMENT } from "@/features/instruments/workstyle/current";
import type { AboutYouFacts } from "@/features/profile/aboutYou";
import { getIdentityGaps, type IdentityCoreValues } from "@/features/profile/identityReadiness";

/**
 * Was „Über dich" über den Bestand wissen muss — und nicht mehr.
 *
 * ---------------------------------------------------------------------------
 * ES WIRD GEZÄHLT, NICHT GELADEN
 * ---------------------------------------------------------------------------
 *
 * Für den Status einer Station braucht es keine Antworten, keine Belege und
 * keine Sätze — nur, ob es welche gibt. Deshalb steht hier überall
 * `head: true, count: "exact"`: Die Datenbank zählt, und über die Leitung
 * geht eine Zahl.
 *
 * Das ist kein Mikro-Optimieren. Die Alternative wäre gewesen, die
 * vorhandenen Lader zu benutzen - `getActiveInterview`, `getDirectionAnswers`,
 * `getScopeReport` - und jeweils ganze Verläufe zu holen, um am Ende
 * `length > 0` zu fragen. Bei einem vollen Profil sind das einige hundert
 * Zeilen für neun Wahrheitswerte.
 *
 * ---------------------------------------------------------------------------
 * WAS DIE SEITE SCHON HAT, WIRD NICHT NOCH EINMAL GEHOLT
 * ---------------------------------------------------------------------------
 *
 * Kern, Einträge und Stärken liegen auf `/profile` ohnehin vor - sie werden
 * hereingereicht statt ein zweites Mal gelesen. Zwei Abfragen auf dieselbe
 * Zeile wären zwei Stände derselben Sache.
 *
 * ---------------------------------------------------------------------------
 * EIN FEHLER DARF DIE SEITE NICHT KOSTEN
 * ---------------------------------------------------------------------------
 *
 * Jede Zählung fängt ihren eigenen Fehler ab und gilt dann als 0. Ein Status,
 * der zu vorsichtig ist, zeigt „noch offen", wo „begonnen" stünde - das ist
 * eine ungenaue Auskunft. Eine Seite, die wegen eines Zählfehlers gar nicht
 * erscheint, ist keine.
 */

type Bekannt = {
  core: IdentityCoreValues | null;
  entries: readonly CapabilityEntry[];
  strengthCount: number;
};

async function zaehle(bauen: () => PromiseLike<{ count: number | null; error: unknown }>) {
  try {
    const { count, error } = await bauen();
    return error ? 0 : (count ?? 0);
  } catch {
    return 0;
  }
}

export async function getAboutYouFacts(
  client: SupabaseClient,
  userId: string,
  bekannt: Bekannt
): Promise<AboutYouFacts> {
  const [
    workAssessment,
    interviewSessions,
    unsortedAnswers,
    directionAnswers,
    directionStatements,
    confirmedResources,
    pendingResources,
    marks,
  ] = await Promise.all([
    // Das Arbeitsprofil: ob es einen Bogen gibt und ob er abgegeben ist.
    (async () => {
      try {
        const { data } = await client
          .from("assessments")
          .select("id, submitted_at")
          .eq("user_id", userId)
          .eq("instrument_id", CURRENT_WORKSTYLE_INSTRUMENT)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        return (data as { id: string; submitted_at: string | null } | null) ?? null;
      } catch {
        return null;
      }
    })(),
    // Gespräche: ob eines läuft und ob eines abgeschlossen ist. Beides in
    // einer Abfrage; die Zeilen sind zwei Spalten breit.
    (async () => {
      try {
        const { data } = await client
          .from("capability_interview_sessions")
          .select("status")
          .eq("kind", CAPABILITY_INTERVIEW)
          .limit(50);
        return (data ?? []) as { status: string }[];
      } catch {
        return [];
      }
    })(),
    // Antworten aus dem Gespräch, die noch nirgends eingeordnet sind. Die
    // Bedingung ist dieselbe wie in `getUnsortedInterviewAnswers`; hier wird
    // nur gezählt.
    zaehle(() =>
      client
        .from("capability_interview_turns")
        .select("id", { count: "exact", head: true })
        .eq("kind", CAPABILITY_INTERVIEW)
        .not("answer", "is", null)
        .is("evidence_id", null)
    ),
    zaehle(() =>
      client
        .from("capability_interview_turns")
        .select("id", { count: "exact", head: true })
        .eq("kind", DIRECTION_INTERVIEW)
        .not("answer", "is", null)
    ),
    zaehle(() =>
      client
        .from("direction_statements")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
    ),
    zaehle(() =>
      client
        .from("person_resources")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("status", "confirmed")
    ),
    zaehle(() =>
      client
        .from("person_resources")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("status", "pending")
    ),
    getSectionMarks(client, userId),
  ]);

  // Angefangen heißt: mindestens eine Antwort. Erst jetzt, weil die Frage
  // ohne Bogen keinen Gegenstand hat - und ohne Bogen auch nicht gestellt
  // werden muss.
  const antworten = workAssessment
    ? await zaehle(() =>
        client
          .from("alignment_answers")
          .select("block_id", { count: "exact", head: true })
          .eq("assessment_id", workAssessment.id)
      )
    : 0;

  const core = bekannt.core;
  const identityTouched = Boolean(
    (core?.display_name ?? "").trim() ||
      (core?.headline ?? "").trim() ||
      (core?.bio ?? "").trim()
  );

  return {
    identityGaps: getIdentityGaps(core).length,
    identityTouched,
    workAnswers: antworten,
    workStarted: Boolean(workAssessment),
    workSubmitted: Boolean(workAssessment?.submitted_at),
    interviewStarted: interviewSessions.some((session) => session.status === "active"),
    interviewCompleted: interviewSessions.some((session) => session.status === "completed"),
    unsortedAnswers,
    areaCount: bekannt.entries.length,
    levelledCount: bekannt.entries.filter((entry) => entry.application_level !== null).length,
    wishedCount: bekannt.entries.filter((entry) => entry.ownership_wish !== null).length,
    strengthCount: bekannt.strengthCount,
    directionAnswers,
    directionStatements,
    confirmedResources,
    pendingResources,
    marks,
  };
}

/**
 * Die eigenen Markierungen.
 *
 * Unbekannte Kennungen werden mitgelesen und schaden nicht: Der Status fragt
 * nach bestimmten Namen, und was nicht gefragt wird, wirkt nicht. Eine Zeile
 * aus einer späteren Fassung der Oberfläche kostet nichts.
 */
export async function getSectionMarks(
  client: SupabaseClient,
  userId: string
): Promise<Set<string>> {
  try {
    const { data } = await client
      .from("person_section_marks")
      .select("section")
      .eq("user_id", userId);
    return new Set(((data ?? []) as { section: string }[]).map((row) => row.section));
  } catch {
    return new Set();
  }
}
