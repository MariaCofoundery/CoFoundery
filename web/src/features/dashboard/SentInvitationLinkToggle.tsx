"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { getSentInvitationLinkAction } from "@/app/(product)/dashboard/actions";
import { toPublicAppUrl } from "@/lib/publicAppOrigin";

type Props = {
  invitationId: string;
  status: string;
};

type LoadState = {
  inviteUrl: string | null;
  error: string | null;
};

const LINKABLE_STATUSES = new Set(["sent", "opened"]);

function mapStatusHint(status: string, t: ReturnType<typeof useTranslations>) {
  const normalized = status.trim().toLowerCase();
  if (normalized === "accepted") return t("sentInvitationLink.status.accepted");
  if (normalized === "expired") return t("sentInvitationLink.status.expired");
  if (normalized === "revoked") return t("sentInvitationLink.status.revoked");
  return t("sentInvitationLink.status.unavailable");
}

function mapActionError(reason: string, t: ReturnType<typeof useTranslations>) {
  if (reason === "status_not_linkable") return t("sentInvitationLink.errors.statusNotLinkable");
  if (reason === "not_found") return t("sentInvitationLink.errors.notFound");
  if (reason === "not_authenticated") return t("sentInvitationLink.errors.notAuthenticated");
  return t("sentInvitationLink.errors.loadFailed");
}

export function SentInvitationLinkToggle({ invitationId, status }: Props) {
  const t = useTranslations("dashboard");
  const [isOpen, setIsOpen] = useState(false);
  const [copyNotice, setCopyNotice] = useState<string | null>(null);
  const [state, setState] = useState<LoadState>({ inviteUrl: null, error: null });
  const [isPending, startTransition] = useTransition();

  const normalizedStatus = status.trim().toLowerCase();
  const isLinkable = LINKABLE_STATUSES.has(normalizedStatus);

  const toAbsoluteUrl = (value: string) => {
    return typeof window === "undefined" ? value : toPublicAppUrl(value, window.location.origin);
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
        setState({ inviteUrl: null, error: mapActionError(result.reason, t) });
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
      setCopyNotice(t("sentInvitationLink.copySuccess"));
    } catch {
      setCopyNotice(t("sentInvitationLink.copyError"));
    }
  };

  return (
    <div className="mt-2">
      {!isLinkable ? (
        <p className="text-xs text-slate-600">{mapStatusHint(normalizedStatus, t)}</p>
      ) : (
        <>
          <button
            type="button"
            onClick={onToggle}
            className="inline-flex rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700"
          >
            {isOpen ? t("sentInvitationLink.hide") : t("sentInvitationLink.show")}
          </button>

          {isOpen ? (
            <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50/70 p-3">
              {isPending ? (
                <p className="text-xs text-slate-600">{t("sentInvitationLink.loading")}</p>
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
                    {t("sentInvitationLink.copy")}
                  </button>
                  {copyNotice ? <p className="mt-2 text-xs text-slate-600">{copyNotice}</p> : null}
                </>
              ) : (
                <p className="text-xs text-slate-600">{t("sentInvitationLink.empty")}</p>
              )}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
