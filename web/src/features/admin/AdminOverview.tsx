import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { markReminderDoneAction } from "@/features/moderation/adminReminderActions";
import { isMissingDatabaseFunction } from "@/features/admin/rpcErrors";
import { cronState, daysSince } from "@/features/admin/adminOverviewModel";
import { SubmitButton } from "@/features/ui/SubmitButton";

type Stats = {
  accounts_week: number; accounts_prev_week: number; onboarded_week: number; highlight_consent: number;
  connect_week: { seeking: number; offering: number; problems: number; ventures: number };
  open_reports: number; radar_new: number; highlights_ending: number;
  cron: Record<string, { last_run_at: string; ok: boolean }>;
};

type CheckCounts = { started_total: number; started_30d: number; completed_total?: number; abandoned_total?: number };
type TeamCheckStats = { read_my_mind: CheckCounts; founder_in_the_wild: CheckCounts; commitment_lab: CheckCounts };

const card = "flex min-w-0 flex-col gap-2.5 rounded-[22px] border border-[#e4e2f0] bg-white p-[22px]";
const label = "text-[13px] font-semibold uppercase tracking-[.08em] text-[#5f5e7a]";
const pill = "inline-block min-w-[22px] rounded-full px-2 py-0.5 text-center text-[13px] font-bold";

