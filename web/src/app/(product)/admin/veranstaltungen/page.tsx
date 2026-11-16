import Link from "next/link";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { requirePlatformAdmin } from "@/features/moderation/access";
import { deleteAdminEventAction, saveAdminEventAction } from "@/features/events/adminEventActions";
import { eventCheckUrl, eventSignupUrl, EVENT_STATUSES } from "@/features/events/adminEventModel";
import { generateQrPng } from "@/features/events/eventQrCode";
import { isoToBerlinLocal } from "@/lib/berlinTime";
import { getPublicAppOrigin } from "@/lib/publicAppOrigin";
import { SubmitButton } from "@/features/ui/SubmitButton";

export const metadata: Metadata = { robots: { index: false, follow: false } };

type Row = { id: string; slug: string; name: string; status: "draft" | "live" | "closed"; starts_at: string | null; ends_at: string | null; participants: number };

const FIELD = "mt-1 w-full rounded-xl border border-[#c9ccdf] bg-white px-3 py-2 text-[15px]";
const BTN = "min-h-11 rounded-xl border border-[#c9ccdf] bg-white px-4 text-sm font-semibold text-slate-900";
const BTN_PRIMARY = "min-h-11 rounded-xl bg-[linear-gradient(120deg,#6d49e0,#0a80b8)] px-5 text-sm font-semibold text-white";
const PILL = { draft: "bg-amber-100 text-amber-900", live: "bg-emerald-100 text-emerald-900", closed: "bg-slate-200 text-slate-800" } as const;
const ERRORS = ["event_slug_invalid", "event_slug_taken", "event_name_invalid", "event_end_required", "event_time_invalid", "event_has_participants", "save"];
const SAVED = ["created", "updated", "deleted"];

function EventForm({ t, event }: { t: (key: string, values?: Record<string, string | number>) => string; event?: Row }) {
  return (
    <form action={saveAdminEventAction} className="grid gap-3 sm:grid-cols-2">
      {event ? <input type="hidden" name="id" value={event.id} /> : null}
      <label className="block text-sm font-semibold sm:col-span-2">{t("form.name")}<input name="name" required minLength={2} maxLength={120} defaultValue={event?.name ?? ""} className={FIELD} placeholder={t("form.namePlaceholder")} /></label>
      <label className="block text-sm font-semibold">{t("form.slug")}<input name="slug" maxLength={60} defaultValue={event?.slug ?? ""} className={FIELD} placeholder={t("form.slugPlaceholder")} /><span className="mt-1 block text-xs font-normal text-slate-600">{t("form.slugHint")}</span></label>
      <label className="block text-sm font-semibold">{t("form.status")}
        <select name="status" defaultValue={event?.status ?? "draft"} className={FIELD}>{EVENT_STATUSES.map((s) => <option key={s} value={s}>{t(`status.${s}`)}</option>)}</select>
        <span className="mt-1 block text-xs font-normal text-slate-600">{t("form.statusHint")}</span>
      </label>
      <label className="block text-sm font-semibold">{t("form.starts")}<input type="datetime-local" name="starts_at" defaultValue={event?.starts_at ? isoToBerlinLocal(event.starts_at) : ""} className={FIELD} /></label>
      <label className="block text-sm font-semibold">{t("form.ends")}<input type="datetime-local" name="ends_at" defaultValue={event?.ends_at ? isoToBerlinLocal(event.ends_at) : ""} className={FIELD} /><span className="mt-1 block text-xs font-normal text-slate-600">{t("form.endsHint")}</span></label>
      <div className="sm:col-span-2"><SubmitButton label={t(event ? "form.save" : "form.create")} pendingLabel="…" className={BTN_PRIMARY} /></div>
    </form>
  );
}

