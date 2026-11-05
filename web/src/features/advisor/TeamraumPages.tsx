import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { SubmitButton } from "@/features/ui/SubmitButton";
import { UserText } from "@/features/ui/UserText";
import { Avatar, helpers, type TeamraumContext } from "@/features/advisor/Teamraum";
import { PageDraftKeeper } from "@/features/advisor/PageDraftKeeper";
import {
  checkOrgPageItemAction,
  createTaskFromPageItemAction,
  deleteOrgPageAction,
  saveOrgPageAction,
  setOrgPageVisibilityAction,
} from "@/features/advisor/teamraumActions";
import {
  BUILT_IN_TEMPLATES,
  buildPageTree,
  parentOptions,
  parsePageBlocks,
  subtreeHeight,
  type OrgPage,
  type OrgPageSummary,
} from "@/features/advisor/teamraumPageModel";

/**
 * Teamraum-Seiten (Stufe 2): Handbuch, Checklisten, Protokolle - nur fuer das Team der Organisation.
 * Links der Baum (hoechstens drei Ebenen) und die Vorlagen, rechts die Seite. Haekchen-Zeilen werden
 * auf Wunsch Aufgaben; Seite und Board halten sich gegenseitig auf dem gleichen Stand (Datenbank).
 */

export type PagesFeedback = { error: string | null; saved: boolean; deleted: boolean; taskCreated: boolean };

const CARD = "advisor-card";
const LABEL = "block text-xs font-semibold uppercase tracking-[.12em] text-slate-500";
const INPUT = "mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm";
const CHIP = "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold";

function Hidden({ ctx, pageId }: { ctx: TeamraumContext; pageId?: string }) {
  return (
    <>
      <input type="hidden" name="orgId" value={ctx.orgId} />
      <input type="hidden" name="tab" value="pages" />
      {pageId ? <input type="hidden" name="pageId" value={pageId} /> : null}
    </>
  );
}

