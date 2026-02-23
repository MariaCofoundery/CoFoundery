"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createCoFounderInvitationAction } from "@/app/(product)/dashboard/actions";

const SENT_INVITE_TOKEN_STORE_KEY = "sent_invite_tokens_v1";

function toAbsoluteUrl(path: string) {
  if (typeof window === "undefined") return path;
  return path.startsWith("/") ? `${window.location.origin}${path}` : path;
}

function extractTokenFromInviteUrl(inviteUrl: string) {
  if (typeof window === "undefined") return null;
  try {
    const parsed = inviteUrl.startsWith("http")
      ? new URL(inviteUrl)
      : new URL(inviteUrl, window.location.origin);
    const token = parsed.searchParams.get("token");
    return token?.trim() ? token : null;
  } catch {
    return null;
  }
}

function storeInviteToken(invitationId: string, token: string) {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(SENT_INVITE_TOKEN_STORE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Record<string, string>) : {};
    parsed[invitationId] = token;
    window.localStorage.setItem(SENT_INVITE_TOKEN_STORE_KEY, JSON.stringify(parsed));
  } catch {
    // ignore local cache errors
  }
}

export function CoFounderInviteForm() {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [email, setEmail] = useState("");
  const [includeValues, setIncludeValues] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copyNotice, setCopyNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedModulesLabel = useMemo(() => {
    return includeValues ? "Basis, Werte" : "Basis";
  }, [includeValues]);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const invitedEmail = email.trim().toLowerCase();
    if (!invitedEmail || !invitedEmail.includes("@")) {
      setError("Bitte eine gueltige E-Mail-Adresse eingeben.");
      return;
    }

    setError(null);
    setCopyNotice(null);

    startTransition(async () => {
      const formData = new FormData();
      formData.set("label", label.trim());
      formData.set("invitedEmail", invitedEmail);
      formData.set("includeValues", includeValues ? "true" : "false");

      const result = await createCoFounderInvitationAction(formData);
      if (!result.ok) {
        setInviteUrl(null);
        setError(result.error);
        return;
      }

      const absoluteInviteUrl = toAbsoluteUrl(result.inviteUrl);
      const token = extractTokenFromInviteUrl(absoluteInviteUrl);
      if (token) {
        storeInviteToken(result.sessionId, token);
      }

      setInviteUrl(absoluteInviteUrl);
      setCopyNotice(null);
      router.refresh();
    });
  };

  const onCopy = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopyNotice("Link kopiert.");
    } catch {
      setCopyNotice("Kopieren nicht moeglich. Bitte Link manuell kopieren.");
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white/95 p-6">
      <h1 className="text-xl font-semibold text-slate-900">Co-Founder einladen</h1>
      <p className="mt-2 text-sm text-slate-600">
        Einladungen laufen aktuell link-basiert. E-Mail-Versand folgt spaeter.
      </p>

      <form onSubmit={onSubmit} className="mt-5 space-y-4">
        <div>
          <label htmlFor="invite-label" className="text-xs font-medium uppercase tracking-[0.08em] text-slate-600">
            Label / Name
          </label>
          <input
            id="invite-label"
            type="text"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="z. B. Alex"
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
          />
        </div>

        <div>
          <label htmlFor="invite-email" className="text-xs font-medium uppercase tracking-[0.08em] text-slate-600">
            E-Mail-Adresse
          </label>
          <input
            id="invite-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            placeholder="cofounder@example.com"
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
          />
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-slate-600">Module</p>
          <div className="mt-3 space-y-2 text-sm text-slate-700">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked disabled className="h-4 w-4" />
              <span>Basis (aktiv)</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={includeValues}
                onChange={(event) => setIncludeValues(event.target.checked)}
                className="h-4 w-4"
              />
              <span>Werte (optional)</span>
            </label>
            <label className="flex items-center gap-2 text-slate-500">
              <input type="checkbox" checked={false} disabled className="h-4 w-4" />
              <span>Stress & Belastung (coming soon)</span>
            </label>
            <label className="flex items-center gap-2 text-slate-500">
              <input type="checkbox" checked={false} disabled className="h-4 w-4" />
              <span>Arbeitsstil & Entscheidungslogik (coming soon)</span>
            </label>
            <label className="flex items-center gap-2 text-slate-500">
              <input type="checkbox" checked={false} disabled className="h-4 w-4" />
              <span>Konflikt- & Feedback-Dynamiken (coming soon)</span>
            </label>
            <label className="flex items-center gap-2 text-slate-500">
              <input type="checkbox" checked={false} disabled className="h-4 w-4" />
              <span>Rollenverständnis im Team (coming soon)</span>
            </label>
            <label className="flex items-center gap-2 text-slate-500">
              <input type="checkbox" checked={false} disabled className="h-4 w-4" />
              <span>Team-Report (3–4 Personen) (coming soon)</span>
            </label>
            <label className="flex items-center gap-2 text-slate-500">
              <input type="checkbox" checked={false} disabled className="h-4 w-4" />
              <span>Investor / Business-Angel Match (coming soon)</span>
            </label>
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="inline-flex rounded-lg border border-slate-900 bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-60"
        >
          {isPending ? "Einladung wird erstellt..." : "Einladungslink erstellen"}
        </button>
      </form>

      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}

      {inviteUrl ? (
        <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-emerald-800">
            Einladung erstellt
          </p>
          <p className="mt-2 text-sm text-emerald-900">Aktive Module: {selectedModulesLabel}</p>
          <p className="mt-2 break-all rounded-md border border-emerald-200 bg-white px-3 py-2 text-xs text-emerald-900">
            {inviteUrl}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onCopy}
              className="inline-flex rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-sm text-emerald-900"
            >
              Link kopieren
            </button>
            <a
              href="/dashboard"
              className="inline-flex rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700"
            >
              Zum Dashboard
            </a>
          </div>
          {copyNotice ? <p className="mt-2 text-xs text-emerald-900">{copyNotice}</p> : null}
        </div>
      ) : null}
    </section>
  );
}
