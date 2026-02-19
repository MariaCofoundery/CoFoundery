import { supabaseAdmin } from "../_shared/supabaseClient.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return json({ error: "missing_token" }, 400);
  }

  const supabase = supabaseAdmin();

  const { data: participant, error: participantError } = await supabase
    .from("participants")
    .select("id, role, session_id, completed_at")
    .eq("token", token)
    .maybeSingle();

  if (participantError || !participant) {
    return json({ error: "invalid_token" }, 404);
  }

  const { data: session } = await supabase
    .from("sessions")
    .select("id, status")
    .eq("id", participant.session_id)
    .single();

  const { data: questions } = await supabase
    .from("questions")
    .select("id, dimension, prompt, sort_order")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  const { data: choices } = await supabase
    .from("choices")
    .select("id, question_id, label, value, sort_order")
    .order("sort_order", { ascending: true });

  const { data: responses } = await supabase
    .from("responses")
    .select("question_id, choice_value")
    .eq("participant_id", participant.id);

  const { data: freeText } = await supabase
    .from("free_text")
    .select("text")
    .eq("participant_id", participant.id)
    .maybeSingle();

  return json({
    session,
    participant: {
      id: participant.id,
      role: participant.role,
      completed_at: participant.completed_at,
    },
    questions,
    choices,
    responses,
    free_text: freeText?.text ?? null,
  });
});
