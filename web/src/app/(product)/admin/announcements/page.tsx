import Link from "next/link";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { requirePlatformAdmin } from "@/features/moderation/access";
import { AnnouncementCard } from "@/features/announcements/AnnouncementCard";
import { saveAnnouncementAction, setAnnouncementStatusAction } from "@/features/announcements/announcementActions";
import { ANNOUNCEMENT_LIMITS } from "@/features/announcements/announcementModel";
import { SubmitButton } from "@/features/ui/SubmitButton";

export const metadata: Metadata = { robots: { index: false, follow: false } };

type Row = {
  id: string;
  status: "draft" | "active" | "archived";
  title_de: string;
  body_de: string;
  title_en: string | null;
  body_en: string | null;
  cta_label_de: string | null;
  cta_label_en: string | null;
  cta_href: string | null;
  show_once: boolean;
  starts_at: string | null;
  ends_at: string | null;
  seen_count: number;
  dismissed_count: number;
};

const input = "mt-1 block min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm";
const button = "min-h-11 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 disabled:opacity-50";
const primary = "min-h-11 rounded-xl bg-slate-950 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50";
const day = (value: string | null) => (value ? value.slice(0, 10) : "");

export default async function AnnouncementsAdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const client = await requirePlatformAdmin();
  const params = await searchParams;
  const [t, tNotice, locale, { data, error }] = await Promise.all([
    getTranslations("admin.announcements"),
    getTranslations("notices.announcements"),
    getLocale(),
    client.rpc("admin_list_announcements"),
  ]);
  const rows = (error ? [] : (data ?? [])) as Row[];
  const editId = typeof params.edit === "string" ? params.edit : null;
  const editing = rows.find((row) => row.id === editId) ?? null;
  const result = typeof params.result === "string" ? params.result : null;
  const groups = (["active", "draft", "archived"] as const).map((status) => ({ status, items: rows.filter((row) => row.status === status) }));
  const fmt = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" });

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <Link href="/admin" className="text-sm text-slate-600 underline">{"← "}{t("back")}</Link>
      <h1 className="mt-4 text-2xl font-semibold text-slate-950">{t("title")}</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{t("intro")}</p>

      {result === "saved" || result === "status" ? <p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">{t(`results.${result}`)}</p> : null}
      {result && result !== "saved" && result !== "status" ? (
        <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-900">{t(`results.${result === "notfound" || result === "invalid" ? result : "error"}`)}</p>
      ) : null}
      {error ? <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-900">{t("results.error")}</p> : null}

      <form action={saveAnnouncementAction} className="mt-6 space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
        {editing ? <input type="hidden" name="id" value={editing.id} /> : null}
        <h2 className="text-lg font-semibold text-slate-950">{editing ? t("editTitle") : t("newTitle")}</h2>
        <label className="block text-sm font-medium">{t("titleDe")}
          <input name="title_de" required maxLength={ANNOUNCEMENT_LIMITS.title} defaultValue={editing?.title_de ?? ""} className={input} />
        </label>
        <label className="block text-sm font-medium">{t("bodyDe")}
          <textarea name="body_de" required rows={6} maxLength={ANNOUNCEMENT_LIMITS.body} defaultValue={editing?.body_de ?? ""} className={`${input} py-2`} />
          <span className="mt-1 block text-xs font-normal text-slate-500">{t("bodyHint")}</span>
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium">{t("ctaLabelDe")}
            <input name="cta_label_de" maxLength={ANNOUNCEMENT_LIMITS.cta} defaultValue={editing?.cta_label_de ?? ""} className={input} />
          </label>
          <label className="block text-sm font-medium">{t("ctaHref")}
            <input name="cta_href" maxLength={ANNOUNCEMENT_LIMITS.href} defaultValue={editing?.cta_href ?? ""} placeholder="/connect" className={input} />
            <span className="mt-1 block text-xs font-normal text-slate-500">{t("ctaHint")}</span>
          </label>
        </div>
        <fieldset className="grid gap-4 rounded-xl bg-slate-50 p-4">
          <legend className="px-1 text-sm font-semibold text-slate-700">English</legend>
          <p className="-mt-1 text-xs text-slate-500">{t("enHint")}</p>
          <label className="block text-sm font-medium">{t("titleEn")}
            <input name="title_en" maxLength={ANNOUNCEMENT_LIMITS.title} defaultValue={editing?.title_en ?? ""} className={input} />
          </label>
          <label className="block text-sm font-medium">{t("bodyEn")}
            <textarea name="body_en" rows={5} maxLength={ANNOUNCEMENT_LIMITS.body} defaultValue={editing?.body_en ?? ""} className={`${input} py-2`} />
          </label>
          <label className="block text-sm font-medium">{t("ctaLabelEn")}
            <input name="cta_label_en" maxLength={ANNOUNCEMENT_LIMITS.cta} defaultValue={editing?.cta_label_en ?? ""} className={input} />
          </label>
        </fieldset>
        <label className="flex min-h-11 items-start gap-3 text-sm">
          <input type="checkbox" name="show_once" value="yes" defaultChecked={editing ? editing.show_once : true} className="mt-1 h-4 w-4" />
          <span><b>{t("showOnce")}</b><span className="mt-0.5 block text-xs text-slate-500">{t("showOnceHint")}</span></span>
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium">{t("startsOn")}
            <input type="date" name="starts_on" defaultValue={day(editing?.starts_at ?? null)} className={input} />
          </label>
          <label className="block text-sm font-medium">{t("endsOn")}
            <input type="date" name="ends_on" defaultValue={day(editing?.ends_at ?? null)} className={input} />
          </label>
        </div>
        <div className="flex flex-wrap gap-3">
          <SubmitButton label={t("save")} pendingLabel={t("saving")} className={primary} />
          {editing ? <Link href="/admin/announcements" className={`${button} inline-flex items-center`}>{t("cancel")}</Link> : null}
        </div>
      </form>

      {rows.length === 0 ? <p className="mt-8 text-sm text-slate-600">{t("empty")}</p> : null}
      {groups.map((group) =>
        group.items.length > 0 ? (
          <section key={group.status} className="mt-8" aria-labelledby={`g-${group.status}`}>
            <h2 id={`g-${group.status}`} className="text-sm font-bold uppercase tracking-[.08em] text-slate-500">{t(`groups.${group.status}`)}</h2>
            <ul className="mt-3 grid gap-3">
              {group.items.map((row) => (
                <li key={row.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-950">{row.title_de}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {row.show_once ? t("once") : t("repeat")}
                        {row.starts_at ? ` · ${fmt.format(new Date(row.starts_at))}` : ""}
                        {row.ends_at ? ` – ${fmt.format(new Date(row.ends_at))}` : ""}
                        {" · "}
                        {t("stats", { seen: row.seen_count, dismissed: row.dismissed_count })}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link href={`/admin/announcements?edit=${row.id}`} className={`${button} inline-flex items-center`}>{t("edit")}</Link>
                      {(["draft", "archived"] as const).includes(row.status as "draft" | "archived") ? (
                        <form action={setAnnouncementStatusAction}>
                          <input type="hidden" name="id" value={row.id} /><input type="hidden" name="status" value="active" />
                          <SubmitButton label={t("actions.publish")} pendingLabel={t("actions.publishing")} className={primary} />
                        </form>
                      ) : null}
                      {row.status === "active" ? (
                        <form action={setAnnouncementStatusAction}>
                          <input type="hidden" name="id" value={row.id} /><input type="hidden" name="status" value="archived" />
                          <SubmitButton label={t("actions.archive")} pendingLabel={t("actions.archiving")} className={button} />
                        </form>
                      ) : null}
                      {row.status === "active" ? (
                        <form action={setAnnouncementStatusAction}>
                          <input type="hidden" name="id" value={row.id} /><input type="hidden" name="status" value="draft" />
                          <SubmitButton label={t("actions.draft")} pendingLabel={t("actions.drafting")} className={button} />
                        </form>
                      ) : null}
                    </div>
                  </div>
                  <details className="mt-3">
                    <summary className="cursor-pointer text-sm font-semibold text-violet-800">{t("preview")}</summary>
                    <div className="mx-auto mt-3 max-w-md">
                      <AnnouncementCard
                        eyebrow={tNotice("eyebrow")}
                        title={row.title_de}
                        body={row.body_de}
                        actions={
                          <>
                            {row.cta_href && row.cta_label_de ? <span className="brand-cta inline-flex min-h-12 w-full items-center justify-center rounded-2xl px-6 text-base font-semibold">{row.cta_label_de}</span> : null}
                            <span className={`inline-flex min-h-12 w-full items-center justify-center rounded-2xl px-6 text-base font-semibold ${row.cta_href && row.cta_label_de ? "text-slate-600" : "brand-cta"}`}>{tNotice("dismiss")}</span>
                          </>
                        }
                        footer={tNotice("later")}
                      />
                    </div>
                  </details>
                </li>
              ))}
            </ul>
          </section>
        ) : null
      )}
    </main>
  );
}
