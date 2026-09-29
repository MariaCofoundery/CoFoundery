import "server-only";

import { createClient } from "@/lib/supabase/server";

/**
 * Wie jemand in einem Satz heißen soll.
 *
 * ---------------------------------------------------------------------------
 * WARUM NICHT „DU“
 * ---------------------------------------------------------------------------
 *
 * Die Vorlagen der Gesprächskarten stehen in der dritten Person: „{a} sagt
 * {aAnswer}“. Setzt man dort „Du“ ein, steht da „Du sagt manchmal“ — beim
 * Durchklicken am 29.09.2026 genau so gesehen. Eine Vorlage lässt sich nicht
 * gleichzeitig für „Du sagst“ und „Ben sagt“ schreiben, ohne die Verben zu
 * beugen.
 *
 * Also bekommen die Sätze Namen. Die Tabelle daneben behält ihre Spaltenköpfe
 * „Du“ und „Die andere Person“ — dort ist das eine Beschriftung und kein Satz.
 *
 * Ist der Name nicht lesbar — weil die Zeilensicherheit ihn nicht hergibt oder
 * weil niemand einen eingetragen hat —, bleibt der Ersatz stehen. „Die andere
 * Person sagt manchmal“ ist unpersönlich, aber richtig.
 */
export async function displayNameOf(userId: string, fallback: string): Promise<string> {
  try {
    const supabase = await createClient();

    const { data: person } = await supabase
      .from("person_core")
      .select("display_name")
      .eq("user_id", userId)
      .maybeSingle();

    const name = (person?.display_name as string | null)?.trim();
    return name && name.length > 0 ? name : fallback;
  } catch {
    return fallback;
  }
}
