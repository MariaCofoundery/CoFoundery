import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { promptBelongsToSetupItem, setupItemsForPrompt } from "@/features/collaborationLab/collaborationConversationLinks";
import { getReadMyMindPack } from "@/features/collaborationLab/readMyMindContent";
import { getOpenedReadMyMindPromptReveal, getReadMyMindRound, getReadMyMindTeamContext } from "@/features/collaborationLab/readMyMindData";
import { getFounderInTheWildPack } from "@/features/founderInTheWild/founderInTheWildContent";
import { getFounderInTheWildTeam, getOpenedFounderInTheWildReveal } from "@/features/founderInTheWild/founderInTheWildData";
import type { AppLocale } from "@/i18n/config";

/**
 * Markierte Gespraechspunkte, am Thema im Founder-Setup.
 *
 * GEWUENSCHT AM 21.09.2026: "Wenn man markiert, dass man darueber sprechen
 * moechte, waere es gut, dass da auch ein sinnvoller Hinweis im Founder-Setup
 * auftaucht, mit aufklappbarem Ergebnis, sodass man im Setup bleibt, aber
 * nochmal sehen kann, was da war."
 *
 * Bis dahin lag zwischen dem Markieren und dem Festlegen ein Bruch: Die
 * Situation stand im Lab, die Vereinbarung im Setup, und wer sie schrieb,
 * musste sich erinnern, was die andere Seite eigentlich geantwortet hatte -
 * oder den Faden verlassen und hinuebergehen.
 *
 * WAS HIER NICHT PASSIERT: Die Sichtbarkeit wird nicht neu erfunden. Das
 * Ergebnis kommt aus denselben Lesern wie im Lab, und die geben es nur heraus,
 * wenn beide Seiten die Karte aufgedeckt haben. Steht hier `null`, hat die
 * lesende Person sie eben noch nicht geoeffnet - dann gibt es den Hinweis,
 * aber nicht den Inhalt. Ein Setup-Umweg darf kein Weg um das Siegel herum
 * sein.
 */

export type CollaborationConversationPoint = {
  experience: "founder_in_the_wild" | "read_my_mind";
  roundId: string;
  position: number;
  promptKey: string;
  title: string;
  /** Die Situation (Founder in the Wild) bzw. die Frage (Read My Mind). */
  prompt: string;
  markedByMe: boolean;
  markedByPartner: boolean;
  /** Wohin es fuehrt, wenn man doch hinueber will. */
  href: string;
  /** Null, solange diese Person die Karte selbst nicht aufgedeckt hat. */
  answers: { own: string[]; partner: string[] } | null;
  partnerName: string | null;
};

type Row = {
  roundId: string;
  experienceKey: string;
  packKey: string;
  packVersion: number;
  roundPromptId: string;
  promptKey: string;
  position: number;
  markedByMe: boolean;
  markedByPartner: boolean;
};

/**
 * Drei flache Abfragen statt verschachtelter Einbettungen: Die Markierungen
 * haengen an den Prompts, die Prompts an den Runden, und jede Ebene hat ihre
 * eigenen Zeilenregeln. Eine Einbettung, die an einer davon scheitert, gibt
 * still weniger zurueck statt einen Fehler.
 */
async function readMarkedRows(teamId: string, userId: string, client: SupabaseClient): Promise<Row[]> {
  const rounds = await client
    .from("collaboration_experience_rounds")
    .select("id,experience_key,pack_key,pack_version")
    .eq("founder_team_id", teamId)
    // Eine verworfene oder abgelehnte Runde bringt kein Gespraech mit.
    .in("status", ["active", "completed"]);
  if (rounds.error || !rounds.data?.length) return [];
  const roundIds = rounds.data.map((round) => String(round.id));

  const [prompts, markers] = await Promise.all([
    client
      .from("collaboration_experience_round_prompts")
      .select("id,round_id,prompt_key,position")
      .in("round_id", roundIds),
    client
      .from("collaboration_experience_conversation_markers")
      .select("round_prompt_id,participant_user_id")
      .in("round_id", roundIds),
  ]);
  if (prompts.error || markers.error || !prompts.data || !markers.data) return [];

  const roundById = new Map(rounds.data.map((round) => [String(round.id), round]));
  return prompts.data.flatMap((prompt) => {
    const promptMarkers = markers.data.filter(
      (marker) => String(marker.round_prompt_id) === String(prompt.id)
    );
    if (promptMarkers.length === 0) return [];
    const round = roundById.get(String(prompt.round_id));
    if (!round) return [];
    return [{
      roundId: String(round.id),
      experienceKey: String(round.experience_key),
      packKey: String(round.pack_key),
      packVersion: Number(round.pack_version),
      roundPromptId: String(prompt.id),
      promptKey: String(prompt.prompt_key),
      position: Number(prompt.position),
      markedByMe: promptMarkers.some((marker) => String(marker.participant_user_id) === userId),
      markedByPartner: promptMarkers.some((marker) => String(marker.participant_user_id) !== userId),
    }];
  });
}

/**
 * Je Thema die Anzahl - fuer die Liste im Setup.
 *
 * Eine Abfrage fuer alle zwanzig Themen, nicht zwanzig Abfragen: Die
 * Zuordnung steckt im Code, nicht in der Datenbank.
 */
