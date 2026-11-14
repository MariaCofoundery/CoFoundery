import { getTranslations } from "next-intl/server";
import { ReminderAsk } from "@/features/onboarding/ReminderAsk";
import { createClient, getRequestUser } from "@/lib/supabase/server";

/** Wie lange nach dem Einstieg die Frage noch gestellt wird. Danach waere "morgen erinnern" keine sinnvolle Frage mehr. */
const ASK_WITHIN_MS = 3 * 24 * 60 * 60 * 1000;

/**
 * Stellt die Erinnerungsfrage auf der ersten Seite eines Bereichs - aber nur, wenn sie sinnvoll ist:
 * der Einstieg liegt hoechstens drei Tage zurueck, und es gibt noch keine Antwort (Ja oder Nein danke).
 * Wer am Start "Gerade keine Zeit" gewaehlt oder im Fragebogen geantwortet hat, wird nicht noch einmal gefragt.
 * Liest nur die eigene Zeile; schreibt nichts.
 */
export async function ReminderAskSlot() {
  const {
    data: { user },
  } = await getRequestUser();
  if (!user?.id) return null;
  const client = await createClient();
  const [{ data: core }, { data: decided }] = await Promise.all([
    client.from("person_core").select("onboarding_completed_at").eq("user_id", user.id).maybeSingle(),
    client.from("onboarding_reminders").select("user_id").maybeSingle(),
  ]);
  const completedAt = core?.onboarding_completed_at ? Date.parse(core.onboarding_completed_at as string) : NaN;
  if (decided || Number.isNaN(completedAt) || Date.now() - completedAt > ASK_WITHIN_MS) return null;

  const t = await getTranslations("profile.journey.reminderAsk");
  return <ReminderAsk labels={{ title: t("title"), text: t("text"), yes: t("yes"), no: t("no"), thanksYes: t("thanksYes"), thanksNo: t("thanksNo") }} />;
}
