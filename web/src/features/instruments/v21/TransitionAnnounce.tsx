"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  decideTransitionV21,
  postponeTransitionV21,
} from "@/features/instruments/v21/transitionActionsV21";
import { versionFacts, MIXED_COMPARISON_WARNING } from "@/features/instruments/v21/versionChoiceV21";

/**
 * Der Hinweis auf die neue Fassung.
 *
 * ---------------------------------------------------------------------------
 * ER LÄSST SICH SCHLIESSEN, UND ZWAR RICHTIG
 * ---------------------------------------------------------------------------
 *
 * Kein Fenster ohne Ausweg, keine Wahl, die man treffen muss, um
 * weiterzukommen. „Später entscheiden“ ist ein vollwertiger Knopf, und danach
 * ist 30 Tage Ruhe.
 *
 * Der Grund ist nicht Höflichkeit: Ein Hinweis, der bei jedem Seitenaufbau
 * wiederkommt, wird nach dem dritten Mal weggeklickt, ohne gelesen zu werden.
 * Danach ist er wertlos, egal was drinsteht - und die Entscheidung, die er
 * einholen sollte, ist nie bewusst getroffen worden.
 *
 * ---------------------------------------------------------------------------
 * KEINE EMPFOHLENE ANTWORT
 * ---------------------------------------------------------------------------
 *
 * Beide Knöpfe sehen gleich aus. Die neue Fassung ist im Test und hat noch
 * keine Auswertung - sie hervorzuheben wäre eine Empfehlung, die wir nicht
 * geben können.
 */
export function TransitionAnnounce() {
  const [open, setOpen] = useState(true);
  const [pending, start] = useTransition();
  const router = useRouter();

  if (!open) return null;

  const run = (work: () => Promise<{ ok: boolean }>, goTo?: string) =>
    start(async () => {
      await work();
      setOpen(false);
      // Wer "ausprobieren" klickt, will ausfuellen und nicht auf dem
      // Dashboard bleiben, wo der Hinweis gerade verschwunden ist.
      if (goTo) router.push(goTo);
      else router.refresh();
    });

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="transition-announce-title"
      className="mb-8 rounded-[28px] border border-amber-200 bg-amber-50/70 p-5 sm:p-6"
    >
      <p className="text-[11px] uppercase tracking-[0.22em] text-amber-800">
        Neue Fassung im Test
      </p>
      <h2 id="transition-announce-title" className="mt-2 text-2xl font-semibold text-slate-950">
        Wir testen eine überarbeitete Fassung des Fragebogens
      </h2>

      <p className="mt-3 text-sm leading-7 text-slate-700">
        Eine fachliche Durchsicht hat Fehler in unseren Fragen gefunden — unklare
        Formulierungen und Antwortstufen, bei denen nicht jede Antwort passte. Die
        überarbeitete Fassung ist fertig, aber noch nicht ausgewertet. Du kannst sie
        ausprobieren oder bei der bisherigen bleiben.
      </p>

      <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        {versionFacts().slice(0, 4).map((fact) => (
          <div key={fact.aspect} className="rounded-xl bg-white/70 px-3 py-2">
            <dt className="text-xs text-slate-500">{fact.aspect}</dt>
            <dd className="text-slate-800">
              <span className="text-slate-500">bisher:</span> {fact.previous}
              <br />
              <span className="text-slate-500">neu:</span> {fact.next}
            </dd>
          </div>
        ))}
      </dl>

      {/* DER UNANGENEHME SATZ STEHT VOR DEN KNOEPFEN, nicht darunter. Wer erst
          klickt und dann liest, hat ihn nicht gelesen. */}
      <p className="mt-4 rounded-xl bg-white/70 px-3 py-2 text-sm text-slate-700">
        {MIXED_COMPARISON_WARNING}
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => decideTransitionV21("retake"), "/founder-alignment/pilot")}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 disabled:opacity-50"
        >
          Neue Fassung ausprobieren
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => decideTransitionV21("keep_previous"))}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 disabled:opacity-50"
        >
          Bei der bisherigen bleiben
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => postponeTransitionV21())}
          className="rounded-xl px-4 py-2.5 text-sm text-slate-600 underline disabled:opacity-50"
        >
          Später entscheiden
        </button>
      </div>

      <p className="mt-3 text-xs text-slate-600">
        Egal wie du dich entscheidest: Deine bisherigen Antworten und dein Report
        bleiben erhalten. Du kannst es jederzeit ändern.
      </p>
    </div>
  );
}
