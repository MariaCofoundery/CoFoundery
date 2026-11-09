import { FeedbackMomentCard } from "@/features/feedback/FeedbackMomentCard";
import type { FeedbackMoment as Moment } from "@/features/feedback/feedbackModel";
import { createClient, getRequestUser } from "@/lib/supabase/server";

/**
 * Schneller Moment (Entwurf vom 09.11.2026): eine kleine Frage im Fluss, nach einem Schluesselmoment. Sie steht dort, wo
 * die Seite sie hinsetzt - nie als Pop-up - und je Konto HOECHSTENS EINMAL: Wer irgendwie darauf reagiert hat (Ja, Nicht
 * so, Mehr sagen, weggeklickt), wird nicht wieder gefragt. Ein Lesefehler heisst "schon gefragt": nicht fragen ist der
 * harmlosere Fehler.
 */
export async function FeedbackMoment({ moment }: { moment: Moment }) {
  const {
    data: { user },
  } = await getRequestUser();
  if (!user) return null;
  const client = await createClient();
  const { data, error } = await client.from("feedback_moments").select("answer").eq("moment", moment).maybeSingle();
  if (error || data) return null;
  return <FeedbackMomentCard moment={moment} />;
}
