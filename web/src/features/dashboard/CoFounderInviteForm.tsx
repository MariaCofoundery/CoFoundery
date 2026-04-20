"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createCoFounderInvitationAction } from "@/app/(product)/dashboard/actions";
import { toPublicAppUrl } from "@/lib/publicAppOrigin";
type TeamContext = "pre_founder" | "existing_team";

function toAbsoluteUrl(path: string) {
  return typeof window === "undefined" ? path : toPublicAppUrl(path, window.location.origin);
}

export function CoFounderInviteForm() {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [email, setEmail] = useState("");
  const [includeValues, setIncludeValues] = useState(false);
  const [teamContext, setTeamContext] = useState<TeamContext | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copyNotice, setCopyNotice] = useState<string | null>(null);
  const [resultState, setResultState] = useState<{
    tone: "success" | "warning";
    recipient: string;
    message: string;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedModulesLabel = useMemo(() => {
    return includeValues ? "Basis, Werte" : "Basis";
  }, [includeValues]);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const invitedEmail = email.trim().toLowerCase();
    if (!invitedEmail || !invitedEmail.includes("@")) {
      setError("Bitte eine gültige E-Mail-Adresse eingeben.");
      return;
    }
    if (!teamContext) {
      setError("Bitte wähle aus, ob ihr euch erst kennenlernt oder bereits zusammenarbeitet.");
      return;
    }

    setError(null);
    setCopyNotice(null);
    setResultState(null);

    startTransition(async () => {
      const formData = new FormData();
      formData.set("label", label.trim());
      formData.set("invitedEmail", invitedEmail);
      formData.set("includeValues", includeValues ? "true" : "false");
      formData.set("teamContext", teamContext);

      const result = await createCoFounderInvitationAction(formData);
      if (!result.ok) {
        setInviteUrl(null);
        setResultState(null);
        setError(result.error);
        return;
      }

      const absoluteInviteUrl = toAbsoluteUrl(result.inviteUrl);
      setInviteUrl(absoluteInviteUrl);
      setCopyNotice(null);
      setResultState(
        result.emailStatus === "sent"
          ? {
              tone: "success",
              recipient: result.emailRecipient,
              message: `Die Einladung wurde an ${result.emailRecipient} versendet.`,
            }
          : {
              tone: "warning",
              recipient: result.emailRecipient,
              message:
                "Die Einladung wurde erstellt, aber die E-Mail konnte nicht versendet werden. Teile den Link bitte manuell.",
            }
      );
      router.refresh();
    });
  };

  const onCopy = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopyNotice("Link kopiert.");
    } catch {
      setCopyNotice("Kopieren nicht möglich. Bitte Link manuell kopieren.");
    }
  };

  return (
    <section
      id="cofounder-invite-form"
      className="scroll-mt-24 rounded-2xl border border-slate-200/80 bg-white/95 p-6"
    >
      <h1 className="text-xl font-semibold text-slate-900">Co-Founder einladen</h1>
      <p className="mt-2 text-sm text-slate-600">
        Wähle jetzt euren Kontext und sende die Einladung direkt per E-Mail. Falls nötig, kannst du den Link danach weiterhin manuell teilen.
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

        <div className="rounded-2xl border border-cyan-100 bg-cyan-50/70 p-4">
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-slate-600">
            Team-Kontext
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Wähle bewusst, ob ihr gerade eine mögliche Zusammenarbeit prüft oder bereits gemeinsam arbeitet.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                setTeamContext("pre_founder");
                setError(null);
              }}
              className={`rounded-2xl border px-4 py-4 text-left transition ${
                teamContext === "pre_founder"
                  ? "border-cyan-400 bg-white shadow-[0_10px_25px_rgba(34,211,238,0.12)]"
                  : "border-slate-200 bg-white/90 hover:border-cyan-200"
              }`}
              aria-pressed={teamContext === "pre_founder"}
            >
              <p className="text-sm font-semibold text-slate-900">Wir überlegen zusammenzuarbeiten</p>
            </button>
            <button
              type="button"
              onClick={() => {
                setTeamContext("existing_team");
                setError(null);
              }}
              className={`rounded-2xl border px-4 py-4 text-left transition ${
                teamContext === "existing_team"
                  ? "border-cyan-400 bg-white shadow-[0_10px_25px_rgba(34,211,238,0.12)]"
                  : "border-slate-200 bg-white/90 hover:border-cyan-200"
              }`}
              aria-pressed={teamContext === "existing_team"}
            >
              <p className="text-sm font-semibold text-slate-900">Wir arbeiten bereits zusammen</p>
            </button>
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-500">
            Dieser Kontext beeinflusst später eure Auswertung.
          </p>
          <p className="mt-2 max-w-2xl text-xs leading-5 text-slate-500">
            Die Ergebnisse gehören euch beiden. Wenn eine Person ihre Daten löscht, werden auch
            die gemeinsamen Ergebnisse entfernt.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-slate-600">Module</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Für den produktiven Founder-Flow startet ihr mit Basis und optional Werte. Report und Workbook bauen anschließend auf diesen beiden Modulen auf.
          </p>
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
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="inline-flex rounded-lg border border-[color:var(--brand-primary)] bg-[color:var(--brand-primary)] px-4 py-2 text-sm text-slate-900 shadow-[0_10px_30px_rgba(103,232,249,0.22)] transition hover:bg-[#4fd4e6] disabled:opacity-60"
        >
          {isPending ? "Einladung wird gesendet..." : "Einladung senden"}
        </button>
        <p className="text-xs text-slate-500">
          Fallback: Wenn der Versand scheitert, kannst du den Einladungslink danach manuell teilen.
        </p>
      </form>

      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}

      {inviteUrl && resultState ? (
        <div
          className={`mt-5 rounded-xl border p-4 ${
            resultState.tone === "success"
              ? "border-emerald-200 bg-emerald-50/60"
              : "border-amber-200 bg-amber-50/60"
          }`}
        >
          <p
            className={`text-xs font-semibold uppercase tracking-[0.08em] ${
              resultState.tone === "success" ? "text-emerald-800" : "text-amber-800"
            }`}
          >
            {resultState.tone === "success" ? "Einladung versendet" : "Einladung erstellt"}
          </p>
          <p
            className={`mt-2 text-sm ${
              resultState.tone === "success" ? "text-emerald-900" : "text-amber-900"
            }`}
          >
            {resultState.message}
          </p>
          <p
            className={`mt-2 text-sm ${
              resultState.tone === "success" ? "text-emerald-900" : "text-amber-900"
            }`}
          >
            Aktive Module: {selectedModulesLabel}
          </p>
          {teamContext ? (
            <p
              className={`mt-1 text-sm ${
                resultState.tone === "success" ? "text-emerald-900" : "text-amber-900"
              }`}
            >
              Kontext: {teamContext === "existing_team" ? "Wir arbeiten bereits zusammen" : "Wir überlegen, zusammenzuarbeiten"}
            </p>
          ) : null}
          <p
            className={`mt-2 text-xs leading-6 ${
              resultState.tone === "success" ? "text-emerald-800" : "text-amber-800"
            }`}
          >
            {resultState.tone === "success"
              ? "Falls du zusätzlich manuell nachfassen willst, kannst du denselben Einladungslink kopieren."
              : "Die Einladung ist gültig. Nutze den Link jetzt als manuellen Rettungsweg, damit der Flow nicht blockiert."}
          </p>
          <p
            className={`mt-2 break-all rounded-md border bg-white px-3 py-2 text-xs ${
              resultState.tone === "success"
                ? "border-emerald-200 text-emerald-900"
                : "border-amber-200 text-amber-900"
            }`}
          >
            {inviteUrl}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onCopy}
              className={`inline-flex rounded-lg border bg-white px-3 py-1.5 text-sm ${
                resultState.tone === "success"
                  ? "border-emerald-300 text-emerald-900"
                  : "border-amber-300 text-amber-900"
              }`}
            >
              Einladungslink kopieren
            </button>
            <a
              href="/dashboard"
              className="inline-flex rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700"
            >
              Zum Dashboard
            </a>
          </div>
          {copyNotice ? (
            <p
              className={`mt-2 text-xs ${
                resultState.tone === "success" ? "text-emerald-900" : "text-amber-900"
              }`}
            >
              {copyNotice}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
