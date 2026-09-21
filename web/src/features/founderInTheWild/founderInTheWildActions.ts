"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getFounderInTheWildPack, isFounderInTheWildChoice } from "./founderInTheWildContent";
import { getFounderInTheWildRound, getFounderInTheWildTeam } from "./founderInTheWildData";
import { logFounderInTheWildServerError } from "./founderInTheWildDiagnostics";
import { founderInTheWildEntryHref, founderInTheWildRevealHref, founderInTheWildRoundHref } from "./founderInTheWildRoutes";
import { getNotificationRecipient } from "@/lib/email/notificationRecipient";
import { createInAppNotice, withdrawInAppNotice } from "@/features/notifications/inAppNotice";
import { sendFounderInTheWildHandoffEmail } from "@/lib/email/sendFounderInTheWildHandoffEmail";
import { toPublicAppUrl } from "@/lib/publicAppOrigin";
import { createClient } from "@/lib/supabase/server";

const entryHref = founderInTheWildEntryHref;
const roundHref = founderInTheWildRoundHref;
const revealHref = founderInTheWildRevealHref;

async function auth(next: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return { supabase, user };
}

function refresh(teamId: string, roundId?: string) {
  revalidatePath("/dashboard");
  revalidatePath(`/teams/${teamId}`); revalidatePath(entryHref(teamId));
  if (roundId) { revalidatePath(roundHref(teamId, roundId)); revalidatePath(revealHref(teamId, roundId)); }
}

async function claimAndSendHandoff(params: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  teamId: string;
  roundId: string;
  founderName: string | null;
}) {
  const claim = await params.supabase.rpc("claim_founder_in_the_wild_handoff_email", {
    p_round_id: params.roundId,
  });
  if (claim.error) {
    logFounderInTheWildServerError("claim_handoff_email", claim.error);
    return;
  }
  const row = Array.isArray(claim.data) ? claim.data[0] : claim.data;
  const recipientUserId = (row as { recipient_user_id?: unknown } | null)?.recipient_user_id;
  if (typeof recipientUserId !== "string") return;

  // Neu am 21.09.2026: der Hinweis in der Anwendung, und zwar VOR dem
  // Mail-Schalter. Wer die Uebergabe-Mails abbestellt hat, soll trotzdem
  // sehen, dass die andere Seite fertig ist und er dran ist - sonst wartet er,
  // ohne es zu wissen, und genau das war der Grund fuer die Uebergabe.
  await createInAppNotice(params.supabase, {
    kind: "founder_in_the_wild_handoff",
    recipientUserId,
    subjectId: params.roundId,
    path: roundHref(params.teamId, params.roundId),
  });

  // Neu am 18.09.2026: eigener Schalter, und die Sprache der Empfaengerin.
  const { data: wanted } = await params.supabase.rpc("wants_email_notification", {
    p_user_id: recipientUserId,
    p_kind: "founder_in_the_wild",
  });
  if (wanted !== true) return;

  const recipient = await getNotificationRecipient(recipientUserId);
  if (!recipient) {
    logFounderInTheWildServerError("resolve_handoff_recipient", { code: "recipient_unavailable" });
    return;
  }
  try {
    const delivery = await sendFounderInTheWildHandoffEmail({
      recipientEmail: recipient.email,
      founderName: params.founderName,
      roundUrl: toPublicAppUrl(roundHref(params.teamId, params.roundId)),
      locale: recipient.locale,
    });
    if (!delivery.ok) {
      logFounderInTheWildServerError("send_handoff_email", { code: delivery.error });
    }
  } catch {
    logFounderInTheWildServerError("send_handoff_email", { code: "unexpected_delivery_error" });
  }
}

