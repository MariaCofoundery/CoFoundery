import { redirect } from "next/navigation";
import { getPersonStrengths } from "@/features/capability/strengthData";
import { StrengthsReport, type CounterAnswer } from "@/features/strengths/StrengthsReport";
import { getLatestCompletedStrengthsInterview } from "@/features/strengths/strengthsInterviewData";
import { createClient, getRequestUser } from "@/lib/supabase/server";

const COUNTER_ORDER = ["avoid_task", "hand_off", "others_better"] as const;

/** Das Stärkenbild: Themen aus dem Stärken-Interview, nach Bereichen, ohne Rangfolge. */
export default async function StrengthsReportPage() {
  const {
    data: { user },
  } = await getRequestUser();
  if (!user) redirect("/login?next=/me/profile/strengths");

  const client = await createClient();
  const [strengths, completed] = await Promise.all([
    getPersonStrengths(client),
    getLatestCompletedStrengthsInterview(client),
  ]);

  const counterAnswers: CounterAnswer[] = COUNTER_ORDER.flatMap((questionId) => {
    const turn = completed?.answers.find((answer) => answer.questionId === questionId);
    return turn?.answer ? [{ questionId, answer: turn.answer }] : [];
  });

  return <StrengthsReport strengths={strengths} counterAnswers={counterAnswers} hasInterview={Boolean(completed)} />;
}