async function PageEditor({
  ctx,
  pages,
  page,
  prefill,
  feedback,
}: {
  ctx: TeamraumContext;
  pages: OrgPageSummary[];
  page: OrgPage | null;
  prefill: { title: string; body: string; parentId: string | null; isNote: boolean };
  feedback: PagesFeedback;
}) {
  const t = await getTranslations("advisor.teamraum.pages");
  const { dayOf, href } = helpers(ctx);
  // Eine eigene Notiz steht fuer sich: keine Oberseite, keine Vorlage (20270315120000).
  const isNote = page ? page.visibility === "private" : prefill.isNote;
  const tree = buildPageTree(pages);
  const options = parentOptions(tree, page?.id ?? null, page ? subtreeHeight(tree, page.id) : 1);
  const formId = page ? `page-form-${page.id}` : "page-form-new";
  return (
    <div className="grid gap-4">
      <PageDraftKeeper
        formId={formId}
        storageKey={`teamraum-page-draft-${page?.id ?? "new"}`}
        conflict={feedback.error === "changed"}
        saved={feedback.saved}
        title={t("draftTitle")}
        hint={t("draftHint")}
      />
      <form id={formId} action={saveOrgPageAction} className="grid gap-4">
        <Hidden ctx={ctx} pageId={page?.id} />
        {page ? <input type="hidden" name="expected" value={page.updatedAt} /> : null}
        {!page && isNote ? <input type="hidden" name="visibility" value="private" /> : null}
        {isNote ? <p className="rounded-xl bg-sky-50 px-4 py-3 text-sm text-sky-900">{t("noteHint")}</p> : null}
        <label className="block">
          <span className={LABEL}>{t("titleLabel")}</span>
          <input name="title" required maxLength={160} defaultValue={page?.title ?? prefill.title} className={`${INPUT} text-lg font-semibold`} />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          {isNote ? <input type="hidden" name="parentId" value="" /> : (
          <label>
            <span className={LABEL}>{t("parentLabel")}</span>
            <select name="parentId" defaultValue={page?.parentId ?? prefill.parentId ?? ""} className={INPUT}>
              <option value="">{t("parentNone")}</option>
              {options.map((entry) => (
                <option key={entry.id} value={entry.id}>{`${"– ".repeat(entry.depth - 1)}${entry.title}`}</option>
              ))}
            </select>
          </label>
          )}
          <label>
            <span className={LABEL}>{t("eventLabel")}</span>
            <select name="eventId" defaultValue={page?.eventId ?? ""} className={INPUT}>
              <option value="">{t("eventNone")}</option>
              {ctx.events.map((event) => (
                <option key={event.eventId} value={event.eventId}>{`${dayOf(event.startsAt.slice(0, 10))} · ${event.title}`}</option>
              ))}
            </select>
          </label>
        </div>
        <label className="block">
          <span className={LABEL}>{t("bodyLabel")}</span>
          <textarea name="body" rows={18} maxLength={50000} defaultValue={page?.body ?? prefill.body} className={`${INPUT} py-3 leading-7`} />
          <span className="mt-1 block text-xs leading-5 text-slate-500">{t("formatHint")}</span>
        </label>
        {isNote ? null : (
          <label className="flex min-h-11 items-center gap-3 text-sm text-slate-800">
            <input type="checkbox" name="isTemplate" value="yes" defaultChecked={page?.isTemplate ?? false} className="size-5" />
            {t("isTemplate")}
          </label>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <SubmitButton label={t("save")} pendingLabel="…" className="brand-cta inline-flex min-h-11 items-center rounded-xl px-5 text-sm font-semibold" />
          <Link href={page ? href("pages", { doc: page.id }) : href("pages")} className="inline-flex min-h-11 items-center px-2 text-sm text-slate-600 underline-offset-4 hover:underline">
            {t("cancel")}
          </Link>
        </div>
      </form>
    </div>
  );
}

async function PageView({ ctx, page, pages }: { ctx: TeamraumContext; page: OrgPage; pages: OrgPageSummary[] }) {
  const t = await getTranslations("advisor.teamraum.pages");
  const tTasks = await getTranslations("advisor.teamraum");
  const { dayOf, timeOf, memberOf, eventOf, href } = helpers(ctx);
  const blocks = parsePageBlocks(page.body);
  const event = eventOf(page.eventId);
  const editor = memberOf(page.updatedByUserId);
  const linked = ctx.tasks.filter((task) => task.pageId === page.id);
  const taskFor = (text: string) => linked.find((task) => task.title.trim() === text.trim()) ?? null;
  const children = pages.filter((entry) => entry.parentId === page.id && !entry.isTemplate);
  const canDelete = ctx.canWrite && (page.createdByUserId === ctx.me || ctx.isOwner);
  return (
    <article className={`${CARD} min-w-0 p-6 sm:p-9`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {event ? <span className={`${CHIP} bg-amber-100 text-amber-900`}>{t("belongsTo", { title: event.title, date: dayOf(event.startsAt.slice(0, 10)) })}</span> : null}
          {page.isTemplate ? <span className={`${CHIP} bg-sky-100 text-sky-800`}>{t("template")}</span> : null}
          {page.visibility === "private" ? (
            <span className={`${CHIP} bg-sky-100 text-sky-900`}>{t("onlyYou")}</span>
          ) : (
            <span className={`${CHIP} bg-slate-100 text-slate-700`}>{t("onlyTeam")}</span>
          )}
        </div>
        <p className="flex items-center gap-2 text-xs text-slate-500">
          {editor ? <Avatar userId={editor.userId} name={editor.name} size="h-6 w-6 text-[11px]" /> : null}
          {t("lastEdited", { name: editor?.name ?? tTasks("formerMember"), date: timeOf(page.updatedAt) })}
        </p>
      </div>
      <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">{page.title}</h2>

      {blocks.length === 0 ? <p className="mt-4 text-sm text-slate-500">{t("emptyBody")}</p> : null}
      <div className="mt-4 grid gap-3 text-[15px] leading-7 text-slate-800">
        {blocks.map((block, blockIndex) => {
          if (block.kind === "heading") {
            const Tag = block.level === 1 ? "h3" : block.level === 2 ? "h4" : "h5";
            return (
              <Tag key={blockIndex} className={`${block.level === 1 ? "mt-4 text-2xl" : block.level === 2 ? "mt-3 text-xl" : "mt-2 text-lg"} font-semibold text-slate-950`}>
                <UserText text={block.text} />
              </Tag>
            );
          }
          if (block.kind === "bullets") {
            return (
              <ul key={blockIndex} className="list-disc space-y-1 pl-6">
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex}><UserText text={item} /></li>
                ))}
              </ul>
            );
          }
          if (block.kind === "paragraph") {
            return <p key={blockIndex} className="whitespace-pre-line"><UserText text={block.text} /></p>;
          }
          if (!block.text) return null;
          const task = taskFor(block.text);
          const assignee = memberOf(task?.assigneeUserId ?? null);
          return (
            <div key={blockIndex} className="flex flex-wrap items-center gap-3">
              <form action={checkOrgPageItemAction}>
                <Hidden ctx={ctx} pageId={page.id} />
                <input type="hidden" name="index" value={block.index} />
                <input type="hidden" name="text" value={block.text} />
                <input type="hidden" name="done" value={block.done ? "no" : "yes"} />
                <button
                  type="submit"
                  disabled={!ctx.canWrite}
                  aria-label={block.done ? tTasks("detail.uncheck", { item: block.text }) : tTasks("detail.check", { item: block.text })}
                  className={`grid h-7 w-7 place-items-center rounded-lg border-2 text-sm ${block.done ? "border-violet-600 bg-violet-600 text-white" : "border-slate-300 bg-white text-transparent hover:border-violet-400"}`}
                >
                  ✓
                </button>
              </form>
              <span className={`min-w-0 flex-1 ${block.done ? "text-slate-500 line-through" : ""}`}><UserText text={block.text} /></span>
              {task ? (
                <Link href={`${href("tasks", { task: task.id })}#task-detail`} className={`${CHIP} bg-violet-100 text-violet-800 underline-offset-4 hover:underline`}>
                  {[t("taskChip"), assignee?.name ?? tTasks("nobody"), task.dueOn ? dayOf(task.dueOn) : null].filter(Boolean).join(" · ")}
                </Link>
              ) : !block.done && ctx.canWrite ? (
                <form action={createTaskFromPageItemAction}>
                  <Hidden ctx={ctx} pageId={page.id} />
                  <input type="hidden" name="index" value={block.index} />
                  <input type="hidden" name="text" value={block.text} />
                  <SubmitButton label={t("makeTask")} pendingLabel="…" className="inline-flex min-h-9 items-center rounded-full border border-dashed border-violet-300 bg-white px-3 text-xs font-semibold text-violet-800 hover:bg-violet-50" />
                </form>
              ) : null}
            </div>
          );
        })}
      </div>

      {children.length > 0 || event || linked.length > 0 ? (
        <div className="mt-7 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
          <span className="font-semibold">{t("linked")}</span>
          {children.map((child) => (
            <Link key={child.id} href={href("pages", { doc: child.id })} className="text-violet-800 underline-offset-4 hover:underline">{child.title}</Link>
          ))}
          {event ? (
            <Link href={`/advisor/organisation?${new URLSearchParams({ org: ctx.orgId, tab: "plan", open: event.eventId }).toString()}`} className="text-violet-800 underline-offset-4 hover:underline">{t("eventLink", { title: event.title })}</Link>
          ) : null}
          {linked.length > 0 ? <span>{t("linkedTasks", { count: linked.length })}</span> : null}
        </div>
      ) : null}

      {ctx.canWrite ? (
        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
          <Link href={href("pages", { doc: page.id, edit: "1" })} className="inline-flex min-h-11 items-center rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white">{t("edit")}</Link>
          {page.visibility === "team" ? (
            <Link href={href("pages", { newDoc: "1", parent: page.id })} className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50">{t("newChild")}</Link>
          ) : null}
          {page.createdByUserId === ctx.me && (page.visibility === "private" || children.length === 0) ? (
            <form action={setOrgPageVisibilityAction}>
              <Hidden ctx={ctx} pageId={page.id} />
              <input type="hidden" name="visibility" value={page.visibility === "private" ? "team" : "private"} />
              <SubmitButton
                label={page.visibility === "private" ? t("share") : t("makePrivate")}
                pendingLabel="…"
                className={page.visibility === "private" ? "brand-cta inline-flex min-h-11 items-center rounded-xl px-4 text-sm font-semibold" : "inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50"}
              />
            </form>
          ) : null}
          {page.isTemplate ? (
            <Link href={href("pages", { newDoc: "1", template: page.id })} className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 hover:bg-slate-50">{t("useTemplate")}</Link>
          ) : null}
          {canDelete ? (
            <form action={deleteOrgPageAction} className="ml-auto">
              <Hidden ctx={ctx} pageId={page.id} />
              <SubmitButton label={t("delete")} pendingLabel="…" className="inline-flex min-h-11 items-center text-sm font-medium text-rose-700 underline-offset-4 hover:underline" />
            </form>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

export async function TeamraumPages({
  ctx,
  pages,
  page,
  mode,
  prefill,
  feedback,
}: {
  ctx: TeamraumContext;
  pages: OrgPageSummary[];
  page: OrgPage | null;
  mode: "view" | "edit" | "new";
  prefill: { title: string; body: string; parentId: string | null; isNote: boolean };
  feedback: PagesFeedback;
}) {
  const t = await getTranslations("advisor.teamraum.pages");
  const { href } = helpers(ctx);
  const tree = buildPageTree(pages);
  const templates = pages.filter((entry) => entry.isTemplate && entry.visibility === "team");
  // Die Zeilensicherheit liefert nur die eigenen Notizen.
  const notes = pages.filter((entry) => entry.visibility === "private").sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  const message = feedback.error
    ? { tone: "rose", text: t(`errors.${["changed", "deep", "children"].includes(feedback.error) ? feedback.error : "failed"}`) }
    : feedback.saved
      ? { tone: "emerald", text: t("saved") }
      : feedback.deleted
        ? { tone: "emerald", text: t("deleted") }
        : feedback.taskCreated
          ? { tone: "emerald", text: t("taskCreated") }
          : null;
  return (
    <div>
      {message ? (
        <p role={message.tone === "rose" ? "alert" : "status"} className={`mb-4 rounded-xl border px-4 py-3 text-sm ${message.tone === "rose" ? "border-rose-200 bg-rose-50 text-rose-800" : "border-emerald-200 bg-emerald-50 text-emerald-900"}`}>
          {message.text}
        </p>
      ) : null}
      <div className="flex flex-wrap items-start gap-5">
        <nav aria-label={t("treeLabel")} className={`${CARD} w-full p-3 md:w-72 md:flex-none`}>
          <div className="flex items-center justify-between px-2 pb-2 pt-1">
            <p className="text-xs font-semibold uppercase tracking-[.12em] text-slate-500">{t("treeLabel")}</p>
            {ctx.canWrite ? (
              <Link href={href("pages", { newDoc: "1" })} aria-label={t("new")} className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-lg leading-none text-slate-700 hover:bg-slate-50">+</Link>
            ) : null}
          </div>
          {tree.length === 0 ? <p className="px-2 pb-2 text-sm leading-6 text-slate-600">{t("treeEmpty")}</p> : null}
          <ul className="grid gap-0.5">
            {tree.map((entry) => (
              <li key={entry.id}>
                <Link
                  href={href("pages", { doc: entry.id })}
                  aria-current={page?.id === entry.id ? "page" : undefined}
                  className={`flex min-h-10 items-center rounded-xl px-2.5 text-sm ${entry.depth === 2 ? "ml-4" : entry.depth === 3 ? "ml-8" : ""} ${
                    page?.id === entry.id ? "bg-violet-100 font-semibold text-slate-950" : `${entry.depth === 1 ? "font-semibold" : ""} text-slate-700 hover:bg-violet-50`
                  }`}
                >
                  {entry.title}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-3 border-t border-slate-100 pt-3">
            <div className="flex items-center justify-between px-2 pb-1">
              <p className="text-xs font-semibold uppercase tracking-[.12em] text-slate-500">{t("notesLabel")}</p>
              {ctx.canWrite ? (
                <Link href={href("pages", { newDoc: "1", note: "1" })} aria-label={t("newNote")} className="grid h-8 w-8 place-items-center rounded-lg border border-slate-200 bg-white text-base leading-none text-slate-700 hover:bg-slate-50">+</Link>
              ) : null}
            </div>
            {notes.length === 0 ? <p className="px-2 pb-1 text-xs leading-5 text-slate-500">{t("notesEmpty")}</p> : null}
            <ul className="grid gap-0.5">
              {notes.map((entry) => (
                <li key={entry.id}>
                  <Link href={href("pages", { doc: entry.id })} aria-current={page?.id === entry.id ? "page" : undefined} className={`flex min-h-10 items-center gap-2 rounded-xl px-2.5 text-sm ${page?.id === entry.id ? "bg-sky-100 font-semibold text-slate-950" : "text-slate-700 hover:bg-sky-50"}`}>
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0 text-sky-700" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="5" y="10.5" width="14" height="9" rx="3" /><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" /></svg>
                    {entry.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-3 border-t border-slate-100 pt-3">
            <p className="px-2 pb-1 text-xs font-semibold uppercase tracking-[.12em] text-slate-500">{t("templatesLabel")}</p>
            <ul className="grid gap-0.5">
              {templates.map((entry) => (
                <li key={entry.id}>
                  <Link href={href("pages", { doc: entry.id })} aria-current={page?.id === entry.id ? "page" : undefined} className={`flex min-h-10 items-center rounded-xl px-2.5 text-sm ${page?.id === entry.id ? "bg-violet-100 font-semibold text-slate-950" : "text-slate-700 hover:bg-violet-50"}`}>
                    {entry.title}
                  </Link>
                </li>
              ))}
              {ctx.canWrite
                ? BUILT_IN_TEMPLATES.map((key) => (
                    <li key={key}>
                      <Link href={href("pages", { newDoc: "1", template: key })} className="flex min-h-10 items-center rounded-xl px-2.5 text-sm text-slate-700 hover:bg-violet-50">
                        {t(`templates.${key}.title`)}
                      </Link>
                    </li>
                  ))
                : null}
            </ul>
          </div>
        </nav>

        <div className="min-w-0 flex-1 basis-96">
          {mode === "new" || (mode === "edit" && page) ? (
            <section className={`${CARD} p-5 sm:p-7`} aria-label={mode === "new" ? t("new") : t("edit")}>
              <h2 className="mb-4 text-xl font-semibold text-slate-950">{mode === "new" ? (prefill.isNote ? t("newNote") : t("new")) : t("editTitle", { title: page?.title ?? "" })}</h2>
              <PageEditor ctx={ctx} pages={pages} page={mode === "edit" ? page : null} prefill={prefill} feedback={feedback} />
            </section>
          ) : page ? (
            <PageView ctx={ctx} page={page} pages={pages} />
          ) : (
            <section className="rounded-3xl border border-violet-200 bg-violet-50/70 p-6 sm:p-8">
              <h2 className="text-xl font-semibold text-slate-950">{t("introTitle")}</h2>
              <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-700">{t("introText")}</p>
              {ctx.canWrite ? (
                <ul className="mt-5 grid gap-3 sm:grid-cols-3">
                  {BUILT_IN_TEMPLATES.map((key) => (
                    <li key={key}>
                      <Link href={href("pages", { newDoc: "1", template: key })} className="card-lift advisor-card block h-full p-4">
                        <span className="block text-sm font-semibold text-slate-950">{t(`templates.${key}.title`)}</span>
                        <span className="mt-1 block text-xs leading-5 text-slate-600">{t(`templates.${key}.hint`)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