/** Zaehler, "Zu tun" und Betrieb. Keine Scores, keine Rangliste, kein Personenbezug. */
export async function AdminOverview({ client }: { client: SupabaseClient }) {
  const [t, stats, dump, teamChecks] = await Promise.all([
    getTranslations("admin.overview"),
    client.rpc("admin_dashboard_stats"),
    client.rpc("admin_reminder_status", { p_key: "db_dump" }),
    // Leise: fehlt die Funktion noch (Datenbank-Update steht aus), bleibt nur diese Karte weg.
    client.rpc("admin_team_check_stats"),
  ]);
  const checks = teamChecks.error ? null : (teamChecks.data as TeamCheckStats | null);
  if (stats.error || !stats.data) return <p role="alert" className="text-sm">{isMissingDatabaseFunction(stats.error) ? t("migrationMissing") : t("loadError")}</p>;
  const s = stats.data as Stats;
  const dumpDays = daysSince(typeof dump.data === "string" ? dump.data : null);
  const dumpState = dumpDays === null ? "never" : dumpDays >= 7 ? "late" : "ok";
  const dot = (state: string) => (state === "ok" ? "bg-[#1f9d6b]" : state === "never" ? "bg-[#d8d5ea]" : "bg-[#e0a100]");
  const jobs = [["connect-suggestions", "suggestions"], ["privacy-retention", "retention"]] as const;
  const todos = [
    { count: s.open_reports, href: "/admin/moderation", key: "reports", tone: "bg-[#fdecc8] text-[#7a4300]" },
    { count: s.radar_new, href: "/admin/problem-radar", key: "radar", tone: "bg-[#efeafd] text-[#4a2fb8]" },
    { count: s.highlights_ending, href: "/admin/highlights", key: "highlights", tone: "bg-[#dcf3ef] text-[#0b5d56]" },
  ].filter((item) => item.count > 0);

  return (
    <>
      <section className="grid gap-4 md:grid-cols-3">
        <article className={card}>
          <p className={label}>{t("accounts.title")}</p>
          <p className="font-serif text-[34px] font-semibold leading-none">{s.accounts_week}</p>
          <p className="text-sm leading-relaxed text-[#5f5e7a]">{t("accounts.text", { prev: s.accounts_prev_week, onboarded: s.onboarded_week, highlight: s.highlight_consent })}</p>
        </article>
        <article className={card}>
          <p className={label}>{t("connect.title")}</p>
          <p className="font-serif text-[34px] font-semibold leading-none">{s.connect_week.seeking + s.connect_week.offering + s.connect_week.problems + s.connect_week.ventures}</p>
          <div className="flex flex-wrap gap-1.5">
            <span className={`${pill} bg-[#efeafd] text-[#4a2fb8]`}>{t("connect.seeking", { count: s.connect_week.seeking })}</span>
            <span className={`${pill} bg-[#dcf3ef] text-[#0b5d56]`}>{t("connect.offering", { count: s.connect_week.offering })}</span>
            <span className={`${pill} bg-[#fdecc8] text-[#7a4300]`}>{t("connect.problems", { count: s.connect_week.problems })}</span>
            <span className={`${pill} bg-[#fbe4ef] text-[#8a1f55]`}>{t("connect.ventures", { count: s.connect_week.ventures })}</span>
          </div>
        </article>
        <article className={card}>
          <p className={label}>{t("operations.title")}</p>
          <ul className="flex flex-col gap-2 text-[14.5px]">
            {jobs.map(([job, key]) => {
              const state = cronState(s.cron[job]);
              return (
                <li key={job} className="flex items-center gap-2">
                  <span className={`h-[9px] w-[9px] shrink-0 rounded-full ${dot(state)}`} />
                  {t(`operations.${key}`)}: {t(`operations.state.${state}`)}
                </li>
              );
            })}
            <li className="flex flex-wrap items-center gap-2">
              <span className={`h-[9px] w-[9px] shrink-0 rounded-full ${dot(dumpState)}`} />
              {t("operations.dump")}: {dumpDays === null ? t("operations.state.never") : t("operations.daysAgo", { count: dumpDays })}
              <form action={markReminderDoneAction}>
                <input type="hidden" name="key" value="db_dump" />
                <SubmitButton label={t("operations.dumpDone")} pendingLabel={t("operations.saving")} className="rounded-lg bg-[#f1f0f7] px-2.5 py-1 text-[13px] font-semibold text-slate-900" />
              </form>
            </li>
          </ul>
        </article>
      </section>

      {checks ? (
        <section className={`${card} mt-4`} aria-labelledby="team-checks-title">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="team-checks-title" className="text-[21px] font-semibold text-slate-950">{t("teamChecks.title")}</h2>
            <p className="text-[13.5px] text-[#5f5e7a]">{t("teamChecks.note")}</p>
          </div>
          <ul className="grid gap-3 md:grid-cols-3">
            {(["read_my_mind", "founder_in_the_wild", "commitment_lab"] as const).map((key) => {
              const c = checks[key];
              return (
                <li key={key} className="flex flex-col gap-1.5 rounded-2xl bg-[#f7f6fb] p-4">
                  <p className="text-[15px] font-semibold">{t(`teamChecks.names.${key}`)}</p>
                  <p className="font-serif text-[28px] font-semibold leading-none">{c.started_total}</p>
                  <p className="text-[13.5px] leading-relaxed text-[#5f5e7a]">
                    {t("teamChecks.started", { recent: c.started_30d })}
                    {typeof c.completed_total === "number" ? ` ${t("teamChecks.finished", { completed: c.completed_total, abandoned: c.abandoned_total ?? 0 })}` : ""}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section className="mt-4 grid gap-4 md:grid-cols-2">
        <article className={card}>
          <h2 className="text-[21px] font-semibold text-slate-950">{t("todo.title")}</h2>
          {todos.length === 0 ? <p className="text-sm text-[#5f5e7a]">{t("todo.empty")}</p> : (
            <ul>
              {todos.map((item) => (
                <li key={item.key} className="flex items-center gap-3 border-t border-[#e4e2f0] py-3 text-[15px] first:border-t-0">
                  <span className={`${pill} ${item.tone}`}>{item.count}</span>
                  <span className="flex-1">{t(`todo.${item.key}`, { count: item.count })}</span>
                  <Link href={item.href} className="font-semibold text-[#6d49e0]">{t("todo.open")} →</Link>
                </li>
              ))}
            </ul>
          )}
        </article>
        <article className={card}>
          <h2 className="text-[21px] font-semibold text-slate-950">{t("areas.title")}</h2>
          <div className="flex flex-wrap gap-2.5">
            {([["/admin/moderation", "moderation"], ["/admin/highlights", "highlights"], ["/admin/announcements", "announcements"], ["/admin/problem-radar", "radar"], ["/admin/problem-radar/board", "board"], ["/admin/research/workstyle-pretest", "research"]] as const).map(([href, key]) => (
              <Link key={key} href={href} className="inline-flex min-h-11 items-center rounded-xl bg-[#f1f0f7] px-[18px] text-[15px] font-semibold text-slate-900 hover:bg-[#e9e7f4]">{t(`areas.${key}`)}</Link>
            ))}
          </div>
          <p className="text-[13.5px] text-[#5f5e7a]">{t("areas.text")}</p>
        </article>
      </section>
    </>
  );
}
