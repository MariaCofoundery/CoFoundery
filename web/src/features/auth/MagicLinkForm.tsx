"use client";

import { FormEvent, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type MagicLinkFormProps = {
  nextPath?: string;
};

export function MagicLinkForm({ nextPath = "/dashboard" }: MagicLinkFormProps) {
  const supabase = useMemo(() => createClient(), []);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [message, setMessage] = useState<string>("");

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("loading");
    setMessage("");

    const origin = window.location.origin;
    const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo,
      },
    });

    if (error) {
      setStatus("error");
      setMessage(error.message);
      return;
    }

    setStatus("sent");
    setMessage("Magic Link versendet. Bitte checke dein Postfach.");
  };

  return (
    <form onSubmit={onSubmit} className="grid gap-3">
      <label htmlFor="email" className="text-sm font-medium text-[color:var(--ink)]">
        E-Mail
      </label>
      <input
        id="email"
        type="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="name@firma.de"
        className="rounded-lg border border-[color:var(--line)] bg-white px-4 py-3 text-sm outline-none focus:border-[color:var(--ink-soft)]"
      />
      <button
        type="submit"
        disabled={status === "loading"}
        className="rounded-lg bg-[color:var(--ink)] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === "loading" ? "Sende..." : "Magic Link senden"}
      </button>
      {message ? (
        <p
          className={`text-sm ${status === "error" ? "text-red-700" : "text-[color:var(--muted)]"}`}
        >
          {message}
        </p>
      ) : null}
    </form>
  );
}
