"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { setDiscussionMark } from "@/features/instruments/v2/discussionMarkActions";

/**
 * Das Ankreuzfeld am eigenen Report.
 *
 * ES STEHT HIER UND NICHT IM FRAGEBOGEN, weil man erst weiß, worüber man
 * sprechen möchte, wenn die eigenen Antworten nebeneinanderstehen.
 *
 * Und die Notiz erscheint erst nach dem Ankreuzen: Ein leeres Feld an jeder
 * einzelnen Frage wäre genau die Ablenkung, die aus dem Fragebogen
 * herausgenommen wurde.
 */
export function ReportMark({
  blockId, initialMarked, initialNote,
}: { blockId: string; initialMarked: boolean; initialNote: string | null }) {
  const t = useTranslations("alignment");
  const [marked, setMarked] = useState(initialMarked);
  const [note, setNote] = useState(initialNote ?? "");
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  const save = async (nextMarked: boolean, nextNote: string) => {
    setState("saving");
    const result = await setDiscussionMark(blockId, nextMarked, nextNote);
    setState(result.ok ? "saved" : "error");
  };

  return (
    <div className="mt-3">
      <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={marked}
          onChange={(event) => {
            setMarked(event.target.checked);
            save(event.target.checked, note);
          }}
        />
        <span>{t("discussion.mark")}</span>
      </label>

      {marked && (
        <input
          className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none"
          placeholder={t("discussion.changeCondition")}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          onBlur={() => save(marked, note)}
        />
      )}

      {state === "saved" && <p className="mt-1 text-xs text-slate-500">{t("shell.saved")}</p>}
      {state === "error" && <p className="mt-1 text-xs text-rose-700">{t("discovery.saveError")}</p>}
    </div>
  );
}