export async function getCollaborationConversationPointCounts(
  teamId: string,
  userId: string,
  client: SupabaseClient
) {
  const counts = new Map<string, number>();
  for (const row of await readMarkedRows(teamId, userId, client)) {
    for (const itemKey of setupItemsForPrompt(row.promptKey)) {
      counts.set(itemKey, (counts.get(itemKey) ?? 0) + 1);
    }
  }
  return counts;
}

function label(choices: readonly { key: string; label: { de: string; en: string } }[], keys: readonly string[], locale: AppLocale) {
  return keys.flatMap((key) => {
    const found = choices.find((choice) => choice.key === key);
    return found ? [found.label[locale]] : [];
  });
}

export async function getCollaborationConversationPoints(params: {
  teamId: string;
  itemKey: string;
  userId: string;
  locale: AppLocale;
  client: SupabaseClient;
}): Promise<CollaborationConversationPoint[]> {
  const rows = (await readMarkedRows(params.teamId, params.userId, params.client)).filter((row) =>
    promptBelongsToSetupItem(row.promptKey, params.itemKey)
  );
  if (rows.length === 0) return [];

  // Die Teamkontexte kosten je eine Abfrage und werden nur geholt, wenn ein
  // Punkt aus dem jeweiligen Erlebnis dabei ist.
  const needsWild = rows.some((row) => row.experienceKey === "founder_in_the_wild");
  const needsReadMyMind = rows.some((row) => row.experienceKey === "read_my_mind");
  const [wildTeam, readMyMindTeam] = await Promise.all([
    needsWild ? getFounderInTheWildTeam(params.teamId, params.userId, params.client) : null,
    needsReadMyMind ? getReadMyMindTeamContext(params.teamId, params.userId, params.client) : null,
  ]);

  const points: CollaborationConversationPoint[] = [];
  for (const row of rows) {
    if (row.experienceKey === "founder_in_the_wild") {
      const pack = getFounderInTheWildPack(row.packKey);
      const content = pack?.scenarios.find((scenario) => scenario.key === row.promptKey);
      if (!pack || !content || !wildTeam) continue;
      const opened = await getOpenedFounderInTheWildReveal({
        team: wildTeam,
        roundId: row.roundId,
        position: row.position,
        userId: params.userId,
        client: params.client,
      });
      points.push({
        experience: "founder_in_the_wild",
        roundId: row.roundId,
        position: row.position,
        promptKey: row.promptKey,
        title: content.title[params.locale],
        prompt: content.situation[params.locale],
        markedByMe: row.markedByMe,
        markedByPartner: row.markedByPartner,
        href: `/teams/${encodeURIComponent(params.teamId)}/collaboration-lab/founder-in-the-wild/${encodeURIComponent(row.roundId)}/reveal/${row.position}`,
        // Gezeigt wird die ENTSCHEIDUNG, nicht alles: Was einem wichtig war
        // und was man gebraucht haette, steht im Lab. Hier geht es um den
        // Punkt, an dem eine Vereinbarung ansetzt.
        answers: opened
          ? {
              own: label(content.moves, opened.reveal.own.move, params.locale),
              partner: label(content.moves, opened.reveal.partner.move, params.locale),
            }
          : null,
        partnerName: opened?.round.partner.displayName ?? wildTeam.members.find((member) => member.userId !== params.userId)?.displayName ?? null,
      });
      continue;
    }

    if (row.experienceKey === "read_my_mind") {
      const pack = getReadMyMindPack(row.packKey, row.packVersion);
      const content = pack?.prompts.find((prompt) => prompt.key === row.promptKey);
      if (!pack || !content || !readMyMindTeam) continue;
      const opened = await getOpenedReadMyMindPromptReveal({
        team: readMyMindTeam,
        roundId: row.roundId,
        position: row.position,
        currentUserId: params.userId,
        client: params.client,
      });
      const round = opened?.round ?? (await getReadMyMindRound(readMyMindTeam, row.roundId, params.userId, params.client));
      points.push({
        experience: "read_my_mind",
        roundId: row.roundId,
        position: row.position,
        promptKey: row.promptKey,
        title: content.title[params.locale],
        prompt: content.selfQuestion[params.locale],
        markedByMe: row.markedByMe,
        markedByPartner: row.markedByPartner,
        href: `/teams/${encodeURIComponent(params.teamId)}/collaboration-lab/read-my-mind/${encodeURIComponent(row.roundId)}/reveal/${row.position}`,
        answers: opened
          ? {
              own: label(content.selfGuess.choices, opened.reveal.ownPerspective.self, params.locale),
              partner: label(content.selfGuess.choices, opened.reveal.partnerPerspective.self, params.locale),
            }
          : null,
        partnerName: round?.partner.displayName ?? null,
      });
    }
  }

  // Zuerst, was die andere Seite angemeldet hat: Der eigene Haken ist kein
  // Hinweis, der eigene Haken ist eine Erinnerung.
  return points.sort((a, b) =>
    Number(b.markedByPartner) - Number(a.markedByPartner) || a.position - b.position
  );
}
