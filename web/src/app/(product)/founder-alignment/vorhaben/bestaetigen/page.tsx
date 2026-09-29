import { redirect } from "next/navigation";
import { ConfirmClient } from "@/features/instruments/align/ConfirmClient";
import type { ConfirmEntry } from "@/features/instruments/align/ConfirmVentureAnswers";
import { itemsThatAge, itemsThatKeep } from "@/features/instruments/align/whatAges";
import { resolveVenture, solePartnerName } from "@/features/instruments/align/ventureResolution";
import { readableItems, withPartner } from "@/features/instruments/align/questionnaireData";
import { readAnswer } from "@/features/instruments/v21/readoutV21";
import type { AlignmentAnswerV21 } from "@/features/instruments/v21/answersV21";
import { VENTURE_ALIGNMENT_INSTRUMENT_ID } from "@/features/instruments/instruments";
import { createClient, getRequestUser } from "@/lib/supabase/server";

/**
 * „Das hattest du angegeben - übernehmen oder ändern?“
 *
 * Erscheint, wenn jemand dem Vorhaben beigetreten ist, nachdem zuletzt
 * bestätigt wurde. Wer die Seite direkt aufruft, sieht sie trotzdem: Ein Blick
 * auf die eigenen Angaben ist nie falsch.
 */
export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ venture?: string }>;
}) {
  const { data: auth } = await getRequestUser();
  if (!auth?.user?.id) {
    redirect(`/login?next=${encodeURIComponent("/founder-alignment/vorhaben/bestaetigen")}`);
  }

  // Wer in zwei Vorhaben ist, kommt mit dem gemeinten hierher. Ohne die
  // Angabe gaebe resolveVenture null zurueck und die Seite schickte ihn
  // zurueck an den Fragebogen - ausgerechnet den, der ihn hergeschickt hat.
  const { venture: gewaehlt } = await searchParams;
  const { venture } = await resolveVenture(auth.user.id, gewaehlt);
  if (!venture) redirect("/founder-alignment/vorhaben");

  const supabase = await createClient();

  const { data: assessment } = await supabase
    .from("assessments")
    .select("id, created_at")
    .eq("user_id", auth.user.id)
    .eq("instrument_id", VENTURE_ALIGNMENT_INSTRUMENT_ID)
    .eq("venture_id", venture.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Ohne Antworten gibt es nichts zu bestaetigen - dann gehoert die Person an
  // den Fragebogen und nicht hierher.
  if (!assessment) redirect("/founder-alignment/vorhaben");

  const { data: rows } = await supabase
    .from("alignment_answers")
    .select("block_id, value, missing_code, answered_at")
    .eq("assessment_id", assessment.id);

  if (!rows || rows.length === 0) redirect("/founder-alignment/vorhaben");

  const byId = new Map(rows.map((row) => [row.block_id, row]));

  // DIE FRAGE MUSS MITGEGEBEN WERDEN. Ohne sie greift readAnswer auf die
  // v2.1-Registratur zurueck, und 24 der 36 Kennungen gibt es dort auch - mit
  // anderem Wortlaut und teils anderen Antwortmoeglichkeiten. Dann stuende
  // hier eine Beschriftung aus dem falschen Bogen, und bei den uebrigen zwoelf
  // saehe eine vorhandene Antwort aus wie keine.
  // Hier wird bestaetigt, was man ueber eine bestimmte Person gesagt hat -
  // also steht ihr Name in der Frage, wenn es genau eine ist.
  const partnerName = await solePartnerName(venture.id, auth.user.id);

  const lesbar = new Map(
    readableItems("venture_alignment", partnerName).map((item) => [item.itemId, item]),
  );

  const toEntry = (itemId: string, prompt: string): ConfirmEntry => {
    const row = byId.get(itemId);
    if (!row) return { itemId, prompt, entry: null };
    const answer = (row.missing_code
      ? { blockId: itemId, missingCode: row.missing_code }
      : { blockId: itemId, value: row.value }) as AlignmentAnswerV21;
    return { itemId, prompt, entry: readAnswer(answer, [], lesbar.get(itemId)) };
  };

  const ages = itemsThatAge().map((item) =>
    toEntry(item.itemId, withPartner(item.prompt, partnerName)));
  const keeps = itemsThatKeep().map((item) =>
    toEntry(item.itemId, withPartner(item.prompt, partnerName)));

  // Wer dazugekommen ist - fuer den Satz "X ist jetzt dabei".
  const { data: members } = await supabase
    .from("founder_team_members")
    .select("user_id")
    .eq("team_id", venture.id)
    .neq("user_id", auth.user.id);

  const andere = (members ?? []).length;
  const partnerLabel =
    andere === 0 ? "Jemand" : andere === 1 ? "Eine weitere Person" : `${andere} weitere Personen`;

  const zuletzt = rows
    .map((row) => row.answered_at as string | null)
    .filter((wert): wert is string => Boolean(wert))
    .sort()
    .at(-1) ?? null;

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <ConfirmClient
        ventureId={venture.id}
        ventureName={venture.name}
        partnerLabel={partnerLabel}
        answeredAt={zuletzt}
        ages={ages}
        keeps={keeps}
      />
    </main>
  );
}
