import { CURRENT_WORKSTYLE_INSTRUMENT } from "@/features/instruments/workstyle/current";
import "server-only";

import { offeredItemsV22 } from "@/features/instruments/align/registries";
import { needsConfirmation } from "@/features/instruments/align/needsConfirmation";
import { findVentures } from "@/features/instruments/align/ventureResolution";
import { connectedPartners } from "@/features/instruments/connectedPartners";
import {
  CURRENT_INSTRUMENT_ID,
  VENTURE_ALIGNMENT_INSTRUMENT_ID,
} from "@/features/instruments/instruments";
import {
  shouldAnnounce,
  TRANSITION_TO_ALIGN,
  type TransitionDecision,
} from "@/features/instruments/v21/transitionV21";
import { createClient } from "@/lib/supabase/server";

/**
 * Was das Dashboard über die beiden Bögen wissen muss.
 *
 * ---------------------------------------------------------------------------
 * HIER WIRD NICHTS ANGELEGT
 * ---------------------------------------------------------------------------
 *
 * `resolveVenture` legt ein Vorhaben an, wenn es keins gibt - richtig auf der
 * Fragebogenseite, falsch hier. Das Dashboard wird von jedem geöffnet, auch
 * von Menschen, die mit Align nie etwas zu tun haben; ein `founder_teams`-
 * Eintrag pro Seitenaufruf wäre eine Nebenwirkung des Hinsehens.
 *
 * Deshalb `findVentures`. Wer noch keins hat, sieht den Link zum Bogen - und
 * das Vorhaben entsteht dort, wo es gebraucht wird.
 *
 * ---------------------------------------------------------------------------
 * SIE WIRFT NICHT
 * ---------------------------------------------------------------------------
 *
 * Geht etwas schief, zeigt der Kasten einen Ladehinweis. Ein Fehler dieser Abfrage
 * darf nicht die Startseite kosten.
 */

export type AlignVentureState = {
  id: string;
  name: string | null;
  alone: boolean;
  started: boolean;
  submitted: boolean;
  answered: number;
  of: number;
  /** Jemand ist dazugekommen, seit zuletzt bestätigt wurde. */
  confirm: boolean;
};

export type AlignDashboardState = {
  profile: { started: boolean; submitted: boolean; answered: number; of: number };
  ventures: AlignVentureState[];
  /** Verbunden UND hat einen der beiden Bögen freigegeben. */
  partners: { userId: string; label: string; ready: boolean }[];
  show: boolean;
  /**
   * „Es gibt eine neue Fassung" — nur für Menschen, die die bisherige kennen.
   *
   * Wer gerade erst anfängt, soll keinen Hinweis auf eine Neufassung von
   * etwas bekommen, das er nie gesehen hat.
   */
  announce: boolean;
  /** Was die Person zum Umstieg entschieden hat. */
  decision: TransitionDecision;
  /** Hat sie die bisherige Fassung abgegeben? Dann bleibt ihr Report. */
  hasPrevious: boolean;
  /** Hat einen alten Basisfragebogen, auch als Entwurf: Zugang zum Archiv. */
  knowsPrevious: boolean;
};

const NOTHING: AlignDashboardState = {
  profile: { started: false, submitted: false, answered: 0, of: 0 },
  ventures: [],
  partners: [],
  show: false,
  announce: false,
  decision: "pending",
  hasPrevious: false,
  // A failed read must not invent a new-user or legacy state.
  knowsPrevious: false,
};

