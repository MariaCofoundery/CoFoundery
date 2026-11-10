import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { deleteDoorAction, saveDoorAction, setDoorsOpenAction } from "@/features/connect/doors/doorsActions";
import { MAX_DOORS, type Door } from "@/features/connect/doors/doorCatalog";
import { DoorForm } from "@/features/connect/doors/DoorForm";
import { doorFormCopy, doorMeta, doorTitle } from "@/features/connect/doors/doorLabels";
import { SubmitButton } from "@/features/ui/SubmitButton";

/**
 * "Wen kannst du erreichen?" im Connect-Profil (Entwurf 10.11.2026): ersetzt das Freitextfeld "Wen kennst du?". Steht neben dem
 * Profilformular (eigene Formulare), ist freiwillig und fragt erst nach der ersten Tuer nach einer weiteren.
 */
export async function DoorsSection({ doors, doorsOpen, status, editId, creating, oldText, hasProfile }: { doors: Door[]; doorsOpen: boolean; status: string | null; editId: string | null; creating: boolean; oldText: string | null; hasProfile: boolean }) {
  const t = await getTranslations("connect.doors");
  const tt = (key: string, values?: Record<string, string | number>) => t(key, values);
  const copy = doorFormCopy(tt);
  const editing = editId ? doors.find((door) => door.id === editId) ?? null : null;
  const here = "/connect/profile#tueren";
  const full = doors.length >= MAX_DOORS;
  return (
    <section id="tueren" aria-labelledby="doors-title" className="mt-8 scroll-mt-24 rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
      <h2 id="doors-title" className="font-brand text-2xl font-semibold text-slate-950">{t("title")}</h2>
      <p className="mt-1 max-w-2xl text-[15px] leading-7 text-slate-700">{t("intro")}</p>
      {status === "saved" ? <p role="status" className="mt-3 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{t("saved")}</p> : status === "limit" ? <p role="alert" className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">{t("limit")}</p> : status === "duplicate" ? <p role="alert" className="mt-3 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">{t("duplicate")}</p> : status === "error" ? <p role="alert" className="mt-3 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800">{t("error")}</p> : null}
      {oldText && doors.length === 0 ? (
        <div role="note" className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-[13px] font-semibold text-slate-800">{t("oldText")}</p>
          <p className="mt-1 text-[14.5px] leading-6 text-slate-800">„{oldText}“</p>
          <p className="mt-1 text-xs leading-5 text-slate-600">{t("oldTextHint")}</p>
        </div>
      ) : null}

      <h3 className="mt-5 text-base font-semibold text-slate-950">{t("count", { count: doors.length, max: MAX_DOORS })}</h3>
      {doors.length === 0 ? <p className="mt-1 text-sm text-slate-700">{t("empty")}</p> : null}
      <ul className="mt-2 grid gap-2">
        {doors.map((door) => (
          <li key={door.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3">
            <span className="min-w-0 flex-1">
              <b className="block text-[15px] text-slate-950">{doorTitle(tt, door)}</b>
              <span className="block text-[13px] text-slate-700">{[doorMeta(tt, door), t(`closeness.${door.closeness}.label`)].filter(Boolean).join(" · ")}</span>
              {door.note ? <span className="block text-[13px] text-slate-600">„{door.note}“</span> : null}
            </span>
            <Link href={`/connect/profile?tuer_bearbeiten=${door.id}#tueren`} className="inline-flex min-h-11 items-center px-2 text-sm font-semibold text-violet-800 underline-offset-4 hover:underline">{t("edit")}</Link>
            <form action={deleteDoorAction}><input type="hidden" name="doorId" value={door.id} /><SubmitButton label={t("delete")} pendingLabel="…" className="inline-flex min-h-11 items-center px-2 text-sm font-semibold text-slate-600 hover:text-rose-800" /></form>
          </li>
        ))}
      </ul>

      {editing ? <div className="mt-4"><DoorForm copy={copy} initial={editing} action={saveDoorAction} onCancelHref={here} /></div> : creating ? <div className="mt-4"><DoorForm copy={copy} action={saveDoorAction} onCancelHref={here} /></div> : full ? <p className="mt-3 text-sm text-slate-700">{t("limit")}</p> : (
        <Link href="/connect/profile?tuer_neu=1#tueren" className="mt-3 inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-violet-800 hover:bg-violet-50">+ {doors.length === 0 ? t("add") : t("addAnother")}</Link>
      )}

      {hasProfile && doors.length > 0 ? (
        <form action={setDoorsOpenAction} className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3">
          <input type="hidden" name="open" value={doorsOpen ? "no" : "yes"} />
          <span className="min-w-0 flex-1"><b className="block text-[14.5px] text-slate-950">{t("open.label")}</b><span className="block text-[13px] text-slate-700">{doorsOpen ? t("open.on") : t("open.off")}</span></span>
          <SubmitButton label={doorsOpen ? t("open.pause") : t("open.resume")} pendingLabel="…" className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-900 hover:bg-slate-50" />
        </form>
      ) : null}
    </section>
  );
}
