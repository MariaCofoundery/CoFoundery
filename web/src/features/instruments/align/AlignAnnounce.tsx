"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  decideTransitionV21,
  postponeTransitionV21,
} from "@/features/instruments/v21/transitionActionsV21";

/**
 * „Es gibt eine neue Fassung" — der Hinweis für Menschen, die v1 kennen.
 *
 * ---------------------------------------------------------------------------
 * ER ERSCHEINT NUR FÜR DIE, DIE ETWAS ZU VERLIEREN HABEN
 * ---------------------------------------------------------------------------
 *
 * Wer gerade erst anfängt, soll keinen Hinweis auf eine Neufassung von etwas
 * bekommen, das er nie gesehen hat. Deshalb hängt er an einem vorhandenen
 * v1-Fragebogen.
 *
 * ---------------------------------------------------------------------------
 * ZWEI SÄTZE, DIE OFT FEHLEN
 * ---------------------------------------------------------------------------
 *
 * „Befristet" steht dabei, weil es stimmt — v1 wird irgendwann abgelöst, und
 * das erst kurz vorher zu sagen wäre unfair.
 *
 * „Deine Daten bleiben" steht dabei, weil das die eigentliche Sorge ist. Wer
 * nicht weiß, ob sein Report verschwindet, entscheidet nicht über die neue
 * Fassung, sondern über das Risiko.
 *
 * ---------------------------------------------------------------------------
 * KEINE EMPFOHLENE ANTWORT
 * ---------------------------------------------------------------------------
 *
 * Beide Knöpfe sehen gleich aus. Die neue Fassung ist im Test und hat noch
 * keine Auswertung — sie hervorzuheben wäre eine Empfehlung, die wir nicht
 * geben können. „Später entscheiden" ist ein vollwertiger dritter Knopf, und
 * danach ist 30 Tage Ruhe: Ein Hinweis, der bei jedem Seitenaufbau
 * wiederkommt, wird nach dem dritten Mal weggeklickt, ohne gelesen zu werden.
 */
export function AlignAnnounce() {
  const [open, setOpen] = useState(true);
  const [pending, start] = useTransition();
  const router = useRouter();

  if (!open) return null;

  const run = (work: () => Promise<{ ok: boolean }>, goTo?: string) =>
    start(async () => {
      await work();
      setOpen(false);
      if (goTo) router.push(goTo);
      else router.refresh();
    });

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="align-announce-title"
      className="mb-8 rounded-[28px] border border-amber-200 bg-amber-50/70 p-5 sm:p-6"
    >
      <p className="text-[11px] uppercase tracking-[0.22em] text-amber-800">
        Neue Fassung im Test
      </p>
      <h2
        id="align-announce-title"
        className="mt-2 text-2xl font-semibold text-slate-950"
      >
        Hallo — es gibt eine neue Fassung des Tests
      </h2>

      <p className="mt-3 text-sm leading-7 text-slate-700">
        Statt eines Fragebogens gibt es jetzt zwei: einen über <strong>dich</strong> und
        wie du arbeitest, und einen über <strong>euer Vorhaben</strong> — Ziele,
        Zusagen, Regeln, Grenzen. Wir testen sie gerade und freuen uns über jede
        Rückmeldung.
      </p>

      <ul className="mt-4 space-y-2 text-sm leading-7 text-slate-700">
        <li>
          <strong>Du kannst weiter mit der bisherigen Fassung arbeiten</strong> — aber
          nicht unbegrenzt. Sie wird irgendwann abgelöst; wann, sagen wir rechtzeitig.
        </li>
        <li>
          <strong>Deine bisherigen Daten bleiben.</strong> Dein Report und deine
          Antworten sind weiter da und bleiben es auch danach.
        </li>
        <li>
          {/* Der unangenehme Satz gehoert nach oben und nicht ans Ende. */}
          <strong>Ein Vergleich läuft nur innerhalb einer Fassung.</strong> Wer
          wechselt, während sein Mitgründer bleibt, kann sich mit ihm vorerst nicht
          nebeneinanderstellen.
        </li>
        <li>
          Die neue Fassung ist im Test: Sie zeigt eure Antworten nebeneinander und
          Fragen zum Sprechen — <strong>noch keine Auswertung</strong>.
        </li>
      </ul>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => decideTransitionV21("retake", "align"), "/founder-alignment/profil")}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 hover:bg-slate-50 disabled:opacity-50"
        >
          Neue Fassung ausprobieren
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => decideTransitionV21("keep_previous", "align"))}
          className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm text-slate-900 hover:bg-slate-50 disabled:opacity-50"
        >
          Vorerst bei der bisherigen bleiben
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => run(() => postponeTransitionV21("align"))}
          className="rounded-xl px-4 py-2 text-sm text-slate-600 underline disabled:opacity-50"
        >
          Später entscheiden
        </button>
      </div>
    </div>
  );
}
