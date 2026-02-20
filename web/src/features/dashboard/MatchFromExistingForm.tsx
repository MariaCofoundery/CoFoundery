"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createComparisonFromExistingAction } from "@/app/(product)/dashboard/actions";

type Option = {
  sessionId: string;
  label: string;
};

type Props = {
  options: Option[];
};

export function MatchFromExistingForm({ options }: Props) {
  const router = useRouter();
  const [sourceSessionId, setSourceSessionId] = useState(options[0]?.sessionId ?? "");
  const [email, setEmail] = useState("");
  const [reportScope, setReportScope] = useState<"basis" | "basis_plus_values">("basis");
  const [inviteConsent, setInviteConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ text: string; tone: "success" | "warning" } | null>(null);
  const [isPending, startTransition] = useTransition();

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!sourceSessionId) {
      setError("Bitte eine Ausgangs-Auswertung wählen.");
      return;
    }
    const invitedEmail = email.trim().toLowerCase();
    if (!invitedEmail || !invitedEmail.includes("@")) {
      setError("Bitte eine gültige E-Mail eingeben.");
      return;
    }
    if (!inviteConsent) {
      setError("Bitte bestätige die Einwilligung zur Nutzung der E-Mail-Adresse.");
      return;
    }

    setError(null);
    setNotice(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("sourceSessionId", sourceSessionId);
      formData.set("invitedEmail", invitedEmail);
      formData.set("reportScope", reportScope);
      formData.set("inviteConsent", inviteConsent ? "true" : "false");
      const result = await createComparisonFromExistingAction(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }

      let nextNotice: { text: string; tone: "success" | "warning" };
      if (result.emailStatus === "sent") {
        nextNotice = { text: "Einladung per E-Mail versendet.", tone: "success" };
      } else {
        const inviteUrl = result.inviteUrl.startsWith("/")
          ? `${window.location.origin}${result.inviteUrl}`
          : result.inviteUrl;
        try {
          await navigator.clipboard.writeText(inviteUrl);
          nextNotice = {
            text: "E-Mail nicht versendet. Einladungslink wurde automatisch kopiert.",
            tone: "warning",
          };
        } catch {
          nextNotice = {
            text: "E-Mail nicht versendet. Bitte nutze den Button 'Link kopieren'.",
            tone: "warning",
          };
        }
      }
      setEmail("");
      setInviteConsent(false);
      setNotice(nextNotice);
      router.refresh();
    });
  };

  return (
    <div className="mt-5 rounded-xl border border-cyan-200 bg-cyan-50/60 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-cyan-800">
        Mit bestehender Auswertung matchen
      </p>
      <p className="mt-2 text-xs leading-6 text-cyan-900/80">
        Du nutzt eine vorhandene eigene Auswertung als Basis. Der Fragebogen wird dafür nicht neu gestartet.
      </p>
      <form onSubmit={onSubmit} className="mt-3 space-y-3">
        <select
          value={sourceSessionId}
          onChange={(event) => setSourceSessionId(event.target.value)}
          className="w-full rounded-lg border border-cyan-200 bg-white px-3 py-2 text-xs text-slate-800"
        >
          {options.map((option) => (
            <option key={option.sessionId} value={option.sessionId}>
              {option.label}
            </option>
          ))}
        </select>
        <input
          type="email"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            setNotice(null);
          }}
          placeholder="partner@firma.de"
          className="w-full rounded-lg border border-cyan-200 bg-white px-3 py-2 text-xs"
          required
        />
        <select
          value={reportScope}
          onChange={(event) =>
            setReportScope(event.target.value === "basis_plus_values" ? "basis_plus_values" : "basis")
          }
          className="w-full rounded-lg border border-cyan-200 bg-white px-3 py-2 text-xs text-slate-700"
        >
          <option value="basis">Report-Umfang: Nur Basis</option>
          <option value="basis_plus_values">Report-Umfang: Basis + Werte-Add-on</option>
        </select>
        <label className="flex items-start gap-2 rounded-lg border border-cyan-200 bg-white px-3 py-2 text-xs text-slate-700">
          <input
            type="checkbox"
            checked={inviteConsent}
            onChange={(event) => {
              setInviteConsent(event.target.checked);
              setNotice(null);
            }}
            className="mt-0.5"
          />
          <span>Einwilligung zur zweckgebundenen Nutzung der E-Mail-Adresse liegt vor.</span>
        </label>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg bg-cyan-700 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
        >
          {isPending ? "Erstelle..." : "Vergleich mit dieser Auswertung starten"}
        </button>
      </form>
      {error ? <p className="mt-2 text-xs text-red-700">{error}</p> : null}
      {notice ? (
        <p
          className={`mt-2 rounded-md border px-3 py-2 text-xs ${
            notice.tone === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-amber-200 bg-amber-50 text-amber-800"
          }`}
        >
          {notice.text}
        </p>
      ) : null}
    </div>
  );
}
