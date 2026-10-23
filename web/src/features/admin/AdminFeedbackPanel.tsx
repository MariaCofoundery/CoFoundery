import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isMissingDatabaseFunction } from "@/features/admin/rpcErrors";
import { markFeedbackReadAction } from "@/features/admin/adminFeedbackActions";
import { SubmitButton } from "@/features/ui/SubmitButton";

export type AdminFeedbackRow = {
  id: string; created_at: string; source: "nav" | "workbook"; sender_name: string | null; account_since: string | null;
  q1: string; q2: string; q3: string; q4_choice: string | null; q4_other_text: string | null; q5: string | null; is_new: boolean;
};
import { FEEDBACK_TABS as TABS, type FeedbackTab as Tab } from "@/features/admin/feedbackTab";
export { parseFeedbackTab } from "@/features/admin/feedbackTab";
const PAGE = 25;

/**
 * Feedback im Admin-Dashboard: links die Liste, rechts das gewaehlte.
 *
 * "Neu" gilt pro Admin-Person (admin_feedback_reads), nicht fuer alle. Namen
 * kommen aus dem Kernprofil; der Feedback-Dialog sagt das vorher.
 */
export async function AdminFeedbackPanel({ client, tab, selectedId, page }: { client: SupabaseClient; tab: Tab; selectedId: string | null; page: number }) {
  const [t, tf, locale, counts, list] = await Promise.all([
    getTranslations("admin.feedback"),
    getTranslations("feedback"),
    getLocale(),
    client.rpc("admin_feedback_counts"),
    client.rpc("admin_list_feedback", { p_tab: tab, p_offset: page * PAGE }),
  ]);
  const rows = ((list.data ?? []) as AdminFeedbackRow[]).slice(0, PAGE);
  const hasMore = ((list.data ?? []) as AdminFeedbackRow[]).length > PAGE;
  const c = (counts.data ?? { all: 0, new: 0 }) as { all: number; new: number };
  const total = { new: c.new, all: c.all, read: Math.max(0, c.all - c.new) };
  const selected = rows.find((row) => row.id === selectedId) ?? rows[0] ?? null;
  const nextNew = selected ? rows.find((row) => row.is_new && row.id !== selected.id) ?? null : null;
  const when = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });
  const day = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });
  const href = (nextTab: Tab, id?: string, nextPage = 0) => `/admin?tab=${nextTab}${id ? `&id=${id}` : ""}${nextPage ? `&page=${nextPage}` : ""}#feedback`;

  return (
    <section id="feedback" className="scroll-mt-6 overflow-hidden rounded-[22px] border border-[#e4e2f0] bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e4e2f0] px-5 py-4">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-semibold tracking-[-0.01em] text-slate-950">{t("title")}</h2>
          {total.new > 0 ? <span className="rounded-full bg-[#6d49e0] px-2.5 py-0.5 text-[13px] font-bold text-white">{t("newCount", { count: total.new })}</span> : null}
        </div>
        <nav aria-label={t("title")} className="flex flex-wrap gap-1">
          {TABS.map((item) => (
            <Link key={item} href={href(item)} aria-current={item === tab ? "page" : undefined}
              className={`rounded-full px-3.5 py-2 text-sm font-semibold ${item === tab ? "bg-[#efeafd] text-[#4a2fb8]" : "text-[#5f5e7a] hover:bg-slate-50"}`}>
              {t(`tabs.${item}`)} · {total[item]}
            </Link>
          ))}
        </nav>
      </div>

      {list.error ? <p role="alert" className="p-5 text-sm">{isMissingDatabaseFunction(list.error) || isMissingDatabaseFunction(counts.error) ? t("migrationMissing") : t("loadError")}</p> : rows.length === 0 ? (
        <p className="p-6 text-sm text-[#5f5e7a]">{t(`empty.${tab}`)}</p>
      ) : (
        <div className="grid md:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
          <div className="border-b border-[#e4e2f0] md:border-b-0 md:border-r">
            <ul>
              {rows.map((row) => (
                <li key={row.id} className="border-t border-[#e4e2f0] first:border-t-0">
                  <Link href={href(tab, row.id, page)} aria-current={selected?.id === row.id ? "true" : undefined}
                    className={`flex items-start gap-3 px-4 py-3.5 ${selected?.id === row.id ? "bg-[#f5f2fe]" : "hover:bg-[#faf9fe]"} ${row.is_new ? "" : "opacity-75"}`}>
                    <span aria-label={row.is_new ? t("new") : t("read")} className={`mt-2 h-[9px] w-[9px] shrink-0 rounded-full ${row.is_new ? "bg-[#6d49e0]" : "bg-[#d8d5ea]"}`} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className={`truncate text-[15px] text-slate-950 ${row.is_new ? "font-semibold" : "font-medium"}`}>{row.sender_name || t("deleted")}</span>
                        <span className="shrink-0 text-[13px] text-[#5f5e7a]">{day.format(new Date(row.created_at))}</span>
                      </span>
                      <span className="mt-0.5 line-clamp-2 block text-sm text-[#5f5e7a]">{row.q1}</span>
                      <span className="mt-1.5 inline-block rounded-full bg-[#f1f0f7] px-2.5 py-0.5 text-xs font-medium text-[#33325e]">{t(`source.${row.source}`)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            {page > 0 || hasMore ? (
              <div className="flex justify-between gap-3 border-t border-[#e4e2f0] px-4 py-3 text-sm font-semibold">
                {page > 0 ? <Link href={href(tab, undefined, page - 1)} className="text-[#6d49e0]">{t("newer")}</Link> : <span />}
                {hasMore ? <Link href={href(tab, undefined, page + 1)} className="text-[#6d49e0]">{t("older")}</Link> : null}
              </div>
            ) : null}
          </div>

          {selected ? (
            <article className="flex min-w-0 flex-col gap-4 px-6 py-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-xl font-semibold text-slate-950">{selected.sender_name || t("deleted")}</h3>
                  <p className="mt-0.5 text-[13.5px] text-[#5f5e7a]">
                    {when.format(new Date(selected.created_at))} · {t(`source.${selected.source}`)}
                    {selected.account_since ? ` · ${t("accountSince", { date: day.format(new Date(selected.account_since)) })}` : ""}
                  </p>
                </div>
                {selected.is_new ? <span className="rounded-full bg-[#efeafd] px-2.5 py-0.5 text-[13px] font-semibold text-[#4a2fb8]">{t("new")}</span> : null}
              </div>
              {([["q1", selected.q1], ["q2", selected.q2], ["q3", selected.q3]] as const).map(([key, answer]) => (
                <div key={key}><p className="text-[13px] font-semibold text-[#5f5e7a]">{tf(`questions.${key}`).replace(/^\d+\.\s*/, "")}</p><p className="mt-1 whitespace-pre-line text-[15px] leading-relaxed text-slate-950">{answer}</p></div>
              ))}
              <div>
                <p className="text-[13px] font-semibold text-[#5f5e7a]">{tf("questions.q4").replace(/^\d+\.\s*/, "")}</p>
                {selected.q4_choice ? <p className="mt-1.5"><span className="rounded-full bg-[#f1f0f7] px-2.5 py-0.5 text-sm font-medium text-[#33325e]">{tf(`assistance.${selected.q4_choice}`)}</span>{selected.q4_other_text ? <span className="ml-2 text-[15px]">{selected.q4_other_text}</span> : null}</p> : <p className="mt-1 text-[15px] text-[#5f5e7a]">{t("noAnswer")}</p>}
              </div>
              <div>
                <p className="text-[13px] font-semibold text-[#5f5e7a]">{tf("questions.q5").replace(/^\d+\.\s*/, "")}</p>
                <p className={`mt-1 whitespace-pre-line text-[15px] leading-relaxed ${selected.q5 ? "text-slate-950" : "text-[#5f5e7a]"}`}>{selected.q5 || t("noAnswer")}</p>
              </div>
              <form action={markFeedbackReadAction} className="mt-2 flex flex-wrap items-center gap-3 border-t border-[#e4e2f0] pt-4">
                <input type="hidden" name="id" value={selected.id} />
                <input type="hidden" name="tab" value={tab} />
                <input type="hidden" name="read" value={selected.is_new ? "yes" : "no"} />
                {selected.is_new && nextNew ? <input type="hidden" name="next" value={nextNew.id} /> : null}
                <SubmitButton label={selected.is_new ? t("markRead") : t("markNew")} pendingLabel={t("saving")}
                  className="inline-flex min-h-11 items-center rounded-xl bg-[linear-gradient(120deg,#6d49e0,#0a80b8)] px-[18px] text-[15px] font-semibold text-white disabled:opacity-60" />
                {selected.is_new && nextNew ? <Link href={href(tab, nextNew.id, page)} className="inline-flex min-h-11 items-center rounded-xl bg-[#f1f0f7] px-[18px] text-[15px] font-semibold text-slate-900">{t("nextNew")}</Link> : null}
              </form>
            </article>
          ) : null}
        </div>
      )}
    </section>
  );
}
