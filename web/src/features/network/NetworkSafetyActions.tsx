"use client";

import { blockNetworkUserAction, reportNetworkInteractionAction, unblockNetworkUserAction } from "./networkActions";
import { NetworkSubmitButton } from "./NetworkSubmitButton";

export function NetworkSafetyActions({ otherUserId, contactRequestId, returnTo, blockedByMe, interactionBlocked, copy }: {
  otherUserId: string;
  contactRequestId: string;
  returnTo: string;
  blockedByMe: boolean;
  interactionBlocked: boolean;
  copy: Record<string, string>;
}) {
  return <div className="mt-4 border-t border-slate-100 pt-4">
    {interactionBlocked ? <p className="text-sm text-slate-600">{copy.blockedState}</p> : null}
    <div className="mt-2 flex flex-wrap gap-3">
      {blockedByMe ? <form action={unblockNetworkUserAction}>
        <input type="hidden" name="other_user_id" value={otherUserId} /><input type="hidden" name="return_to" value={returnTo} />
        <NetworkSubmitButton label={copy.unblock} pendingLabel={copy.unblocking} className="min-h-11 text-sm font-semibold text-slate-600 underline-offset-4 hover:underline" />
      </form> : !interactionBlocked ? <form action={blockNetworkUserAction} onSubmit={(event) => { if (!window.confirm(copy.blockConfirm)) event.preventDefault(); }}>
        <input type="hidden" name="other_user_id" value={otherUserId} /><input type="hidden" name="return_to" value={returnTo} />
        <NetworkSubmitButton label={copy.block} pendingLabel={copy.blocking} className="min-h-11 text-sm font-semibold text-slate-600 underline-offset-4 hover:underline" />
      </form> : null}
      <details className="w-full sm:w-auto">
        <summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold text-slate-600">{copy.report}</summary>
        <form action={reportNetworkInteractionAction} className="mt-2 w-full space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:w-96">
          <input type="hidden" name="contact_request_id" value={contactRequestId} /><input type="hidden" name="return_to" value={returnTo} />
          <label className="block text-sm font-medium">{copy.reportCategory}<select name="category" required className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3">
            {(["spam", "harassment", "misleading", "other"] as const).map((category) => <option key={category} value={category}>{copy[category]}</option>)}
          </select></label>
          <label className="block text-sm font-medium">{copy.reportComment}<textarea name="comment" maxLength={1000} rows={3} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2" /></label>
          <NetworkSubmitButton label={copy.reportSubmit} pendingLabel={copy.reporting} className="min-h-11 rounded-full bg-slate-900 px-5 text-sm font-semibold text-white" />
        </form>
      </details>
    </div>
  </div>;
}
