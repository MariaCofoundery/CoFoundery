"use server";

import { createClient } from "@/lib/supabase/server";
import { sendPanelFeedbackNotification } from "@/lib/email/sendFeedbackNotification";
import { feedbackMomentAnswerOf, feedbackMomentOf, sanitizeFeedbackSubmission, type FeedbackSubmissionInput } from "@/features/feedback/feedbackModel";

export type SubmitProductFeedbackResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      reason: "not_authenticated" | "invalid_input" | "insert_failed";
    };

/**
 * Feedback aus dem Panel (09.11.2026). Bereich und Seite bestimmt der SERVER aus der Adresse - die Eingabe kann weder
 * einen Bereich vorgeben noch eine Kennung oder einen Code in die Seite schmuggeln. Die Erlaubnis zum Anschreiben gilt
 * nur bei ausdruecklichem Ja.
 */
export async function submitFeedbackAction(input: FeedbackSubmissionInput): Promise<SubmitProductFeedbackResult> {
  const sanitized = sanitizeFeedbackSubmission(input);
  if (!sanitized.ok) return { ok: false, reason: "invalid_input" };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "not_authenticated" };

  const { value } = sanitized;
  const { error } = await supabase.from("product_feedback").insert({
    user_id: user.id,
    invitation_id: value.invitationId,
    source: value.source,
    kind: value.kind,
    message: value.message,
    importance: value.importance,
    area: value.area,
    page_path: value.pagePath,
    device: value.device,
    may_contact: value.mayContact,
    moment: value.moment,
  });
  if (error) return { ok: false, reason: "insert_failed" };

  // Der Eintrag steht. Eine fehlgeschlagene Benachrichtigung aendert daran nichts.
  try {
    const notification = await sendPanelFeedbackNotification({ ...value, userId: user.id });
    if (!notification.ok) console.warn("[feedback] notification_not_sent", notification.error);
  } catch {
    console.warn("[feedback] notification_not_sent", "unexpected_mail_error");
  }
  return { ok: true };
}

/**
 * Schneller Moment: Ja / Nicht so / Mehr sagen / weggeklickt. Je Konto und Moment gilt die ERSTE Reaktion - danach wird
 * nicht wieder gefragt. Nichts davon ist Pflicht, und die Antworten sind im Admin-Bereich nur Zaehler.
 */
export async function answerFeedbackMomentAction(moment: string, answer: string): Promise<{ ok: boolean }> {
  const checkedMoment = feedbackMomentOf(moment);
  const checkedAnswer = feedbackMomentAnswerOf(answer);
  if (!checkedMoment || !checkedAnswer) return { ok: false };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false };
  const { error } = await supabase.rpc("answer_feedback_moment", { p_moment: checkedMoment, p_answer: checkedAnswer });
  return { ok: !error };
}
