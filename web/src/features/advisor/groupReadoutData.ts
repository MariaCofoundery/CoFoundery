import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { TeamCapabilityReadout } from "@/features/capability/capabilityTeamData";
import {
  buildCapabilityTeamReadout,
  type TeamMemberSides,
} from "@/features/capability/capabilityTeamReadout";
import { getCapabilityVocabulary } from "@/features/capability/capabilityData";

/**
 * Die Rollenlage einer Gruppe, die noch kein Team ist.
 *
 * GEWUENSCHT: Team-Matching fuer den Accelerator. Ein Programm begleitet
 * einzelne Menschen und moechte sehen, wie sie zusammen dastehen - bevor sie
 * ein Team sind.
 *
 * ---------------------------------------------------------------------------
 * DASSELBE BILD, DAS EIN TEAM VON SICH SELBST SIEHT
 * ---------------------------------------------------------------------------
 *
 * Gerechnet wird mit `buildCapabilityTeamReadout` - derselben reinen Funktion
 * wie unter `/teams/<id>/roles`, und angezeigt wird mit demselben Bauteil.
 * Das ist eine Entscheidung und keine Sparsamkeit:
 *
 *   Ein Accelerator bekommt KEINE reichhaltigere Sonderansicht. Was er ueber
 *   eine Gruppe sieht, ist genau das, was die Gruppe ueber sich selbst sehen
 *   wuerde. Gaebe es hier eine eigene Rechnung, waere sie irgendwann die
 *   bessere - und dann haette das Produkt zwei Wahrheiten ueber dieselben
 *   Menschen, von denen die genauere denen gehoert, die entscheiden.
 *
 *   Und es gibt weiterhin keine Gesamtzahl. Kein "Team-Score", kein Ranking
 *   von Aufstellungen. Ein unvalidiertes Instrument, das eine Zahl je Gruppe
 *   ausgibt, entscheidet darueber, wer in ein Programm kommt.
 *
 * ---------------------------------------------------------------------------
 * WER UEBERHAUPT VORKOMMT
 * ---------------------------------------------------------------------------
 *
 * Jede Seite kommt aus den Freigabefunktionen (Migration 20261045120000), die
 * selbst pruefen, ob dieser Advisor diesen Bereich dieser Person sehen darf.
 * Es gibt hier bewusst keinen Weg, der daran vorbeifuehrt.
 *
 * NOETIG SIND ZWEI FREIGABEN, `base` und `capability`. Nicht aus Strenge: Die
 * Auswertung besteht aus Saetzen wie "Anna und Bert wollen beide das
 * verantworten". Ohne Namen waere das "jemand und jemand" - unbrauchbar, und
 * bei mehreren Namenlosen nicht einmal unterscheidbar.
 *
 * WER FEHLT, WIRD GENANNT. Eine Gruppenauswertung, der stillschweigend die
 * Haelfte fehlt, sieht aus wie eine Aussage ueber eine duenn besetzte Gruppe.
 * Sie ist aber eine Aussage darueber, wer zugestimmt hat.
 */

export type OmittedPerson = {
  subjectUserId: string;
  /** `no_base`: kein Name freigegeben. `no_capability`: keine Faehigkeiten. */
  reason: "no_base" | "no_capability";
};

export type AdvisorGroupReadout = {
  data: TeamCapabilityReadout;
  included: { userId: string; name: string }[];
  omitted: OmittedPerson[];
};

type CapabilityRow = {
  area_id: string;
  family_id: string;
  application_level: number | null;
  ownership_wish: string | null;
};

type BaseRow = { display_name: string | null };

export async function getAdvisorGroupReadout(
  client: SupabaseClient,
  subjectUserIds: string[]
): Promise<AdvisorGroupReadout | null> {
  // Ein Mensch allein ist keine Aufstellung - dafuer gibt es die Einzelseite.
  const unique = [...new Set(subjectUserIds)].slice(0, 12);
  if (unique.length < 2) return null;

  const vocabulary = await getCapabilityVocabulary(client);

  const resolved = await Promise.all(
    unique.map(async (userId) => {
      const [baseResult, capabilityResult] = await Promise.all([
        client.rpc("get_advisor_person_base", { p_subject_user_id: userId }),
        client.rpc("get_advisor_person_capability", { p_subject_user_id: userId }),
      ]);

      // Ein Fehler heisst hier "nicht freigegeben" und nicht "kaputt": Die
      // Funktionen werfen `42501`, wenn keine Zustimmung vorliegt.
      if (baseResult.error) {
        return { omitted: { subjectUserId: userId, reason: "no_base" as const } };
      }
      if (capabilityResult.error) {
        return { omitted: { subjectUserId: userId, reason: "no_capability" as const } };
      }

      const name = ((baseResult.data ?? []) as BaseRow[])[0]?.display_name?.trim() ?? "";
      if (!name) {
        return { omitted: { subjectUserId: userId, reason: "no_base" as const } };
      }

      const entries = ((capabilityResult.data ?? []) as CapabilityRow[]).map((row) => ({
        areaId: row.area_id,
        applicationLevel: row.application_level,
        ownershipWish: row.ownership_wish,
      }));

      return { side: { userId, name, entries } satisfies TeamMemberSides };
    })
  );

  const sides = resolved.flatMap((entry) => ("side" in entry && entry.side ? [entry.side] : []));
  const omitted = resolved.flatMap((entry) =>
    "omitted" in entry && entry.omitted ? [entry.omitted] : []
  );

  if (sides.length < 2) return null;

  return {
    data: {
      readout: buildCapabilityTeamReadout(sides, vocabulary.areas, vocabulary.families),
      contributing: sides.filter((side) => side.entries.length > 0).length,
      // WIE VIELE IHRE TIEFE FREIGEGEBEN HABEN, wird mitgezaehlt und
      // angezeigt. Ohne diese Zahl liest sich eine duenne Auswertung wie ein
      // Befund ueber die Gruppe, obwohl sie eine Auskunft ueber Zustimmungen
      // ist - hier noch mehr als im Team, weil hier jemand entscheidet.
      withDepth: sides.filter((side) =>
        side.entries.some((entry) => entry.applicationLevel !== null)
      ).length,
      memberCount: sides.length,
    },
    included: sides.map((side) => ({ userId: side.userId, name: side.name })),
    omitted,
  };
}
