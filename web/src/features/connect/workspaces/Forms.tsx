"use client";
import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { SubmitButton } from "@/features/ui/SubmitButton";
import { ENTRY_TYPES, type WorkspaceEntry } from "./model";
import {
  saveWorkspaceEntryAction,
  inviteWorkspaceAction,
  rotateWorkspaceInviteAction,
  type WorkspaceDelivery,
} from "./actions";
import { field as workspaceField, button as workspaceButton } from "./styles";
export function WorkspaceEntryForm({
  workspaceId,
  entry,
}: {
  workspaceId: string;
  entry?: WorkspaceEntry;
}) {
  const t = useTranslations("problemWorkspace");
  const [type, setType] = useState(entry?.type ?? "observation");
  return (
    <form
      action={saveWorkspaceEntryAction.bind(
        null,
        workspaceId,
        entry?.id ?? null,
      )}
      className="space-y-4"
    >
      <label className="block">
        {t("type")}
        <select
          name="type"
          value={type}
          onChange={(e) => setType(e.target.value as typeof type)}
          className={workspaceField}
        >
          {ENTRY_TYPES.map((v) => (
            <option key={v} value={v}>
              {t(`types.${v}`)}
            </option>
          ))}
        </select>
      </label>
      <p className="text-sm text-slate-600">{t(`hints.${type}`)}</p>
      <label className="block">
        {t("content")}
        <textarea
          name="content"
          required
          maxLength={6000}
          rows={5}
          defaultValue={entry?.content ?? ""}
          className={workspaceField}
        />
      </label>
      {(type === "observation" || type === "perspective") && (
        <>
          <label className="block">
            {t("sourceUrl")}
            <input
              name="source_url"
              type="url"
              maxLength={2048}
              defaultValue={entry?.source_url ?? ""}
              className={workspaceField}
            />
          </label>
          <label className="block">
            {t("sourceLabel")}
            <input
              name="source_label"
              maxLength={200}
              defaultValue={entry?.source_label ?? ""}
              className={workspaceField}
            />
          </label>
          <p className="text-sm text-slate-600">{t("sourceHelp")}</p>
        </>
      )}
      <SubmitButton
        className={workspaceButton}
        label={t("save")}
        pendingLabel={t("saving")}
      />
    </form>
  );
}
function Delivery({ result }: { result: WorkspaceDelivery }) {
  const t = useTranslations("problemWorkspace");
  return (
    <div aria-live="polite">
      {result.error && (
        <p role="alert" className="my-3 text-red-900">
          {t("error")}
        </p>
      )}
      {result.url && (
        <div className="my-3 space-y-2 rounded-xl border p-3">
          <p>{t(result.sent ? "sent" : "failed")}</p>
          <a href={result.url} className="block break-all underline">
            {t("inviteLink")}: {result.url}
          </a>
        </div>
      )}
    </div>
  );
}
export function WorkspaceInviteForm({ workspaceId }: { workspaceId: string }) {
  const t = useTranslations("problemWorkspace");
  const [state, action, pending] = useActionState(
    inviteWorkspaceAction.bind(null, workspaceId),
    {},
  );
  return (
    <form action={action} className="space-y-4">
      <label className="block">
        {t("email")}
        <input
          type="email"
          name="email"
          required
          maxLength={254}
          className={workspaceField}
        />
      </label>
      <label className="block">
        {t("role")}
        <select name="role" className={workspaceField}>
          <option value="contributor">{t("contributor")}</option>
          <option value="viewer">{t("viewer")}</option>
        </select>
      </label>
      <button disabled={pending} className={workspaceButton}>
        {t(pending ? "saving" : "send")}
      </button>
      <Delivery result={state} />
    </form>
  );
}
export function WorkspaceRotateInvite({
  workspaceId,
  inviteId,
}: {
  workspaceId: string;
  inviteId: string;
}) {
  const t = useTranslations("problemWorkspace");
  const [state, action, pending] = useActionState(
    rotateWorkspaceInviteAction.bind(null, workspaceId, inviteId),
    {},
  );
  return (
    <form action={action}>
      <button
        disabled={pending}
        className="min-h-11 py-3 underline disabled:opacity-50"
      >
        {t("rotate")}
      </button>
      <Delivery result={state} />
    </form>
  );
}
