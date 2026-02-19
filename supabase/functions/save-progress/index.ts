import { supabaseAdmin } from "../_shared/supabaseClient.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

type Answer = {
  question_id: string;
  choice_value: string;
};

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return json({ error: "method_not_allowed" }, 405);
  }

  const payload = await req.json().catch(() => null);
  if (!payload || !payload.token) {
    return json({ error: "missing_token" }, 400);
  }

  const token = payload.token as string;
  const answers = (payload.answers as Answer[] | undefined) ?? [];
  const freeText = payload.free_text as string | undefined;

  const supabase = supabaseAdmin();

  const { data: participant, error: participantError } = await supabase
    .from("participants")
    .select("id, session_id, completed_at")
    .eq("token", token)
    .maybeSingle();

  if (participantError || !participant) {
    return json({ error: "invalid_token" }, 404);
  }

  if (participant.completed_at) {
    return json({ error: "already_completed" }, 409);
  }

  if (answers.length > 0) {
    const rows = answers.map((answer) => ({
      session_id: participant.session_id,
      participant_id: participant.id,
      question_id: answer.question_id,
      choice_value: answer.choice_value,
      updated_at: new Date().toISOString(),
    }));

    const { error: responseError } = await supabase
      .from("responses")
      .upsert(rows, { onConflict: "participant_id,question_id" });

    if (responseError) {
      return json({ error: "failed_to_save_responses" }, 500);
    }
  }

  if (typeof freeText === "string") {
    const { error: freeTextError } = await supabase
      .from("free_text")
      .upsert(
        {
          session_id: participant.session_id,
          participant_id: participant.id,
          text: freeText,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "participant_id" }
      );

    if (freeTextError) {
      return json({ error: "failed_to_save_free_text" }, 500);
    }
  }

  return json({ ok: true });
});
