"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { deleteBlogCategoryAction, saveBlogCategoryAction } from "@/features/blog/blogAdminActions";

export type CategoryRow = { id: string; slug: string; name_de: string; name_en: string; description_de: string; description_en: string; sort_order: number; post_count: number };
type Draft = CategoryRow & { isNew?: boolean };

const FIELD = "mt-1 w-full rounded-xl border border-[#c9ccdf] bg-white px-3 py-2 text-[15px]";
const BTN = "min-h-11 rounded-xl border border-[#c9ccdf] bg-white px-4 text-sm font-semibold text-slate-900 disabled:opacity-50";
const BTN_PRIMARY = "min-h-11 rounded-xl bg-[linear-gradient(120deg,#6d49e0,#0a80b8)] px-5 text-sm font-semibold text-white disabled:opacity-50";

/** Kategorien anlegen, benennen, ordnen, loeschen. Jede Zeile speichert fuer sich; Reihenfolge tauscht die Nummern zweier Nachbarn. */
export function BlogCategoriesEditor({ initial }: { initial: CategoryRow[] }) {
  const t = useTranslations("admin.blog.categories");
  const tm = useTranslations("admin.blog.messages");
  const router = useRouter();
  const [rows, setRows] = useState<Draft[]>(initial);
  const [note, setNote] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const patch = (id: string, change: Partial<Draft>) => setRows((current) => current.map((r) => (r.id === id ? { ...r, ...change } : r)));
  const add = () => setRows((current) => [...current, { id: `new-${Date.now()}`, slug: "", name_de: "", name_en: "", description_de: "", description_en: "", sort_order: (current.at(-1)?.sort_order ?? 0) + 1, post_count: 0, isNew: true }]);
  const fail = (key: string | undefined) => setNote({ tone: "error", text: tm(`error_${key ?? "save"}`) });

  const save = (row: Draft) => start(async () => {
    const result = await saveBlogCategoryAction(row.isNew ? null : row.id, row);
    if (!result.ok) return fail(result.error);
    setNote({ tone: "ok", text: t("saved") });
    router.refresh();
  });
  const move = (index: number, delta: number) => start(async () => {
    const a = rows[index]; const b = rows[index + delta];
    if (!a || !b || a.isNew || b.isNew) return;
    const first = await saveBlogCategoryAction(a.id, { ...a, sort_order: b.sort_order });
    const second = await saveBlogCategoryAction(b.id, { ...b, sort_order: a.sort_order });
    if (!first.ok || !second.ok) return fail("save");
    router.refresh();
    setRows((current) => { const next = [...current]; [next[index], next[index + delta]] = [{ ...b, sort_order: a.sort_order }, { ...a, sort_order: b.sort_order }]; return next; });
  });
  const remove = (row: Draft) => start(async () => {
    if (row.isNew) { setRows((current) => current.filter((r) => r.id !== row.id)); return; }
    const result = await deleteBlogCategoryAction(row.id);
    if (!result.ok) return fail(result.error);
    setRows((current) => current.filter((r) => r.id !== row.id)); setConfirmDelete(null); setNote({ tone: "ok", text: t("deleted") });
  });

  return (
    <div className="space-y-4">
      {note ? <p role="status" className={`rounded-2xl p-3 text-sm ${note.tone === "ok" ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-900"}`}>{note.text}</p> : null}
      <ol className="space-y-3">
        {rows.map((row, index) => (
          <li key={row.id} className="rounded-2xl border border-[#d9dcec] bg-white p-4">
            <div className="flex flex-wrap items-center gap-2">
              <strong className="text-base">{index + 1}. {row.name_de || "…"}</strong>
              {!row.isNew ? <span className="text-xs text-slate-600">/blog/kategorie/{row.slug} · {t("posts", { count: row.post_count })}</span> : null}
              <span className="ml-auto flex gap-1">
                <button type="button" className={BTN} disabled={pending || row.isNew || index === 0} onClick={() => move(index, -1)} aria-label={t("up")}>↑</button>
                <button type="button" className={BTN} disabled={pending || row.isNew || index === rows.length - 1} onClick={() => move(index, 1)} aria-label={t("down")}>↓</button>
              </span>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block text-sm font-semibold">{t("nameDe")}<input className={FIELD} maxLength={60} value={row.name_de} onChange={(e) => patch(row.id, { name_de: e.target.value })} /></label>
              <label className="block text-sm font-semibold">{t("nameEn")}<input className={FIELD} maxLength={60} value={row.name_en} onChange={(e) => patch(row.id, { name_en: e.target.value })} /></label>
              <label className="block text-sm font-semibold sm:col-span-2">{t("slug")}<input className={FIELD} maxLength={60} value={row.slug} placeholder={row.name_de} onChange={(e) => patch(row.id, { slug: e.target.value.toLowerCase() })} /></label>
              <label className="block text-sm font-semibold">{t("descDe")}<input className={FIELD} maxLength={200} value={row.description_de} onChange={(e) => patch(row.id, { description_de: e.target.value })} /></label>
              <label className="block text-sm font-semibold">{t("descEn")}<input className={FIELD} maxLength={200} value={row.description_en} onChange={(e) => patch(row.id, { description_en: e.target.value })} /></label>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button type="button" className={BTN_PRIMARY} disabled={pending || !row.name_de.trim()} onClick={() => save(row)}>{t("save")}</button>
              {confirmDelete === row.id ? (
                <>
                  <span className="text-sm font-semibold">{t("deleteSure")}</span>
                  <button type="button" className={BTN} disabled={pending} onClick={() => remove(row)}>{t("deleteYes")}</button>
                  <button type="button" className={BTN} onClick={() => setConfirmDelete(null)}>×</button>
                </>
              ) : <button type="button" className="text-sm text-slate-600 underline" onClick={() => (row.isNew ? remove(row) : setConfirmDelete(row.id))}>{t("delete")}</button>}
            </div>
          </li>
        ))}
      </ol>
      <p className="text-sm text-slate-600">{t("deleteHint")}</p>
      <button type="button" className={BTN} disabled={pending} onClick={add}>{t("new")}</button>
    </div>
  );
}