export async function getAlignDashboardState(
  userId: string,
): Promise<AlignDashboardState> {
  try {
    const supabase = await createClient();

    const { data: assessments, error: assessmentsError } = await supabase
      .from("assessments")
      .select("id, instrument_id, venture_id, submitted_at, answers_confirmed_at")
      .eq("user_id", userId)
      .in("instrument_id", [CURRENT_WORKSTYLE_INSTRUMENT, VENTURE_ALIGNMENT_INSTRUMENT_ID])
      .order("created_at", { ascending: false });
    if (assessmentsError) throw assessmentsError;

    const rows = assessments ?? [];

    // Eine Abfrage fuer alle Boegen zusammen. Je Bogen einzeln zu zaehlen
    // waere dieselbe Zahl in mehr Runden - und das Dashboard macht schon
    // genug davon.
    const { data: answers, error: answersError } = rows.length
      ? await supabase
          .from("alignment_answers")
          .select("assessment_id")
          .in("assessment_id", rows.map((row) => row.id))
      : { data: [], error: null };

    if (answersError) throw answersError;

    const answeredBy = new Map<string, number>();
    for (const row of answers ?? []) {
      const id = row.assessment_id as string;
      answeredBy.set(id, (answeredBy.get(id) ?? 0) + 1);
    }

    // Die bisherige Fassung - fuer den Hinweis und fuer den Satz "deine Daten
    // bleiben". Beides gilt nur fuer Menschen, die sie ueberhaupt haben.
    const { data: vorher, error: previousError } = await supabase
      .from("assessments")
      .select("id, submitted_at")
      .eq("user_id", userId)
      .eq("instrument_id", CURRENT_INSTRUMENT_ID)
      .eq("module", "base");
    if (previousError) throw previousError;

    const { data: transition } = await supabase
      .from("instrument_transitions")
      .select("decision, remind_after")
      .eq("user_id", userId)
      .eq("from_instrument_id", TRANSITION_TO_ALIGN.from)
      .eq("to_instrument_id", TRANSITION_TO_ALIGN.to)
      .maybeSingle();

    const decision = (transition?.decision ?? "pending") as TransitionDecision;

    const profileRow = rows.find(
      (row) => row.instrument_id === CURRENT_WORKSTYLE_INSTRUMENT,
    );
    const profileAnswered = profileRow ? (answeredBy.get(profileRow.id) ?? 0) : 0;

    const ventures = await findVentures(userId);

    const { data: members } = ventures.length
      ? await supabase
          .from("founder_team_members")
          .select("team_id, user_id, created_at")
          .in("team_id", ventures.map((venture) => venture.id))
      : { data: [] };

    const ventureStates: AlignVentureState[] = ventures.map((venture) => {
      const row = rows.find(
        (entry) =>
          entry.instrument_id === VENTURE_ALIGNMENT_INSTRUMENT_ID &&
          entry.venture_id === venture.id,
      );
      const answered = row ? (answeredBy.get(row.id) ?? 0) : 0;

      return {
        id: venture.id,
        name: venture.name,
        alone: venture.alone,
        started: answered > 0,
        submitted: Boolean(row?.submitted_at),
        answered,
        // ZURUECKGEZOGENE FRAGEN ZAEHLEN NICHT MIT. S01 ist durch S01a bis
        // S01f und S01_top ersetzt und bleibt nur in der Registratur, damit
        // alte Antworten lesbar bleiben. Mitgezaehlt stand auf dem Dashboard
        // "43 Fragen" und im Bericht "von 42" - dieselbe Sache, zwei Zahlen.
        of: offeredItemsV22("venture_alignment").length,
        confirm: needsConfirmation({
          confirmedAt: (row?.answers_confirmed_at as string | null) ?? null,
          otherJoinedAt: (members ?? [])
            .filter((entry) => entry.team_id === venture.id && entry.user_id !== userId)
            .map((entry) => entry.created_at as string),
          hasAnswers: answered > 0,
        }),
      };
    });

    return {
      profile: {
        started: Boolean(profileRow),
        submitted: Boolean(profileRow?.submitted_at),
        answered: profileAnswered,
        of: 29,
      },
      ventures: ventureStates,
      partners: await partnersFor(userId),
      announce: !profileRow?.submitted_at && profileAnswered === 0 && shouldAnnounce({
        hasPreviousAssessment: (vorher ?? []).some((row) => Boolean(row.submitted_at)),
        transition: transition
          ? { decision, remindAfter: transition.remind_after ?? null }
          : null,
      }),
      decision,
      hasPrevious: (vorher ?? []).some((row) => row.submitted_at),
      knowsPrevious: (vorher ?? []).length > 0,
      // Der Kasten steht auf jedem Founder-Dashboard, auch auf einem leeren:
      // Er IST der Weg zu den beiden Boegen. Ein Kasten, der erst erscheint,
      // wenn man angefangen hat, koennte nie den ersten Anfang tragen.
      show: true,
    };
  } catch {
    return NOTHING;
  }
}

/**
 * Wer verbunden ist und einen der beiden Bögen freigegeben hat.
 *
 * `ready` heißt nur: Es gibt etwas zu vergleichen. Welchen Bogen sie
 * freigegeben haben, steht auf der Vergleichsseite - hier wäre es eine Zeile
 * mehr Text für eine Unterscheidung, die man beim Klicken ohnehin sieht.
 */
async function partnersFor(
  userId: string,
): Promise<{ userId: string; label: string; ready: boolean }[]> {
  const supabase = await createClient();

  const partners = await connectedPartners(userId);
  if (partners.length === 0) return [];

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
        .in("instrument_id", [CURRENT_WORKSTYLE_INSTRUMENT, VENTURE_ALIGNMENT_INSTRUMENT_ID])
        .not("submitted_at", "is", null)
    : { data: [] };

  const ready = new Set((theirs ?? []).map((row) => row.user_id as string));

  return partners.map((partner) => ({
    userId: partner.userId,
    label: partner.label,
    ready: ready.has(partner.userId),
  }));
}