export async function startFounderInTheWildRoundAction(teamId: string, packKey: string) {
  const { supabase, user } = await auth(entryHref(teamId));
  const team = await getFounderInTheWildTeam(teamId, user.id, supabase);
  if (!team || team.members.length !== 2) redirect(`${entryHref(teamId)}?result=unavailable`);
  // Nur ein Pack, das es wirklich gibt: Der Schluessel kommt aus dem Formular
  // und waere sonst ein Wert, den die Seite an die Datenbank durchreicht.
  const pack = getFounderInTheWildPack(packKey);
  if (!pack) redirect(`${entryHref(teamId)}?result=changed`);
  const result = await supabase.rpc("create_founder_in_the_wild_round", { p_founder_team_id: teamId, p_pack_key: pack.key, p_pack_version: pack.version });
  if (result.error) {
    logFounderInTheWildServerError("create_round", result.error);
    redirect(`${entryHref(teamId)}?result=changed`);
  }
  if (typeof result.data !== "string") {
    logFounderInTheWildServerError("create_round_return_contract");
    redirect(`${entryHref(teamId)}?result=changed`);
  }
  const round = await getFounderInTheWildRound(team, result.data, user.id, supabase);
  if (!round) redirect(`${entryHref(teamId)}?result=changed`);
  refresh(teamId, round.id); redirect(roundHref(teamId, round.id));
}

export async function lockFounderInTheWildScenarioAction(teamId: string, roundId: string, roundPromptId: string, formData: FormData) {
  const { supabase, user } = await auth(roundHref(teamId, roundId));
  const team = await getFounderInTheWildTeam(teamId, user.id, supabase);
  const round = team ? await getFounderInTheWildRound(team, roundId, user.id, supabase) : null;
  const prompt = round?.prompts.find((entry) => entry.roundPromptId === roundPromptId);
  if (!round || !prompt || round.status !== "active") redirect(`${entryHref(teamId)}?result=changed`);
  // "guess" nur, wenn das Pack es hat - sonst gibt es keinen Vertrag dafuer
  // und die Datenbank wiese es zu Recht ab.
  const responseTypes = prompt.guess
    ? (["move", "guess", "matters", "need"] as const)
    : (["move", "matters", "need"] as const);
  for (const responseType of responseTypes) {
    const keys = formData.getAll(responseType).filter((value): value is string => typeof value === "string");
    if (!isFounderInTheWildChoice(responseType, prompt.content, keys)) redirect(`${roundHref(teamId, roundId)}?result=invalid`);
    const slot = prompt[responseType];
    if (!slot || slot.lockedAt) continue;
    const result = await supabase.rpc("lock_founder_in_the_wild_response", { p_prompt_assignment_id: slot.assignmentId, p_response_type: responseType, p_choice_keys: keys });
    if (result.error) redirect(`${roundHref(teamId, roundId)}?result=changed`);
  }
  await claimAndSendHandoff({
    supabase,
    teamId,
    roundId,
    founderName: team?.members.find((member) => member.userId === user.id)?.displayName ?? null,
  });
  refresh(teamId, roundId); redirect(roundHref(teamId, roundId));
}

export async function openFounderInTheWildRevealAction(teamId: string, roundId: string, position: number) {
  const { supabase, user } = await auth(revealHref(teamId, roundId, position));
  const team = await getFounderInTheWildTeam(teamId, user.id, supabase);
  const round = team ? await getFounderInTheWildRound(team, roundId, user.id, supabase) : null;
  const prompt = round?.prompts.find((entry) => entry.position === position);
  if (!round?.wholeRoundAnswerComplete || !prompt) redirect(roundHref(teamId, roundId));
  const result = await supabase.rpc("get_founder_in_the_wild_prompt_reveal", { p_round_prompt_id: prompt.roundPromptId });
  if (result.error) redirect(roundHref(teamId, roundId));
  refresh(teamId, roundId); redirect(revealHref(teamId, roundId, position));
}

export async function completeFounderInTheWildRoundAction(teamId: string, roundId: string) {
  const { supabase } = await auth(revealHref(teamId, roundId));
  const result = await supabase.rpc("complete_founder_in_the_wild_round", { p_round_id: roundId });
  refresh(teamId, roundId); redirect(`${revealHref(teamId, roundId)}?result=${result.error ? "waiting" : "completed"}`);
}

