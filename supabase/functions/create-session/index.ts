import { supabaseAdmin } from "../_shared/supabaseClient.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const createToken = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
};

Deno.serve(async () => {
  const supabase = supabaseAdmin();

  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .insert({ status: "in_progress" })
    .select("id, status")
    .single();

  if (sessionError || !session) {
    return json({ error: "failed_to_create_session" }, 500);
  }

  const tokenA = createToken();
  const tokenB = createToken();

  const { error: participantError } = await supabase.from("participants").insert([
    { session_id: session.id, role: "A", token: tokenA },
    { session_id: session.id, role: "B", token: tokenB },
  ]);

  if (participantError) {
    return json({ error: "failed_to_create_participants" }, 500);
  }

  return json({
    session_id: session.id,
    status: session.status,
    token_a: tokenA,
    token_b: tokenB,
  });
});
