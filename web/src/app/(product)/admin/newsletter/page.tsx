import Link from "next/link";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { requirePlatformAdmin } from "@/features/moderation/access";
import { createNewsletterIssueAction } from "@/features/newsletter/newsletterAdminActions";
import { sendWelcomeTestAction } from "@/features/newsletter/newsletterWelcomeAdminActions";
import { SubmitButton } from "@/features/ui/SubmitButton";

export const metadata: Metadata = { robots: { index: false, follow: false } };

type Row = { id: string; title: string; subject: string; status: "draft" | "scheduled" | "sending" | "sent"; scheduled_for: string | null; sent_at: string | null; updated_at: string; delivered: number };

const PILL: Record<Row["status"], string> = { draft: "bg-amber-100 text-amber-900", scheduled: "bg-sky-100 text-sky-900", sending: "bg-violet-100 text-violet-900", sent: "bg-emerald-100 text-emerald-900" };

export default async function NewsletterAdminPage({ searchParams }: { searchParams: Promise<{ error?: string; welcome?: string }> }) {
  const client = await requirePlatformAdmin();
  const params = await searchParams;
  const [t, locale, issues, stats] = await Promise.all([
    getTranslations("admin.newsletter"), getLocale(),
    client.rpc("admin_list_newsletter_issues"), client.rpc("admin_newsletter_stats"),
  ]);
  const rows = (issues.error ? [] : (issues.data ?? [])) as Row[];
  const s = ((stats.data ?? []) as { confirmed: number; pending: number; unsubscribed: number }[])[0] ?? { confirmed: 0, pending: 0, unsubscribed: 0 };
  const fmt = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Berlin" });
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <Link href="/admin" className="text-sm text-slate-600 underline">{"← "}{t("back")}</Link>
      <h1 className="mt-4 text-3xl font-semibold text-slate-950">{t("title")}</h1>
      <p className="mt-2 max-w-2xl text-base leading-7 text-slate-600">{t("intro")}</p>
      {params.error ? <p role="alert" className="mt-4 rounded-2xl bg-amber-50 p-3 text-sm text-amber-900">{t("messages.error_save")}</p> : null}
      {params.welcome === "sent" ? <p role="status" className="mt-4 rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-900">{t("welcomeSent")}</p> : null}
      {params.welcome === "error" ? <p role="alert" className="mt-4 rounded-2xl bg-amber-50 p-3 text-sm text-amber-900">{t("welcomeError")}</p> : null}
      <section className="mt-6 grid gap-3 sm:grid-cols-3" aria-label={t("stats.title")}>
        {([["confirmed", s.confirmed], ["pending", s.pending], ["unsubscribed", s.unsubscribed]] as const).map(([key, value]) => (
          <div key={key} className="rounded-2xl border border-[#d9dcec] bg-white p-4"><div className="text-3xl font-bold">{value}</div><div className="text-sm text-slate-600">{t(`stats.${key}`)}</div></div>
        ))}
      </section>
      <form action={createNewsletterIssueAction} className="mt-6"><SubmitButton label={t("new")} pendingLabel="…" className="min-h-11 rounded-xl bg-[linear-gradient(120deg,#6d49e0,#0a80b8)] px-5 text-sm font-semibold text-white" /></form>
      <section className="mt-8 rounded-2xl border border-[#d9dcec] bg-white p-4" aria-labelledby="welcome-title">
        <h2 id="welcome-title" className="text-lg font-semibold">{t("welcomeTitle")}</h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">{t("welcomeText")}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {(["de", "en"] as const).map((code) => (
            <form key={code} action={sendWelcomeTestAction}>
              <input type="hidden" name="locale" value={code} />
              <SubmitButton label={t(code === "de" ? "welcomeDe" : "welcomeEn")} pendingLabel="…" className="min-h-11 rounded-xl border border-[#c9ccdf] bg-white px-4 text-sm font-semibold text-slate-900" />
            </form>
          ))}
        </div>
      </section>
      <h2 className="mt-8 text-lg font-semibold">{t("issues")}</h2>
      {rows.length === 0 ? <p className="mt-2 text-sm text-slate-600">{t("empty")}</p> : (
        <ul className="mt-3 space-y-2">
          {rows.map((row) => (
            <li key={row.id}>
              <Link href={`/admin/newsletter/${row.id}`} className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#d9dcec] bg-white px-4 py-3 hover:bg-[#faf9fe]">
                <span className="min-w-0 flex-1 font-semibold">{row.title || row.subject || t("untitled")}</span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${PILL[row.status]}`}>{t(`status.${row.status}`)}</span>
                <span className="text-sm text-slate-600">
                  {row.status === "scheduled" && row.scheduled_for ? fmt.format(new Date(row.scheduled_for)) : row.status === "sent" && row.sent_at ? t("sentOn", { date: fmt.format(new Date(row.sent_at)), count: row.delivered }) : row.status === "sending" ? t("sendingProgress", { count: row.delivered }) : fmt.format(new Date(row.updated_at))}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
