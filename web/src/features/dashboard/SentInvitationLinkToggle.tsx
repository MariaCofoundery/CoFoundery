"use client";

import { useState, useTransition } from "react";
import { getSentInvitationLinkAction } from "@/app/(product)/dashboard/actions";

type Props = {
  invitationId: string;
  status: string;
};

type LoadState = {
  inviteUrl: string | null;
  error: string | null;
};

const LINKABLE_STATUSES = new Set(["sent", "opened"]);

function mapStatusHint(status: string) {
  const normalized = status.trim().toLowerCase();
  if (normalized === "accepted") return "Link nicht mehr verfügbar: Einladung bereits angenommen.";
  if (normalized === "expired") return "Link nicht mehr verfügbar: Einladung abgelaufen.";
  if (normalized === "revoked") return "Link nicht mehr verfügbar: Einladung widerrufen.";
  return "Link für diesen Status nicht mehr verfügbar.";
}

function mapActionError(reason: string) {
  if (reason === "status_not_linkable") return "Link für diese Einladung nicht mehr verfügbar.";
  if (reason === "not_found") return "Einladung nicht gefunden.";
  if (reason === "not_authenticated") return "Bitte erneut anmelden.";
  return "Link konnte nicht geladen werden.";
}

export function SentInvitationLinkToggle({ invitationId, status }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [copyNotice, setCopyNotice] = useState<string | null>(null);
  const [state, setState] = useState<LoadState>({ inviteUrl: null, error: null });
  const [isPending, startTransition] = useTransition();

  const normalizedStatus = status.trim().toLowerCase();
  const isLinkable = LINKABLE_STATUSES.has(normalizedStatus);

  const toAbsoluteUrl = (value: string) => {
    if (typeof window === "undefined") return value;
    return value.startsWith("/") ? `${window.location.origin}${value}` : value;
  };

  const onToggle = () => {
    setCopyNotice(null);

    if (isOpen) {
      setIsOpen(false);
      return;
    }

    setIsOpen(true);
    if (state.inviteUrl || isPending) {
      return;
    }

    startTransition(async () => {
      const result = await getSentInvitationLinkAction(invitationId);
      if (!result.ok) {
        setState({ inviteUrl: null, error: mapActionError(result.reason) });
        return;
      }
      const absoluteUrl = toAbsoluteUrl(result.inviteUrl);
      setState({ inviteUrl: absoluteUrl, error: null });
    });
  };

  const onCopy = async () => {
    if (!state.inviteUrl) return;
    try {
      await navigator.clipboard.writeText(state.inviteUrl);
      setCopyNotice("Link kopiert.");
    } catch {
      setCopyNotice("Kopieren nicht möglich. Bitte Link manuell kopieren.");
    }
  };

  return (
    <div className="mt-2">
      {!isLinkable ? (
        <p className="text-xs text-slate-600">{mapStatusHint(normalizedStatus)}</p>
      ) : (
        <>
          <button
            type="button"
            onClick={onToggle}
            className="inline-flex rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700"
          >
            {isOpen ? "Link ausblenden" : "Link anzeigen"}
          </button>

          {isOpen ? (
            <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50/70 p-3">
              {isPending ? (
                <p className="text-xs text-slate-600">Link wird geladen...</p>
              ) : state.error ? (
                <p className="text-xs text-amber-700">{state.error}</p>
              ) : state.inviteUrl ? (
                <>
                  <p className="break-all rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700">
                    {state.inviteUrl}
                  </p>
                  <button
                    type="button"
                    onClick={onCopy}
                    className="mt-2 inline-flex rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700"
                  >
                    Link kopieren
                  </button>
                  {copyNotice ? <p className="mt-2 text-xs text-slate-600">{copyNotice}</p> : null}
                </>
              ) : (
                <p className="text-xs text-slate-600">Kein Link verfügbar.</p>
              )}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
