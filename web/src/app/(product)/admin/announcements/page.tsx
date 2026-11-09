import Link from "next/link";
import { berlinDayOf } from "@/lib/berlinTime";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { requirePlatformAdmin } from "@/features/moderation/access";
import { AnnouncementForm } from "@/features/announcements/AnnouncementForm";
import { AnnouncementPreview } from "@/features/announcements/AnnouncementPreview";
import { saveAnnouncementAction, setAnnouncementStatusAction } from "@/features/announcements/announcementActions";
import { displayOf } from "@/features/announcements/announcementModel";
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
  display: string | null;
  starts_at: string | null;
  ends_at: string | null;
  seen_count: number;
  dismissed_count: number;
};

const button = "min-h-11 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 disabled:opacity-50";
const primary = "min-h-11 rounded-xl bg-slate-950 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50";
const day = (value: string | null) => (value ? berlinDayOf(value) : "");

export default async function AnnouncementsAdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const client = await requirePlatformAdmin();
  const params = await searchParams;
  const [t, locale, { data, error }] = await Promise.all([
    getTranslations("admin.announcements"),
    getLocale(),
    client.rpc("admin_list_announcements"),
  ]);
  const rows = (error ? [] : (data ?? [])) as Row[];
  const editId = typeof params.edit === "string" ? params.edit : null;
  const editing = rows.find((row) => row.id === editId) ?? null;
  const result = typeof params.result === "string" ? params.result : null;
  const groups = (["active", "draft", "archived"] as const).map((status) => ({ status, items: rows.filter((row) => row.status === status) }));
  const fmt = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "Europe/Berlin" });

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <Link href="/admin" className="text-sm text-slate-600 underline">{"← "}{t("back")}</Link>
      <h1 className="mt-4 text-2xl font-semibold text-slate-950">{t("title")}</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{t("intro")}</p>

      {result === "saved" || result === "status" ? <p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">{t(`results.${result}`)}</p> : null}
      {result && result !== "saved" && result !== "status" ? (
        <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-900">{t(`results.${result === "notfound" || result === "invalid" ? result : "error"}`)}</p>
      ) : null}
      {error ? <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-900">{t("results.error")}</p> : null}

      <AnnouncementForm
        // Beim Wechsel zu einer anderen Mitteilung neu aufbauen - sonst bleiben die Felder der vorigen stehen.
        key={editing?.id ?? "new"}
        action={saveAnnouncementAction}
        cancelHref={editing ? "/admin/announcements" : null}
        draft={{
          id: editing?.id ?? null,
          titleDe: editing?.title_de ?? "",
          bodyDe: editing?.body_de ?? "",
          ctaLabelDe: editing?.cta_label_de ?? "",
          ctaHref: editing?.cta_href ?? "",
          titleEn: editing?.title_en ?? "",
          bodyEn: editing?.body_en ?? "",
          ctaLabelEn: editing?.cta_label_en ?? "",
          showOnce: editing ? editing.show_once : true,
          startsOn: day(editing?.starts_at ?? null),
          endsOn: day(editing?.ends_at ?? null),
          display: displayOf(editing?.display),
        }}
      />

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
                        {t(`display.${displayOf(row.display)}.name`)}{" · "}
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
                    <div className="mt-3">
                      <AnnouncementPreview display={displayOf(row.display)} title={row.title_de} body={row.body_de} ctaLabel={row.cta_href && row.cta_label_de ? row.cta_label_de : null} />
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
