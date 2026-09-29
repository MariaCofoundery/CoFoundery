"use server";

import { createClient } from "@/lib/supabase/server";
import { ALIGNMENT_V21_INSTRUMENT_ID } from "@/features/instruments/instruments";
import { getItemV21 } from "@/features/instruments/v21/registryV21";
import { INSTRUMENT_OF } from "@/features/instruments/align/reportData";
import { getItemsV22, type AssessmentScope } from "@/features/instruments/align/registries";

/**
 * „Darüber möchte ich sprechen“ - nachträglich, am eigenen Bericht.
 *
 * ---------------------------------------------------------------------------
 * WARUM NICHT IM FRAGEBOGEN
 * ---------------------------------------------------------------------------
 *
 * Am 28.09.2026 gemeldet: „Dieses kleine Feld mit ‚darüber möchte ich
 * sprechen‘, das ist auch ein bisschen zu viel.“ Stimmt - beim Ausfüllen weiß
 * niemand, was ein Thema wird. Das sieht man, wenn die eigenen Antworten
 * beieinanderstehen.
 *
 * ---------------------------------------------------------------------------
 * UND WARUM ES NACH DER ABGABE NOCH GEHT
 * ---------------------------------------------------------------------------
 *
 * Die Antworten sind nach der Abgabe eingefroren - ein Trigger in der
 * Datenbank hält das fest. Die Markierung ist ausdrücklich ausgenommen, denn
 * sie ist keine Antwort auf die Frage. Sie ist ein Wunsch an das Gespräch, und
 * der darf sich ändern, ohne dass jemand seine Auskunft ändert.
 *
 * ---------------------------------------------------------------------------
 * ERWEITERT AM 29.09.2026 - SIE KANNTE NUR v2.1
 * ---------------------------------------------------------------------------
 *
 * In den beiden neuen Bögen ließ sich nichts markieren: Die Aktion suchte
 * ausschließlich v2.1-Fragebögen, und die Antwortseiten boten den Haken gar
 * nicht erst an.
 *
 * GELESEN WURDE DIE MARKIERUNG TROTZDEM. `agendaV21` stellt markierte Fragen
 * VOR alle anderen, und die Gesprächskarten haben dafür eine eigene Regel:
 * „Wer sagt ‚darüber möchte ich sprechen‘, hat recht, unabhängig davon, wie
 * nah die Antworten liegen.“ Diese Regel konnte nie greifen - ein Vorrang für
 * etwas, das niemand auslösen kann.
 */

type Result = { ok: true } | { ok: false; reason: string; detail?: string };

export type MarkScope = AssessmentScope | "v21";

export async function setDiscussionMarkV21(
  itemId: string,
  marked: boolean,
  scope: MarkScope = "v21",
  ventureId?: string,
): Promise<Result> {
  const kennt =
    scope === "v21"
      ? Boolean(getItemV21(itemId))
      : getItemsV22(scope).some((item) => item.itemId === itemId);
  if (!kennt) return { ok: false, reason: "unknown_block", detail: itemId };

  const supabase = await createClient();
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth?.user?.id) return { ok: false, reason: "not_authenticated" };

  // Über die eigenen Fragebögen, nicht über eine mitgegebene Kennung: Sonst
  // wäre die Markierung ein Weg, an fremden Zeilen zu drehen. Die Policies
  // würden es abfangen - aber eine Serverfunktion soll nicht darauf bauen.
  const suche = supabase
    .from("assessments")
    .select("id")
    .eq("user_id", auth.user.id)
    .eq(
      "instrument_id",
      scope === "v21" ? ALIGNMENT_V21_INSTRUMENT_ID : INSTRUMENT_OF[scope],
    );

  // Beim Vorhaben zaehlt das gemeinte: Wer in zwei Vorhaben ist, markiert
  // sonst in beiden - und in einem davon eine Frage, die er dort nie
  // beantwortet hat.
  const { data: assessments } = ventureId
    ? await suche.eq("venture_id", ventureId)
    : await suche;

  const ids = (assessments ?? []).map((row) => row.id);
  if (ids.length === 0) return { ok: false, reason: "no_assessment" };

  const { error } = await supabase
    .from("alignment_answers")
    .update({ marked_for_discussion: marked })
    .in("assessment_id", ids)
    .eq("block_id", itemId);

  if (error) return { ok: false, reason: "mark_failed", detail: error.message };
  return { ok: true };
}
