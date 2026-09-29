import "server-only";

import {
  ALIGNMENT_V21_INSTRUMENT_ID,
  CURRENT_INSTRUMENT_ID,
} from "@/features/instruments/instruments";
import {
  shouldAnnounce,
  type TransitionDecision,
} from "@/features/instruments/v21/transitionV21";
import type { ArchiveConnection } from "@/features/instruments/v21/VersionArchiveCard";
import { connectedPartners } from "@/features/instruments/connectedPartners";
import { createClient } from "@/lib/supabase/server";

/**
 * Was das Dashboard über die beiden Fassungen wissen muss.
 *
 * In einer Funktion und nicht verstreut in der Seite: Das Dashboard ist über
 * tausend Zeilen lang, und jede Abfrage, die dort einzeln danebensteht, wird
 * beim nächsten Umbau übersehen.
 *
 * SIE WIRFT NICHT. Geht etwas schief, fehlt der Abschnitt - ein Fehler beim
 * Laden einer Nebensache darf nicht die Startseite kosten.
 */

export type DashboardVersionState = {
  announce: boolean;
  decision: TransitionDecision;
  previous: { submitted: boolean; reportHref: string | null };
  next: { started: boolean; submitted: boolean };
  connectionsNext: ArchiveConnection[];
  /** Ob der Abschnitt überhaupt gezeigt wird. */
  show: boolean;
};

const NOTHING: DashboardVersionState = {
  announce: false,
  decision: "pending",
  previous: { submitted: false, reportHref: null },
  next: { started: false, submitted: false },
  connectionsNext: [],
  show: false,
};

export async function getDashboardVersionState(
  userId: string,
): Promise<DashboardVersionState> {
  try {
    const supabase = await createClient();

    const { data: assessments } = await supabase
      .from("assessments")
      .select("instrument_id, module, submitted_at")
      .eq("user_id", userId)
      .in("instrument_id", [CURRENT_INSTRUMENT_ID, ALIGNMENT_V21_INSTRUMENT_ID]);

    const rows = assessments ?? [];
    const previousSubmitted = rows.some(
      (row) => row.instrument_id === CURRENT_INSTRUMENT_ID && row.submitted_at,
    );
    const hasPrevious = rows.some((row) => row.instrument_id === CURRENT_INSTRUMENT_ID);
    const nextRows = rows.filter((row) => row.instrument_id === ALIGNMENT_V21_INSTRUMENT_ID);

    const { data: transition } = await supabase
      .from("instrument_transitions")
      .select("decision, remind_after")
      .eq("user_id", userId)
      .eq("from_instrument_id", CURRENT_INSTRUMENT_ID)
      .eq("to_instrument_id", ALIGNMENT_V21_INSTRUMENT_ID)
      .maybeSingle();

    const decision = (transition?.decision ?? "pending") as TransitionDecision;
    const next = {
      started: nextRows.length > 0,
      submitted: nextRows.some((row) => row.submitted_at),
    };

    return {
      announce: shouldAnnounce({
        hasPreviousAssessment: hasPrevious,
        transition: transition
          ? { decision, remindAfter: transition.remind_after ?? null }
          : null,
      }),
      decision,
      previous: {
        submitted: previousSubmitted,
        // Der Report gibt es erst nach der Abgabe. Vorher dorthin zu
        // verlinken hiesse, jemanden auf eine leere Seite zu schicken und ihm
        // danach zu erklaeren, warum.
        reportHref: previousSubmitted ? "/me/report" : null,
      },
      next,
      connectionsNext: next.submitted ? await connectionsFor(userId) : [],
      // Der Abschnitt erscheint erst, wenn es etwas zu zeigen gibt: eine
      // getroffene Entscheidung oder ein angefangener neuer Fragebogen. Sonst
      // steht auf jedem Dashboard ein Kasten ueber eine Fassung, die die
      // Person nie gesehen hat.
      show: decision !== "pending" || next.started,
    };
  } catch {
    return NOTHING;
  }
}

/**
 * Mit wem ein Vergleich zur neuen Fassung möglich ist.
 *
 * „Möglich“ heißt: verbunden UND hat freigegeben. Beides zu trennen wäre
 * genauer, aber für den Kasten reicht ein Satz je Person - und wer nicht
 * freigegeben hat, soll nicht wie ein Fehler aussehen.
 */
async function connectionsFor(userId: string): Promise<ArchiveConnection[]> {
  const supabase = await createClient();

  // Wer verbunden ist, steht an einer Stelle - sonst heisst dieselbe Person
  // hier anders als im Kasten daneben.
  const partners = await connectedPartners(userId);
  if (partners.length === 0) return [];

  // Freigegeben heisst: Ich sehe ihre Antworten. Genau das prueft diese
  // Abfrage - ueber dieselben Policies wie ueberall, nicht ueber eine
  // Sonderregel.
  const { data: shares } = await supabase
    .from("alignment_shares")
    .select("assessment_id")
    .eq("recipient_user_id", userId)
    .is("revoked_at", null);

  const { data: theirs } = (shares ?? []).length
    ? await supabase
        .from("assessments")
        .select("user_id")
        .in("id", (shares ?? []).map((row) => row.assessment_id))
        .eq("instrument_id", ALIGNMENT_V21_INSTRUMENT_ID)
        .not("submitted_at", "is", null)
    : { data: [] };

  const ready = new Set((theirs ?? []).map((row) => row.user_id as string));

  return partners.map((partner) => ({
    userId: partner.userId,
    label: partner.label,
    ready: ready.has(partner.userId),
  }));
}