async function endRound(teamId: string, roundId: string, action: "discard" | "decline") {
  const { supabase, user } = await auth(roundHref(teamId, roundId));
  const team = await getFounderInTheWildTeam(teamId, user.id, supabase);
  const round = team ? await getFounderInTheWildRound(team, roundId, user.id, supabase) : null;
  if (!round || (action === "discard" ? !round.canDiscard : !round.canDecline)) redirect(`${roundHref(teamId, roundId)}?result=changed`);
  const result = await supabase.rpc("end_founder_in_the_wild_round", { p_round_id: roundId, p_action: action });
  if (result.error) redirect(`${roundHref(teamId, roundId)}?result=changed`);
  refresh(teamId, roundId); redirect(`${entryHref(teamId)}?result=${action === "discard" ? "discarded" : "declined"}`);
}

export async function discardFounderInTheWildRoundAction(teamId: string, roundId: string) { return endRound(teamId, roundId, "discard"); }
export async function declineFounderInTheWildRoundAction(teamId: string, roundId: string) { return endRound(teamId, roundId, "decline"); }

/**
 * Markieren heisst, die andere Seite darauf ansprechen zu wollen.
 *
 * GEMELDET AM 21.09.2026: "Ich habe auch markiert, darueber moechte ich
 * sprechen, aber da kam jetzt bei dem anderen Profil noch keine Nachricht an."
 * Die Markierung stand bis dahin nur auf der Reveal-Seite - wer nicht von sich
 * aus dieselbe Karte noch einmal aufmachte, erfuhr nie davon. Damit war der
 * einzige Zweck der Markierung verfehlt.
 *
 * DIE RUNDE WIRD JETZT GELADEN, weil der Hinweis eine Empfaengerin braucht.
 * Vorher genuegte die Prompt-Kennung, denn die Pruefung steckt ohnehin in der
 * Markierungsfunktion.
 *
 * Und ein Zuruecknehmen nimmt den Hinweis mit: Wer nicht mehr darueber
 * sprechen will, soll die andere Person nicht zu einem Punkt schicken, den es
 * nicht mehr gibt.
 */
async function marker(teamId: string, roundId: string, position: number, roundPromptId: string, rpc: "mark_collaboration_prompt_for_conversation" | "unmark_collaboration_prompt_for_conversation") {
  const { supabase, user } = await auth(revealHref(teamId, roundId, position));
  const { error } = await supabase.rpc(rpc, { p_round_prompt_id: roundPromptId });

  // Nur wenn die Markierung wirklich gesetzt (oder entfernt) wurde. Sonst
  // stuende ein Hinweis fuer etwas, das nicht geschehen ist.
  if (!error) {
    const team = await getFounderInTheWildTeam(teamId, user.id, supabase);
    const round = team ? await getFounderInTheWildRound(team, roundId, user.id, supabase) : null;
    if (round) {
      const params = {
        kind: "collaboration_conversation_marker",
        recipientUserId: round.partner.userId,
        subjectId: roundPromptId,
      } as const;
      if (rpc === "mark_collaboration_prompt_for_conversation") {
        await createInAppNotice(supabase, { ...params, path: revealHref(teamId, roundId, position) });
      } else {
        await withdrawInAppNotice(supabase, params);
      }
    }
  }

  refresh(teamId, roundId); redirect(`${revealHref(teamId, roundId, position)}#conversation-marker`);
}

export async function markFounderInTheWildConversationAction(teamId: string, roundId: string, position: number, roundPromptId: string) { return marker(teamId, roundId, position, roundPromptId, "mark_collaboration_prompt_for_conversation"); }
export async function unmarkFounderInTheWildConversationAction(teamId: string, roundId: string, position: number, roundPromptId: string) { return marker(teamId, roundId, position, roundPromptId, "unmark_collaboration_prompt_for_conversation"); }
