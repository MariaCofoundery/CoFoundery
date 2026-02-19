import { supabaseAdmin } from "../_shared/supabaseClient.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return json({ error: "method_not_allowed" }, 405);
  }

  const payload = await req.json().catch(() => null);
  if (!payload || !payload.token) {
    return json({ error: "missing_token" }, 400);
  }

  const token = payload.token as string;
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

  const { count: questionCount } = await supabase
    .from("questions")
    .select("id", { count: "exact", head: true })
    .eq("is_active", true);

  const { count: responseCount } = await supabase
    .from("responses")
    .select("id", { count: "exact", head: true })
    .eq("participant_id", participant.id);

  if (!questionCount || responseCount !== questionCount) {
    return json(
      { error: "incomplete_answers", expected: questionCount ?? 0, received: responseCount ?? 0 },
      400
    );
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

  const completedAt = new Date().toISOString();
  const { error: completeError } = await supabase
    .from("participants")
    .update({ completed_at: completedAt })
    .eq("id", participant.id);

  if (completeError) {
    return json({ error: "failed_to_complete" }, 500);
  }

  const { data: participants } = await supabase
    .from("participants")
    .select("completed_at")
    .eq("session_id", participant.session_id);

  const allDone = participants?.every((p) => p.completed_at) ?? false;
  const newStatus = allDone ? "ready" : "waiting";

  await supabase
    .from("sessions")
    .update({ status: newStatus, updated_at: completedAt })
    .eq("id", participant.session_id);

  return json({ ok: true, status: newStatus });
});
