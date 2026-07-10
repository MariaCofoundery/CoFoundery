"use client";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { useTranslations } from "next-intl";
import { FormEvent, useMemo, useState } from "react";
import { getPublicAppOrigin, isLocalDevelopmentOrigin } from "@/lib/publicAppOrigin";

type MagicLinkFormProps = {
  nextPath?: string;
  shouldCreateUser?: boolean;
};

export function MagicLinkForm({ nextPath = "/dashboard", shouldCreateUser = false }: MagicLinkFormProps) {
  const t = useTranslations("auth.magicLinkForm");
  const supabase = useMemo(
    () =>
      createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          auth: {
            autoRefreshToken: false,
            detectSessionInUrl: false,
            flowType: "implicit",
            persistSession: false,
          },
        }
      ),
    []
  );
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [message, setMessage] = useState<string>("");
  const sentMessage = shouldCreateUser ? t("sentInvitation") : t("sentExisting");

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("loading");
    setMessage("");

    const origin =
      getPublicAppOrigin(window.location.origin) ||
      (isLocalDevelopmentOrigin(window.location.origin) ? window.location.origin : "");

    if (!origin) {
      setStatus("error");
      setMessage(t("configurationError"));
      return;
    }

    const redirectTo = new URL("/auth/callback", `${origin}/`);
    redirectTo.searchParams.set("next", nextPath);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo.toString(),
        shouldCreateUser,
      },
    });

    if (error) {
      setStatus("sent");
      setMessage(sentMessage);
      return;
    }

    setStatus("sent");
    setMessage(sentMessage);
  };

  return (
    <form onSubmit={onSubmit} className="grid gap-3">
      <label htmlFor="email" className="text-sm font-medium text-[color:var(--ink)]">
        {t("emailLabel")}
      </label>
      <input
        id="email"
        type="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder={t("emailPlaceholder")}
        className="rounded-lg border border-[color:var(--line)] bg-white px-4 py-3 text-sm outline-none focus:border-[color:var(--ink-soft)]"
      />
      <button
        type="submit"
        disabled={status === "loading"}
        className="rounded-lg bg-[color:var(--ink)] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === "loading" ? t("submitting") : t("submit")}
      </button>
      <p className="text-xs text-[color:var(--muted)]">
        {t("hint")}
      </p>
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