export default async function AdminEventsPage({ searchParams }: { searchParams: Promise<{ saved?: string; error?: string }> }) {
  const client = await requirePlatformAdmin();
  const params = await searchParams;
  const [t, locale, { data }] = await Promise.all([getTranslations("admin.eventsQr"), getLocale(), client.rpc("admin_list_events")]);
  const rows = (data ?? []) as Row[];
  const origin = getPublicAppOrigin();
  const fmt = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Berlin" });
  const withQr = await Promise.all(rows.map(async (row) => ({
    row,
    signup: { url: eventSignupUrl(origin, row.slug), qr: await generateQrPng(eventSignupUrl(origin, row.slug)) },
    check: { url: eventCheckUrl(origin, row.slug), qr: await generateQrPng(eventCheckUrl(origin, row.slug)) },
  })));
  const error = ERRORS.includes(params.error ?? "") ? params.error : null;
  const saved = SAVED.includes(params.saved ?? "") ? params.saved : null;

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <Link href="/admin" className="text-sm text-slate-600 underline">{"← "}{t("back")}</Link>
      <h1 className="mt-4 text-3xl font-semibold text-slate-950">{t("title")}</h1>
      <p className="mt-2 max-w-2xl text-base leading-7 text-slate-600">{t("intro")}</p>
      {saved ? <p role="status" className="mt-4 rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-900">{t(`saved.${saved}`)}</p> : null}
      {error ? <p role="alert" className="mt-4 rounded-2xl bg-amber-50 p-3 text-sm text-amber-900">{t(`errors.${error}`)}</p> : null}

      <section className="mt-6 rounded-2xl border border-[#d9dcec] bg-white p-5" aria-labelledby="new-event">
        <h2 id="new-event" className="text-lg font-semibold">{t("new")}</h2>
        <div className="mt-3"><EventForm t={t} /></div>
      </section>

      <h2 className="mt-8 text-lg font-semibold">{t("list")}</h2>
      {withQr.length === 0 ? <p className="mt-2 text-sm text-slate-600">{t("empty")}</p> : (
        <ul className="mt-3 space-y-3">
          {withQr.map(({ row, signup, check }) => (
            <li key={row.id}>
              <details className="rounded-2xl border border-[#d9dcec] bg-white">
                <summary className="flex min-h-14 cursor-pointer flex-wrap items-center gap-3 px-4 py-3">
                  <span className="min-w-0 flex-1 font-semibold">{row.name}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${PILL[row.status]}`}>{t(`status.${row.status}`)}</span>
                  <span className="text-sm text-slate-600">{row.starts_at ? fmt.format(new Date(row.starts_at)) : t("noDate")} · {t("participants", { count: row.participants })}</span>
                </summary>
                <div className="border-t border-[#e4e2f0] p-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    {([["signup", signup], ["check", check]] as const).map(([key, item]) => (
                      <section key={key} className="rounded-2xl border border-[#d9dcec] bg-[#faf9fe] p-4" aria-label={t(`qr.${key}.title`)}>
                        <h3 className="text-base font-semibold">{t(`qr.${key}.title`)}</h3>
                        <p className="mt-1 text-sm leading-6 text-slate-700">{t(`qr.${key}.text`)}</p>
                        {item.qr.ok ? (
                          <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={item.qr.dataUrl} alt={t("qr.alt", { name: row.name })} width={200} height={200} className="mt-3 h-[200px] w-[200px] rounded-xl bg-white p-1" />
                            <a href={item.qr.dataUrl} download={`qr-${row.slug}-${key}.png`} className={`${BTN} mt-3 inline-flex items-center`}>{t("qr.download")}</a>
                          </>
                        ) : <p className="mt-3 text-sm text-amber-900">{t("qr.failed")}</p>}
                        <p className="mt-3 break-all text-xs text-slate-600"><span className="font-semibold">{t("qr.address")}:</span> {item.url}</p>
                      </section>
                    ))}
                  </div>
                  <div className="mt-5"><EventForm t={t} event={row} /></div>
                  {row.participants === 0 ? (
                    <form action={deleteAdminEventAction} className="mt-4"><input type="hidden" name="id" value={row.id} /><SubmitButton label={t("delete")} pendingLabel="…" className={`${BTN} text-rose-900`} /></form>
                  ) : <p className="mt-4 text-xs text-slate-600">{t("deleteBlocked")}</p>}
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
