import { redirect } from "next/navigation";
import { QuestionnaireV21 } from "@/features/instruments/v21/QuestionnaireV21";
import { buildSectionsV21 } from "@/features/instruments/v21/questionnaireDataV21";
import { ALIGNMENT_V21_INSTRUMENT_ID } from "@/features/instruments/instruments";
import { NavV21 } from "@/features/instruments/v21/NavV21";
import { createClient, getRequestUser } from "@/lib/supabase/server";

/**
 * Der Fragebogen v2.1 - die Testfassung, erreichbar fuer Founder.
 *
 * ---------------------------------------------------------------------------
 * WARUM ER JETZT AUF EINER ECHTEN ROUTE LIEGT
 * ---------------------------------------------------------------------------
 *
 * Er lag unter `debug` und war in Production 404. Das ging nicht mehr: Die
 * fachliche Durchsicht empfiehlt ausdruecklich, v2.1 fuer kognitive Interviews
 * und einen begleiteten Produktpilot zu verwenden - und dafuer muessen die
 * Teilnehmenden ihn erreichen koennen.
 *
 * Ich hatte eine Einladungsliste vorgeschlagen. Maria hat widersprochen, und
 * sie hat recht: Man muss angemeldet sein, und die Datenbank laesst ein Konto
 * ohne Founder-Rolle nicht einmal einen Fragebogen anlegen. Die Rolle IST das
 * Tor. Eine Einladungsliste waere Maschinerie fuer einen Unterschied, den es
 * nicht gibt - und wer teilgenommen hat, steht ohnehin an jeder Zeile.
 *
 * ---------------------------------------------------------------------------
 * WAS DAFUER AUF DER SEITE STEHEN MUSS
 * ---------------------------------------------------------------------------
 *
 * Das Instrument steht auf `draft`, und v1 bleibt die Fassung, die gilt. Wer
 * hier ausfuellt, bekommt noch keine Auswertung - das darf niemand erst
 * hinterher merken. Ein Test haelt fest, dass der Hinweis auf der Seite steht.
 */

export default async function AlignmentV21Page() {

  // getRequestUser statt auth.getUser: Die Middleware hat die Person für diese
  // Anfrage bereits geholt, ein zweiter Netzwerkgang je Seitenaufbau wäre
  // geschenkt. Ein Test im Projekt hält das fest.
  const { data: auth } = await getRequestUser();
  // Zum Login statt 404: Wer den Link bekommt und gerade ausgeloggt ist, soll
  // sich anmelden koennen und danach hier landen - nicht ins Leere laufen.
  if (!auth?.user?.id) redirect(`/login?next=${encodeURIComponent("/founder-alignment/pilot")}`);

  const supabase = await createClient();

  const { data: assessment } = await supabase
    .from("assessments")
    .select("id, submitted_at")
    .eq("user_id", auth.user.id)
    .eq("module", "base")
    .eq("instrument_id", ALIGNMENT_V21_INSTRUMENT_ID)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: rows } = assessment
    ? await supabase
        .from("alignment_answers")
        .select("block_id, value, missing_code")
        .eq("assessment_id", assessment.id)
    : { data: [] };

  const initialAnswers = Object.fromEntries(
    (rows ?? []).map((row) => [
      row.block_id,
      row.missing_code ? { missingCode: row.missing_code } : { value: row.value },
    ]),
  );

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <NavV21 current="/founder-alignment/pilot" />

      <p className="mb-2 inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-900">
        Testfassung
      </p>
      <h1 className="text-2xl font-semibold text-slate-900">
        Wie du arbeiten möchtest
      </h1>
      <p className="mt-4 text-slate-700">
        36 Fragen dazu, wie du entscheiden, zusammenarbeiten und mit offenen Fragen
        umgehen möchtest. Es gibt keine richtigen Antworten und am Ende keine Punktzahl
        — das Ergebnis ist eine Grundlage für ein Gespräch.
      </p>

      {/*
        DAS GEHOERT VOR DIE ERSTE FRAGE, NICHT HINTER DIE LETZTE.
        Wer eine halbe Stunde ausfuellt und danach erfaehrt, dass es noch keine
        Auswertung gibt, ist zu Recht veraergert.
      */}
      <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <p className="font-medium">Das hier ist eine Testfassung.</p>
        <p className="mt-1">
          Wir prüfen gerade, ob die Fragen verständlich sind und das Richtige treffen.
          Deine Antworten kannst du dir ansehen, aber es gibt dazu noch keine
          Auswertung und keine Gesprächskarten — die bisherige Fassung des Tests
          bleibt davon unberührt und gilt weiter.
        </p>
        <p className="mt-1">
          Ein Vergleich läuft nur zwischen zwei Personen, die dieselbe Fassung
          ausgefüllt haben. Das sind zwei verschiedene Fragebögen, keine zwei
          Versionen desselben.
        </p>
      </div>

      <p className="mt-4 text-sm text-slate-500">
        Du kannst jederzeit aufhören und später weitermachen. Alles wird sofort
        gespeichert.
      </p>

      <div className="mt-10">
        <QuestionnaireV21
          sections={buildSectionsV21()}
          initialAnswers={initialAnswers}
          submitted={Boolean(assessment?.submitted_at)}
        />
      </div>
    </main>
  );
}
