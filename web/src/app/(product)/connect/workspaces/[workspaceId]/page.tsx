import Link from "next/link";
import { WorkspaceDevelopment } from "@/features/connect/workspaces/WorkspaceDevelopment";
import { getTranslations } from "next-intl/server";
import { readWorkspace } from "@/features/connect/workspaces/data";
import {
  ENTRY_TYPES,
  safeSourceUrl,
} from "@/features/connect/workspaces/model";
import {
  WorkspaceEntryForm,
  WorkspaceInviteForm,
  WorkspaceRotateInvite,
} from "@/features/connect/workspaces/Forms";
import {
  updateWorkspaceAction,
  archiveWorkspaceAction,
  deleteWorkspaceEntryAction,
  setWorkspaceMemberAction,
  revokeWorkspaceInviteAction,
} from "@/features/connect/workspaces/actions";
import { SubmitButton } from "@/features/ui/SubmitButton";
import { card, button, field } from "@/features/connect/workspaces/styles";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceId: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { workspaceId } = await params;
  const { user, workspace: w } = await readWorkspace(workspaceId);
  const t = await getTranslations("problemWorkspace");
  const query = await searchParams;
  const owner = w.role === "owner";
  const active = w.status === "active";
  return (
    <>
      <Link
        href="/connect/workspaces"
        className="inline-block min-h-11 py-3 underline"
      >
        {t("back")}
      </Link>
      <header className="space-y-3">
        <p className="text-sm font-medium text-violet-800">
          {t("private")} · {t(w.status)} · {t(w.role)}
        </p>
        <h1 className="break-words text-3xl font-semibold">{w.title}</h1>
        <p className="whitespace-pre-wrap break-words leading-7">
          {w.description}
        </p>
        <p className="text-sm text-slate-600">{t("privacy")}</p>
        {w.source_problem_id && (
          <Link
            href={`/connect/problems/${w.source_problem_id}`}
            className="inline-block py-3 underline"
          >
            {t("sourceProblem")}
          </Link>
        )}
      </header>
      {query.error && (
        <p role="alert" className="rounded-xl bg-amber-50 p-4">
          {t("error")}
        </p>
      )}
      {query.saved && <p role="status">{t("saved")}</p>}
      {!active && <p>{t("archiveHelp")}</p>}
      {owner && active && (
        <details className={card}>
          <summary className="cursor-pointer py-2 font-semibold">
            {t("edit")}
          </summary>
          <form
            action={updateWorkspaceAction.bind(null, w.id)}
            className="space-y-4"
          >
            <label className="block">
              {t("name")}
              <input
                name="title"
                required
                maxLength={160}
                defaultValue={w.title}
                className={field}
              />
            </label>
            <label className="block">
              {t("description")}
              <textarea
                name="description"
                maxLength={3000}
                rows={4}
                defaultValue={w.description}
                className={field}
              />
            </label>
            <SubmitButton
              label={t("save")}
              pendingLabel={t("saving")}
              className={button}
            />
          </form>
        </details>
      )}
      <section className={card}>
        <h2 className="text-xl font-semibold">{t("members")}</h2>
        <p className="text-sm text-slate-600">{t("memberHelp")}</p>
        <ul className="space-y-4">
          {w.members.map((m) => (
            <li key={m.user_id} className="space-y-2 border-t pt-3">
              <p className="break-words font-medium">
                {m.name} · {t(m.role)}
              </p>
              {owner && m.role !== "owner" && (
                <>
                  <form
                    action={setWorkspaceMemberAction.bind(
                      null,
                      w.id,
                      m.user_id,
                    )}
                    className="flex flex-wrap items-end gap-3"
                  >
                    <label>
                      {t("role")}
                      <select
                        name="role"
                        defaultValue={m.role}
                        className={field}
                      >
                        <option value="contributor">{t("contributor")}</option>
                        <option value="viewer">{t("viewer")}</option>
                      </select>
                    </label>
                    <SubmitButton
                      label={t("save")}
                      pendingLabel={t("saving")}
                      className={button}
                    />
                  </form>
                  <details>
                    <summary className="cursor-pointer py-3">
                      {t("remove")}
                    </summary>
                    <form
                      action={setWorkspaceMemberAction.bind(
                        null,
                        w.id,
                        m.user_id,
                      )}
                      className="space-y-3"
                    >
                      <input type="hidden" name="role" value="remove" />
                      <label className="flex items-start gap-3">
                        <input
                          name="confirm"
                          type="checkbox"
                          required
                          className="mt-1"
                        />
                        {t("removeCheck")}
                      </label>
                      <SubmitButton
                        label={t("remove")}
                        pendingLabel={t("saving")}
                        className={button}
                      />
                    </form>
                  </details>
                </>
              )}
            </li>
          ))}
        </ul>
      </section>
      {owner && (
        <section className={card}>
          <h2 className="text-xl font-semibold">{t("invites")}</h2>
          {active && (
            <>
              <p>{t("inviteHelp")}</p>
              <WorkspaceInviteForm workspaceId={w.id} />
            </>
          )}
          <p className="text-sm text-slate-600">{t("inviteDisclosure")}</p>
          <ul className="space-y-4">
            {w.invites.map((i) => (
              <li key={i.id} className="break-words border-t pt-3">
                <p>
                  {i.email} · {t(i.role)} · {t(i.status)}
                </p>
                {active &&
                  (i.status === "pending" || i.status === "expired") && (
                    <>
                      <p className="text-sm text-slate-600">
                        {t("rotateHelp")}
                      </p>
                      <WorkspaceRotateInvite
                        workspaceId={w.id}
                        inviteId={i.id}
                      />
                      <form
                        action={revokeWorkspaceInviteAction.bind(
                          null,
                          w.id,
                          i.id,
                        )}
                      >
                        <SubmitButton
                          label={t("revoke")}
                          pendingLabel={t("saving")}
                          className={button}
                        />
                      </form>
                    </>
                  )}
              </li>
            ))}
          </ul>
        </section>
      )}
      {!w.entries.length && (
        <section className="space-y-3 rounded-2xl bg-violet-50 p-4">
          <p className="leading-7">{t("emptyEntries")}</p>
          <p className="text-sm">{t("freeOrder")}</p>
        </section>
      )}
      {active && w.role !== "viewer" && (
        <section className={card}>
          <h2 className="text-xl font-semibold">{t("newEntry")}</h2>
          <WorkspaceEntryForm workspaceId={w.id} />
        </section>
      )}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold">{t("entries")}</h2>
        {ENTRY_TYPES.map((type) => (
          <section key={type} className="space-y-4">
            <h3 className="text-xl font-semibold">{t(`types.${type}`)}</h3>
            <p className="text-sm text-slate-600">{t(`hints.${type}`)}</p>
            {w.entries.filter((e) => e.type === type).length ? (
              w.entries
                .filter((e) => e.type === type)
                .map((e) => (
                  <article key={e.id} className={card}>
                    <p className="whitespace-pre-wrap break-words leading-7">
                      {e.content}
                    </p>
                    <p className="text-sm text-slate-600">
                      {t("by", { name: e.author_name })} · {t("updated")}:{" "}
                      {e.updated_at.slice(0, 10)}
                    </p>
                    {e.source_label && (
                      <p className="break-words text-sm">{e.source_label}</p>
                    )}
                    {safeSourceUrl(e.source_url) && (
                      <a
                        href={safeSourceUrl(e.source_url)!}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="block break-all text-sm underline"
                      >
                        {e.source_url}
                      </a>
                    )}
                    {active &&
                      w.role !== "viewer" &&
                      e.author_user_id === user.id && (
                        <details>
                          <summary className="cursor-pointer py-3">
                            {t("edit")}
                          </summary>
                          <WorkspaceEntryForm workspaceId={w.id} entry={e} />
                        </details>
                      )}
                    {active &&
                      (owner ||
                        (w.role === "contributor" &&
                          e.author_user_id === user.id)) && (
                        <details>
                          <summary className="cursor-pointer py-3">
                            {t("delete")}
                          </summary>
                          <form
                            action={deleteWorkspaceEntryAction.bind(
                              null,
                              w.id,
                              e.id,
                            )}
                            className="space-y-3"
                          >
                            <label className="flex items-start gap-3">
                              <input
                                required
                                type="checkbox"
                                name="confirm"
                                className="mt-1"
                              />
                              {t("deleteCheck")}
                            </label>
                            <SubmitButton
                              label={t("delete")}
                              pendingLabel={t("saving")}
                              className={button}
                            />
                          </form>
                        </details>
                      )}
                  </article>
                ))
            ) : (
              <p className="text-sm text-slate-500">{t("noneType")}</p>
            )}
          </section>
        ))}
      </section>
      <WorkspaceDevelopment workspace={w} />
      {owner && active && (
        <details className={card}>
          <summary className="cursor-pointer py-3">{t("archive")}</summary>
          <p>{t("archiveHelp")}</p>
          <form
            action={archiveWorkspaceAction.bind(null, w.id)}
            className="space-y-3"
          >
            <label className="flex items-start gap-3">
              <input required type="checkbox" name="confirm" className="mt-1" />
              {t("archiveCheck")}
            </label>
            <SubmitButton
              label={t("archive")}
              pendingLabel={t("saving")}
              className={button}
            />
          </form>
        </details>
      )}
    </>
  );
}
