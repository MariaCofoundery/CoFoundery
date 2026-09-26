import { getTranslations } from "next-intl/server";
import {
  completeAdvisorFollowUpForAction,
  saveAdvisorFollowUpForAction,
  saveAdvisorNoteAction,
} from "@/features/advisor/notebookActions";
import type { NoteAnchor } from "@/features/advisor/notebookData";
import type { AdvisorFollowUp, AdvisorPrivateNote } from "@/features/reporting/advisorWorkspaceData";
import { SubmitButton } from "@/features/ui/SubmitButton";

/**
 * Die Handakte - Notiz und Wiedervorlage, an einem Ort.
 *
 * SIE STEHT UNTER DEM MATERIAL, auf das sie sich bezieht. Genau das war der
 * Grund, sie überhaupt zu bauen: Wer beruflich begleitet, führt Notizen, und
 * die mussten bisher in ein anderes Werkzeug - getrennt von dem, worüber sie
 * handeln.
 *
 * SIE GEHÖRT DEM, DER SIE SCHREIBT. Nicht der begleiteten Person, nicht den
 * anderen Advisors derselben Organisation. Das hält die Datenbank selbst, und
 * es steht auch dabei: Ein Feld, von dem man nicht weiß, wer es liest,
 * schreibt sich anders.
 *
 * EINE NOTIZ JE MANDAT, nicht je Sitzung. Sitzungen gibt es in diesem Produkt
 * nicht als Gegenstand; sie zu erfinden, nur um Notizen zu datieren, wäre ein
 * Modell für eine Funktion statt umgekehrt. Wer datieren will, schreibt ein
 * Datum in den Text.
 */
export async function AdvisorNotebook({
  anchor,
  note,
  followUp,
  saved,
  error,
}: {
  anchor: NoteAnchor;
  note: AdvisorPrivateNote;
  followUp: AdvisorFollowUp | null;
  saved?: string;
  error?: string;
}) {
  const t = await getTranslations("advisor.notebook");
  const open = followUp && !followUp.completedAt;

  return (
    <section
      id="notebook"
      className="mt-8 scroll-mt-6 rounded-3xl border border-slate-200 bg-slate-50/60 p-6"
    >
      <h2 className="text-base font-semibold text-slate-900">{t("title")}</h2>
      {/* Wer es liest, steht dabei - ein Feld ohne diese Auskunft schreibt
          sich anders. */}
      <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">{t("private")}</p>

      {error ? (
        <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-800">
          {t(`errors.${error === "forbidden" || error === "due" ? error : "save"}`)}
        </p>
      ) : null}
      {saved ? (
        <p className="mt-3 text-sm leading-6 text-emerald-800">{t("saved")}</p>
      ) : null}

      <form action={saveAdvisorNoteAction} className="mt-4">
        <input type="hidden" name="anchorKind" value={anchor.kind} />
        <input type="hidden" name="anchorId" value={anchor.id} />
        <label className="block">
          <span className="block text-xs font-semibold uppercase tracking-[.12em] text-slate-500">
            {t("noteLabel")}
          </span>
          <textarea
            name="body"
            rows={6}
            defaultValue={note.body}
            maxLength={20000}
            placeholder={t("notePlaceholder")}
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm leading-6"
          />
        </label>
        <SubmitButton
          label={t("saveNote")}
          pendingLabel={t("pending")}
          className="mt-2 inline-flex min-h-11 items-center rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white"
        />
      </form>

      <form action={saveAdvisorFollowUpForAction} className="mt-6 border-t border-slate-200 pt-5">
        <input type="hidden" name="anchorKind" value={anchor.kind} />
        <input type="hidden" name="anchorId" value={anchor.id} />
        <p className="text-xs font-semibold uppercase tracking-[.12em] text-slate-500">
          {t("followUpLabel")}
        </p>
        <div className="mt-2 flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="block text-xs text-slate-500">{t("dueOn")}</span>
            <input
              type="date"
              name="dueOn"
              defaultValue={followUp?.dueOn ?? ""}
              className="mt-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            />
          </label>
          <label className="min-w-0 flex-1">
            <span className="block text-xs text-slate-500">{t("followUpNote")}</span>
            <input
              name="note"
              defaultValue={followUp?.note ?? ""}
              maxLength={2000}
              placeholder={t("followUpPlaceholder")}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            />
          </label>
          <SubmitButton
            label={t("saveFollowUp")}
            pendingLabel={t("pending")}
            className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700"
          />
        </div>
      </form>

      {open ? (
        <form action={completeAdvisorFollowUpForAction} className="mt-3">
          <input type="hidden" name="anchorKind" value={anchor.kind} />
          <input type="hidden" name="anchorId" value={anchor.id} />
          <SubmitButton
            label={t("markDone")}
            pendingLabel={t("pending")}
            className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700"
          />
        </form>
      ) : null}

      {/* Dass die Handakte einen Widerruf überlebt, gehört hierher: Sonst
          schreibt niemand etwas hinein, was länger gelten soll. */}
      <p className="mt-5 text-xs leading-5 text-slate-500">{t("survives")}</p>
    </section>
  );
}
