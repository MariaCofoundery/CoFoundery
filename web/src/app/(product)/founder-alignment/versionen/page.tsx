import { redirect } from "next/navigation";
import { NavV21 } from "@/features/instruments/v21/NavV21";
import { VersionChoiceView } from "@/features/instruments/v21/VersionChoiceView";
import {
  ALIGNMENT_V21_INSTRUMENT_ID,
  CURRENT_INSTRUMENT_ID,
} from "@/features/instruments/instruments";
import { createClient, getRequestUser } from "@/lib/supabase/server";

/**
 * Die Wahl zwischen den Fassungen - für Leute, die schon einen Account haben.
 *
 * Sie erzwingt nichts. Wer nie hierher kommt, behält die bisherige Fassung und
 * merkt von der neuen nichts.
 */
export default async function VersionChoicePage() {
  const { data: auth } = await getRequestUser();
  if (!auth?.user?.id) {
    redirect(`/login?next=${encodeURIComponent("/founder-alignment/versionen")}`);
  }

  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("assessments")
    .select("instrument_id, submitted_at")
    .eq("user_id", auth.user.id)
    .in("instrument_id", [CURRENT_INSTRUMENT_ID, ALIGNMENT_V21_INSTRUMENT_ID]);

  const has = (instrumentId: string) =>
    (rows ?? []).some((row) => row.instrument_id === instrumentId);

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <NavV21 current="/founder-alignment/versionen" />

      <h1 className="text-2xl font-semibold text-slate-900">Zwei Fassungen des Tests</h1>
      <p className="mt-4 text-slate-700">
        Wir haben den Fragebogen überarbeitet, nachdem eine fachliche Durchsicht Fehler
        darin gefunden hat. Die neue Fassung ist noch im Test — deshalb bleibt die
        bisherige, und du entscheidest selbst.
      </p>

      <div className="mt-10">
        <VersionChoiceView
          hasPrevious={has(CURRENT_INSTRUMENT_ID)}
          hasNext={has(ALIGNMENT_V21_INSTRUMENT_ID)}
        />
      </div>
    </main>
  );
}
