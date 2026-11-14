"use client";

import { useState, useTransition } from "react";
import { answerReminderAction } from "@/features/onboarding/reminderActions";

/**
 * Die Erinnerungsfrage auf der ersten Seite eines Bereichs: "Soll ich dich morgen erinnern?" - Ja, gern oder Nein danke.
 *
 * Zwei gleichwertige Knoepfe, nichts vorangekreuzt; beides wird festgehalten, damit die Frage nicht wiederkommt. Nach der
 * Antwort verschwindet die Karte mit einem Satz. Ein Fehler stoert die Seite nicht.
 */
export function ReminderAsk({ labels }: { labels: { title: string; text: string; yes: string; no: string; thanksYes: string; thanksNo: string } }) {
  const [answer, setAnswer] = useState<"yes" | "no" | null>(null);
  const [pending, startTransition] = useTransition();

  if (answer) {
    return <p role="status" className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{answer === "yes" ? labels.thanksYes : labels.thanksNo}</p>;
  }

  const choose = (wants: boolean) =>
    startTransition(async () => {
      await answerReminderAction(wants).catch(() => ({ ok: false }));
      setAnswer(wants ? "yes" : "no");
    });

  return (
    <section aria-label={labels.title} className="mb-4 rounded-2xl border-2 border-violet-600 bg-white p-5" data-reminder-ask>
      <p className="text-lg font-semibold text-slate-950">{labels.title}</p>
      <p className="mt-1 text-sm leading-6 text-slate-700">{labels.text}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <button type="button" disabled={pending} onClick={() => choose(true)} className="brand-cta inline-flex min-h-11 items-center justify-center rounded-xl px-5 text-sm font-semibold disabled:opacity-60">{labels.yes}</button>
        <button type="button" disabled={pending} onClick={() => choose(false)} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-900 disabled:opacity-60">{labels.no}</button>
      </div>
    </section>
  );
}
